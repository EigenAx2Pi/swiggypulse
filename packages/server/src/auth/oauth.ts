import { randomBytes, randomUUID } from 'node:crypto';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientMetadata,
  OAuthClientInformationMixed,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { logger } from '../lib/logger.js';

/**
 * OAuth 2.1 + PKCE for Swiggy MCP.
 *
 * Two paths live here:
 *  - Mock mode: `startMockSession` hands back a fake token immediately, no redirect.
 *  - Live mode: `SwiggyOAuthProvider` implements the MCP SDK's OAuthClientProvider.
 *    The SDK drives Dynamic Client Registration (/auth/register), PKCE (S256), the
 *    /auth/authorize redirect and the /auth/token exchange + refresh. Endpoints are
 *    discovered by the SDK from the server's protected-resource metadata — verified
 *    live: issuer https://mcp.swiggy.com/auth, DCR open, public client (auth method
 *    "none"), scopes mcp:tools mcp:resources mcp:prompts.
 *
 * All state is in-memory / session-scoped — no DB, no PII at rest.
 */

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  mock: boolean;
}

// Session-scoped, in-memory only — no DB, no PII at rest
const sessions = new Map<string, AuthSession>();

export function startMockSession(sessionId: string): AuthSession {
  const session: AuthSession = {
    accessToken: `demo-mock-${randomBytes(16).toString('hex')}`,
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    mock: true,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): AuthSession | undefined {
  const s = sessions.get(sessionId);
  if (!s) return undefined;
  if (s.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return s;
}

/**
 * Live-mode OAuth provider handed to StreamableHTTPClientTransport as `authProvider`.
 * The SDK calls these methods; we just persist the bits it produces for the session.
 */
export class SwiggyOAuthProvider implements OAuthClientProvider {
  private _clientInfo: OAuthClientInformationMixed | undefined;
  private _tokens: OAuthTokens | undefined;
  private _verifier: string | undefined;
  private _state: string | undefined;

  /**
   * Set by `redirectToAuthorization` when the SDK needs the user to log in.
   * The /auth/start route reads this and returns it to the browser to redirect.
   */
  pendingAuthorizationUrl: string | undefined;

  constructor(private readonly _redirectUri: string) {}

  get redirectUrl(): string {
    return this._redirectUri;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'SwiggyPulse',
      redirect_uris: [this._redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      // Public client + loopback redirect — no client secret (Swiggy AS allows "none").
      token_endpoint_auth_method: 'none',
      scope: 'mcp:tools mcp:resources mcp:prompts',
    };
  }

  /** CSRF state; compared against the callback's `state` before finishing auth. */
  state(): string {
    this._state = randomUUID();
    return this._state;
  }

  get lastState(): string | undefined {
    return this._state;
  }

  /**
   * Clears the one-time login state after a completed code exchange, so a callback
   * (state + code) cannot be replayed against an already-finished flow.
   */
  clearAuthFlowState(): void {
    this._state = undefined;
    this.pendingAuthorizationUrl = undefined;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this._clientInfo;
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    this._clientInfo = info;
    logger.info('swiggy DCR client registered', {
      clientId: (info as { client_id?: string }).client_id,
    });
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    logger.info('swiggy oauth tokens stored', {
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
      hasRefresh: Boolean(tokens.refresh_token),
    });
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this.pendingAuthorizationUrl = authorizationUrl.toString();
    logger.info('swiggy authorization required', { url: this.pendingAuthorizationUrl });
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._verifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this._verifier) throw new Error('no PKCE code verifier saved for this session');
    return this._verifier;
  }

  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): void {
    if (scope === 'all' || scope === 'tokens') this._tokens = undefined;
    if (scope === 'all' || scope === 'client') this._clientInfo = undefined;
    if (scope === 'all' || scope === 'verifier') this._verifier = undefined;
    logger.warn('swiggy credentials invalidated', { scope });
  }
}
