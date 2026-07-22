import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { createInitialState, HEIGHT, update, WIDTH, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, setThrust, sfx, startMusic, stopMusic, stopThrust } from './sound';
import styles from './Defender.module.scss';

type Status = 'ready' | 'playing' | 'gameover';

interface ScoreResponse {
  score: number;
  points: number;
}

export function Defender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<GameInput>({ left: false, right: false, up: false, down: false, fire: false, smartBomb: false });
  const pendingSmartBombRef = useRef(false);
  const elapsedMsRef = useRef(0);

  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [humanoids, setHumanoids] = useState(0);
  const [smartBombs, setSmartBombs] = useState(0);
  const [finalScore, setFinalScore] = useState<{ score: number; elapsedMs: number } | null>(null);

  const submitMutation = useMutation({
    mutationFn: (payload: { score: number; elapsedMs: number }) => api.post<ScoreResponse>('/games/defender/scores', payload),
  });

  useEffect(() => {
    if (status !== 'playing') return undefined;

    let raf = 0;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsedMsRef.current += dt * 1000;

      const input = inputRef.current;
      input.smartBomb = pendingSmartBombRef.current;
      pendingSmartBombRef.current = false;

      const events = update(stateRef.current, input, dt);
      for (const event of events) {
        switch (event.type) {
          case 'shoot':
            sfx.shoot();
            break;
          case 'enemyKilled':
            sfx.enemyKilled();
            break;
          case 'humanoidGrabbed':
            sfx.humanoidGrabbed();
            break;
          case 'humanoidRescued':
            sfx.humanoidRescued();
            break;
          case 'humanoidLost':
            sfx.humanoidLost();
            break;
          case 'smartBomb':
            sfx.smartBomb();
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

      setThrust(input.left || input.right || input.up || input.down);

      setScore(stateRef.current.score);
      setWave(stateRef.current.wave);
      setLives(stateRef.current.lives);
      setSmartBombs(stateRef.current.smartBombs);
      setHumanoids(stateRef.current.humanoids.filter((h) => h.state !== 'dead').length);
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
      stopThrust();
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
      if ((e.key === 'b' || e.key === 'B') && !e.repeat) pendingSmartBombRef.current = true;
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
    inputRef.current = { left: false, right: false, up: false, down: false, fire: false, smartBomb: false };
    pendingSmartBombRef.current = false;
    setScore(0);
    setWave(1);
    setLives(3);
    setHumanoids(stateRef.current.humanoids.length);
    setSmartBombs(stateRef.current.smartBombs);
    setFinalScore(null);
    submitMutation.reset();
    setStatus('playing');
  }, [submitMutation]);

  function press(key: keyof Omit<GameInput, 'smartBomb'>, value: boolean) {
    inputRef.current[key] = value;
  }

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span>Score: {score}</span>
        <span>Wave: {wave}</span>
        <span>Lives: {lives}</span>
        <span>Humanoids: {humanoids}</span>
        <span>Bombs: {smartBombs}</span>
      </div>

      <div className={styles.screenWrap}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />

        {status !== 'playing' && (
          <div className={styles.overlay}>
            {status === 'ready' && (
              <>
                <p>Arrows/WASD to fly, Space to fire, B for a smart bomb.</p>
                <p>Shoot down Landers before they carry off a humanoid — or catch the falling humanoid to rescue it.</p>
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

      <div className={styles.controls} aria-hidden="true">
        <div className={styles.dpad}>
          <span />
          <button
            type="button"
            onPointerDown={() => press('up', true)}
            onPointerUp={() => press('up', false)}
            onPointerLeave={() => press('up', false)}
          >
            &#9650;
          </button>
          <span />
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
            onPointerDown={() => press('down', true)}
            onPointerUp={() => press('down', false)}
            onPointerLeave={() => press('down', false)}
          >
            &#9660;
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
        <div className={styles.actions}>
          <button
            type="button"
            onPointerDown={() => press('fire', true)}
            onPointerUp={() => press('fire', false)}
            onPointerLeave={() => press('fire', false)}
          >
            Fire
          </button>
          <button type="button" onClick={() => (pendingSmartBombRef.current = true)}>
            Bomb
          </button>
        </div>
      </div>
    </div>
  );
}
