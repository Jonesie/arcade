import {
  pointsFor,
  pointsForSpeed,
  replayGame,
  resultToOutcome,
  sumPlayerElapsedMs,
  type Difficulty,
  type Move,
} from '@arcade/shared';

const HUMAN_PLAYER = 'X';

export interface TicTacToeSubmission {
  difficulty: Difficulty;
  moves: Move[];
  speedMode?: boolean;
}

export type SubmissionVerdict =
  | { valid: true; outcome: 'win' | 'draw' | 'loss'; points: number }
  | { valid: false; reason: string };

/**
 * Server-side source of truth for a tic-tac-toe game: replays the client's
 * claimed moves and derives the outcome + points itself. The client's own
 * claimed result/score is never trusted directly. In Speed Mode (GitHub
 * issue #10), points are derived from the human player's own summed
 * per-move `elapsedMs` instead of the flat per-difficulty table.
 */
export function validateTicTacToeSubmission(submission: TicTacToeSubmission): SubmissionVerdict {
  const { result, valid, reason } = replayGame(submission.moves);
  if (!valid) {
    return { valid: false, reason: reason ?? 'Illegal move sequence' };
  }

  const outcome = resultToOutcome(result, HUMAN_PLAYER);
  if (outcome === null) {
    return { valid: false, reason: 'Submitted game has not finished' };
  }

  if (submission.speedMode) {
    const humanElapsedMs = sumPlayerElapsedMs(submission.moves, HUMAN_PLAYER);
    return { valid: true, outcome, points: pointsForSpeed(submission.difficulty, outcome, humanElapsedMs) };
  }

  return { valid: true, outcome, points: pointsFor(submission.difficulty, outcome) };
}
