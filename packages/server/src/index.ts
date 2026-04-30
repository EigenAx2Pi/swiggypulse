import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { logger } from './lib/logger.js';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3001);

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);
app.use('/auth', authRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'internal server error', message: err.message });
});

app.listen(PORT, () => {
  logger.info('server listening', {
    port: PORT,
    mode: process.env['USE_MOCK'] !== 'false' ? 'mock' : 'live',
  });
});
