import { MockMCPClient } from '@swiggypulse/mcp-mock';
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
 * Skeleton for the real Swiggy MCP client. Not wired yet — credentials are issued
 * after Builders Club acceptance. Kept here so the factory + auth flow are visible
 * and only one env flag (USE_MOCK=false) needs to flip.
 *
 * When credentials arrive: implement streamable-HTTP transport, wire OAuth tokens
 * from the auth flow into the request headers, and route by tool prefix to the
 * appropriate Swiggy MCP server (food / instamart / dineout).
 */
export class RealMCPClient implements MCPClient {
  constructor(
    private readonly _config: {
      foodUrl: string;
      instamartUrl: string;
      dineoutUrl: string;
      accessToken?: string;
    },
  ) {}

  async callTool<T = unknown>(name: string, _args?: Record<string, unknown>): Promise<MCPResponse<T>> {
    logger.warn('RealMCPClient called but not yet implemented', { tool: name });
    return {
      success: false,
      data: null as T,
      message: 'Real MCP client not yet implemented — running in mock mode',
    };
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
      foodUrl: process.env['SWIGGY_MCP_FOOD_URL'] ?? '',
      instamartUrl: process.env['SWIGGY_MCP_INSTAMART_URL'] ?? '',
      dineoutUrl: process.env['SWIGGY_MCP_DINEOUT_URL'] ?? '',
    });
  }
  return _client;
}
