/**
 * Pure game simulation — no canvas, no DOM, no React (same pattern as the
 * other games' engines). Defender's big structural differences from
 * Galaga/Space Invaders: the world scrolls and wraps horizontally (fly far
 * enough and you come back around to where you started), the ship
 * free-moves on both axes with real inertia instead of snapping along a
 * fixed lane, and the whole point isn't just racking up kills — enemies
 * try to grab humanoids off the ground and carry them off the top of the
 * screen, and protecting them is the actual game.
 *
 * Scope note (see GitHub issue #4): the original has several enemy types
 * (Landers, Bombers, Pods/Swarmers, Baiters) and a "mutant" reskin once
 * every humanoid is lost. This implements Landers (the core
 * grab-and-carry enemy, plus the shoot-them-down-and-catch-the-falling-
 * humanoid rescue) and Bombers (simple strafing bomb droppers) for
 * variety, and leans on escalating wave difficulty instead of the full
 * mutant transformation — the same kind of scope trim already taken on
 * Asteroids (no UFOs) and Galaga (invented dive patterns rather than the
 * real formation data).
 *
 * World-space vs screen-space: every entity's `x` is a *world* coordinate
 * in [0, WORLD_WIDTH), wrapped every update. The camera is centered on the
 * player, so rendering converts a world x to a screen x via `wrapDelta`
 * (the shortest signed distance around the loop) — that one function is
 * what makes objects near the wrap seam scroll smoothly into view from
 * the other edge instead of popping.
 */

export const WIDTH = 480;
export const HEIGHT = 360;
export const WORLD_WIDTH = WIDTH * 4;
export const GROUND_Y = HEIGHT - 24;

export const SHIP_W = 24;
export const SHIP_H = 12;
const SHIP_ACCEL = 480;
const SHIP_DRAG = 2.6;
const MAX_SHIP_SPEED = 260;
const MAX_SHIP_V_SPEED = 170;
const SHIP_MIN_Y = 20;
const SHIP_MAX_Y = GROUND_Y - 30;
const INVULN_S = 2;
const SHIP_HIT_RADIUS = 9;

const LASER_SPEED = 520;
const LASER_LIFE_S = 0.55;
const FIRE_COOLDOWN_S = 0.12;
const MAX_BULLETS = 6;

const HUMANOID_WALK_SPEED = 14;
const HUMANOID_FALL_SPEED = 85;
const CATCH_RADIUS_X = 20;
const CATCH_RADIUS_Y = 16;
const HUMANOID_RESCUE_POINTS = 500;
const START_HUMANOIDS = 6;
const MAX_HUMANOIDS = 9;

const LANDER_BASE_SPEED = 46;
const LANDER_RISE_SPEED = 66;
const LANDER_POINTS = 150;
const LANDER_HIT_RADIUS = 10;

const BOMBER_BASE_SPEED = 60;
const BOMBER_POINTS = 250;
const BOMBER_HIT_RADIUS = 11;
const BOMB_FALL_SPEED = 130;
const BOMB_INTERVAL_S = 2.2;
const BOMB_KILL_RADIUS = 14;

const SMART_BOMB_START = 3;
const KILLS_PER_WAVE_BASE = 8;

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  invulnS: number;
}

export type HumanoidState = 'walking' | 'grabbed' | 'falling' | 'dead';

export interface Humanoid {
  id: number;
  state: HumanoidState;
  x: number;
  y: number; // height above ground: 0 = on the ground, increases upward
  vx: number;
  turnTimer: number;
}

export type LanderState = 'seeking' | 'rising';

export interface Lander {
  id: number;
  kind: 'lander';
  x: number;
  y: number; // screen-space altitude, GROUND_Y-ish down to near the top
  state: LanderState;
  targetHumanoidId: number | null;
  carryingHumanoidId: number | null;
  speed: number;
}

export interface Bomber {
  id: number;
  kind: 'bomber';
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  bombTimer: number;
}

export type Enemy = Lander | Bomber;

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  life: number;
}

export interface Bomb {
  x: number;
  y: number;
  vy: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  /** One-shot: the caller should only set this true for the single update
   * call covering the button press, not for as long as it's held. */
  smartBomb: boolean;
}

