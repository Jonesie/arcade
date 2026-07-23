import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/knex.js';
import { env } from '../env.js';

export interface AuthUser {
  id: number;
  username: string | null;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  subscribed: boolean;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE_NAME = 'arcade_token';
const TOKEN_TTL = '30d';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  id: number;
}

// The token only ever carries the user's id — everything else (email
// verification, admin status, block status) is looked up fresh from the
// DB on every request (see attachUser) instead of being baked into a
// 30-day token, so a block or an admin-list change takes effect on the
// user's very next request rather than waiting for the token to expire.
export function signToken(userId: number): string {
  const payload: TokenPayload = { id: userId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function isAdminEmail(email: string | null, emailVerified: boolean): boolean {
  return Boolean(email) && emailVerified && env.ADMIN_EMAILS.includes(email!.toLowerCase());
}

/** Loads a user row fresh from the DB and shapes it into the request-facing AuthUser. */
export async function loadAuthUser(userId: number): Promise<AuthUser | null> {
  const row = await db('Users').where({ Id: userId }).first();
  if (!row || row.Blocked) return null;
  return {
    id: row.Id,
    username: row.Username,
    displayName: row.DisplayName,
    email: row.Email,
    emailVerified: row.EmailVerified,
    subscribed: row.Subscribed,
    isAdmin: isAdminEmail(row.Email, row.EmailVerified),
  };
}

/**
 * Reads the auth cookie (if present and valid) and attaches req.user by
 * looking the account up fresh from the DB — never just decoding the
 * token's claims — so a block or an admin-list change is picked up
 * immediately rather than only once the 30-day token expires. Never
 * rejects the request; a DB error here is treated the same as "not
 * logged in" rather than a hard failure.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      req.user = (await loadAuthUser(payload.id)) ?? undefined;
    } catch {
      // expired/invalid token, or the DB lookup failed: treat as logged out
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
