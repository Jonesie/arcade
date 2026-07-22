import { useEffect, useRef } from 'react';

/**
 * Generic attract-mode player for any game whose engine follows the
 * `update(state, input, dt)` / `render(canvas, state)` shape (Space
 * Invaders, Galaga, Asteroids, Defender all match this — see each game's
 * engine.ts). A `computeInput` heuristic stands in for the player, and the
 * whole thing quietly restarts a few seconds after the bot's run ends —
 * an imperfect bot dying and looping is normal attract-mode behavior, not
 * a bug to fix.
 *
 * Sound plays (per the user's request), same as real play: `onFrame` gets
 * the events `update()` returned each tick so the per-game demo wrapper
 * can dispatch its own sfx exactly like its real component does, and
 * `onStart`/`onStop` cover one-time setup/teardown (ensureAudio, looping
 * music, a continuous thrust drone). Every sound function already checks
 * the site's mute state itself, so the existing music button just works.
 *
 * Frogger (tick-based, not a continuous dt/input loop) and Tic-Tac-Toe
 * (turn-based, not a canvas loop, and silent even in real play) don't fit
 * this shape and have their own bespoke demo components instead.
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
  onStart?: () => void;
  onStop?: () => void;
  onFrame?: (state: TState, input: TInput, events: unknown) => void;
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
  onStart,
  onStop,
  onFrame,
}: EngineDemoProps<TState, TInput>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let state = createInitialState();
    let last = performance.now();
    let restartAt: number | null = null;

    onStart?.();

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (restartAt != null) {
        if (now >= restartAt) {
          state = createInitialState();
          restartAt = null;
        }
      } else {
        const input = computeInput(state);
        const events = update(state, input, dt);
        onFrame?.(state, input, events);
        if (isGameOver(state)) {
          restartAt = now + restartDelayMs;
        }
      }

      render(canvasRef.current, state);
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      onStop?.();
    };
    // Runs once per mount — a fresh game per slide is exactly what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
