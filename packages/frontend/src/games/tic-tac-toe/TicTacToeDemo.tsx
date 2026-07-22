import { bestMove, checkWinner, emptyBoard, isBoardFull, type Board, type Player } from '@arcade/shared';
import { useEffect, useState } from 'react';
import styles from './TicTacToe.module.scss';

const MOVE_DELAY_MS = 700;
const ROUND_END_PAUSE_MS = 1500;

/**
 * Self-play: the same `bestMove` AI (see shared/tic-tac-toe.ts) plays both
 * sides at 'hard' difficulty, looping — no real asset or separate replay
 * format needed, same reasoning as the games/attract demos.
 */
export function TicTacToeDemo() {
  const [board, setBoard] = useState<Board>(emptyBoard());

  useEffect(() => {
    let cancelled = false;
    let currentBoard = emptyBoard();
    let currentTurn: Player = 'X';
    let timer: ReturnType<typeof setTimeout>;

    function step() {
      if (cancelled) return;
      const winner = checkWinner(currentBoard);
      if (winner || isBoardFull(currentBoard)) {
        timer = setTimeout(() => {
          if (cancelled) return;
          currentBoard = emptyBoard();
          currentTurn = 'X';
          setBoard(currentBoard);
          timer = setTimeout(step, MOVE_DELAY_MS);
        }, ROUND_END_PAUSE_MS);
        return;
      }
      const index = bestMove(currentBoard, currentTurn, 'hard');
      currentBoard = currentBoard.slice();
      currentBoard[index] = currentTurn;
      currentTurn = currentTurn === 'X' ? 'O' : 'X';
      setBoard(currentBoard);
      timer = setTimeout(step, MOVE_DELAY_MS);
    }

    timer = setTimeout(step, MOVE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={styles.board}>
      {board.map((cell, i) => (
        <div key={i} className={styles.cell}>
          {cell}
        </div>
      ))}
    </div>
  );
}
