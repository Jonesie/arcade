/**
 * Pure game simulation — no canvas, no DOM, no React (see the tic-tac-toe /
 * space-invaders engines for the same pattern). Unlike space-invaders'
 * fixed marching grid, enemies here fly in on curved entrance paths, sit in
 * formation, then periodically peel off to dive-bomb the player before
 * flying back in to re-join formation — the enemy `state` machine
 * ('entering' | 'formation' | 'diving') and the quadratic-bezier flight
 * paths are the main things this engine has that space-invaders' doesn't.
 */

export const WIDTH = 480;
export const HEIGHT = 360;

export const PLAYER_W = 28;
export const PLAYER_H = 14;
export const PLAYER_Y = HEIGHT - 30;
const PLAYER_SPEED = 220;
const PLAYER_INVULN_S = 1.5;
const PLAYER_BULLET_SPEED = 380;
const MAX_PLAYER_BULLETS = 2;
const ENEMY_BULLET_SPEED = 170;

export const ENEMY_W = 20;
export const ENEMY_H = 16;

export type Tier = 'boss' | 'butterfly' | 'bee';

interface TierConfig {
  hp: number;
  formationPoints: number;
  divePoints: number;
  color: string;
  damagedColor?: string;
}

export const TIERS: Record<Tier, TierConfig> = {
  boss: { hp: 2, formationPoints: 150, divePoints: 400, color: '#c88bff', damagedColor: '#7a4fbf' },
  butterfly: { hp: 1, formationPoints: 80, divePoints: 160, color: '#5fe1ff' },
  bee: { hp: 1, formationPoints: 50, divePoints: 100, color: '#f7e05f' },
};

const COLS = 8;
const SLOT_W = 44;
const SLOT_H = 32;
const GRID_TOP = 36;
const GRID_LEFT = (WIDTH - (COLS - 1) * SLOT_W) / 2;

interface Slot {
  row: number;
  col: number;
  tier: Tier;
}

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  for (const col of [2, 3, 4, 5]) slots.push({ row: 0, col, tier: 'boss' });
  for (let row = 1; row <= 2; row++) {
    for (let col = 0; col < COLS; col++) slots.push({ row, col, tier: 'butterfly' });
  }
  for (let col = 0; col < COLS; col++) slots.push({ row: 3, col, tier: 'bee' });
  return slots;
}

const SLOTS = buildSlots();

function slotPosition(slot: Slot): Point {
  return { x: GRID_LEFT + slot.col * SLOT_W, y: GRID_TOP + slot.row * SLOT_H };
}

interface Point {
  x: number;
  y: number;
}

function bezierPoint(from: Point, control: Point, to: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  };
}

export type EnemyState = 'entering' | 'formation' | 'diving';

export interface Enemy {
  id: number;
  tier: Tier;
  row: number;
  col: number;
  hp: number;
  damaged: boolean;
  state: EnemyState;
  x: number;
  y: number;
  t: number;
  duration: number;
  from: Point;
  control: Point;
  to: Point;
  firedDuringDive: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  vy: number;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface GameState {
  player: { x: number; invulnS: number };
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: Enemy[];
  diveTimer: number;
  score: number;
  lives: number;
  wave: number;
  gameOver: boolean;
}

export type GameEvent =
  | { type: 'shoot' }
  | { type: 'enemyHit' }
  | { type: 'enemyKilled'; points: number }
  | { type: 'enemyFire' }
  | { type: 'playerHit' }
  | { type: 'waveClear' }
  | { type: 'gameOver' };

let idCounter = 0;

function entrancePathFor(slot: Point, staggerIndex: number): Pick<Enemy, 'from' | 'control' | 'to' | 't'> {
  const fromLeft = staggerIndex % 2 === 0;
  const from: Point = { x: fromLeft ? -30 : WIDTH + 30, y: -30 };
  const control: Point = { x: WIDTH / 2 + (fromLeft ? -60 : 60), y: slot.y - 90 };
  return { from, control, to: slot, t: -staggerIndex * 0.04 };
}

function spawnWave(): Enemy[] {
  return SLOTS.map((slot, index) => {
    const to = slotPosition(slot);
    const cfg = TIERS[slot.tier];
    const path = entrancePathFor(to, index);
    return {
      id: idCounter++,
      tier: slot.tier,
      row: slot.row,
      col: slot.col,
      hp: cfg.hp,
      damaged: false,
      state: 'entering' as EnemyState,
      x: path.from.x,
      y: path.from.y,
      t: path.t,
      duration: 1.1,
      from: path.from,
      control: path.control,
      to: path.to,
      firedDuringDive: false,
    };
  });
}

export function createInitialState(): GameState {
  idCounter = 0;
  return {
    player: { x: WIDTH / 2 - PLAYER_W / 2, invulnS: 0 },
    playerBullets: [],
    enemyBullets: [],
    enemies: spawnWave(),
    diveTimer: 2.5,
    score: 0,
    lives: 3,
    wave: 1,
    gameOver: false,
  };
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function update(state: GameState, input: GameInput, dt: number): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];

  if (state.player.invulnS > 0) state.player.invulnS = Math.max(0, state.player.invulnS - dt);

  if (input.left) state.player.x -= PLAYER_SPEED * dt;
  if (input.right) state.player.x += PLAYER_SPEED * dt;
  state.player.x = Math.max(0, Math.min(WIDTH - PLAYER_W, state.player.x));

