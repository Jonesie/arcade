/**
 * Pure game simulation — no canvas, no DOM, no React (see the asteroids/
 * defender engines for the same pattern). GitHub issue #15's MVP scope:
 * just the 25m girders-and-barrels stage, looped with escalating
 * difficulty on each clear rather than progressing through the classic
 * arcade's other three stages (a later follow-up, per the issue).
 *
 * Vertical traversal between girders only ever happens via ladders —
 * jumping is a short in-place hop for dodging a barrel, not a way to
 * cross between platforms (matching the original: you can't jump-gap
 * between girders any more than the real cabinet lets you). That keeps
 * the physics to two small pieces: a sine-arc hop for the player, and
 * real gravity for barrels falling between girders.
 */

export const WIDTH = 440;
export const HEIGHT = 520;

const MARGIN_X = 20;
const X1 = MARGIN_X;
const X2 = WIDTH - MARGIN_X;

export const PLAYER_RADIUS = 10;
export const BARREL_RADIUS = 9;
const HAMMER_PICKUP_RADIUS = 12;

const PLAYER_SPEED = 92;
const CLIMB_SPEED = 72;
const JUMP_DURATION_S = 0.45;
const JUMP_HEIGHT = 26;
const JUMP_OVER_RANGE = 15;
const LADDER_SNAP_TOLERANCE = 14;
const GRAVITY = 520;

const BARREL_SPEED_BASE = 58;
const BARREL_SPEED_PER_LEVEL = 7;
const BARREL_SPEED_MAX = 130;
const BARREL_SPAWN_INTERVAL_BASE = 3.1;
const BARREL_SPAWN_INTERVAL_MIN = 1.3;
const BARREL_SPAWN_INTERVAL_PER_LEVEL = 0.25;
const LADDER_DROP_CHANCE = 0.3;
const MAX_BARRELS = 14;

const HAMMER_DURATION_S = 8;
const APE_THROW_ANIM_S = 0.35;

const JUMP_OVER_POINTS = 100;
const BARREL_SMASH_POINTS = 300;
const HAMMER_PICKUP_POINTS = 50;
const STAGE_CLEAR_BONUS = 1000;

export const START_LIVES = 3;

interface Girder {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Horizontal direction a barrel rolls in while on this girder. */
  downhill: 1 | -1;
}

function girderYAt(girder: Girder, x: number): number {
  const t = (x - girder.x1) / (girder.x2 - girder.x1);
  return girder.y1 + (girder.y2 - girder.y1) * t;
}

// Bottom to top: flat ground, four alternating slopes, flat top platform.
export const GIRDERS: Girder[] = [
  { x1: X1, y1: 480, x2: X2, y2: 480, downhill: 1 },
  { x1: X1, y1: 386, x2: X2, y2: 414, downhill: 1 },
  { x1: X1, y1: 334, x2: X2, y2: 306, downhill: -1 },
  { x1: X1, y1: 226, x2: X2, y2: 254, downhill: 1 },
  { x1: X1, y1: 174, x2: X2, y2: 146, downhill: -1 },
  { x1: X1, y1: 80, x2: X2, y2: 80, downhill: -1 },
];
export const TOP_GIRDER_INDEX = GIRDERS.length - 1;

interface Ladder {
  x: number;
  /** Connects GIRDERS[gapIndex] (below) and GIRDERS[gapIndex + 1] (above). */
  gapIndex: number;
}

export const LADDERS: Ladder[] = [
  { x: 100, gapIndex: 0 },
  { x: 340, gapIndex: 0 },
  { x: 160, gapIndex: 1 },
  { x: 380, gapIndex: 1 },
  { x: 100, gapIndex: 2 },
  { x: 340, gapIndex: 2 },
  { x: 160, gapIndex: 3 },
  { x: 380, gapIndex: 3 },
  { x: 100, gapIndex: 4 },
  { x: 340, gapIndex: 4 },
];

function laddersForGap(gapIndex: number): Ladder[] {
  return LADDERS.filter((l) => l.gapIndex === gapIndex);
}

export interface HammerPickup {
  x: number;
  girderIndex: number;
  taken: boolean;
}

const HAMMER_SPOTS: { x: number; girderIndex: number }[] = [
  { x: 250, girderIndex: 2 },
  { x: 200, girderIndex: 4 },
];

export const APE_POS = { x: 380, y: GIRDERS[TOP_GIRDER_INDEX].y2 };
export const GIRL_POS = { x: 60, y: GIRDERS[TOP_GIRDER_INDEX].y1 };
const PLAYER_START = { x: 60, y: GIRDERS[0].y1 };

export interface Barrel {
  id: number;
  x: number;
  y: number;
  girderIndex: number;
  falling: boolean;
  fallTargetGirderIndex: number;
  vy: number;
}

export interface Player {
  x: number;
  y: number;
  girderIndex: number;
  onLadderGapIndex: number | null;
  facing: 1 | -1;
  jumping: boolean;
  jumpT: number;
  hammerS: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
}

