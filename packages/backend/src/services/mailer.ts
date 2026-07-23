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

export interface EmailContent {
  text: string;
  html: string;
}

export async function sendEmail(to: string, subject: string, content: EmailContent): Promise<boolean> {
  if (!env.SMTP_HOST) {
    console.log(`[mailer] SMTP not configured — skipping email "${subject}" to ${to}\n${content.text}`);
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_ADDRESS },
      to,
      subject,
      text: content.text,
      html: content.html,
    });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return false;
  }
}

// A plain-text "neon sign" recreation of the site's marquee (see
// Cabinet.module.scss's --neon-red / .neonText) — most email clients
// strip glow-style text-shadow entirely (Outlook's desktop renderer in
// particular), so rather than a CSS effect that only works sometimes,
// this leans on a dark banner block + bold red letter-spaced text, which
// degrades to something reasonable everywhere.
function brandedHtml(bodyHtml: string): string {
  return `
    <div style="background:#0d0a08;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
              <tr>
                <td align="center" style="background:#1a1410;border:1px solid #443722;border-radius:12px 12px 0 0;padding:22px 16px;">
                  <div style="color:#fff5f2;font-weight:bold;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;">
                    <span style="color:#ff3d2e;">The Dog</span> House
                  </div>
                  <div style="color:#c9b8a8;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;margin-top:4px;">
                    24 Hour Video Games
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#17131a;border:1px solid #2a2645;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px;color:#f2f0fb;font-size:15px;line-height:1.6;">
                  ${bodyHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function verificationEmailContent(code: string): EmailContent {
  // Carries the code itself so clicking through verifies immediately —
  // ProfilePage reads `?verify=` on mount. Manually typing the code
  // (shown below too) is the fallback if the link's session doesn't
  // match (e.g. opened on a different device that isn't logged in).
  const verifyUrl = `${env.PUBLIC_BASE_URL}/profile?verify=${code}`;
  const profileUrl = `${env.PUBLIC_BASE_URL}/profile`;
  const text =
    `Your verification code is: ${code}\n\n` +
    `Verify now: ${verifyUrl}\n\n` +
    `Or enter the code yourself on your profile: ${profileUrl}\n` +
    `It expires in 15 minutes.\n\n` +
    `— The Dog House\n`;

  const html = brandedHtml(`
    <p style="margin:0 0 16px;">Confirm your email for The Dog House:</p>
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${verifyUrl}" style="display:inline-block;background:#7c6cf0;color:#fff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:8px;font-size:16px;">
        Verify email
      </a>
    </p>
    <p style="margin:0 0 8px;color:#a9a4c9;font-size:13px;">Or enter this code on your profile yourself:</p>
    <p style="margin:0 0 20px;text-align:center;">
      <span style="display:inline-block;background:#2a2645;border-radius:8px;padding:10px 18px;font-size:24px;font-weight:bold;letter-spacing:0.15em;color:#7c6cf0;">
        ${code}
      </span>
    </p>
    <p style="margin:0;color:#a9a4c9;font-size:13px;">This code expires in 15 minutes.</p>
  `);

  return { text, html };
}