export interface GameState {
  player: Player;
  bullets: Bullet[];
  bombs: Bomb[];
  enemies: Enemy[];
  humanoids: Humanoid[];
  smartBombs: number;
  score: number;
  lives: number;
  wave: number;
  waveKills: number;
  fireCooldown: number;
  spawnTimer: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'shoot' }
  | { type: 'enemyKilled'; points: number }
  | { type: 'humanoidGrabbed' }
  | { type: 'humanoidRescued'; points: number }
  | { type: 'humanoidLost' }
  | { type: 'smartBomb' }
  | { type: 'playerHit' }
  | { type: 'waveClear' }
  | { type: 'gameOver' };

let idCounter = 0;

export function wrapPos(x: number, width: number): number {
  let v = x % width;
  if (v < 0) v += width;
  return v;
}

/** Shortest signed distance from `a` to `b` around a loop of `width`. */
export function wrapDelta(a: number, b: number, width: number): number {
  let d = (b - a) % width;
  if (d > width / 2) d -= width;
  if (d < -width / 2) d += width;
  return d;
}

function randomWorldXAwayFrom(x: number, minDistance: number): number {
  let candidate = 0;
  do {
    candidate = Math.random() * WORLD_WIDTH;
  } while (Math.abs(wrapDelta(x, candidate, WORLD_WIDTH)) < minDistance);
  return candidate;
}

function spawnHumanoid(x?: number): Humanoid {
  return {
    id: idCounter++,
    state: 'walking',
    x: x ?? Math.random() * WORLD_WIDTH,
    y: 0,
    vx: Math.random() < 0.5 ? HUMANOID_WALK_SPEED : -HUMANOID_WALK_SPEED,
    turnTimer: 2 + Math.random() * 3,
  };
}

function spawnLander(playerX: number, waveMultiplier: number): Lander {
  return {
    id: idCounter++,
    kind: 'lander',
    x: randomWorldXAwayFrom(playerX, WIDTH * 0.6),
    y: GROUND_Y - 40,
    state: 'seeking',
    targetHumanoidId: null,
    carryingHumanoidId: null,
    speed: LANDER_BASE_SPEED * waveMultiplier,
  };
}

function spawnBomber(playerX: number, waveMultiplier: number): Bomber {
  return {
    id: idCounter++,
    kind: 'bomber',
    x: randomWorldXAwayFrom(playerX, WIDTH * 0.6),
    y: 50 + Math.random() * 80,
    dir: Math.random() < 0.5 ? 1 : -1,
    speed: BOMBER_BASE_SPEED * waveMultiplier,
    bombTimer: BOMB_INTERVAL_S * (0.5 + Math.random()),
  };
}

function waveMultiplierFor(wave: number): number {
  return 1 + (wave - 1) * 0.12;
}

function enemyTargetsFor(wave: number): { landers: number; bombers: number } {
  return { landers: Math.min(3 + Math.floor(wave / 2), 8), bombers: Math.min(1 + Math.floor((wave - 1) / 3), 4) };
}

export function createInitialState(): GameState {
  idCounter = 0;
  const player: Player = { x: WORLD_WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, facing: 1, invulnS: INVULN_S };
  const humanoids: Humanoid[] = [];
  for (let i = 0; i < START_HUMANOIDS; i++) {
    humanoids.push(spawnHumanoid((i / START_HUMANOIDS) * WORLD_WIDTH));
  }
  const targets = enemyTargetsFor(1);
  const enemies: Enemy[] = [];
  for (let i = 0; i < targets.landers; i++) enemies.push(spawnLander(player.x, 1));
  for (let i = 0; i < targets.bombers; i++) enemies.push(spawnBomber(player.x, 1));

  return {
    player,
    bullets: [],
    bombs: [],
    enemies,
    humanoids,
    smartBombs: SMART_BOMB_START,
    score: 0,
    lives: 3,
    wave: 1,
    waveKills: 0,
    fireCooldown: 0,
    spawnTimer: 1.5,
    gameOver: false,
  };
}

function livingHumanoidCount(state: GameState): number {
  return state.humanoids.filter((h) => h.state !== 'dead').length;
}

