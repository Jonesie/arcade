import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../api/client';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Turnstile'));
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

/** The public Turnstile site key, or null when the backend has no
 * Turnstile configured (in which case the widget shouldn't render and
 * forms submit without a token — see backend services/turnstile.ts). */
export function useTurnstileSiteKey(): string | null {
  const configQuery = useQuery({
    queryKey: ['config'],
    queryFn: () => api.get<{ turnstileSiteKey: string | null }>('/config'),
    staleTime: Infinity,
  });
  return configQuery.data?.turnstileSiteKey ?? null;
}

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Bump this to reset the widget and get a fresh token. Tokens are
   * single-use, so a form must do this after any failed submit or the
   * user's retry would be rejected with the already-spent token. */
  resetKey?: number;
}

/** Cloudflare Turnstile widget, used on the register and login forms
 * (see ../pages/RegisterPage.tsx, ../pages/LoginPage.tsx) to block
 * scripted signup spam and credential stuffing. Renders nothing until
 * the script loads; `onToken` fires with the response token on success
 * and `null` if it expires before the form submits. */
export function Turnstile({ siteKey, onToken, resetKey = 0 }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
        });
      })
      .catch((err: unknown) => console.error('[turnstile]', err));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // Re-render only if the site key itself changes (never does in
    // practice) — onToken is a fresh closure every render and isn't
    // meant to retrigger the widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onToken(null);
    // Same reasoning as above: only the reset signal should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return <div ref={containerRef} />;
}
