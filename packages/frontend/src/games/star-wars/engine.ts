/**
 * Pure game simulation — no canvas, no DOM, no React (see the asteroids/
 * defender engines for the same pattern). GitHub issue #16's MVP scope:
 * just the trench run — dodge trench turrets and their fire, thread the
 * exhaust port at the end — not the open-space TIE fighter wave or the
 * surface-turret wave, which the issue calls out as later follow-ups.
 *
 * Everything lives in a simple (x, y, z) world: x/y are lateral position
 * within the trench cross-section, z is depth (large = far away, 0 = at
 * the player). Screen projection (in render.ts) divides by z, so
 * shrinking z reads as "approaching." The player doesn't itself move in
 * z — only steers laterally — matching a fixed-speed forward flight.
 */

export const WIDTH = 480;
export const HEIGHT = 360;

export const TRENCH_HALF_WIDTH = 150;
export const TRENCH_HALF_HEIGHT = 95;
export const FAR_Z = 3200;
const NEAR_Z = 60;
export const FOCAL = 260;

const PLAYER_MOVE_SPEED = 220;
const FIRE_COOLDOWN_S = 0.16;
const SHOT_SPEED = 2400;
// Split so tuning one doesn't fight the other: how close a bolt/turret
// needs to be to actually hurt the player vs. how forgiving the
// player's own aim is when shooting at a turret.
const PLAYER_HIT_RADIUS = 20;
const AIM_TOLERANCE = 34;
const SHOT_CROSS_TOLERANCE = 90;

const FORWARD_SPEED_BASE = 820;
const FORWARD_SPEED_PER_LEVEL = 55;
const FORWARD_SPEED_MAX = 1300;

const TURRET_SPAWN_INTERVAL_BASE = 1.3;
const TURRET_SPAWN_INTERVAL_MIN = 0.75;
const TURRET_SPAWN_INTERVAL_PER_LEVEL = 0.06;
const MAX_TURRETS = 7;
const TURRET_FIRE_MIN_Z = 500;
const TURRET_FIRE_MAX_Z = 2200;
const TURRET_FIRE_PROBABILITY = 0.35;
const BOLT_SPEED_BASE = 1500;
const BOLT_SPEED_PER_LEVEL = 40;

const SHIELD_MAX = 100;
const HIT_DAMAGE = 16;

export const TRENCH_LENGTH = 14000;
export const PORT_WINDOW = 1300;
export const PORT_RADIUS = 42;

const TURRET_POINTS = 80;
const PORT_HIT_BONUS = 1500;

export const START_SHIELD = SHIELD_MAX;

export interface Turret {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Decided once at spawn — not every turret shoots at the player. */
  willFire: boolean;
  hasFired: boolean;
}

