/**
 * Best-effort mailer for account verification codes (GitHub issue #12).
 * SMTP is unconfigured by default (SMTP_HOST empty) so this is a no-op —
 * logged, never sent — until a real provider is wired up, same convention
 * as ~/dev/lorna/backend/app/services/mailer.py. Failures are logged and
 * never thrown; a flaky mail provider shouldn't break registration.
 */
import nodemailer from 'nodemailer';
import { env } from '../env.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!env.SMTP_HOST) {
    console.log(`[mailer] SMTP not configured — skipping email "${subject}" to ${to}\n${text}`);
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_ADDRESS },
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return false;
  }
}

export function verificationEmailBody(code: string): string {
  return (
    `Your verification code is: ${code}\n\n` +
    `Enter this on the site to confirm your email. It expires in 15 minutes.\n\n` +
    `— The Dog House\n`
  );
}
