import { createHash, randomBytes } from 'node:crypto';

/**
 * OAuth 2.1 + PKCE skeleton for Swiggy MCP.
 *
 * In mock mode this returns a fake token immediately — no redirect. In live mode
 * it would emit the authorization URL, store the verifier in session, and exchange
 * the callback code for an access token (5-day lifetime, no refresh in v1).
 */

const CLIENT_ID = process.env['SWIGGY_CLIENT_ID'] ?? 'SWIGGYPULSE_DEV';
const REDIRECT_URI = process.env['OAUTH_REDIRECT_URI'] ?? 'http://localhost:3001/auth/callback';
const SCOPE = 'mcp:tools mcp:resources mcp:prompts';

export interface PKCEPair {
  verifier: string;
  challenge: string;
}

export function generatePKCE(): PKCEPair {
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  mock: boolean;
}

// Session-scoped, in-memory only — no DB, no PII at rest
const sessions = new Map<string, AuthSession>();

export function buildAuthorizationUrl(challenge: string, state: string): string {
  const url = new URL(process.env['SWIGGY_MCP_FOOD_URL'] ?? 'https://mcp.swiggy.com');
  url.pathname = '/oauth/authorize';
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

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
