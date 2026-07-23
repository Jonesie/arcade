import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnvFile } from 'dotenv';

// dotenv's default `dotenv/config` import resolves `.env` relative to
// process.cwd(), which differs between `npm run <script> -w @arcade/backend`
// (cwd = packages/backend) and running from the repo root. Resolve it
// relative to this file instead so it works the same everywhere. In
// production no .env file is shipped — real environment variables set by
// the container/orchestrator take precedence, and a missing file here is a
// silent no-op (dotenv doesn't throw).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  DB_SERVER: required('DB_SERVER'),
  DB_PORT: Number(process.env.DB_PORT ?? 1433),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: required('DB_PASSWORD'),
  JWT_SECRET: required('JWT_SECRET'),

  // Outbound email (GitHub issue #12: email verification codes). Same
  // "empty host = no-op, log instead" convention as ~/dev/lorna's mailer —
  // this works with no SMTP configured at all, just without ever actually
  // delivering mail; see services/mailer.ts.
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME ?? 'The Dog House',
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS ?? 'noreply@arcade.jonesie.net.nz',

  // Comma-separated list of email addresses treated as admins (GitHub
  // issue #12) — an account counts as admin only once that same address
  // is set *and verified* on it, so someone can't self-promote just by
  // typing an admin's email into an unverified field.
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};
