import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { createInitialState, HEIGHT, update, WIDTH, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, isSoundEnabled, setSoundEnabled, sfx } from './sound';
import styles from './Galaga.module.scss';

type Status = 'ready' | 'playing' | 'gameover';

interface ScoreResponse {
  score: number;
  points: number;
}

export function Galaga() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<GameInput>({ left: false, right: false, fire: false });
  const elapsedMsRef = useRef(0);

  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [muted, setMuted] = useState(!isSoundEnabled());
  const [finalScore, setFinalScore] = useState<{ score: number; elapsedMs: number } | null>(null);

  const submitMutation = useMutation({
    mutationFn: (payload: { score: number; elapsedMs: number }) => api.post<ScoreResponse>('/games/galaga/scores', payload),
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
          case 'shoot':
            sfx.shoot();
            break;
          case 'enemyHit':
            sfx.enemyHit();
            break;
          case 'enemyKilled':
            sfx.enemyKilled();
            break;
          case 'enemyFire':
            sfx.enemyFire();
            break;
          case 'playerHit':
            sfx.playerHit();
            break;
          case 'waveClear':
            sfx.waveClear();
            break;
          case 'gameOver':
            sfx.gameOver();
            break;
        }
      }

      setScore(stateRef.current.score);
      setWave(stateRef.current.wave);
      setLives(stateRef.current.lives);
      render(canvasRef.current, stateRef.current);

      if (stateRef.current.gameOver) {
        setFinalScore({ score: stateRef.current.score, elapsedMs: elapsedMsRef.current });
        setStatus('gameover');
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.fire = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputRef.current.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputRef.current.fire = false;
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
    stateRef.current = createInitialState();
    elapsedMsRef.current = 0;
    inputRef.current = { left: false, right: false, fire: false };
    setScore(0);
    setWave(1);
    setLives(3);
    setFinalScore(null);
    submitMutation.reset();
    setStatus('playing');
  }, [submitMutation]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setSoundEnabled(!next);
  }

  function press(key: keyof GameInput, value: boolean) {
    inputRef.current[key] = value;
  }

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span>Score: {score}</span>
        <span>Wave: {wave}</span>
        <span>Lives: {lives}</span>
        <button type="button" onClick={toggleMute} aria-pressed={muted}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>

      <div className={styles.screenWrap}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />

        {status !== 'playing' && (
          <div className={styles.overlay}>
            {status === 'ready' && (
              <>
                <p>Arrow keys / A-D to move, Space to fire. Watch for divers.</p>
                <button type="button" className={styles.primary} onClick={startGame}>
                  Start
                </button>
              </>
            )}
            {status === 'gameover' && (
              <>
                <p className={styles.gameOverTitle}>Game over</p>
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

      <div className={styles.touchControls} aria-hidden="true">
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
          onPointerDown={() => press('fire', true)}
          onPointerUp={() => press('fire', false)}
          onPointerLeave={() => press('fire', false)}
        >
          Fire
        </button>
        <button
          type="button"
          onPointerDown={() => press('right', true)}
          onPointerUp={() => press('right', false)}
          onPointerLeave={() => press('right', false)}
        >
          &#9654;
        </button>
      </div>
    </div>
  );
}
