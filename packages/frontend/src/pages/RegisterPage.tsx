import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import { Turnstile } from '../components/Turnstile';
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configQuery = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ turnstileSiteKey: string | null }>('/config'),
    staleTime: Infinity,
  });
  const turnstileSiteKey = configQuery.data?.turnstileSiteKey ?? null;
  const captchaPending = Boolean(turnstileSiteKey) && !turnstileToken;

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName, { company, turnstileToken: turnstileToken ?? undefined });
      navigate('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
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
      {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />}
      <button type="submit" className={styles.submit} disabled={submitting || captchaPending}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
