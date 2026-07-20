import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { logger } from './lib/logger.js';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3001);

// Restricted to the local UI origin. A wildcard here means any site open in the
// same browser can read /api/* — including real Swiggy order history in live mode.
app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' }));
app.use(express.json());

app.use('/api', apiRouter);
app.use('/auth', authRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, () => {
  logger.info('server listening', {
    port: PORT,
    mode: process.env['USE_MOCK'] !== 'false' ? 'mock' : 'live',
  });
});