export interface GameState {
  player: Player;
  barrels: Barrel[];
  hammers: HammerPickup[];
  score: number;
  lives: number;
  level: number;
  spawnTimer: number;
  jumpClearedIds: Set<number>;
  gameOver: boolean;
  stageCleared: boolean;
  stageClearTimer: number;
  /** Counts down after each barrel spawn — render.ts uses it to show the
   * ape's throwing pose in sync with the actual spawn, not a guess. */
  apeThrowS: number;
}

export type GameEvent =
  | { type: 'jump' }
  | { type: 'hammerPickup' }
  | { type: 'barrelSmash' }
  | { type: 'jumpOver' }
  | { type: 'playerHit' }
  | { type: 'stageClear' }
  | { type: 'gameOver' };

let idCounter = 0;

function barrelSpeedForLevel(level: number): number {
  return Math.min(BARREL_SPEED_MAX, BARREL_SPEED_BASE + (level - 1) * BARREL_SPEED_PER_LEVEL);
}

function spawnIntervalForLevel(level: number): number {
  return Math.max(BARREL_SPAWN_INTERVAL_MIN, BARREL_SPAWN_INTERVAL_BASE - (level - 1) * BARREL_SPAWN_INTERVAL_PER_LEVEL);
}

function spawnBarrel(): Barrel {
  const girder = GIRDERS[TOP_GIRDER_INDEX];
  return {
    id: idCounter++,
    x: APE_POS.x,
    y: girderYAt(girder, APE_POS.x),
    girderIndex: TOP_GIRDER_INDEX,
    falling: false,
    fallTargetGirderIndex: -1,
    vy: 0,
  };
}

function createPlayer(): Player {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    girderIndex: 0,
    onLadderGapIndex: null,
    facing: 1,
    jumping: false,
    jumpT: 0,
    hammerS: 0,
  };
}

export function createInitialState(): GameState {
  idCounter = 0;
  return {
    player: createPlayer(),
    barrels: [],
    hammers: HAMMER_SPOTS.map((h) => ({ ...h, taken: false })),
    score: 0,
    lives: START_LIVES,
    level: 1,
    spawnTimer: 1.2,
    jumpClearedIds: new Set(),
    gameOver: false,
    stageCleared: false,
    stageClearTimer: 0,
    apeThrowS: 0,
  };
}

function resetForNextAttempt(state: GameState, keepScore: boolean): void {
  state.player = createPlayer();
  state.barrels = [];
  state.hammers = HAMMER_SPOTS.map((h) => ({ ...h, taken: false }));
  state.spawnTimer = 1.2;
  state.jumpClearedIds = new Set();
  state.apeThrowS = 0;
  if (!keepScore) state.score = 0;
}

function playerJumpOffset(player: Player): number {
  if (!player.jumping) return 0;
  return JUMP_HEIGHT * Math.sin(Math.PI * Math.min(1, player.jumpT / JUMP_DURATION_S));
}

export function playerRenderY(player: Player): number {
  return player.y - playerJumpOffset(player);
}

function updatePlayer(state: GameState, input: GameInput, dt: number, events: GameEvent[]): void {
  const player = state.player;
  if (player.hammerS > 0) player.hammerS = Math.max(0, player.hammerS - dt);

  if (player.onLadderGapIndex !== null) {
    const gapIndex = player.onLadderGapIndex;
    const below = GIRDERS[gapIndex];
    const above = GIRDERS[gapIndex + 1];
    const yBottom = girderYAt(below, player.x);
    const yTop = girderYAt(above, player.x);
    if (input.up) player.y -= CLIMB_SPEED * dt;
    if (input.down) player.y += CLIMB_SPEED * dt;

    if (player.y <= yTop) {
      player.y = girderYAt(above, player.x);
      player.girderIndex = gapIndex + 1;
      player.onLadderGapIndex = null;
    } else if (player.y >= yBottom) {
      player.y = girderYAt(below, player.x);
      player.girderIndex = gapIndex;
      player.onLadderGapIndex = null;
    }
  } else {
    const girder = GIRDERS[player.girderIndex];

    if (input.left) {
      player.x = Math.max(girder.x1, player.x - PLAYER_SPEED * dt);
      player.facing = -1;
    }
    if (input.right) {
      player.x = Math.min(girder.x2, player.x + PLAYER_SPEED * dt);
      player.facing = 1;
    }
    player.y = girderYAt(girder, player.x);

    if (player.jumping) {
      player.jumpT += dt;
      if (player.jumpT >= JUMP_DURATION_S) {
        player.jumping = false;
        player.jumpT = 0;
        state.jumpClearedIds.clear();
      }
    } else if (input.jump) {
      player.jumping = true;
      player.jumpT = 0;
      state.jumpClearedIds.clear();
      events.push({ type: 'jump' });
    } else if (input.up || input.down) {
      const wantAbove = input.up;
      const gapIndex = wantAbove ? player.girderIndex : player.girderIndex - 1;
      if (gapIndex >= 0 && gapIndex < TOP_GIRDER_INDEX + 1) {
        const ladder = laddersForGap(gapIndex).find((l) => Math.abs(l.x - player.x) < LADDER_SNAP_TOLERANCE);
        if (ladder) {
          player.onLadderGapIndex = gapIndex;
          player.x = ladder.x;
        }
      }
    }

    for (const hammer of state.hammers) {
      if (hammer.taken || hammer.girderIndex !== player.girderIndex) continue;
      if (Math.abs(hammer.x - player.x) <= HAMMER_PICKUP_RADIUS) {
        hammer.taken = true;
        player.hammerS = HAMMER_DURATION_S;
        state.score += HAMMER_PICKUP_POINTS;
        events.push({ type: 'hammerPickup' });
      }
    }
  }

  if (player.girderIndex === TOP_GIRDER_INDEX && !state.stageCleared) {
    state.stageCleared = true;
    state.stageClearTimer = 1.4;
    state.score += STAGE_CLEAR_BONUS;
    events.push({ type: 'stageClear' });
  }
}

