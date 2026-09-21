import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { clearAuthCookie, loadAuthUser, requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';
import { domainAcceptsMail } from '../services/emailDomain.js';
import { checkResendCooldown, checkVerificationCode, issueVerificationCode } from '../services/emailVerification.js';
import { verifyTurnstileToken } from '../services/turnstile.js';

export const authRouter = Router();

// Tighter than the general per-route authLimiter (see index.ts), which
// is shared across every /api/auth endpoint including login retries —
// registration specifically is what sends a real email to whatever
// address is given, so it gets its own stricter budget.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
});

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(200);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, 'Display name is required').max(50),
  // Honeypot: a field real users never see or fill (hidden off-screen on
  // the register form), but that naive bots auto-fill anyway. Anything
  // in it means the request didn't come from the real form.
  company: z.string().max(200).optional(),
  // Cloudflare Turnstile response token — only required when
  // TURNSTILE_SECRET_KEY is configured (see services/turnstile.ts).
  turnstileToken: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
  // Same optional-when-unconfigured Turnstile token as registration —
  // here it blunts credential-stuffing rather than signup spam.
  turnstileToken: z.string().optional(),
});

const verifyCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

const addEmailSchema = z.object({ email: emailSchema });

const subscribeSchema = z.object({ subscribed: z.boolean() });

// New accounts register with email only — Username is legacy, kept
// nullable for old accounts (see db/migrate.ts). "Email already exists"
// is checked case-insensitively even though it's stored lowercase, same
// defensive style as the pre-existing Username check this replaces.
authRouter.post('/register', registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const { email, password, displayName, company, turnstileToken } = parsed.data;

  // Honeypot tripped — respond exactly like an ordinary validation
  // failure so a bot can't tell this field is being checked at all.
  if (company) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const humanVerified = await verifyTurnstileToken(turnstileToken, req.ip ?? '');
  if (!humanVerified) {
    res.status(400).json({ error: 'Verification failed — please try again' });
    return;
  }

  const existing = await db('Users').whereRaw('LOWER(Email) = ?', [email]).first();
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists' });
    return;
  }

  if (!(await domainAcceptsMail(email))) {
    res.status(400).json({ error: "We couldn't verify that email domain — check for typos" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db('Users').insert({
    Email: email,
    PasswordHash: passwordHash,
    DisplayName: displayName,
    EmailVerified: false,
    Subscribed: false,
    Blocked: false,
  });
  const created = await db('Users').whereRaw('LOWER(Email) = ?', [email]).first();
  await issueVerificationCode(created.Id, email);

  const user = await loadAuthUser(created.Id);
  setAuthCookie(res, signToken(created.Id));
  res.status(201).json({ user });
});

// Accepts either the legacy Username or an Email so old accounts (no
// email set) and new email-registered accounts both work through one form.
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const { identifier, password, turnstileToken } = parsed.data;

  // Checked before touching the database or bcrypt so a bot without a
  // valid token can't use this endpoint to test credentials at all.
  const humanVerified = await verifyTurnstileToken(turnstileToken, req.ip ?? '');
  if (!humanVerified) {
    res.status(400).json({ error: 'Verification failed — please try again' });
    return;
  }

  const row = await db('Users')
    .whereRaw('LOWER(Username) = LOWER(?) OR LOWER(Email) = LOWER(?)', [identifier, identifier])
    .first();
  if (!row || !(await bcrypt.compare(password, row.PasswordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (row.Blocked) {
    res.status(403).json({ error: 'This account has been disabled' });
    return;
  }

  const user = await loadAuthUser(row.Id);
  setAuthCookie(res, signToken(row.Id));
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/verify-email', requireAuth, async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid code' });
    return;
  }

  const row = await db('Users').where({ Id: req.user!.id }).first();
  if (row.EmailVerified) {
    res.status(400).json({ error: 'Email already verified' });
    return;
  }

  const verdict = checkVerificationCode(parsed.data.code, row.EmailVerificationCode, row.EmailVerificationExpiresAt);
  if (!verdict.ok) {
    res.status(400).json({ error: verdict.reason });
    return;
  }

  await db('Users')
    .where({ Id: req.user!.id })
    .update({ EmailVerified: true, EmailVerificationCode: null, EmailVerificationExpiresAt: null });

  const user = await loadAuthUser(req.user!.id);
  res.json({ user });
});

authRouter.post('/resend-verification', requireAuth, async (req, res) => {
  const row = await db('Users').where({ Id: req.user!.id }).first();
  if (!row.Email) {
    res.status(400).json({ error: 'No email set on this account yet' });
    return;
  }
  if (row.EmailVerified) {
    res.status(400).json({ error: 'Email already verified' });
    return;
  }

  const cooldown = checkResendCooldown(row.EmailVerificationSentAt);
  if (!cooldown.ok) {
    res.status(429).json({ error: cooldown.reason });
    return;
  }

  await issueVerificationCode(row.Id, row.Email);
  res.status(204).end();
});

// For legacy (pre-email) accounts only — once an email is set, on this
// route or at registration, it's permanent (GitHub issue #12: "Once set
// the email cannot be changed").
authRouter.post('/add-email', requireAuth, async (req, res) => {
  const parsed = addEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid email' });
    return;
  }

  const row = await db('Users').where({ Id: req.user!.id }).first();
  if (row.Email) {
    res.status(409).json({ error: 'Email is already set on this account and cannot be changed' });
    return;
  }

  const { email } = parsed.data;
  const existing = await db('Users').whereRaw('LOWER(Email) = ?', [email]).first();
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists' });
    return;
  }

  if (!(await domainAcceptsMail(email))) {
    res.status(400).json({ error: "We couldn't verify that email domain — check for typos" });
    return;
  }

  await db('Users').where({ Id: row.Id }).update({ Email: email, EmailVerified: false });
  await issueVerificationCode(row.Id, email);

  const user = await loadAuthUser(row.Id);
  res.json({ user });
});

authRouter.post('/subscribe', requireAuth, async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  await db('Users').where({ Id: req.user!.id }).update({ Subscribed: parsed.data.subscribed });
  const user = await loadAuthUser(req.user!.id);
  res.json({ user });
});
