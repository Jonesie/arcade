import { pointsForScore } from '@arcade/shared';

export interface SpaceInvadersSubmission {
  score: number;
  elapsedMs: number;
}

export type SubmissionVerdict = { valid: true; points: number } | { valid: false; reason: string };

// Unlike tic-tac-toe, this is real-time action — there's no move list to
// replay and independently verify. Instead this is a sanity-bound check on
// the raw (score, elapsedMs) pair: generous enough not to reject genuine
// play, but enough to stop a trivial "POST an enormous score instantly"
// submission. A deliberately lower-trust v1 (see GitHub issue #2) — worth
// revisiting if this ever needs to be airtight.
const MIN_ELAPSED_MS_FOR_ANY_SCORE = 3000;
const MAX_SCORE = 99990;
const MAX_SCORE_PER_SECOND = 40;

export function validateSpaceInvadersSubmission(submission: SpaceInvadersSubmission): SubmissionVerdict {
  const { score, elapsedMs } = submission;

  if (!Number.isInteger(score) || score < 0) {
    return { valid: false, reason: 'Score must be a non-negative integer' };
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return { valid: false, reason: 'Invalid elapsed time' };
  }
  if (score > 0 && elapsedMs < MIN_ELAPSED_MS_FOR_ANY_SCORE) {
    return { valid: false, reason: 'Game ended implausibly quickly for that score' };
  }
  if (score > MAX_SCORE) {
    return { valid: false, reason: 'Score exceeds the maximum plausible value' };
  }
  const maxPlausibleScore = (elapsedMs / 1000) * MAX_SCORE_PER_SECOND;
  if (score > maxPlausibleScore) {
    return { valid: false, reason: 'Score is implausible for the time played' };
  }

  return { valid: true, points: pointsForScore(score) };
}
