import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex.js';
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, _ and -'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1).max(50),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const { username, password, displayName } = parsed.data;

  const existing = await db('Users').whereRaw('LOWER(Username) = LOWER(?)', [username]).first();
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db('Users').insert({ Username: username, PasswordHash: passwordHash, DisplayName: displayName });
  const created = await db('Users').where({ Username: username }).first();

  const user = { id: created.Id, username: created.Username, displayName: created.DisplayName };
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user });
});

authRouter.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid username or password' });
    return;
  }
  const { username, password } = parsed.data;

  const row = await db('Users').whereRaw('LOWER(Username) = LOWER(?)', [username]).first();
  if (!row || !(await bcrypt.compare(password, row.PasswordHash))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const user = { id: row.Id, username: row.Username, displayName: row.DisplayName };
  setAuthCookie(res, signToken(user));
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
