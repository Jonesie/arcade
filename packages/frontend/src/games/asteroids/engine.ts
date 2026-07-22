/**
 * Pure game simulation — no canvas, no DOM, no React (see the
 * space-invaders/galaga engines for the same pattern). The ship moves with
 * real inertia (thrust adds velocity, nothing removes it but a speed cap)
 * and everything wraps at the screen edges, same as the original arcade
 * game. Asteroids split into two smaller ones when shot rather than just
 * being destroyed outright, down to a smallest size that pops for good.
 */

export const WIDTH = 480;
export const HEIGHT = 360;

export const SHIP_RADIUS = 9;
const ROTATE_SPEED = Math.PI * 1.8;
const THRUST_ACCEL = 180;
const MAX_SPEED = 220;
const BULLET_SPEED = 320;
const BULLET_LIFE_S = 0.9;
const MAX_BULLETS = 4;
const INVULN_S = 2;
const SHAPE_VERTICES = 10;

export type AsteroidSize = 'large' | 'medium' | 'small';

interface SizeConfig {
  radius: number;
  points: number;
  minSpeed: number;
  maxSpeed: number;
}

export const ASTEROID_SIZES: Record<AsteroidSize, SizeConfig> = {
  large: { radius: 30, points: 20, minSpeed: 20, maxSpeed: 50 },
  medium: { radius: 17, points: 50, minSpeed: 40, maxSpeed: 80 },
  small: { radius: 9, points: 100, minSpeed: 70, maxSpeed: 120 },
};

const NEXT_SIZE: Partial<Record<AsteroidSize, AsteroidSize>> = {
  large: 'medium',
  medium: 'small',
};

export interface Asteroid {
  id: number;
  size: AsteroidSize;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  shape: number[];
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  invulnS: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
}

export interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  score: number;
  lives: number;
  wave: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'shoot' }
  | { type: 'explosion'; points: number }
  | { type: 'shipDestroyed' }
  | { type: 'waveClear' }
  | { type: 'gameOver' };

let idCounter = 0;

function randomShape(): number[] {
  const points: number[] = [];
  for (let i = 0; i < SHAPE_VERTICES; i++) points.push(0.72 + Math.random() * 0.42);
  return points;
}

function randomEdgePosition(): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * WIDTH, y: 0 };
  if (side === 1) return { x: WIDTH, y: Math.random() * HEIGHT };
  if (side === 2) return { x: Math.random() * WIDTH, y: HEIGHT };
  return { x: 0, y: Math.random() * HEIGHT };
}

function spawnAsteroid(size: AsteroidSize, at?: { x: number; y: number }): Asteroid {
  const cfg = ASTEROID_SIZES[size];
  const pos = at ?? randomEdgePosition();
  const angle = Math.random() * Math.PI * 2;
  const speed = cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed);
  return {
    id: idCounter++,
    size,
    x: pos.x,
    y: pos.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.5,
    shape: randomShape(),
  };
}

function spawnWave(count: number): Asteroid[] {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < count; i++) asteroids.push(spawnAsteroid('large'));
  return asteroids;
}

export function createInitialState(): GameState {
  idCounter = 0;
  return {
    ship: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, angle: 0, invulnS: INVULN_S },
    bullets: [],
    asteroids: spawnWave(4),
    score: 0,
    lives: 3,
    wave: 1,
    gameOver: false,
  };
}

function wrap(value: number, max: number): number {
  if (value < 0) return value + max;
  if (value >= max) return value - max;
  return value;
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];
  const ship = state.ship;

  if (ship.invulnS > 0) ship.invulnS = Math.max(0, ship.invulnS - dt);

  if (input.left) ship.angle -= ROTATE_SPEED * dt;
  if (input.right) ship.angle += ROTATE_SPEED * dt;

  if (input.thrust) {
    ship.vx += Math.sin(ship.angle) * THRUST_ACCEL * dt;
    ship.vy -= Math.cos(ship.angle) * THRUST_ACCEL * dt;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > MAX_SPEED) {
      ship.vx = (ship.vx / speed) * MAX_SPEED;
      ship.vy = (ship.vy / speed) * MAX_SPEED;
    }
  }

  ship.x = wrap(ship.x + ship.vx * dt, WIDTH);
  ship.y = wrap(ship.y + ship.vy * dt, HEIGHT);

  if (input.fire && state.bullets.length < MAX_BULLETS) {
    state.bullets.push({
      x: ship.x + Math.sin(ship.angle) * SHIP_RADIUS,
      y: ship.y - Math.cos(ship.angle) * SHIP_RADIUS,
      vx: Math.sin(ship.angle) * BULLET_SPEED,
      vy: -Math.cos(ship.angle) * BULLET_SPEED,
      life: BULLET_LIFE_S,
    });
    events.push({ type: 'shoot' });
  }

  for (const bullet of state.bullets) {
    bullet.x = wrap(bullet.x + bullet.vx * dt, WIDTH);
    bullet.y = wrap(bullet.y + bullet.vy * dt, HEIGHT);
    bullet.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  for (const asteroid of state.asteroids) {
    asteroid.x = wrap(asteroid.x + asteroid.vx * dt, WIDTH);
    asteroid.y = wrap(asteroid.y + asteroid.vy * dt, HEIGHT);
    asteroid.rotation += asteroid.spin * dt;
  }

  // Bullets vs asteroids — each bullet can destroy at most one asteroid per
  // tick, and a destroyed asteroid splits into two of the next size down
  // (unless it's already the smallest).
  const destroyedIds = new Set<number>();
  const spentBullets = new Set<Bullet>();
  const spawned: Asteroid[] = [];
  for (const bullet of state.bullets) {
    if (spentBullets.has(bullet)) continue;
    for (const asteroid of state.asteroids) {
      if (destroyedIds.has(asteroid.id)) continue;
      const r = ASTEROID_SIZES[asteroid.size].radius;
      if (Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) > r) continue;

      spentBullets.add(bullet);
      destroyedIds.add(asteroid.id);
      const cfg = ASTEROID_SIZES[asteroid.size];
      state.score += cfg.points;
      events.push({ type: 'explosion', points: cfg.points });

      const nextSize = NEXT_SIZE[asteroid.size];
      if (nextSize) {
        spawned.push(spawnAsteroid(nextSize, { x: asteroid.x, y: asteroid.y }));
        spawned.push(spawnAsteroid(nextSize, { x: asteroid.x, y: asteroid.y }));
      }
      break;
    }
  }
  if (destroyedIds.size > 0) {
    state.bullets = state.bullets.filter((b) => !spentBullets.has(b));
    state.asteroids = state.asteroids.filter((a) => !destroyedIds.has(a.id)).concat(spawned);
  }

  // Ship vs asteroids.
  if (ship.invulnS <= 0) {
    for (const asteroid of state.asteroids) {
      const r = ASTEROID_SIZES[asteroid.size].radius + SHIP_RADIUS;
      if (Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y) <= r) {
        state.lives -= 1;
        ship.x = WIDTH / 2;
        ship.y = HEIGHT / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.invulnS = INVULN_S;
        events.push({ type: 'shipDestroyed' });
        if (state.lives <= 0) {
          state.gameOver = true;
          events.push({ type: 'gameOver' });
        }
        break;
      }
    }
  }

  if (!state.gameOver && state.asteroids.length === 0) {
    state.wave += 1;
    state.asteroids = spawnWave(Math.min(3 + state.wave, 11));
    events.push({ type: 'waveClear' });
  }

  return events;
}
