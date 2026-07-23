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
import { useAuth } from '../../auth/AuthContext';
import { Fireworks } from './Fireworks';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';
import styles from './TicTacToe.module.scss';

const HUMAN: Player = 'X';
const AI: Player = 'O';

type Mode = 'ai' | 'hotseat';

interface ScoreResponse {
  outcome: 'win' | 'draw' | 'loss';
  points: number;
}

// A different random bright hue pair each game (GitHub issue #9) — the
// second hue is offset 120-240deg from the first so X and O always stay
// clearly distinct regardless of what the first roll picks.
function randomMarkColors(): Record<Player, string> {
  const hue1 = Math.floor(Math.random() * 360);
  const hue2 = (hue1 + 120 + Math.floor(Math.random() * 120)) % 360;
  return { X: `hsl(${hue1}, 85%, 60%)`, O: `hsl(${hue2}, 85%, 60%)` };
}

export function TicTacToe() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [board, setBoard] = useState<BoardState>(emptyBoard());
  const [moves, setMoves] = useState<Move[]>([]);
  const [turn, setTurn] = useState<Player>('X');
  const [submitted, setSubmitted] = useState(false);
  const [markColors, setMarkColors] = useState(randomMarkColors);

  const result = getResult(board);
  // "You" is only meaningful vs. the computer, where the human is always X.
  const humanLost = mode === 'ai' && result === AI;
  const isWin = result !== null && result !== 'draw';
  const showCelebration = isWin && !humanLost;

  const submitMutation = useMutation({
    mutationFn: (payload: { difficulty: Difficulty; moves: Move[] }) =>
      api.post<ScoreResponse>('/games/tic-tac-toe/scores', payload),
  });

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setMoves([]);
    setTurn('X');
    setSubmitted(false);
    setMarkColors(randomMarkColors());
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
    else if (humanLost) sfx.lose();
    else sfx.win();
    // humanLost derives from result/mode, both already tracked; re-running
    // this per result change (not per mode change alone) is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  let statusText = '';
  if (result === 'draw') {
    statusText = "It's a draw! 🤝";
  } else if (result !== null) {
    if (mode === 'ai') {
      statusText = humanLost ? 'You lose 😢' : 'You win! 🎉';
    } else {
      const winnerName = result === 'X' ? (user?.displayName ?? 'Player 1') : 'Player 2';
      statusText = `${winnerName} wins! 🎉`;
    }
  }

  return (
    <div className={styles.game}>
      {showCelebration && <Fireworks />}
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
            style={cell ? { color: markColors[cell] } : undefined}
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
          {statusText}
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
