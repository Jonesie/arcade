/**
 * Pure game simulation — no canvas, no DOM, no React. `update()` mutates
 * the passed-in state in place (standard for a per-frame game loop; an
 * immutable-state approach would just churn allocations at 60fps for no
 * benefit here) and returns a list of transient events for the caller to
 * react to (sounds, mostly). Score/lives/wave live on the state itself and
 * are the authoritative values — events are notifications, not the source
 * of truth.
 */

export const WIDTH = 480;
export const HEIGHT = 360;

const ROWS = 5;
const COLS = 8;
export const ALIEN_W = 24;
export const ALIEN_H = 16;
const ALIEN_GAP_X = 12;
const ALIEN_GAP_Y = 14;
const GRID_W = COLS * (ALIEN_W + ALIEN_GAP_X) - ALIEN_GAP_X;
const GRID_START_X = (WIDTH - GRID_W) / 2;
const GRID_START_Y = 34;
const ROW_H = ALIEN_H + ALIEN_GAP_Y;

const ROW_POINTS = [30, 20, 20, 10, 10];
export const ROW_COLORS = ['#ff5fa2', '#5fe1ff', '#5fe1ff', '#f7e05f', '#f7e05f'];

export const PLAYER_W = 28;
export const PLAYER_H = 14;
export const PLAYER_Y = HEIGHT - 30;
const PLAYER_SPEED = 220;
const PLAYER_INVULN_S = 1.5;

const PLAYER_BULLET_SPEED = 380;
const ALIEN_BULLET_SPEED = 170;

const STEP_DOWN = 12;
const BASE_STEP_INTERVAL = 0.9;
const MIN_STEP_INTERVAL = 0.07;

export interface Alien {
  row: number;
  col: number;
  alive: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  vy: number;
}

export interface Ufo {
  x: number;
  vx: number;
  value: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface GameState {
  player: { x: number; invulnS: number };
  playerBullet: Bullet | null;
  alienBullets: Bullet[];
  aliens: Alien[];
  formation: { offsetX: number; offsetY: number; dir: 1 | -1; stepTimer: number; frame: 0 | 1 };
  alienFireTimer: number;
  ufo: Ufo | null;
  ufoTimer: number;
  score: number;
  lives: number;
  wave: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'shoot' }
  | { type: 'invaderKilled'; points: number }
  | { type: 'ufoHit'; points: number }
  | { type: 'playerHit' }
  | { type: 'waveClear' }
  | { type: 'march' }
  | { type: 'gameOver' };

function createAliens(): Alien[] {
  const aliens: Alien[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      aliens.push({ row, col, alive: true });
    }
  }
  return aliens;
}

export function createInitialState(): GameState {
  return {
    player: { x: WIDTH / 2 - PLAYER_W / 2, invulnS: 0 },
    playerBullet: null,
    alienBullets: [],
    aliens: createAliens(),
    formation: { offsetX: 0, offsetY: 0, dir: 1, stepTimer: BASE_STEP_INTERVAL, frame: 0 },
    alienFireTimer: 1.5,
    ufo: null,
    ufoTimer: 15 + Math.random() * 10,
    score: 0,
    lives: 3,
    wave: 1,
    gameOver: false,
  };
}

