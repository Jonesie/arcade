import { Router } from 'express';
import { env } from '../env.js';

export const configRouter = Router();

// Public, read-only runtime config the frontend needs before the user
// is authenticated — currently just whether Turnstile is configured, so
// the register page knows whether to render the widget. The site key
// itself is meant to be public (Cloudflare embeds it in every page that
// uses Turnstile); the secret key never leaves the backend.
configRouter.get('/', (_req, res) => {
  res.json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null });
});