function nearestWalkingHumanoid(state: GameState, x: number): Humanoid | null {
  let best: Humanoid | null = null;
  let bestDist = Infinity;
  for (const h of state.humanoids) {
    if (h.state !== 'walking') continue;
    const dist = Math.abs(wrapDelta(x, h.x, WORLD_WIDTH));
    if (dist < bestDist) {
      bestDist = dist;
      best = h;
    }
  }
  return best;
}

function destroyEnemy(state: GameState, enemy: Enemy, events: GameEvent[], points: number): void {
  state.score += points;
  state.waveKills += 1;
  events.push({ type: 'enemyKilled', points });

  if (enemy.kind === 'lander' && enemy.carryingHumanoidId != null) {
    const humanoid = state.humanoids.find((h) => h.id === enemy.carryingHumanoidId);
    if (humanoid) {
      humanoid.state = 'falling';
    }
  }
  state.enemies = state.enemies.filter((e) => e !== enemy);
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];
  const player = state.player;
  const waveMult = waveMultiplierFor(state.wave);

  if (player.invulnS > 0) player.invulnS = Math.max(0, player.invulnS - dt);

  // Ship movement: acceleration + drag rather than a hard speed cap with no
  // momentum, so it coasts a little like the original rather than feeling
  // like it's on rails. Facing flips instantly on input, matching how the
  // original ship "flips" the moment you reverse direction even while
  // still coasting the old way.
  if (input.left) {
    player.vx -= SHIP_ACCEL * dt;
    player.facing = -1;
  }
  if (input.right) {
    player.vx += SHIP_ACCEL * dt;
    player.facing = 1;
  }
  if (input.up) player.vy -= SHIP_ACCEL * dt;
  if (input.down) player.vy += SHIP_ACCEL * dt;

  const drag = Math.exp(-SHIP_DRAG * dt);
  player.vx *= drag;
  player.vy *= drag;
  player.vx = Math.max(-MAX_SHIP_SPEED, Math.min(MAX_SHIP_SPEED, player.vx));
  player.vy = Math.max(-MAX_SHIP_V_SPEED, Math.min(MAX_SHIP_V_SPEED, player.vy));

  player.x = wrapPos(player.x + player.vx * dt, WORLD_WIDTH);
  player.y += player.vy * dt;
  if (player.y < SHIP_MIN_Y) {
    player.y = SHIP_MIN_Y;
    player.vy = 0;
  }
  if (player.y > SHIP_MAX_Y) {
    player.y = SHIP_MAX_Y;
    player.vy = 0;
  }

  if (state.fireCooldown > 0) state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  if (input.fire && state.fireCooldown <= 0 && state.bullets.length < MAX_BULLETS) {
    state.bullets.push({
      x: wrapPos(player.x + player.facing * (SHIP_W / 2 + 2), WORLD_WIDTH),
      y: player.y,
      vx: player.facing * LASER_SPEED,
      life: LASER_LIFE_S,
    });
    state.fireCooldown = FIRE_COOLDOWN_S;
    events.push({ type: 'shoot' });
  }

  if (input.smartBomb && state.smartBombs > 0) {
    state.smartBombs -= 1;
    const inView = state.enemies.filter((e) => Math.abs(wrapDelta(player.x, e.x, WORLD_WIDTH)) < WIDTH / 2 + 20);
    for (const enemy of inView) {
      destroyEnemy(state, enemy, events, enemy.kind === 'lander' ? LANDER_POINTS : BOMBER_POINTS);
    }
    events.push({ type: 'smartBomb' });
  }

  for (const bullet of state.bullets) {
    bullet.x = wrapPos(bullet.x + bullet.vx * dt, WORLD_WIDTH);
    bullet.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  for (const bomb of state.bombs) {
    bomb.y += bomb.vy * dt;
  }

  // Humanoids: walk and turn on the ground, follow their captor while
  // grabbed, or fall (and can be caught by the player) once freed.
  for (const humanoid of state.humanoids) {
    if (humanoid.state === 'walking') {
      humanoid.x = wrapPos(humanoid.x + humanoid.vx * dt, WORLD_WIDTH);
      humanoid.turnTimer -= dt;
      if (humanoid.turnTimer <= 0) {
        humanoid.vx = -humanoid.vx;
        humanoid.turnTimer = 2 + Math.random() * 3;
      }
    } else if (humanoid.state === 'falling') {
      humanoid.y = Math.max(0, humanoid.y - HUMANOID_FALL_SPEED * dt);
      const dx = Math.abs(wrapDelta(player.x, humanoid.x, WORLD_WIDTH));
      const shipAltitude = GROUND_Y - player.y;
      const dy = Math.abs(shipAltitude - humanoid.y);
      if (dx < CATCH_RADIUS_X && dy < CATCH_RADIUS_Y) {
        humanoid.state = 'walking';
        humanoid.x = player.x;
        humanoid.y = 0;
        humanoid.vx = Math.random() < 0.5 ? HUMANOID_WALK_SPEED : -HUMANOID_WALK_SPEED;
        humanoid.turnTimer = 2 + Math.random() * 3;
        state.score += HUMANOID_RESCUE_POINTS;
        events.push({ type: 'humanoidRescued', points: HUMANOID_RESCUE_POINTS });
      } else if (humanoid.y <= 0) {
        humanoid.state = 'dead';
        events.push({ type: 'humanoidLost' });
      }
    }
  }

  // Bombs vs. humanoids/ground.
  for (const bomb of state.bombs) {
    if (bomb.y >= GROUND_Y) {
      for (const humanoid of state.humanoids) {
        if (humanoid.state !== 'walking') continue;
        if (Math.abs(wrapDelta(bomb.x, humanoid.x, WORLD_WIDTH)) < BOMB_KILL_RADIUS) {
          humanoid.state = 'dead';
          events.push({ type: 'humanoidLost' });
        }
      }
    }
  }
  state.bombs = state.bombs.filter((b) => b.y < GROUND_Y);

  const anyHumanoidLeft = state.humanoids.some((h) => h.state === 'walking' || h.state === 'grabbed');

  for (const enemy of state.enemies) {
    if (enemy.kind === 'lander') {
      if (enemy.state === 'seeking') {
        let target = enemy.targetHumanoidId != null ? state.humanoids.find((h) => h.id === enemy.targetHumanoidId) : null;
        if (target && target.state !== 'walking') {
          // Another lander grabbed (or something killed) this one first —
          // drop the stale target instead of chasing it forever.
          target = null;
          enemy.targetHumanoidId = null;
        }
        if (!target) {
          target = anyHumanoidLeft ? nearestWalkingHumanoid(state, enemy.x) : null;
          enemy.targetHumanoidId = target ? target.id : null;
        }
        const targetX = target ? target.x : player.x;
        const targetGroundLevel = target != null;

        const dx = wrapDelta(enemy.x, targetX, WORLD_WIDTH);
        const dir = dx > 0 ? 1 : -1;
        enemy.x = wrapPos(enemy.x + dir * enemy.speed * dt, WORLD_WIDTH);

        const desiredY = targetGroundLevel ? GROUND_Y - 4 : player.y;
        enemy.y += Math.sign(desiredY - enemy.y) * enemy.speed * 0.6 * dt;

        if (target && target.state === 'walking') {
          const closeX = Math.abs(wrapDelta(enemy.x, target.x, WORLD_WIDTH)) < 10;
          const closeY = Math.abs(enemy.y - (GROUND_Y - 4)) < 10;
          if (closeX && closeY) {
            target.state = 'grabbed';
            enemy.carryingHumanoidId = target.id;
            enemy.state = 'rising';
            events.push({ type: 'humanoidGrabbed' });
          }
        } else if (!target && Math.abs(wrapDelta(enemy.x, player.x, WORLD_WIDTH)) < 6 && Math.abs(enemy.y - player.y) < 6) {
          // No humanoids left anywhere — the lander harasses the player
          // directly instead of just idling.
          enemy.y += (Math.random() < 0.5 ? -1 : 1) * 30 * dt;
        }
      } else {
        enemy.y -= LANDER_RISE_SPEED * waveMult * dt;
        const carried = enemy.carryingHumanoidId != null ? state.humanoids.find((h) => h.id === enemy.carryingHumanoidId) : null;
        if (carried) {
          carried.x = enemy.x;
          carried.y = GROUND_Y - enemy.y;
        }
        if (enemy.y <= 24) {
          if (carried) {
            carried.state = 'dead';
            events.push({ type: 'humanoidLost' });
          }
          enemy.carryingHumanoidId = null;
          enemy.targetHumanoidId = null;
          enemy.state = 'seeking';
          enemy.x = randomWorldXAwayFrom(player.x, WIDTH * 0.6);
          enemy.y = GROUND_Y - 40;
        }
      }
    } else {
      enemy.x = wrapPos(enemy.x + enemy.dir * enemy.speed * dt, WORLD_WIDTH);
      enemy.bombTimer -= dt;
      if (enemy.bombTimer <= 0) {
        state.bombs.push({ x: enemy.x, y: enemy.y, vy: BOMB_FALL_SPEED });
        enemy.bombTimer = BOMB_INTERVAL_S * (0.7 + Math.random() * 0.6);
      }
    }
  }

  // Bullets vs enemies.
  const destroyed = new Set<Enemy>();
  const spentBullets = new Set<Bullet>();
  for (const bullet of state.bullets) {
    if (spentBullets.has(bullet)) continue;
    for (const enemy of state.enemies) {
      if (destroyed.has(enemy)) continue;
      const radius = enemy.kind === 'lander' ? LANDER_HIT_RADIUS : BOMBER_HIT_RADIUS;
      if (Math.abs(wrapDelta(bullet.x, enemy.x, WORLD_WIDTH)) > radius) continue;
      if (Math.abs(bullet.y - enemy.y) > radius) continue;
      spentBullets.add(bullet);
      destroyed.add(enemy);
      destroyEnemy(state, enemy, events, enemy.kind === 'lander' ? LANDER_POINTS : BOMBER_POINTS);
      break;
    }
  }
  if (spentBullets.size > 0) {
    state.bullets = state.bullets.filter((b) => !spentBullets.has(b));
  }

  // Enemies/bombs vs player.
  if (player.invulnS <= 0) {
    let hit = false;
    for (const enemy of state.enemies) {
      const radius = enemy.kind === 'lander' ? LANDER_HIT_RADIUS : BOMBER_HIT_RADIUS;
      if (Math.abs(wrapDelta(player.x, enemy.x, WORLD_WIDTH)) < radius + SHIP_HIT_RADIUS && Math.abs(player.y - enemy.y) < radius + SHIP_HIT_RADIUS) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const bomb of state.bombs) {
        if (Math.abs(wrapDelta(player.x, bomb.x, WORLD_WIDTH)) < BOMB_KILL_RADIUS && Math.abs(player.y - bomb.y) < BOMB_KILL_RADIUS) {
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      state.lives -= 1;
      player.invulnS = INVULN_S;
      player.vx = 0;
      player.vy = 0;
      events.push({ type: 'playerHit' });
      if (state.lives <= 0) {
        state.gameOver = true;
        events.push({ type: 'gameOver' });
      }
    }
  }

  // Wave progression: clearing enough kills escalates difficulty and
  // tops up the humanoid population (the planet always has more to
  // save) rather than ending in a discrete "no enemies left" state like
  // Galaga — Defender is meant to be continuous, escalating pressure.
  const killsNeeded = KILLS_PER_WAVE_BASE + (state.wave - 1) * 2;
  if (!state.gameOver && state.waveKills >= killsNeeded) {
    state.wave += 1;
    state.waveKills = 0;
    const targets = enemyTargetsFor(state.wave);
    while (livingHumanoidCount(state) < Math.min(MAX_HUMANOIDS, targets.landers)) {
      state.humanoids.push(spawnHumanoid());
    }
    events.push({ type: 'waveClear' });
  }

  // Trickle in new enemies up to this wave's target counts, with a real
  // gap between spawns — otherwise a kill gets instantly backfilled next
  // frame and clearing enemies never actually feels like clearing them.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const targets = enemyTargetsFor(state.wave);
    const landerCount = state.enemies.filter((e) => e.kind === 'lander').length;
    const bomberCount = state.enemies.filter((e) => e.kind === 'bomber').length;
    if (landerCount < targets.landers) {
      state.enemies.push(spawnLander(player.x, waveMult));
      state.spawnTimer = Math.max(0.6, 1.8 - (state.wave - 1) * 0.08);
    } else if (bomberCount < targets.bombers) {
      state.enemies.push(spawnBomber(player.x, waveMult));
      state.spawnTimer = Math.max(0.6, 1.8 - (state.wave - 1) * 0.08);
    }
  }

  return events;
}
