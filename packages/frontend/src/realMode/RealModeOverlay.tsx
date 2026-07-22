import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getGame } from '../games/registry';
import { isRealModeEnabled, subscribeRealMode } from './realModeState';
import styles from './RealModeOverlay.module.scss';
import { sfx } from './sound';
import { StaticGlitch } from './StaticGlitch';

interface Scenario {
  type: 'machineFailure' | 'flyingFood' | 'boganAttack' | 'fight' | 'copsArrive';
  message: string;
  icon: string;
  durationMs: number;
  playSfx: () => void;
}

// Five candidate scenarios straight from GitHub issue #6. Durations are
// tuned to roughly match each sfx's own length (see ./sound.ts) so the
// banner doesn't outlast or cut off the sound.
const SCENARIOS: Scenario[] = [
  { type: 'machineFailure', message: 'SIGNAL LOST', icon: '📺', durationMs: 1400, playSfx: sfx.machineFailure },
  { type: 'flyingFood', message: 'INCOMING BURGER!', icon: '🍔', durationMs: 2000, playSfx: sfx.foodSplat },
  { type: 'boganAttack', message: 'BOGAN ATTACK!', icon: '🤜', durationMs: 2000, playSfx: sfx.boganAttack },
  { type: 'fight', message: 'FIGHT BREAKS OUT!', icon: '💥', durationMs: 2200, playSfx: sfx.fight },
  { type: 'copsArrive', message: 'COPS! EVERYONE OUT!', icon: '🚨', durationMs: 2700, playSfx: sfx.copsArrive },
];

// Floor of 60s keeps events to at most one per minute, per user feedback
// that the original 30-90s range felt too frequent.
const MIN_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 180_000;

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

function randomScenario(): Scenario {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

/**
 * Real Mode's random chaos events (GitHub issue #6): while enabled and a
 * game is on screen, occasionally interrupts play for a couple of
 * seconds with a sound + notification, purely cosmetic — nothing here
 * touches the game underneath, so whatever's playing keeps running
 * exactly as it would otherwise. Rendered by Cabinet.tsx as an absolute
 * layer over `.screen`, so it works the same for every game without
 * each one needing its own integration.
 */
export function RealModeOverlay() {
  const location = useLocation();
  const gameSlug = location.pathname.match(/^\/games\/([^/]+)/)?.[1];
  const onGamePage = Boolean(gameSlug && getGame(gameSlug));

  const [enabled, setEnabled] = useState(isRealModeEnabled());
  useEffect(() => subscribeRealMode(setEnabled), []);

  const [active, setActive] = useState<Scenario | null>(null);

  useEffect(() => {
    if (!enabled || !onGamePage) {
      setActive(null);
      return undefined;
    }

    let scheduleTimer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function scheduleNext() {
      scheduleTimer = setTimeout(triggerEvent, randomInterval());
    }

    function triggerEvent() {
      if (cancelled) return;
      const scenario = randomScenario();
      scenario.playSfx();
      setActive(scenario);
      clearTimer = setTimeout(() => {
        if (cancelled) return;
        setActive(null);
        scheduleNext();
      }, scenario.durationMs);
    }

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(scheduleTimer);
      clearTimeout(clearTimer);
      setActive(null);
    };
  }, [enabled, onGamePage]);

  if (!active) return null;

  return (
    <div className={styles.overlay} aria-hidden="true">
      {active.type === 'machineFailure' ? (
        <StaticGlitch />
      ) : (
        <div className={styles.banner}>
          <span className={styles.icon}>{active.icon}</span>
          <span className={styles.message}>{active.message}</span>
        </div>
      )}
    </div>
  );
}
