import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './env.js';
import { attachUser } from './middleware/auth.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { gamesRouter } from './routes/games.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { scoresRouter } from './routes/scores.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Deployed behind exactly one reverse proxy (nginx) — trust its
// X-Forwarded-For so rate-limiting and logging see the real client IP
// instead of the proxy's.
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(attachUser);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/games', scoresRouter);
app.use('/api/games', gamesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);

// Any other /api/* request that fell through is a genuine 404, not the SPA.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built frontend (packages/frontend/dist, a sibling of this
// package's dist/ once built) and fall back to it for client-side routing.
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(env.PORT, () => {
  console.log(`arcade backend listening on :${env.PORT}`);
});
