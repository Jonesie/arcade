import { pointsFor, replayGame, resultToOutcome, type Difficulty, type Move } from '@arcade/shared';

const HUMAN_PLAYER = 'X';

export interface TicTacToeSubmission {
  difficulty: Difficulty;
  moves: Move[];
}

export type SubmissionVerdict =
  | { valid: true; outcome: 'win' | 'draw' | 'loss'; points: number }
  | { valid: false; reason: string };

/**
 * Server-side source of truth for a tic-tac-toe game: replays the client's
 * claimed moves and derives the outcome + points itself. The client's own
 * claimed result/score is never trusted directly.
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

  return { valid: true, outcome, points: pointsFor(submission.difficulty, outcome) };
}
