import { createInitialState, tickUpdate, TICK_MS, type Direction, type FroggerMove, type GameEvent, type GameState } from '@arcade/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { render, WIDTH, HEIGHT } from './render';
import { ensureAudio, sfx } from './sound';
import styles from './Frogger.module.scss';

type Status = 'ready' | 'playing' | 'gameover';

interface ScoreResponse {
  score: number;
  points: number;
}

interface FinalResult {
  moves: FroggerMove[];
  finalTick: number;
}

export function Frogger() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const movesRef = useRef<FroggerMove[]>([]);
  const lastTickRef = useRef(-1);
  const startTimeRef = useRef(0);
  const gameOverHandledRef = useRef(false);
  const statusRef = useRef<Status>('ready');

  const [status, setStatus] = useState<Status>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);

  const submitMutation = useMutation({
    mutationFn: (payload: FinalResult) => api.post<ScoreResponse>('/games/frogger/scores', payload),
  });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleEvents = useCallback((events: GameEvent[]) => {
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
  }, []);

  const processTick = useCallback((targetTick: number, hop?: Direction): GameEvent[] => {
    const events: GameEvent[] = [];
    for (let t = lastTickRef.current + 1; t <= targetTick; t++) {
      const tickEvents = tickUpdate(stateRef.current, t, t === targetTick ? hop : undefined);
      events.push(...tickEvents);
      if (stateRef.current.gameOver) break;
    }
    lastTickRef.current = targetTick;
    return events;
  }, []);

  const afterTick = useCallback((tick: number) => {
    setScore(stateRef.current.score);
    setLives(stateRef.current.lives);
    setLevel(stateRef.current.level);
    render(canvasRef.current, stateRef.current, tick);
    if (stateRef.current.gameOver && !gameOverHandledRef.current) {
      gameOverHandledRef.current = true;
      setFinalResult({ moves: movesRef.current.slice(), finalTick: lastTickRef.current });
      setStatus('gameover');
    }
  }, []);

  useEffect(() => {
    if (status !== 'playing') return undefined;

    let raf = 0;

    function loop(now: number) {
      const elapsed = now - startTimeRef.current;
      const currentTick = Math.floor(elapsed / TICK_MS);
      if (currentTick > lastTickRef.current) {
        const events = processTick(currentTick);
        handleEvents(events);
      }
      afterTick(currentTick);
      if (stateRef.current.gameOver) return;
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, processTick, afterTick, handleEvents]);

  useEffect(() => {
    if (finalResult) {
      submitMutation.mutate(finalResult);
    }
    // Only fire once per finished game, when finalResult is first set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalResult]);

  const hop = useCallback(
    (dir: Direction) => {
      if (statusRef.current !== 'playing') return;
      const elapsed = performance.now() - startTimeRef.current;
      let tick = Math.floor(elapsed / TICK_MS);
      if (tick <= lastTickRef.current) tick = lastTickRef.current + 1;
      const events = processTick(tick, dir);
      movesRef.current.push({ tick, dir });
      handleEvents(events);
      afterTick(tick);
    },
    [processTick, afterTick, handleEvents],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') hop('up');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') hop('down');
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') hop('left');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') hop('right');
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hop]);

  const startGame = useCallback(() => {
    ensureAudio();
    stateRef.current = createInitialState();
    movesRef.current = [];
    lastTickRef.current = -1;
    gameOverHandledRef.current = false;
    startTimeRef.current = performance.now();
    setScore(0);
    setLives(3);
    setLevel(1);
    setFinalResult(null);
    submitMutation.reset();
    render(canvasRef.current, stateRef.current, 0);
    setStatus('playing');
  }, [submitMutation]);

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Lives: {lives}</span>
      </div>

      <div className={styles.screenWrap}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />

        {status !== 'playing' && (
          <div className={styles.overlay}>
            {status === 'ready' && (
              <>
                <p>Arrow keys / WASD to hop. Ride the logs, dodge the cars.</p>
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

      <div className={styles.dpad} aria-hidden="true">
        <span />
        <button type="button" onClick={() => hop('up')}>
          &#9650;
        </button>
        <span />
        <button type="button" onClick={() => hop('left')}>
          &#9664;
        </button>
        <button type="button" onClick={() => hop('down')}>
          &#9660;
        </button>
        <button type="button" onClick={() => hop('right')}>
          &#9654;
        </button>
      </div>
    </div>
  );
}
