/**
 * Same normalization approach as asteroids.ts/space-invaders.ts: real-time
 * action with no move list to replay, so the raw score is only
 * sanity-bound server-side (see packages/backend/src/games/donkeyKong.ts),
 * then scaled down by a flat factor here so it doesn't dwarf other games'
 * points on the cross-game leaderboard.
 */
const POINTS_PER_SCORE_UNIT = 1 / 20;

export function pointsForDonkeyKongScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
