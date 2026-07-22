/**
 * Unlike the shooters (space-invaders, galaga), Frogger's obstacles move on
 * a fully deterministic schedule — no randomness anywhere in this file —
 * so the server can replay a submitted move list tick-by-tick and derive
 * the outcome itself, the same way tic-tac-toe's `replayGame` works. This
 * is the "proof it out on a second game" case referenced in GitHub issue
 * #1: `replayFrogger` here is the single source of truth used both to
 * drive live gameplay (packages/frontend/src/games/frogger) and to
 * independently validate a submission server-side
 * (packages/backend/src/games/frogger.ts) — the client's own idea of its
 * score is never trusted, or even sent; the server derives it from the
 * move list alone.
 */

export const COLS = 13;
export const ROWS = 14;
export const TICK_MS = 200;

export const START_ROW = 13;
export const BANK_ROW = 1;
export const MEDIAN_ROW = 8;
export const HOME_ROW = 0;
export const CENTER_COL = 6;

export const HOME_SLOT_COLS = [1, 4, 6, 8, 11];

export type Direction = 'up' | 'down' | 'left' | 'right';
export type LaneKind = 'road' | 'river';

export interface LaneConfig {
  row: number;
  kind: LaneKind;
  dir: 1 | -1;
  /** Ticks per 1-cell shift at level 1 — lower is faster. */
  baseStep: number;
  pattern: boolean[];
  patternLen: number;
}

export const LANES: LaneConfig[] = [
  { row: 12, kind: 'road', dir: -1, baseStep: 6, pattern: [true, false, false, false, false], patternLen: 5 },
  { row: 11, kind: 'road', dir: 1, baseStep: 5, pattern: [true, false, false, false], patternLen: 4 },
  {
    row: 10,
    kind: 'road',
    dir: -1,
    baseStep: 7,
    pattern: [true, true, false, false, false, false],
    patternLen: 6,
  },
  { row: 9, kind: 'road', dir: 1, baseStep: 4, pattern: [true, false, false, false, false, false], patternLen: 6 },
  { row: 7, kind: 'river', dir: 1, baseStep: 5, pattern: [true, true, true, false, false], patternLen: 5 },
  { row: 6, kind: 'river', dir: -1, baseStep: 6, pattern: [true, true, false, false, false, false], patternLen: 6 },
  { row: 5, kind: 'river', dir: 1, baseStep: 4, pattern: [true, true, true, false, false, false], patternLen: 6 },
  { row: 4, kind: 'river', dir: -1, baseStep: 7, pattern: [true, true, false, false, false], patternLen: 5 },
  {
    row: 3,
    kind: 'river',
    dir: 1,
    baseStep: 5,
    pattern: [true, true, true, true, false, false, false],
    patternLen: 7,
  },
  { row: 2, kind: 'river', dir: -1, baseStep: 6, pattern: [true, true, false, false, false, false], patternLen: 6 },
];

const LANE_BY_ROW = new Map(LANES.map((l) => [l.row, l]));

export function laneAt(row: number): LaneConfig | undefined {
  return LANE_BY_ROW.get(row);
}

/** Ticks-per-shift for a lane at a given level — speeds up 1 tick per level, floor of 1. */
export function effectiveStep(lane: LaneConfig, level: number): number {
  return Math.max(1, lane.baseStep - (level - 1));
}

function laneShift(lane: LaneConfig, tick: number, level: number): number {
  return Math.floor(tick / effectiveStep(lane, level)) * lane.dir;
}

export function isObstacleAt(lane: LaneConfig, col: number, tick: number, level: number): boolean {
  const shift = laneShift(lane, tick, level);
  const idx = (((col - shift) % lane.patternLen) + lane.patternLen) % lane.patternLen;
  return lane.pattern[idx];
}

const LIFE_TICKS_LIMIT = 125; // 25s at TICK_MS=200
const POINTS_PER_ROW = 10;
const POINTS_PER_SLOT = 50;
const POINTS_PER_LEVEL_CLEAR = 1000;

export interface GameState {
  frogRow: number;
  frogCol: number;
  lives: number;
  score: number;
  level: number;
  slotsFilled: boolean[];
  lifeStartTick: number;
  bestRowThisLife: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'hop' }
  | { type: 'forwardProgress'; points: number }
  | { type: 'slotFilled'; points: number }
  | { type: 'levelClear'; points: number }
  | { type: 'died'; cause: 'hit' | 'drowned' | 'offscreen' | 'hedge' | 'timeout' }
  | { type: 'gameOver' };

export function createInitialState(): GameState {
  return {
    frogRow: START_ROW,
    frogCol: CENTER_COL,
    lives: 3,
    score: 0,
    level: 1,
    slotsFilled: HOME_SLOT_COLS.map(() => false),
    lifeStartTick: 0,
    bestRowThisLife: START_ROW,
    gameOver: false,
  };
}

function respawn(state: GameState, tick: number): void {
  state.frogRow = START_ROW;
  state.frogCol = CENTER_COL;
  state.lifeStartTick = tick;
  state.bestRowThisLife = START_ROW;
}

