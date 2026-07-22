import { pointsForFroggerScore, replayFrogger, type FroggerMove } from '@arcade/shared';

export type SubmissionVerdict = { valid: true; score: number; points: number } | { valid: false; reason: string };

/**
 * Unlike tic-tac-toe/space-invaders/galaga, the client doesn't submit a
 * score (or a claimed outcome) at all here — just the raw move list and
 * the tick it says the game ended on. `replayFrogger` (packages/shared)
 * derives the score entirely from replaying that deterministically; there
 * is nothing for the client to lie about beyond the inputs themselves,
 * which get validated move-by-move. See GitHub issue #1.
 */
export function validateFroggerSubmission(moves: FroggerMove[], finalTick: number): SubmissionVerdict {
  const result = replayFrogger(moves, finalTick);
  if (!result.valid) {
    return { valid: false, reason: result.reason };
  }
  return { valid: true, score: result.score, points: pointsForFroggerScore(result.score) };
}