export interface Bolt {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface Shot {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface Player {
  x: number;
  y: number;
  fireCooldownS: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export interface GameState {
  player: Player;
  turrets: Turret[];
  bolts: Bolt[];
  shots: Shot[];
  score: number;
  shield: number;
  level: number;
  distance: number;
  turretSpawnTimer: number;
  portActive: boolean;
  portHitFlashS: number;
  hitFlashS: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'fire' }
  | { type: 'turretDestroyed' }
  | { type: 'enemyBoltFired' }
  | { type: 'playerHit' }
  | { type: 'portHit' }
  | { type: 'runClear' }
  | { type: 'gameOver' };

let idCounter = 0;

function forwardSpeedForLevel(level: number): number {
  return Math.min(FORWARD_SPEED_MAX, FORWARD_SPEED_BASE + (level - 1) * FORWARD_SPEED_PER_LEVEL);
}

function turretSpawnIntervalForLevel(level: number): number {
  return Math.max(
    TURRET_SPAWN_INTERVAL_MIN,
    TURRET_SPAWN_INTERVAL_BASE - (level - 1) * TURRET_SPAWN_INTERVAL_PER_LEVEL,
  );
}

function boltSpeedForLevel(level: number): number {
  return BOLT_SPEED_BASE + (level - 1) * BOLT_SPEED_PER_LEVEL;
}

function randomTrenchX(): number {
  return (Math.random() * 2 - 1) * TRENCH_HALF_WIDTH * 0.8;
}

function randomTrenchY(): number {
  return (Math.random() * 2 - 1) * TRENCH_HALF_HEIGHT * 0.8;
}

function spawnTurret(): Turret {
  return {
    id: idCounter++,
    x: randomTrenchX(),
    y: randomTrenchY(),
    z: FAR_Z,
    willFire: Math.random() < TURRET_FIRE_PROBABILITY,
    hasFired: false,
  };
}

function createPlayer(): Player {
  return { x: 0, y: 0, fireCooldownS: 0 };
}

export function createInitialState(): GameState {
  idCounter = 0;
  return {
    player: createPlayer(),
    turrets: [],
    bolts: [],
    shots: [],
    score: 0,
    shield: START_SHIELD,
    level: 1,
    distance: 0,
    turretSpawnTimer: 0.6,
    portActive: false,
    portHitFlashS: 0,
    hitFlashS: 0,
    gameOver: false,
  };
}

function resetRun(state: GameState): void {
  state.player = createPlayer();
  state.turrets = [];
  state.bolts = [];
  state.shots = [];
  state.distance = 0;
  state.turretSpawnTimer = 0.6;
  state.portActive = false;
}

function updatePlayer(state: GameState, input: GameInput, dt: number, events: GameEvent[]): void {
  const player = state.player;

  if (input.left) player.x = Math.max(-TRENCH_HALF_WIDTH, player.x - PLAYER_MOVE_SPEED * dt);
  if (input.right) player.x = Math.min(TRENCH_HALF_WIDTH, player.x + PLAYER_MOVE_SPEED * dt);
  if (input.up) player.y = Math.max(-TRENCH_HALF_HEIGHT, player.y - PLAYER_MOVE_SPEED * dt);
  if (input.down) player.y = Math.min(TRENCH_HALF_HEIGHT, player.y + PLAYER_MOVE_SPEED * dt);

  if (player.fireCooldownS > 0) player.fireCooldownS = Math.max(0, player.fireCooldownS - dt);

  if (input.fire && player.fireCooldownS <= 0) {
    player.fireCooldownS = FIRE_COOLDOWN_S;
    events.push({ type: 'fire' });

    if (state.portActive && Math.abs(player.x) < PORT_RADIUS && Math.abs(player.y) < PORT_RADIUS) {
      state.score += PORT_HIT_BONUS;
      state.portActive = false;
      state.portHitFlashS = 0.6;
      events.push({ type: 'portHit' });
      events.push({ type: 'runClear' });
      state.level += 1;
      resetRun(state);
      return;
    }

    state.shots.push({ id: idCounter++, x: player.x, y: player.y, z: 0 });
  }
}

function updateTurretsAndBolts(state: GameState, dt: number, events: GameEvent[]): void {
  const forwardSpeed = forwardSpeedForLevel(state.level);
  const boltSpeed = boltSpeedForLevel(state.level);

  for (const turret of state.turrets) {
    turret.z -= forwardSpeed * dt;

    if (turret.willFire && !turret.hasFired && turret.z < TURRET_FIRE_MAX_Z && turret.z > TURRET_FIRE_MIN_Z) {
      turret.hasFired = true;
      state.bolts.push({ id: idCounter++, x: turret.x, y: turret.y, z: turret.z });
      events.push({ type: 'enemyBoltFired' });
    }
  }

  for (const bolt of state.bolts) {
    bolt.z -= boltSpeed * dt;
  }

  // Turrets/bolts reaching the player without being shot down.
  const survivedTurrets: Turret[] = [];
  for (const turret of state.turrets) {
    if (turret.z <= NEAR_Z) {
      if (Math.hypot(turret.x - state.player.x, turret.y - state.player.y) < PLAYER_HIT_RADIUS) {
        applyHit(state, events);
      }
      continue;
    }
    survivedTurrets.push(turret);
  }
  state.turrets = survivedTurrets;

  // A dodged bolt (reached NEAR_Z without overlapping the player) is
  // simply dropped — no penalty, no bonus, same as walking away clean.
  const survivedBolts: Bolt[] = [];
  for (const bolt of state.bolts) {
    if (bolt.z <= NEAR_Z) {
      if (Math.hypot(bolt.x - state.player.x, bolt.y - state.player.y) < PLAYER_HIT_RADIUS) {
        applyHit(state, events);
      }
      continue;
    }
    survivedBolts.push(bolt);
  }
  state.bolts = survivedBolts;
}

function applyHit(state: GameState, events: GameEvent[]): void {
  state.shield = Math.max(0, state.shield - HIT_DAMAGE);
  state.hitFlashS = 0.35;
  events.push({ type: 'playerHit' });
  if (state.shield <= 0) {
    state.gameOver = true;
    events.push({ type: 'gameOver' });
  }
}

function updateShots(state: GameState, dt: number, events: GameEvent[]): void {
  for (const shot of state.shots) {
    shot.z += SHOT_SPEED * dt;
  }
  state.shots = state.shots.filter((s) => s.z < FAR_Z + 200);

  const destroyedTurretIds = new Set<number>();
  const spentShotIds = new Set<number>();
  for (const shot of state.shots) {
    if (spentShotIds.has(shot.id)) continue;
    for (const turret of state.turrets) {
      if (destroyedTurretIds.has(turret.id)) continue;
      if (shot.z < turret.z || shot.z - turret.z > SHOT_CROSS_TOLERANCE) continue;
      if (Math.abs(shot.x - turret.x) > AIM_TOLERANCE || Math.abs(shot.y - turret.y) > AIM_TOLERANCE) continue;
      destroyedTurretIds.add(turret.id);
      spentShotIds.add(shot.id);
      state.score += TURRET_POINTS;
      events.push({ type: 'turretDestroyed' });
      break;
    }
  }
  if (destroyedTurretIds.size > 0) {
    state.turrets = state.turrets.filter((t) => !destroyedTurretIds.has(t.id));
    state.shots = state.shots.filter((s) => !spentShotIds.has(s.id));
  }
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];
  if (state.portHitFlashS > 0) state.portHitFlashS = Math.max(0, state.portHitFlashS - dt);
  if (state.hitFlashS > 0) state.hitFlashS = Math.max(0, state.hitFlashS - dt);

  updatePlayer(state, input, dt, events);
  if (state.gameOver) return events;
  // A run-clear (port hit) already resets everything inside updatePlayer.
  if (events.some((e) => e.type === 'runClear')) return events;

  const forwardSpeed = forwardSpeedForLevel(state.level);
  state.distance = Math.min(TRENCH_LENGTH, state.distance + forwardSpeed * dt);
  state.portActive = state.distance >= TRENCH_LENGTH - PORT_WINDOW;

  if (state.distance >= TRENCH_LENGTH) {
    // Ran out the clock without a hit — no bonus, but keep the game
    // moving rather than a hard fail.
    state.level += 1;
    resetRun(state);
    return events;
  }

  state.turretSpawnTimer -= dt;
  if (state.turretSpawnTimer <= 0 && state.turrets.length < MAX_TURRETS) {
    state.turrets.push(spawnTurret());
    state.turretSpawnTimer = turretSpawnIntervalForLevel(state.level);
  }

  updateTurretsAndBolts(state, dt, events);
  if (state.gameOver) return events;
  updateShots(state, dt, events);

  return events;
}
