/**
 * Cloudflare Turnstile CAPTCHA verification, used to stop scripted
 * registration spam (bots submitting throwaway/other-people's email
 * addresses, which then bounce and erode the sending account's
 * deliverability) and credential-stuffing against login. Same "empty
 * config = disabled" convention as mailer.ts's SMTP_HOST — with no
 * secret key set, verification is skipped entirely so local dev needs
 * no Turnstile account at all.
 */
import { env } from '../env.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string | undefined, remoteIp: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  try {
    const params = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: remoteIp,
    });
    const res = await fetch(VERIFY_URL, { method: 'POST', body: params });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification request failed:', err);
    return false;
  }
}
