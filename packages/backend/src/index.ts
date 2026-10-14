import 'express-async-errors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './env.js';
import { attachUser } from './middleware/auth.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { configRouter } from './routes/config.js';
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
app.use(
  helmet({
    // Extends helmet's default CSP to allow Cloudflare Turnstile's
    // widget script and challenge iframe (see routes/config.ts and
    // services/turnstile.ts) — everything else stays locked to 'self'.
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://challenges.cloudflare.com'],
        'frame-src': ["'self'", 'https://challenges.cloudflare.com'],
        'connect-src': ["'self'", 'https://challenges.cloudflare.com'],
      },
    },
  }),
);
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
app.use('/api/config', configRouter);
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

// Last in the chain: an error thrown or rejected in any route (e.g. a DB
// failure) becomes a 500 for that request instead of an unhandled
// rejection that takes the whole process down. Body-parser errors keep
// their own 4xx status.
app.use((err: Error & { status?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[error]', err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Bad request' });
});

app.listen(env.PORT, () => {
  console.log(`arcade backend listening on :${env.PORT}`);
});
