/**
 * Sanity-checks that an email's domain can actually receive mail before
 * an account is created and a verification email is fired at it.
 * Without this, a bot (or a typo'd address) targeting a nonexistent
 * domain still gets a real send attempt, which bounces and erodes the
 * sending account's deliverability. A domain with neither an MX record
 * nor an A/AAAA fallback can't receive SMTP mail at all, so this is a
 * cheap, safe filter — not a full deliverability guarantee (a domain
 * can resolve and still reject the specific mailbox).
 */
import dns from 'node:dns/promises';

export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;

  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // No MX — fall through to the A/AAAA fallback below.
  }

  try {
    await dns.lookup(domain);
    return true;
  } catch {
    return false;
  }
}
