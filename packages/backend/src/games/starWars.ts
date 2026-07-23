import { pointsForStarWarsScore } from '@arcade/shared';

export interface StarWarsSubmission {
  score: number;
  elapsedMs: number;
}

export type SubmissionVerdict = { valid: true; points: number } | { valid: false; reason: string };

// Same trade-off as the other real-time games (space-invaders.ts,
// asteroids.ts, donkeyKong.ts): continuous action, no move list to
// replay, so this is a sanity-bound check on (score, elapsedMs) rather
// than an independent replay. See GitHub issue #16's anti-cheat note.
const MIN_ELAPSED_MS_FOR_ANY_SCORE = 3000;
const MAX_SCORE = 999990;
const MAX_SCORE_PER_SECOND = 90;

export function validateStarWarsSubmission(submission: StarWarsSubmission): SubmissionVerdict {
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

  return { valid: true, points: pointsForStarWarsScore(score) };
}
