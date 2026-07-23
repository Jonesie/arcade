import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import styles from './Form.module.scss';

export function ProfilePage() {
  const { user, addEmail, verifyEmail, resendVerification, setSubscribed } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(() => searchParams.get('verify') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autoVerifyAttempted = useRef(false);

  // The verification email's "Verify email" button links straight to
  // /profile?verify=CODE so clicking it confirms the address without
  // needing to copy/paste the code by hand. Falls back to the manual
  // form below (which the code is also pre-filled into) if this fails —
  // e.g. the link was opened somewhere not logged in as this account.
  useEffect(() => {
    const paramCode = searchParams.get('verify');
    if (!paramCode || autoVerifyAttempted.current || !user || user.emailVerified) return;
    autoVerifyAttempted.current = true;
    setSubmitting(true);
    verifyEmail(paramCode)
      .then(() => setNotice('Email verified!'))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not verify code'))
      .finally(() => {
        setSubmitting(false);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('verify');
            return next;
          },
          { replace: true },
        );
      });
    // Runs once on mount to consume the one-time `verify` query param —
    // deliberately not re-running as user/searchParams change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The route this page is mounted on is already wrapped in RequireAuth.
  if (!user) return null;

  async function handleAddEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await addEmail(email);
      setNotice('Verification code sent — check your email.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add email');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await verifyEmail(code);
      setCode('');
      setNotice('Email verified!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify code');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendVerification();
      setNotice('Verification code resent — check your email.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend code');
    }
  }

  async function handleSubscribeToggle(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    try {
      await setSubscribed(e.target.checked);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update preference');
    }
  }

  return (
    <div className={styles.form}>
      <h1>Your profile</h1>
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      <p>
        <strong>Display name:</strong> {user.displayName}
      </p>

      {user.email ? (
        <>
          <p>
            <strong>Email:</strong> {user.email} {user.emailVerified ? '✅ Verified' : '⚠️ Not verified'}
          </p>
          {!user.emailVerified && (
            <>
              <form onSubmit={handleVerify}>
                <label>
                  Verification code
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                  />
                </label>
                <button type="submit" className={styles.submit} disabled={submitting}>
                  Verify
                </button>
              </form>
              <button type="button" onClick={() => void handleResend()}>
                Resend code
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <p>No email on file. Once set, it can&apos;t be changed — pick carefully.</p>
          <form onSubmit={handleAddEmail}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
              />
            </label>
            <button type="submit" className={styles.submit} disabled={submitting}>
              Add email
            </button>
          </form>
        </>
      )}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={user.subscribed} onChange={(e) => void handleSubscribeToggle(e)} />
        Subscribe to updates
      </label>
    </div>
  );
}