export function alienRect(state: GameState, alien: Alien) {
  return {
    x: GRID_START_X + alien.col * (ALIEN_W + ALIEN_GAP_X) + state.formation.offsetX,
    y: GRID_START_Y + alien.row * ROW_H + state.formation.offsetY,
    w: ALIEN_W,
    h: ALIEN_H,
  };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function stepInterval(aliveCount: number, totalCount: number, wave: number): number {
  const ratio = Math.max(aliveCount / totalCount, 0.04);
  const waveFactor = Math.max(0.55, 1 - (wave - 1) * 0.08);
  return Math.max(MIN_STEP_INTERVAL, BASE_STEP_INTERVAL * ratio ** 1.3 * waveFactor);
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];

  if (state.player.invulnS > 0) state.player.invulnS = Math.max(0, state.player.invulnS - dt);

  if (input.left) state.player.x -= PLAYER_SPEED * dt;
  if (input.right) state.player.x += PLAYER_SPEED * dt;
  state.player.x = Math.max(0, Math.min(WIDTH - PLAYER_W, state.player.x));

  if (input.fire && !state.playerBullet) {
    state.playerBullet = { x: state.player.x + PLAYER_W / 2 - 1, y: PLAYER_Y - 6, vy: -PLAYER_BULLET_SPEED };
    events.push({ type: 'shoot' });
  }

  if (state.playerBullet) {
    state.playerBullet.y += state.playerBullet.vy * dt;
    if (state.playerBullet.y < 0) state.playerBullet = null;
  }

  for (const bullet of state.alienBullets) {
    bullet.y += bullet.vy * dt;
  }
  state.alienBullets = state.alienBullets.filter((b) => b.y < HEIGHT);

  const aliveAliens = state.aliens.filter((a) => a.alive);
  const totalAliens = state.aliens.length;

  // Formation stepping — moves in discrete steps like the original, faster
  // as fewer aliens remain, reversing and dropping a row at the edge.
  state.formation.stepTimer -= dt;
  if (state.formation.stepTimer <= 0 && aliveAliens.length > 0) {
    state.formation.stepTimer = stepInterval(aliveAliens.length, totalAliens, state.wave);
    state.formation.frame = state.formation.frame === 0 ? 1 : 0;
    events.push({ type: 'march' });

    const minX = Math.min(...aliveAliens.map((a) => alienRect(state, a).x));
    const maxX = Math.max(...aliveAliens.map((a) => alienRect(state, a).x + ALIEN_W));
    const stepSize = 8;
    const wouldExceed =
      (state.formation.dir === 1 && maxX + stepSize > WIDTH) || (state.formation.dir === -1 && minX - stepSize < 0);

    if (wouldExceed) {
      state.formation.dir = state.formation.dir === 1 ? -1 : 1;
      state.formation.offsetY += STEP_DOWN;
    } else {
      state.formation.offsetX += stepSize * state.formation.dir;
    }
  }

  // Invasion reaches the player — instant game over, same as the arcade original.
  const lowestY = Math.max(0, ...aliveAliens.map((a) => alienRect(state, a).y + ALIEN_H));
  if (lowestY >= PLAYER_Y) {
    state.gameOver = true;
    events.push({ type: 'gameOver' });
    return events;
  }

  // Alien fire.
  state.alienFireTimer -= dt;
  if (state.alienFireTimer <= 0 && aliveAliens.length > 0) {
    const columns = new Map<number, Alien>();
    for (const alien of aliveAliens) {
      const existing = columns.get(alien.col);
      if (!existing || alien.row > existing.row) columns.set(alien.col, alien);
    }
    const shooters = [...columns.values()];
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    if (shooter) {
      const rect = alienRect(state, shooter);
      state.alienBullets.push({ x: rect.x + rect.w / 2 - 1, y: rect.y + rect.h, vy: ALIEN_BULLET_SPEED });
    }
    const density = aliveAliens.length / totalAliens;
    state.alienFireTimer = 0.5 + Math.random() * (1.8 * Math.max(density, 0.2));
  }

  // Player bullet vs aliens.
  if (state.playerBullet) {
    const bulletRect = { x: state.playerBullet.x, y: state.playerBullet.y, w: 2, h: 8 };
    for (const alien of aliveAliens) {
      if (overlaps(bulletRect, alienRect(state, alien))) {
        alien.alive = false;
        state.playerBullet = null;
        const points = ROW_POINTS[alien.row] ?? 10;
        state.score += points;
        events.push({ type: 'invaderKilled', points });
        break;
      }
    }
  }

  // Player bullet vs UFO.
  if (state.playerBullet && state.ufo) {
    const bulletRect = { x: state.playerBullet.x, y: state.playerBullet.y, w: 2, h: 8 };
    const ufoRect = { x: state.ufo.x, y: 16, w: 28, h: 12 };
    if (overlaps(bulletRect, ufoRect)) {
      state.score += state.ufo.value;
      events.push({ type: 'ufoHit', points: state.ufo.value });
      state.ufo = null;
      state.playerBullet = null;
    }
  }

  // UFO movement/spawn.
  if (state.ufo) {
    state.ufo.x += state.ufo.vx * dt;
    if (state.ufo.x < -30 || state.ufo.x > WIDTH + 30) state.ufo = null;
  } else {
    state.ufoTimer -= dt;
    if (state.ufoTimer <= 0) {
      const fromLeft = Math.random() < 0.5;
      state.ufo = {
        x: fromLeft ? -30 : WIDTH + 30,
        vx: fromLeft ? 70 : -70,
        value: [50, 100, 150, 300][Math.floor(Math.random() * 4)],
      };
      state.ufoTimer = 18 + Math.random() * 12;
    }
  }

  // Alien bullets vs player.
  if (state.player.invulnS <= 0) {
    const playerRect = { x: state.player.x, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };
    for (const bullet of state.alienBullets) {
      const bulletRect = { x: bullet.x, y: bullet.y, w: 2, h: 8 };
      if (overlaps(bulletRect, playerRect)) {
        state.alienBullets = state.alienBullets.filter((b) => b !== bullet);
        state.lives -= 1;
        state.player.invulnS = PLAYER_INVULN_S;
        events.push({ type: 'playerHit' });
        if (state.lives <= 0) {
          state.gameOver = true;
          events.push({ type: 'gameOver' });
        }
        break;
      }
    }
  }

  // Wave clear. (aliveAliens is a snapshot from the top of this frame, so a
  // kill that happens later in this same frame is picked up here one frame
  // late — imperceptible at 60fps, and simpler than re-filtering mid-update.)
  if (!state.gameOver && aliveAliens.length === 0 && state.aliens.length > 0) {
    state.wave += 1;
    state.aliens = createAliens();
    state.formation = { offsetX: 0, offsetY: 0, dir: 1, stepTimer: BASE_STEP_INTERVAL, frame: 0 };
    state.playerBullet = null;
    state.alienBullets = [];
    events.push({ type: 'waveClear' });
  }

  return events;
}
