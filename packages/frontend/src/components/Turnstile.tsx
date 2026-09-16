import { useEffect, useRef } from 'react';

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

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string | null) => void;
}

/** Cloudflare Turnstile widget, used on the register form (see
 * ../pages/RegisterPage.tsx) to block scripted signup spam. Renders
 * nothing until the script loads; `onToken` fires with the response
 * token on success and `null` if it expires before the form submits. */
export function Turnstile({ siteKey, onToken }: TurnstileProps) {
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

  return <div ref={containerRef} />;
}
