import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { Turnstile, useTurnstileSiteKey } from '../components/Turnstile';
import styles from './Form.module.scss';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  // Only same-site paths set by RequireAuth — never an arbitrary URL.
  const redirectTo = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const turnstileSiteKey = useTurnstileSiteKey();
  const captchaPending = Boolean(turnstileSiteKey) && !turnstileToken;

  if (user) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password, { turnstileToken: turnstileToken ?? undefined });
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
      // Wrong-password retries are the normal case here, and the token
      // just sent is spent either way.
      setTurnstileReset((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Log in</h1>
      {error && <p className={styles.error}>{error}</p>}
      <label>
        Email or username
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {turnstileSiteKey && (
        <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />
      )}
      <button type="submit" className={styles.submit} disabled={submitting || captchaPending}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
