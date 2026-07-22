import { createInitialState, tickUpdate, TICK_MS, type Direction, type GameEvent, type GameState } from '@arcade/shared';
import { useEffect, useRef } from 'react';
import styles from '../attract/DemoCanvas.module.scss';
import { render, WIDTH, HEIGHT } from './render';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';

// Candidates in priority order: prefer making progress, then dodging
// sideways, then just holding position — tried in order, first one that
// doesn't cost a life wins.
const HOP_CANDIDATES: (Direction | undefined)[] = ['up', 'left', 'right', undefined];

function cloneState(state: GameState): GameState {
  return { ...state, slotsFilled: [...state.slotsFilled] };
}

// Runs the real tickUpdate against a throwaway clone to see whether a
// candidate hop would actually be safe — reuses the exact same collision/
// timeout/home-slot logic the real game uses instead of a separate (and
// easy to get subtly wrong) heuristic reimplementation of "is this move OK."
function isSafeMove(state: GameState, tick: number, hop?: Direction): boolean {
  const trial = cloneState(state);
  const livesBefore = trial.lives;
  tickUpdate(trial, tick, hop);
  return trial.lives >= livesBefore && !trial.gameOver;
}

function chooseHop(state: GameState, tick: number): Direction | undefined {
  for (const candidate of HOP_CANDIDATES) {
    if (isSafeMove(state, tick, candidate)) return candidate;
  }
  // Nothing is safe this tick — hop up anyway rather than stall silently.
  return 'up';
}

/**
 * Frogger's tick-based `tickUpdate(state, tick, hop?)` doesn't fit the
 * continuous dt/input shape the other games' engines share, so this is a
 * bespoke loop rather than going through EngineDemo. The bot looks one
 * tick ahead (see chooseHop) rather than blindly spamming "up" — it dodges
 * cars, waits for a log instead of drowning, and generally survives a lot
 * longer, while still being simple enough to die and restart occasionally
 * like a normal attract-mode clip.
 */
export function FroggerDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let state: GameState = createInitialState();
    let lastTick = -1;
    let startTime = performance.now();
    let restartAt: number | null = null;

    ensureAudio();
    startMusic();

    function handleEvents(events: GameEvent[]) {
      for (const event of events) {
        switch (event.type) {
          case 'hop':
            sfx.hop();
            break;
          case 'slotFilled':
            sfx.slotFilled();
            break;
          case 'levelClear':
            sfx.levelClear();
            break;
          case 'died':
            sfx.died();
            break;
          case 'gameOver':
            sfx.gameOver();
            break;
        }
      }
    }

    function loop(now: number) {
      if (restartAt != null) {
        if (now >= restartAt) {
          state = createInitialState();
          lastTick = -1;
          startTime = now;
          restartAt = null;
        }
        raf = requestAnimationFrame(loop);
        return;
      }

      const elapsed = now - startTime;
      const currentTick = Math.floor(elapsed / TICK_MS);
      if (currentTick > lastTick) {
        for (let t = lastTick + 1; t <= currentTick; t++) {
          const hop = t === currentTick ? chooseHop(state, t) : undefined;
          const events = tickUpdate(state, t, hop);
          handleEvents(events);
        }
        lastTick = currentTick;
      }

      render(canvasRef.current, state, elapsed / TICK_MS);
      if (state.gameOver) restartAt = now + 1500;
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopMusic();
    };
  }, []);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />;
}
