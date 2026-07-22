import {
  bestMove,
  emptyBoard,
  getResult,
  type Board as BoardState,
  type Difficulty,
  type Move,
  type Player,
} from '@arcade/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';
import styles from './TicTacToe.module.scss';

const HUMAN: Player = 'X';
const AI: Player = 'O';

type Mode = 'ai' | 'hotseat';

interface ScoreResponse {
  outcome: 'win' | 'draw' | 'loss';
  points: number;
}

export function TicTacToe() {
  const [mode, setMode] = useState<Mode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [board, setBoard] = useState<BoardState>(emptyBoard());
  const [moves, setMoves] = useState<Move[]>([]);
  const [turn, setTurn] = useState<Player>('X');
  const [submitted, setSubmitted] = useState(false);

  const result = getResult(board);

  const submitMutation = useMutation({
    mutationFn: (payload: { difficulty: Difficulty; moves: Move[] }) =>
      api.post<ScoreResponse>('/games/tic-tac-toe/scores', payload),
  });

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setMoves([]);
    setTurn('X');
    setSubmitted(false);
    submitMutation.reset();
    // submitMutation identity changes every render; only reset on mode/difficulty switches or explicit restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reset();
  }, [mode, difficulty, reset]);

  // Unlike the other games, there's no "Start" button gesture to hang
  // ensureAudio() off — this board is playable the instant the page
  // loads. The click that navigated here (a home-page tile, or a nav
  // link) still counts as the page's user-activation gesture since this
  // is a client-side route change, not a fresh page load, so starting
  // the music on mount works in practice.
  useEffect(() => {
    ensureAudio();
    startMusic();
    return () => stopMusic();
  }, []);

  useEffect(() => {
    if (result === null) return;
    if (result === 'draw') sfx.draw();
    else sfx.win();
  }, [result]);

  useEffect(() => {
    if (result === null || submitted || mode !== 'ai' || moves.length === 0) return;
    setSubmitted(true);
    submitMutation.mutate({ difficulty, moves });
    // Runs once per finished game; moves/difficulty/submitMutation intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (result !== null || mode !== 'ai' || turn !== AI) return;
    // Compute the move from `board` directly (not a setBoard updater) and
    // apply setBoard/setMoves/setTurn as separate, plain calls. A setState
    // updater function must be pure — React (Strict Mode, in dev) may invoke
    // it more than once, which previously caused the AI's move+bookkeeping
    // to run twice per turn and desync the submitted move list.
    const timer = setTimeout(() => {
      const index = bestMove(board, AI, difficulty);
      const next = board.slice();
      next[index] = AI;
      setBoard(next);
      setMoves((m) => [...m, { index, player: AI }]);
      setTurn(HUMAN);
      sfx.o();
    }, 400);
    return () => clearTimeout(timer);
  }, [board, turn, mode, difficulty, result]);

  function handleCellClick(index: number) {
    if (result !== null || board[index] !== null) return;
    if (mode === 'ai' && turn !== HUMAN) return;

    const player = turn;
    const next = board.slice();
    next[index] = player;
    setBoard(next);
    setMoves((prev) => [...prev, { index, player }]);
    setTurn(player === 'X' ? 'O' : 'X');
    if (player === 'X') sfx.x();
    else sfx.o();
  }

  return (
    <div className={styles.game}>
      <div className={styles.controls}>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="ai">Vs. Computer</option>
            <option value="hotseat">2 Player (local)</option>
          </select>
        </label>
        {mode === 'ai' && (
          <label>
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        )}
        <button onClick={reset}>Restart</button>
      </div>

      <div className={styles.board}>
        {board.map((cell, i) => (
          <button
            key={i}
            className={styles.cell}
            onClick={() => handleCellClick(i)}
            disabled={cell !== null || result !== null}
            aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {result !== null && (
        <p className={styles.status}>
          {result === 'draw' ? "It's a draw!" : `${result} wins!`}
          {mode === 'ai' && submitMutation.isSuccess && (
            <>
              {' '}
              — {submitMutation.data.outcome} recorded, +{submitMutation.data.points} points
            </>
          )}
        </p>
      )}

      {submitMutation.isError && (
        <p className={styles.error}>
          {submitMutation.error instanceof ApiError
            ? submitMutation.error.message
            : 'Could not save this game.'}
        </p>
      )}
    </div>
  );
}
