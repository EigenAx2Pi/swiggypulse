import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { MockMCPClient } from '@swiggypulse/mcp-mock';
import { SwiggyOAuthProvider } from '../auth/oauth.js';
import { TOOL_ADAPTERS, rawShapeSummary } from './adapters.js';
import { logger } from '../lib/logger.js';

export interface MCPResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MCPClient {
  callTool<T = unknown>(name: string, args?: Record<string, unknown>): Promise<MCPResponse<T>>;
}

/**
 * Live client adds the interactive OAuth handshake on top of `callTool`. The two
 * auth methods span two HTTP requests (/auth/start then /auth/callback), so the
 * factory returns a singleton and both routes drive the same instance.
 */
export interface AuthenticatedMCPClient extends MCPClient {
  isAuthorized(): boolean;
  beginAuthorization(): Promise<{ authorizationUrl: string | null; alreadyAuthorized: boolean }>;
  completeAuthorization(code: string, state?: string): Promise<void>;
}

export function isAuthenticatedClient(c: MCPClient): c is AuthenticatedMCPClient {
  return 'beginAuthorization' in c;
}

type ServerKey = 'food' | 'instamart' | 'dineout';

/**
 * Which MCP server exposes each tool. Names mirror the mock schemas; real Swiggy
 * names are logged via listTools() on connect so any drift is visible at runtime.
 */
const TOOL_SERVER: Record<string, ServerKey> = {
  search_restaurants: 'food',
  get_restaurant_menu: 'food',
  get_food_orders: 'food',
  fetch_food_coupons: 'food',
  get_restaurant_details: 'dineout',
  your_go_to_items: 'instamart',
};

interface CallToolResultLike {
  content?: unknown;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * Real Swiggy MCP client over streamable HTTP. One Client+transport per server
 * (food /food, instamart /im, dineout /dineout), all sharing one OAuth provider so
 * a single login covers every server. Connections are lazy: the first call that
 * needs a server connects it (reusing the session token, refreshing as needed).
 */
export class RealMCPClient implements AuthenticatedMCPClient {
  private readonly provider: SwiggyOAuthProvider;
  private readonly urls: Record<ServerKey, string>;
  private readonly clients = new Map<ServerKey, Client>();
  private readonly transports = new Map<ServerKey, StreamableHTTPClientTransport>();
  private readonly connected = new Set<ServerKey>();
  /** Per-tool fallback when a live call fails or returns an unmappable shape. */
  private readonly fallback = new MockMCPClient();

  constructor(config: {
    foodUrl: string;
    instamartUrl: string;
    dineoutUrl: string;
    redirectUri: string;
  }) {
    this.urls = {
      food: config.foodUrl,
      instamart: config.instamartUrl,
      dineout: config.dineoutUrl,
    };
    this.provider = new SwiggyOAuthProvider(config.redirectUri);
  }

  isAuthorized(): boolean {
    return this.provider.tokens() !== undefined;
  }

  private newClient(): Client {
    return new Client({ name: 'swiggypulse', version: '0.1.0' });
  }

  private newTransport(server: ServerKey): StreamableHTTPClientTransport {
    return new StreamableHTTPClientTransport(new URL(this.urls[server]), {
      authProvider: this.provider,
    });
  }

  /**
   * Step 1 of interactive login. Attempts to connect the food server; if the SDK
   * needs the user to authorize, returns the authorization URL for the browser to
   * redirect to. Returns `alreadyAuthorized` if a valid token already exists.
   */
  async beginAuthorization(): Promise<{ authorizationUrl: string | null; alreadyAuthorized: boolean }> {
    if (this.isAuthorized()) return { authorizationUrl: null, alreadyAuthorized: true };

    const client = this.newClient();
    const transport = this.newTransport('food');
    this.clients.set('food', client);
    this.transports.set('food', transport);
    this.provider.pendingAuthorizationUrl = undefined;

    try {
      await client.connect(transport);
      // Connected without a redirect (e.g. cached tokens) — good to go.
      this.connected.add('food');
      await this.logTools('food');
      return { authorizationUrl: null, alreadyAuthorized: true };
    } catch (err) {
      if (err instanceof UnauthorizedError || this.provider.pendingAuthorizationUrl) {
        return {
          authorizationUrl: this.provider.pendingAuthorizationUrl ?? null,
          alreadyAuthorized: false,
        };
      }
      throw err;
    }
  }

  /**
   * Step 2 of interactive login. Exchanges the authorization code for tokens, then
   * reconnects on a fresh transport (a started transport can't be restarted).
   */
  async completeAuthorization(code: string, state?: string): Promise<void> {
    // CSRF: state must be present and match the value generated for this flow (fail
    // closed). An in-flight authorization must exist, else there is nothing to finish.
    const pending = this.transports.get('food');
    if (!pending) throw new Error('no pending authorization; call beginAuthorization first');
    if (!state || !this.provider.lastState || state !== this.provider.lastState) {
      throw new Error('OAuth state missing or mismatched — possible CSRF, aborting');
    }

    await pending.finishAuth(code); // exchanges code -> tokens, saved on the provider
    this.provider.clearAuthFlowState(); // one-time: block callback replay

    const client = this.newClient();
    const transport = this.newTransport('food');
    await client.connect(transport);
    this.clients.set('food', client);
    this.transports.set('food', transport);
    this.connected.add('food');
    await this.logTools('food');
  }

