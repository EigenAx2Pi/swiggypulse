import { Router, type Router as RouterType } from 'express';
import { startMockSession, getSession } from '../auth/oauth.js';
import { getAuthenticatedClient } from '../mcp/client.js';
import { randomBytes } from 'node:crypto';
import { logger } from '../lib/logger.js';

const router: RouterType = Router();

function isMock(): boolean {
  return (process.env['USE_MOCK'] ?? 'true').toLowerCase() !== 'false';
}

// Step 1: begin login. Mock returns an immediate session; live returns the Swiggy
// authorization URL the browser should redirect to.
router.get('/start', async (_req, res) => {
  if (isMock()) {
    const sessionId = randomBytes(16).toString('hex');
    const session = startMockSession(sessionId);
    logger.info('mock auth session started', { sessionId });
    res.json({ sessionId, mock: true, accessTokenPrefix: session.accessToken.slice(0, 16) + '...' });
    return;
  }

  const client = getAuthenticatedClient();
  if (!client) {
    res.status(500).json({ error: 'live MCP client unavailable' });
    return;
  }
  try {
    const { authorizationUrl, alreadyAuthorized } = await client.beginAuthorization();
    if (alreadyAuthorized) {
      res.json({ authorized: true });
      return;
    }
    res.json({ authorizationUrl });
  } catch (err) {
    logger.error('auth start failed', { err: (err as Error).message });
    res.status(502).json({ error: 'auth start failed', message: (err as Error).message });
  }
});

// Step 2: Swiggy redirects the user back here with ?code=&state=.
router.get('/callback', async (req, res) => {
  if (isMock()) {
    res.json({ received: true, mock: true, note: 'mock mode — no live exchange' });
    return;
  }

  const code = req.query['code'];
  const state = req.query['state'];
  if (typeof code !== 'string') {
    res.status(400).json({ error: 'authorization code missing from callback' });
    return;
  }
  const client = getAuthenticatedClient();
  if (!client) {
    res.status(500).json({ error: 'live MCP client unavailable' });
    return;
  }
  try {
    await client.completeAuthorization(code, typeof state === 'string' ? state : undefined);
    logger.info('swiggy authorization completed');
    res
      .status(200)
      .send(
        '<html><body style="font-family:system-ui;padding:2rem"><h2>SwiggyPulse connected ✅</h2><p>You can close this tab and return to the dashboard.</p></body></html>',
      );
  } catch (err) {
    logger.error('auth callback failed', { err: (err as Error).message });
    res.status(502).json({ error: 'authorization failed', message: (err as Error).message });
  }
});

router.get('/session/:id', (req, res) => {
  const id = req.params['id'];
  if (!id) {
    res.status(400).json({ error: 'id required' });
    return;
  }
  const s = getSession(id);
  if (!s) {
    res.status(404).json({ error: 'session not found or expired' });
    return;
  }
  res.json({ mock: s.mock, expiresAt: new Date(s.expiresAt).toISOString() });
});

// Live-mode auth status for the frontend to know whether to show "Connect Swiggy".
router.get('/status', (_req, res) => {
  if (isMock()) {
    res.json({ mock: true, authorized: true });
    return;
  }
  const client = getAuthenticatedClient();
  res.json({ mock: false, authorized: client?.isAuthorized() ?? false });
});

export default router;