  if (input.fire && state.playerBullets.length < MAX_PLAYER_BULLETS) {
    state.playerBullets.push({ x: state.player.x + PLAYER_W / 2 - 1, y: PLAYER_Y - 6, vy: -PLAYER_BULLET_SPEED });
    events.push({ type: 'shoot' });
  }

  for (const bullet of state.playerBullets) bullet.y += bullet.vy * dt;
  state.playerBullets = state.playerBullets.filter((b) => b.y > -10);

  for (const bullet of state.enemyBullets) bullet.y += bullet.vy * dt;
  state.enemyBullets = state.enemyBullets.filter((b) => b.y < HEIGHT + 10);

  // Advance entrance/dive flight paths.
  for (const enemy of state.enemies) {
    if (enemy.state === 'formation') continue;

    enemy.t += dt / enemy.duration;
    const clampedT = Math.max(0, Math.min(1, enemy.t));
    const pos = bezierPoint(enemy.from, enemy.control, enemy.to, clampedT);
    enemy.x = pos.x;
    enemy.y = pos.y;

    if (enemy.state === 'diving' && !enemy.firedDuringDive && enemy.y > HEIGHT * 0.45) {
      enemy.firedDuringDive = true;
      state.enemyBullets.push({ x: enemy.x + ENEMY_W / 2 - 1, y: enemy.y + ENEMY_H, vy: ENEMY_BULLET_SPEED });
      events.push({ type: 'enemyFire' });
    }

    if (enemy.t >= 1) {
      if (enemy.state === 'entering') {
        enemy.state = 'formation';
        enemy.x = enemy.to.x;
        enemy.y = enemy.to.y;
      } else {
        // Dive finished (off the bottom of the screen) — fly back in via a
        // fresh entrance path rather than authoring a separate loop-back
        // curve; visually reads as circling back around.
        const originalSlot = slotPosition({ row: enemy.row, col: enemy.col, tier: enemy.tier });
        const path = entrancePathFor(originalSlot, enemy.col + enemy.row);
        enemy.from = path.from;
        enemy.control = path.control;
        enemy.to = path.to;
        enemy.t = 0;
        enemy.duration = 1.1;
        enemy.firedDuringDive = false;
        enemy.state = 'entering';
      }
    }
  }

  // Maybe start a new dive.
  state.diveTimer -= dt;
  if (state.diveTimer <= 0) {
    const formationEnemies = state.enemies.filter((e) => e.state === 'formation');
    if (formationEnemies.length > 0) {
      const diver = formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
      const playerCenterX = state.player.x + PLAYER_W / 2;
      diver.from = { x: diver.x, y: diver.y };
      diver.control = { x: (diver.x + playerCenterX) / 2, y: HEIGHT * 0.55 };
      diver.to = { x: diver.x + (Math.random() * 80 - 40), y: HEIGHT + 30 };
      diver.t = 0;
      diver.duration = Math.max(1.1, 1.6 - (state.wave - 1) * 0.05);
      diver.firedDuringDive = false;
      diver.state = 'diving';
    }
    const remainingRatio = state.enemies.length / SLOTS.length;
    state.diveTimer = 1.2 + Math.random() * (2.5 * Math.max(0.3, remainingRatio));
  }

  // Player bullets vs enemies.
  for (const bullet of state.playerBullets.slice()) {
    for (const enemy of state.enemies) {
      const bulletRect = { x: bullet.x, y: bullet.y, w: 2, h: 8 };
      const enemyRect = { x: enemy.x, y: enemy.y, w: ENEMY_W, h: ENEMY_H };
      if (!overlaps(bulletRect, enemyRect)) continue;

      enemy.hp -= 1;
      state.playerBullets = state.playerBullets.filter((b) => b !== bullet);
      if (enemy.hp <= 0) {
        const cfg = TIERS[enemy.tier];
        const points = enemy.state === 'diving' ? cfg.divePoints : cfg.formationPoints;
        state.score += points;
        state.enemies = state.enemies.filter((e) => e !== enemy);
        events.push({ type: 'enemyKilled', points });
      } else {
        enemy.damaged = true;
        events.push({ type: 'enemyHit' });
      }
      break;
    }
  }

  // Enemy bullets / diving collisions vs player.
  if (state.player.invulnS <= 0) {
    const playerRect = { x: state.player.x, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };
    let hit = false;

    for (const bullet of state.enemyBullets) {
      if (overlaps({ x: bullet.x, y: bullet.y, w: 2, h: 8 }, playerRect)) {
        state.enemyBullets = state.enemyBullets.filter((b) => b !== bullet);
        hit = true;
        break;
      }
    }

    if (!hit) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'diving' && overlaps({ x: enemy.x, y: enemy.y, w: ENEMY_W, h: ENEMY_H }, playerRect)) {
          state.enemies = state.enemies.filter((e) => e !== enemy);
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      state.lives -= 1;
      state.player.invulnS = PLAYER_INVULN_S;
      events.push({ type: 'playerHit' });
      if (state.lives <= 0) {
        state.gameOver = true;
        events.push({ type: 'gameOver' });
      }
    }
  }

  if (!state.gameOver && state.enemies.length === 0) {
    state.wave += 1;
    state.enemies = spawnWave();
    state.playerBullets = [];
    state.enemyBullets = [];
    state.diveTimer = 2.5;
    events.push({ type: 'waveClear' });
  }

  return events;
}
