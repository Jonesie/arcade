/**
 * Same normalization approach as space-invaders.ts: a raw arcade score runs
 * into the thousands, so it's scaled down by a flat factor rather than used
 * directly for the cross-game leaderboard.
 */
const POINTS_PER_SCORE_UNIT = 1 / 25;

export function pointsForGalagaScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
