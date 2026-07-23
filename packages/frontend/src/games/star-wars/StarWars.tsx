import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { createInitialState, HEIGHT, START_SHIELD, update, WIDTH, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';
import styles from './StarWars.module.scss';

type Status = 'ready' | 'playing' | 'gameover';

interface ScoreResponse {
  score: number;
  points: number;
}

const EMPTY_INPUT: GameInput = { left: false, right: false, up: false, down: false, fire: false };

export function StarWars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<GameInput>({ ...EMPTY_INPUT });
  const elapsedMsRef = useRef(0);

  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shield, setShield] = useState(START_SHIELD);
  const [finalScore, setFinalScore] = useState<{ score: number; elapsedMs: number } | null>(null);

  const submitMutation = useMutation({
    mutationFn: (payload: { score: number; elapsedMs: number }) =>
      api.post<ScoreResponse>('/games/star-wars/scores', payload),
  });

  useEffect(() => {
    if (status !== 'playing') return undefined;

    let raf = 0;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsedMsRef.current += dt * 1000;

      const events = update(stateRef.current, inputRef.current, dt);
      for (const event of events) {
        switch (event.type) {
          case 'fire':
            sfx.fire();
            break;
          case 'turretDestroyed':
            sfx.turretDestroyed();
            break;
          case 'enemyBoltFired':
            sfx.enemyBoltFired();
            break;
          case 'playerHit':
            sfx.playerHit();
            break;
          case 'portHit':
            sfx.portHit();
            break;
          case 'gameOver':
            sfx.gameOver();
            break;
        }
      }

      setScore(stateRef.current.score);
      setLevel(stateRef.current.level);
      setShield(stateRef.current.shield);
      render(canvasRef.current, stateRef.current);

      if (stateRef.current.gameOver) {
        setFinalScore({ score: stateRef.current.score, elapsedMs: elapsedMsRef.current });
        setStatus('gameover');
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopMusic();
    };
  }, [status]);

  useEffect(() => {
    if (finalScore) {
      submitMutation.mutate(finalScore);
    }
    // Only fire once per finished game, when finalScore is first set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalScore]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') inputRef.current.down = true;
      if (e.key === ' ') inputRef.current.fire = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') inputRef.current.down = false;
      if (e.key === ' ') inputRef.current.fire = false;
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = useCallback(() => {
    ensureAudio();
    startMusic();
    stateRef.current = createInitialState();
    elapsedMsRef.current = 0;
    inputRef.current = { ...EMPTY_INPUT };
    setScore(0);
    setLevel(1);
    setShield(START_SHIELD);
    setFinalScore(null);
    submitMutation.reset();
    setStatus('playing');
  }, [submitMutation]);

  function press(key: keyof GameInput, value: boolean) {
    inputRef.current[key] = value;
  }

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>
          Shield:
          <span className={styles.shieldBar}>
            <span className={styles.shieldFill} style={{ width: `${shield}%` }} />
          </span>
        </span>
      </div>

      <div className={styles.screenWrap}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />

        {status !== 'playing' && (
          <div className={styles.overlay}>
            {status === 'ready' && (
              <>
                <p>Arrows/WASD to steer, Space to fire. Thread the exhaust port at the end of the trench.</p>
                <button type="button" className={styles.primary} onClick={startGame}>
                  Start
                </button>
              </>
            )}
            {status === 'gameover' && (
              <>
                <p className={styles.gameOverTitle}>Shield down</p>
                <p>Final score: {score}</p>
                {submitMutation.isSuccess && <p>+{submitMutation.data.points} points</p>}
                {submitMutation.isError && (
                  <p className={styles.error}>
                    {submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Could not save this game.'}
                  </p>
                )}
                <button type="button" className={styles.primary} onClick={startGame}>
                  Play again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.controls} aria-hidden="true">
        <div className={styles.dpad}>
          <button
            type="button"
            onPointerDown={() => press('up', true)}
            onPointerUp={() => press('up', false)}
            onPointerLeave={() => press('up', false)}
          >
            &#9650;
          </button>
          <button
            type="button"
            onPointerDown={() => press('left', true)}
            onPointerUp={() => press('left', false)}
            onPointerLeave={() => press('left', false)}
          >
            &#9664;
          </button>
          <button
            type="button"
            onPointerDown={() => press('right', true)}
            onPointerUp={() => press('right', false)}
            onPointerLeave={() => press('right', false)}
          >
            &#9654;
          </button>
          <button
            type="button"
            onPointerDown={() => press('down', true)}
            onPointerUp={() => press('down', false)}
            onPointerLeave={() => press('down', false)}
          >
            &#9660;
          </button>
        </div>
        <button
          type="button"
          className={styles.fireButton}
          onPointerDown={() => press('fire', true)}
          onPointerUp={() => press('fire', false)}
          onPointerLeave={() => press('fire', false)}
        >
          Fire
        </button>
      </div>
    </div>
  );
}
