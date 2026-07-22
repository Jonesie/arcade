import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 20000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'pointerdown', 'click', 'scroll'] as const;

/**
 * True once the page has sat idle (no mouse/keyboard/touch input) for
 * IDLE_TIMEOUT_MS, and false again the instant any of those events fire —
 * see GitHub issue #5. Whoever calls this owns deciding what to render
 * while idle; this hook only tracks the boolean.
 */
export function useAttractMode(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setActive(true), IDLE_TIMEOUT_MS);
    }

    function handleActivity() {
      setActive(false);
      resetIdleTimer();
    }

    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, handleActivity);
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, handleActivity);
    };
  }, []);

  return active;
}
