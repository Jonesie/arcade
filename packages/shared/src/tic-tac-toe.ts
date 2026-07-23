/**
 * Pure tic-tac-toe game logic shared by the frontend (board rendering + AI
 * opponent) and the backend (replaying a submitted game to validate it
 * before awarding points — see packages/backend/src/games/ticTacToe.ts).
 */

export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Outcome = 'win' | 'draw' | 'loss';

/** Result of a finished game, from no particular player's perspective. `null` means still in progress. */
export type GameResult = Player | 'draw' | null;

export interface Move {
  index: number;
  player: Player;
  /**
   * Speed Mode only (GitHub issue #10): how long this move's player spent
   * on their turn, in ms — 0 for every move made outside Speed Mode, and
   * always 0 for the very first move of a game (the chess-clock-style
   * per-player timers don't start until that first move is made, so
   * there's nothing to have timed yet). Self-reported by the client, same
   * deliberately lower-trust v1 as the other real-time games' elapsedMs
   * (see backend/src/games/spaceInvaders.ts) — the replay only verifies
   * move legality, not wall-clock time.
   */
  elapsedMs?: number;
}

const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function emptyBoard(): Board {
  return Array<Cell>(9).fill(null);
}

export function checkWinner(board: Board): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function getResult(board: Board): GameResult {
  const winner = checkWinner(board);
  if (winner) return winner;
  if (isBoardFull(board)) return 'draw';
  return null;
}

/** Maps a finished game's result to an outcome from the given player's point of view. `null` if unfinished. */
export function resultToOutcome(result: GameResult, perspective: Player): Outcome | null {
  if (result === null) return null;
  if (result === 'draw') return 'draw';
  return result === perspective ? 'win' : 'loss';
}

export interface ReplayResult {
  board: Board;
  result: GameResult;
  valid: boolean;
  reason?: string;
}

/**
 * Replays a claimed sequence of moves from an empty board, enforcing legal
 * play (alternating turns starting with X, no occupied-cell moves, no moves
 * after the game is already decided). Used server-side so a client can never
 * simply assert a result/score — only a legally-played game counts.
 */
export function replayGame(moves: Move[]): ReplayResult {
  const board = emptyBoard();
  let expected: Player = 'X';

  if (moves.length === 0) {
    return { board, result: null, valid: false, reason: 'No moves submitted' };
  }

  for (const move of moves) {
    if (getResult(board) !== null) {
      return { board, result: getResult(board), valid: false, reason: 'Move made after game was already over' };
    }
    if (!Number.isInteger(move.index) || move.index < 0 || move.index > 8) {
      return { board, result: null, valid: false, reason: `Illegal cell index ${move.index}` };
    }
    if (board[move.index] !== null) {
      return { board, result: null, valid: false, reason: `Cell ${move.index} already occupied` };
    }
    if (move.player !== expected) {
      return { board, result: null, valid: false, reason: `Expected ${expected} to move` };
    }
    board[move.index] = move.player;
    expected = expected === 'X' ? 'O' : 'X';
  }

  return { board, result: getResult(board), valid: true };
}

interface MinimaxOutcome {
  score: number;
  index: number | null;
}

function minimax(board: Board, currentPlayer: Player, aiPlayer: Player, depth = 0): MinimaxOutcome {
  const result = getResult(board);
  if (result !== null) {
    if (result === 'draw') return { score: 0, index: null };
    return { score: result === aiPlayer ? 10 - depth : depth - 10, index: null };
  }

  const other: Player = currentPlayer === 'X' ? 'O' : 'X';
  let best: MinimaxOutcome | null = null;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    const next = board.slice();
    next[i] = currentPlayer;
    const { score } = minimax(next, other, aiPlayer, depth + 1);
    const isBetter =
      best === null || (currentPlayer === aiPlayer ? score > best.score : score < best.score);
    if (isBetter) {
      best = { score, index: i };
    }
  }

  // best is never null here: getResult(board) === null guarantees at least one empty cell.
  return best as MinimaxOutcome;
}

/** Picks the AI's next move. Easy plays randomly; medium plays optimally most of the time; hard is always optimal. */
export function bestMove(board: Board, aiPlayer: Player, difficulty: Difficulty): number {
  const legalMoves = board.reduce<number[]>((acc, cell, i) => {
    if (cell === null) acc.push(i);
    return acc;
  }, []);

  if (legalMoves.length === 0) {
    throw new Error('bestMove called on a full board');
  }

  const randomMove = () => legalMoves[Math.floor(Math.random() * legalMoves.length)];

  if (difficulty === 'easy') return randomMove();
  if (difficulty === 'medium' && Math.random() < 0.35) return randomMove();

  const { index } = minimax(board, aiPlayer, aiPlayer);
  return index ?? randomMove();
}

const POINTS: Record<Difficulty, Record<Outcome, number>> = {
  easy: { win: 10, draw: 2, loss: 0 },
  medium: { win: 25, draw: 5, loss: 0 },
  hard: { win: 50, draw: 10, loss: 0 },
};

export function pointsFor(difficulty: Difficulty, outcome: Outcome): number {
  return POINTS[difficulty][outcome];
}

/** Sums a player's own per-move `elapsedMs` (Speed Mode's chess-clock timings) across a move list. */
export function sumPlayerElapsedMs(moves: Move[], player: Player): number {
  return moves.reduce((total, move) => (move.player === player ? total + (move.elapsedMs ?? 0) : total), 0);
}

// Speed Mode scoring (GitHub issue #10): "lower time = higher score for
// win and higher time = negative points on lose" — layered on top of the
// normal per-difficulty points rather than replacing them for a win, but
// fully replacing the (always-zero) loss points with a time-scaled penalty.
const SPEED_WIN_BONUS_MAX = 20;
const SPEED_WIN_BONUS_DECAY_PER_S = 1;
const SPEED_LOSS_PENALTY_PER_S = 1;
const SPEED_LOSS_PENALTY_MAX = 50;

export function pointsForSpeed(difficulty: Difficulty, outcome: Outcome, humanElapsedMs: number): number {
  const seconds = Math.max(0, humanElapsedMs) / 1000;
  if (outcome === 'draw') return pointsFor(difficulty, outcome);
  if (outcome === 'win') {
    const bonus = Math.max(0, Math.round(SPEED_WIN_BONUS_MAX - seconds * SPEED_WIN_BONUS_DECAY_PER_S));
    return pointsFor(difficulty, outcome) + bonus;
  }
  const penalty = Math.min(SPEED_LOSS_PENALTY_MAX, Math.round(seconds * SPEED_LOSS_PENALTY_PER_S));
  return -penalty;
}
