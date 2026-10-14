import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Turnstile, useTurnstileSiteKey } from '../components/Turnstile';
import styles from './Form.module.scss';

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  // Honeypot — real users never see this field, so it should always
  // stay empty; a filled value means the submission didn't come from
  // the real form (see the matching check in backend routes/auth.ts).
  const [company, setCompany] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const turnstileSiteKey = useTurnstileSiteKey();
  const captchaPending = Boolean(turnstileSiteKey) && !turnstileToken;

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName, { company, turnstileToken: turnstileToken ?? undefined });
      // Registration deliberately doesn't start a session (it would reveal
      // whether the email already had an account), so go to login with the
      // email filled in and land on the verify-code page once they're in.
      navigate('/login', {
        replace: true,
        state: {
          from: '/profile',
          email,
          notice: 'Check your email for a verification code, then log in to enter it.',
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
      setTurnstileReset((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Create an account</h1>
      {error && <p className={styles.error}>{error}</p>}
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Shown on leaderboards"
          maxLength={50}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <div className={styles.honeypotField} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      {turnstileSiteKey && (
        <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />
      )}
      <button type="submit" className={styles.submit} disabled={submitting || captchaPending}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
