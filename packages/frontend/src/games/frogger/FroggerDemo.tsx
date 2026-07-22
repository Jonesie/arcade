import { createInitialState, tickUpdate, TICK_MS, type GameEvent, type GameState } from '@arcade/shared';
import { useEffect, useRef } from 'react';
import styles from '../attract/DemoCanvas.module.scss';
import { render, WIDTH, HEIGHT } from './render';
import { ensureAudio, sfx } from './sound';

/**
 * Frogger's tick-based `tickUpdate(state, tick, hop?)` doesn't fit the
 * continuous dt/input shape the other games' engines share, so this is a
 * bespoke loop rather than going through EngineDemo. The "bot" is
 * deliberately dumb — hop up every tick, no danger-avoidance — since a
 * frog that dies and respawns every few seconds is exactly the kind of
 * short, self-resetting clip attract mode wants.
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
          const events = tickUpdate(state, t, t === currentTick ? 'up' : undefined);
          handleEvents(events);
        }
        lastTick = currentTick;
      }

      render(canvasRef.current, state, elapsed / TICK_MS);
      if (state.gameOver) restartAt = now + 1500;
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />;
}
