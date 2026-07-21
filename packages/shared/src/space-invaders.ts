/**
 * Space Invaders is real-time action, not a discrete-move game like
 * tic-tac-toe, so there's no practical way for the server to replay a
 * submission move-by-move and derive the outcome itself (see GitHub issue
 * #2's discussion of this trade-off). The server instead does a sanity-bound
 * check on the raw (score, elapsedMs) pair — see
 * packages/backend/src/games/spaceInvaders.ts for that validation — and
 * this function is the one place both sides agree on how a raw arcade score
 * converts into normalized points for the cross-game leaderboard.
 *
 * A raw score can run into the thousands, which would dwarf every other
 * game's points on the global leaderboard, so it's scaled down by a flat
 * factor rather than used directly.
 */
const POINTS_PER_SCORE_UNIT = 1 / 25;

export function pointsForScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
