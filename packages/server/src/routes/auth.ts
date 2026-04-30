import { Router, type Router as RouterType } from 'express';
import { generatePKCE, buildAuthorizationUrl, startMockSession, getSession } from '../auth/oauth.js';
import { randomBytes } from 'node:crypto';
import { logger } from '../lib/logger.js';

const router: RouterType = Router();

// In mock mode, /auth/start returns an immediate session — no redirect.
router.get('/start', (_req, res) => {
  const useMock = (process.env['USE_MOCK'] ?? 'true').toLowerCase() !== 'false';
  if (useMock) {
    const sessionId = randomBytes(16).toString('hex');
    const session = startMockSession(sessionId);
    logger.info('mock auth session started', { sessionId });
    res.json({ sessionId, mock: true, accessTokenPrefix: session.accessToken.slice(0, 16) + '...' });
    return;
  }
  // Live mode: emit the authorization URL the client should redirect to
  const { verifier, challenge } = generatePKCE();
  const state = randomBytes(16).toString('hex');
  // Note: in a real implementation we'd persist `verifier` keyed by `state` so
  // the callback can recover it. Skipped here since the live flow is gated.
  res.json({
    authorizationUrl: buildAuthorizationUrl(challenge, state),
    verifier,
    state,
  });
});

router.get('/callback', (req, res) => {
  // Live mode would: lookup verifier by state, POST to /oauth/token
  res.json({
    received: true,
    code: req.query['code'],
    state: req.query['state'],
    note: 'Live OAuth callback not wired — credentials issued after Swiggy Builders Club acceptance',
  });
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

export default router;