function updateBarrels(state: GameState, dt: number): void {
  const speed = barrelSpeedForLevel(state.level);

  for (const barrel of state.barrels) {
    if (barrel.falling) {
      barrel.vy += GRAVITY * dt;
      barrel.y += barrel.vy * dt;
      const target = GIRDERS[barrel.fallTargetGirderIndex];
      const targetY = girderYAt(target, barrel.x);
      if (barrel.y >= targetY) {
        barrel.y = targetY;
        barrel.girderIndex = barrel.fallTargetGirderIndex;
        barrel.falling = false;
        barrel.vy = 0;
      }
      continue;
    }

    const girder = GIRDERS[barrel.girderIndex];
    const prevX = barrel.x;
    let nextX = barrel.x + girder.downhill * speed * dt;
    const reachedEdge = girder.downhill > 0 ? nextX >= girder.x2 : nextX <= girder.x1;
    nextX = Math.max(girder.x1, Math.min(girder.x2, nextX));

    if (barrel.girderIndex > 0) {
      const ladders = laddersForGap(barrel.girderIndex - 1);
      for (const ladder of ladders) {
        const crossed = (prevX - ladder.x) * (nextX - ladder.x) <= 0;
        if (crossed && Math.random() < LADDER_DROP_CHANCE) {
          barrel.falling = true;
          barrel.fallTargetGirderIndex = barrel.girderIndex - 1;
          barrel.vy = 0;
          barrel.x = ladder.x;
          barrel.y = girderYAt(girder, ladder.x);
          break;
        }
      }
    }
    if (barrel.falling) continue;

    if (reachedEdge) {
      if (barrel.girderIndex === 0) {
        barrel.girderIndex = -1; // despawn marker
      } else {
        barrel.falling = true;
        barrel.fallTargetGirderIndex = barrel.girderIndex - 1;
        barrel.vy = 0;
      }
      continue;
    }

    barrel.x = nextX;
    barrel.y = girderYAt(girder, barrel.x);
  }

  state.barrels = state.barrels.filter((b) => b.girderIndex !== -1);
}

function handleCollisions(state: GameState, events: GameEvent[]): void {
  const player = state.player;
  const py = playerRenderY(player);
  const smashed = new Set<number>();

  for (const barrel of state.barrels) {
    const dist = Math.hypot(player.x - barrel.x, py - barrel.y);
    const overlapping = dist <= PLAYER_RADIUS + BARREL_RADIUS;

    if (overlapping) {
      if (player.hammerS > 0) {
        smashed.add(barrel.id);
        state.score += BARREL_SMASH_POINTS;
        events.push({ type: 'barrelSmash' });
      } else {
        state.lives -= 1;
        events.push({ type: 'playerHit' });
        if (state.lives <= 0) {
          state.gameOver = true;
          events.push({ type: 'gameOver' });
        } else {
          resetForNextAttempt(state, true);
        }
        return;
      }
    } else if (player.jumping && !state.jumpClearedIds.has(barrel.id) && Math.abs(player.x - barrel.x) < JUMP_OVER_RANGE) {
      state.jumpClearedIds.add(barrel.id);
      state.score += JUMP_OVER_POINTS;
      events.push({ type: 'jumpOver' });
    }
  }

  if (smashed.size > 0) {
    state.barrels = state.barrels.filter((b) => !smashed.has(b.id));
  }
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];
  if (state.apeThrowS > 0) state.apeThrowS = Math.max(0, state.apeThrowS - dt);

  if (state.stageCleared) {
    state.stageClearTimer -= dt;
    if (state.stageClearTimer <= 0) {
      state.level += 1;
      state.stageCleared = false;
      resetForNextAttempt(state, true);
    }
    return events;
  }

  updatePlayer(state, input, dt, events);
  if (state.gameOver || state.stageCleared) return events;

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.barrels.length < MAX_BARRELS) {
    state.barrels.push(spawnBarrel());
    state.spawnTimer = spawnIntervalForLevel(state.level);
    state.apeThrowS = APE_THROW_ANIM_S;
  }

  updateBarrels(state, dt);
  if (!state.gameOver) handleCollisions(state, events);

  return events;
}
