/**
 * Same normalization approach as the other real-time action games
 * (space-invaders.ts/galaga.ts/asteroids.ts): sanity-bound server-side
 * check on the raw score (see packages/backend/src/games/defender.ts),
 * then scaled down by a flat factor so it doesn't dwarf other games'
 * points on the cross-game leaderboard.
 */
const POINTS_PER_SCORE_UNIT = 1 / 25;

export function pointsForDefenderScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
