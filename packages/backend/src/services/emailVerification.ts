import { db } from '../db/knex.js';
import { sendEmail, verificationEmailContent } from './mailer.js';

const CODE_EXPIRY_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Generates a fresh 6-digit code for a user's (already-set) Email, stores it, and emails it. */
export async function issueVerificationCode(userId: number, email: string): Promise<void> {
  const code = generateCode();
  const now = new Date();
  await db('Users')
    .where({ Id: userId })
    .update({
      EmailVerificationCode: code,
      EmailVerificationExpiresAt: new Date(now.getTime() + CODE_EXPIRY_MS),
      EmailVerificationSentAt: now,
    });
  await sendEmail(email, 'Verify your email — The Dog House', verificationEmailContent(code));
}

export type ResendVerdict = { ok: true } | { ok: false; reason: string };

/** Guards against spam-clicking "resend" — same code/cooldown either way, just re-sent. */
export function checkResendCooldown(lastSentAt: Date | string | null): ResendVerdict {
  if (!lastSentAt) return { ok: true };
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed < RESEND_COOLDOWN_MS) {
    const waitS = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return { ok: false, reason: `Please wait ${waitS}s before requesting another code` };
  }
  return { ok: true };
}

export type VerifyVerdict = { ok: true } | { ok: false; reason: string };

export function checkVerificationCode(
  submittedCode: string,
  storedCode: string | null,
  expiresAt: Date | string | null,
): VerifyVerdict {
  if (!storedCode || !expiresAt) {
    return { ok: false, reason: 'No verification code pending — request a new one' };
  }
  if (new Date(expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'That code has expired — request a new one' };
  }
  if (submittedCode !== storedCode) {
    return { ok: false, reason: 'Incorrect code' };
  }
  return { ok: true };
}
