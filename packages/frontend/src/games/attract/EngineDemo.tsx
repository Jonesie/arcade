import { useEffect, useRef } from 'react';

/**
 * Generic attract-mode player for any game whose engine follows the
 * `update(state, input, dt)` / `render(canvas, state)` shape (Space
 * Invaders, Galaga, Asteroids, Defender all match this — see each game's
 * engine.ts). A `computeInput` heuristic stands in for the player, sound
 * is never touched (demo playback is silent regardless of the site's mute
 * state), and the whole thing quietly restarts a few seconds after the
 * bot's run ends — an imperfect bot dying and looping is normal attract-
 * mode behavior, not a bug to fix.
 *
 * Frogger (tick-based, not a continuous dt/input loop) and Tic-Tac-Toe
 * (turn-based, not a canvas loop at all) don't fit this shape and have
 * their own bespoke demo components instead.
 */
export interface EngineDemoProps<TState, TInput> {
  width: number;
  height: number;
  createInitialState: () => TState;
  update: (state: TState, input: TInput, dt: number) => unknown;
  render: (canvas: HTMLCanvasElement | null, state: TState) => void;
  computeInput: (state: TState) => TInput;
  isGameOver: (state: TState) => boolean;
  className?: string;
  restartDelayMs?: number;
}

export function EngineDemo<TState, TInput>({
  width,
  height,
  createInitialState,
  update,
  render,
  computeInput,
  isGameOver,
  className,
  restartDelayMs = 1500,
}: EngineDemoProps<TState, TInput>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let state = createInitialState();
    let last = performance.now();
    let restartAt: number | null = null;

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (restartAt != null) {
        if (now >= restartAt) {
          state = createInitialState();
          restartAt = null;
        }
      } else {
        update(state, computeInput(state), dt);
        if (isGameOver(state)) {
          restartAt = now + restartDelayMs;
        }
      }

      render(canvasRef.current, state);
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // Runs once per mount — a fresh game per slide is exactly what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
