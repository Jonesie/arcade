/**
 * Same normalization approach as space-invaders.ts/galaga.ts: real-time
 * action with no move list to replay, so the raw score is only
 * sanity-bound server-side (see packages/backend/src/games/asteroids.ts),
 * then scaled down by a flat factor here so it doesn't dwarf other games'
 * points on the cross-game leaderboard.
 */
const POINTS_PER_SCORE_UNIT = 1 / 25;

export function pointsForAsteroidsScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