function kill(state: GameState, events: GameEvent[], cause: 'hit' | 'drowned' | 'offscreen' | 'hedge' | 'timeout', tick: number): GameEvent[] {
  events.push({ type: 'died', cause });
  state.lives -= 1;
  if (state.lives <= 0) {
    state.gameOver = true;
    events.push({ type: 'gameOver' });
  } else {
    respawn(state, tick);
  }
  return events;
}

/**
 * Advances the simulation by one tick, optionally applying a hop input at
 * this exact tick. Mutates `state` in place and returns transient events
 * (used for sound/UI on the client; ignored by the server, which only
 * cares about the final state). Pure aside from that mutation — no
 * randomness, no wall-clock reads — so calling this for ticks
 * 0..N in order always produces the same result given the same inputs.
 */
export function tickUpdate(state: GameState, tick: number, hop?: Direction): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];

  if (hop) {
    let { frogRow, frogCol } = state;
    if (hop === 'up') frogRow -= 1;
    if (hop === 'down') frogRow += 1;
    if (hop === 'left') frogCol -= 1;
    if (hop === 'right') frogCol += 1;

    if (frogRow >= 0 && frogRow <= START_ROW && frogCol >= 0 && frogCol < COLS) {
      state.frogRow = frogRow;
      state.frogCol = frogCol;
      events.push({ type: 'hop' });
      if (frogRow < state.bestRowThisLife) {
        state.bestRowThisLife = frogRow;
        state.score += POINTS_PER_ROW;
        events.push({ type: 'forwardProgress', points: POINTS_PER_ROW });
      }
    }
  }

  const lane = laneAt(state.frogRow);
  if (lane && lane.kind === 'river' && tick % effectiveStep(lane, state.level) === 0) {
    state.frogCol += lane.dir;
  }

  if (state.frogCol < 0 || state.frogCol >= COLS) {
    return kill(state, events, 'offscreen', tick);
  }

  const currentLane = laneAt(state.frogRow);
  if (currentLane) {
    const occupied = isObstacleAt(currentLane, state.frogCol, tick, state.level);
    if (currentLane.kind === 'road' && occupied) {
      return kill(state, events, 'hit', tick);
    }
    if (currentLane.kind === 'river' && !occupied) {
      return kill(state, events, 'drowned', tick);
    }
  }

  if (state.frogRow === HOME_ROW) {
    const slotIndex = HOME_SLOT_COLS.indexOf(state.frogCol);
    if (slotIndex === -1 || state.slotsFilled[slotIndex]) {
      return kill(state, events, 'hedge', tick);
    }
    state.slotsFilled[slotIndex] = true;
    state.score += POINTS_PER_SLOT;
    events.push({ type: 'slotFilled', points: POINTS_PER_SLOT });
    respawn(state, tick);
    if (state.slotsFilled.every(Boolean)) {
      state.level += 1;
      state.slotsFilled = HOME_SLOT_COLS.map(() => false);
      state.score += POINTS_PER_LEVEL_CLEAR;
      events.push({ type: 'levelClear', points: POINTS_PER_LEVEL_CLEAR });
    }
    return events;
  }

  if (tick - state.lifeStartTick > LIFE_TICKS_LIMIT) {
    return kill(state, events, 'timeout', tick);
  }

  return events;
}

export interface FroggerMove {
  tick: number;
  dir: Direction;
}

export type FroggerReplayResult = { valid: true; score: number } | { valid: false; reason: string };

const MAX_TICKS = 20000; // ~66 minutes at TICK_MS=200 — generous, but bounded

export function replayFrogger(moves: FroggerMove[], finalTick: number): FroggerReplayResult {
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!Number.isInteger(move.tick) || move.tick < 0) {
      return { valid: false, reason: 'Invalid move tick' };
    }
    if (i > 0 && move.tick <= moves[i - 1].tick) {
      return { valid: false, reason: 'Move ticks must strictly increase' };
    }
  }
  if (!Number.isInteger(finalTick) || finalTick < 0) {
    return { valid: false, reason: 'Invalid final tick' };
  }
  if (moves.length > 0 && finalTick < moves[moves.length - 1].tick) {
    return { valid: false, reason: 'Final tick precedes the last move' };
  }
  if (finalTick > MAX_TICKS) {
    return { valid: false, reason: 'Game exceeds the maximum allowed length' };
  }

  const state = createInitialState();
  let moveIndex = 0;

  for (let tick = 0; tick <= finalTick; tick++) {
    const hop = moveIndex < moves.length && moves[moveIndex].tick === tick ? moves[moveIndex].dir : undefined;
    if (hop) moveIndex++;
    tickUpdate(state, tick, hop);
    if (state.gameOver) {
      if (tick !== finalTick) {
        return { valid: false, reason: 'Game ended before the reported final tick' };
      }
      break;
    }
  }

  if (!state.gameOver) {
    return { valid: false, reason: 'Game had not ended by the reported final tick' };
  }
  if (moveIndex !== moves.length) {
    return { valid: false, reason: 'Submitted moves were not fully consumed' };
  }

  return { valid: true, score: state.score };
}

const POINTS_PER_SCORE_UNIT = 1 / 25;

export function pointsForFroggerScore(score: number): number {
  return Math.max(0, Math.floor(score * POINTS_PER_SCORE_UNIT));
}