  private async ensureConnected(server: ServerKey): Promise<Client> {
    const existing = this.clients.get(server);
    if (existing && this.connected.has(server)) return existing;
    if (!this.isAuthorized()) {
      throw new Error('not authorized — start the Swiggy login at /auth/start');
    }
    const client = this.newClient();
    const transport = this.newTransport(server);
    await client.connect(transport); // reuses/refreshes the session token via the provider
    this.clients.set(server, client);
    this.transports.set(server, transport);
    this.connected.add(server);
    await this.logTools(server);
    return client;
  }

  private async logTools(server: ServerKey): Promise<void> {
    try {
      const client = this.clients.get(server);
      if (!client) return;
      const { tools } = await client.listTools();
      logger.info('swiggy server tools', { server, tools: tools.map((t) => t.name) });
    } catch (err) {
      logger.warn('failed to list swiggy tools', { server, err: (err as Error).message });
    }
  }

  private extractData<T>(result: CallToolResultLike): T {
    if (result.structuredContent !== undefined) return result.structuredContent as T;
    if (Array.isArray(result.content)) {
      const block = result.content.find(
        (c): c is { type: string; text: string } =>
          typeof c === 'object' &&
          c !== null &&
          (c as { type?: unknown }).type === 'text' &&
          typeof (c as { text?: unknown }).text === 'string',
      );
      if (block) {
        try {
          return JSON.parse(block.text) as T;
        } catch {
          return block.text as unknown as T;
        }
      }
    }
    return null as T;
  }

  private isStrict(): boolean {
    const v = (process.env['LIVE_STRICT'] ?? '').toLowerCase();
    return v === 'true' || v === '1';
  }

  private async fallbackToMock<T>(
    name: string,
    args: Record<string, unknown> | undefined,
    reason: string,
  ): Promise<MCPResponse<T>> {
    logger.info('falling back to mock data', { tool: name, reason });
    return (await this.fallback.callTool(name, args)) as MCPResponse<T>;
  }

  async callTool<T = unknown>(name: string, args?: Record<string, unknown>): Promise<MCPResponse<T>> {
    const server = TOOL_SERVER[name] ?? 'food';
    const strict = this.isStrict();

    // 1. Attempt the live call.
    let raw: unknown;
    let liveOk = false;
    let liveErr: string | undefined;
    try {
      const client = await this.ensureConnected(server);
      const result = (await client.callTool({ name, arguments: args ?? {} })) as CallToolResultLike;
      if (result.isError === true) {
        liveErr = 'tool reported an error';
      } else {
        raw = this.extractData<unknown>(result);
        liveOk = true;
      }
    } catch (err) {
      liveErr = (err as Error).message;
    }

    // 2. Live call failed — surface (strict) or degrade to mock.
    if (!liveOk) {
      logger.warn('live tool call failed', { tool: name, server, err: liveErr });
      if (strict) return { success: false, data: null as T, message: liveErr ?? 'live call failed' };
      return this.fallbackToMock<T>(name, args, 'live-error');
    }

    // 3. Map the live shape. No adapter registered => pass raw through.
    const adapter = TOOL_ADAPTERS[name];
    if (!adapter) return { success: true, data: raw as T };

    const mapped = adapter(raw);
    if (!mapped) {
      logger.warn('live tool output shape unmapped', {
        tool: name,
        server,
        rawShape: rawShapeSummary(raw),
      });
      if (strict) {
        return { success: false, data: null as T, message: 'live tool output shape not recognized' };
      }
      return this.fallbackToMock<T>(name, args, 'shape-mismatch');
    }

    if (mapped.degraded.length > 0) {
      logger.warn('live tool mapped with defaulted fields', {
        tool: name,
        server,
        degraded: mapped.degraded,
      });
    }
    return { success: true, data: mapped.value as T };
  }
}

let _client: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (_client) return _client;
  const useMock = (process.env['USE_MOCK'] ?? 'true').toLowerCase() !== 'false';
  if (useMock) {
    logger.info('MCP client: mock mode');
    _client = new MockMCPClient() as MCPClient;
  } else {
    logger.info('MCP client: real mode');
    _client = new RealMCPClient({
      foodUrl: process.env['SWIGGY_MCP_FOOD_URL'] ?? 'https://mcp.swiggy.com/food',
      instamartUrl: process.env['SWIGGY_MCP_INSTAMART_URL'] ?? 'https://mcp.swiggy.com/im',
      dineoutUrl: process.env['SWIGGY_MCP_DINEOUT_URL'] ?? 'https://mcp.swiggy.com/dineout',
      redirectUri: process.env['OAUTH_REDIRECT_URI'] ?? 'http://localhost:3001/auth/callback',
    });
  }
  return _client;
}

/** Returns the live client when in real mode, else null (mock has no auth flow). */
export function getAuthenticatedClient(): AuthenticatedMCPClient | null {
  const c = getMCPClient();
  return isAuthenticatedClient(c) ? c : null;
}
