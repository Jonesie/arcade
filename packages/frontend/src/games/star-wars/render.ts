import {
  FAR_Z,
  FOCAL,
  HEIGHT,
  PORT_RADIUS,
  PORT_WINDOW,
  TRENCH_HALF_HEIGHT,
  TRENCH_HALF_WIDTH,
  TRENCH_LENGTH,
  WIDTH,
  type Bolt,
  type GameState,
  type Shot,
  type Turret,
} from './engine';

const TRENCH_COLOR = '#2fe86b';
const TRENCH_GLOW = 'rgba(47, 232, 107, 0.5)';
const TURRET_COLOR = '#ff8a3d';
const BOLT_COLOR = '#ff3b3b';
const SHOT_COLOR = '#eafcff';
const PORT_COLOR = '#ffe14d';
const MIN_RENDER_Z = 40;

interface Projected {
  x: number;
  y: number;
  scale: number;
}

// Perspective projection: divide by depth. The player's own (x, y) is
// subtracted from the world position (not added to the camera) since
// steering right should make the world appear to slide left — the
// player *is* the camera here, there's no separate ship sprite to move.
function project(worldX: number, worldY: number, z: number, playerX: number, playerY: number): Projected {
  const zc = Math.max(MIN_RENDER_Z, z);
  const scale = FOCAL / zc;
  return {
    x: WIDTH / 2 + (worldX - playerX) * scale,
    y: HEIGHT / 2 + (worldY - playerY) * scale,
    scale,
  };
}

const HOOP_COUNT = 14;

function drawTrench(ctx: CanvasRenderingContext2D, playerX: number, playerY: number): void {
  const hoops: { tl: Projected; tr: Projected; bl: Projected; br: Projected }[] = [];
  for (let i = 0; i <= HOOP_COUNT; i++) {
    const z = FAR_Z - (i * FAR_Z) / HOOP_COUNT;
    hoops.push({
      tl: project(-TRENCH_HALF_WIDTH, -TRENCH_HALF_HEIGHT, z, playerX, playerY),
      tr: project(TRENCH_HALF_WIDTH, -TRENCH_HALF_HEIGHT, z, playerX, playerY),
      bl: project(-TRENCH_HALF_WIDTH, TRENCH_HALF_HEIGHT, z, playerX, playerY),
      br: project(TRENCH_HALF_WIDTH, TRENCH_HALF_HEIGHT, z, playerX, playerY),
    });
  }

  ctx.save();
  ctx.strokeStyle = TRENCH_COLOR;
  ctx.shadowColor = TRENCH_GLOW;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;

  for (const h of hoops) {
    ctx.beginPath();
    ctx.moveTo(h.tl.x, h.tl.y);
    ctx.lineTo(h.tr.x, h.tr.y);
    ctx.lineTo(h.br.x, h.br.y);
    ctx.lineTo(h.bl.x, h.bl.y);
    ctx.closePath();
    ctx.stroke();
  }

  const corners = ['tl', 'tr', 'bl', 'br'] as const;
  for (let i = 0; i < hoops.length - 1; i++) {
    for (const corner of corners) {
      const a = hoops[i][corner];
      const b = hoops[i + 1][corner];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTurret(ctx: CanvasRenderingContext2D, turret: Turret, playerX: number, playerY: number): void {
  const p = project(turret.x, turret.y, turret.z, playerX, playerY);
  const size = Math.max(2, 14 * p.scale * (FOCAL / 40));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = TURRET_COLOR;
  ctx.fillStyle = 'rgba(255, 138, 61, 0.25)';
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.rect(-size / 2, -size / 2, size, size);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBolt(ctx: CanvasRenderingContext2D, bolt: Bolt, playerX: number, playerY: number): void {
  const p = project(bolt.x, bolt.y, bolt.z, playerX, playerY);
  const size = Math.max(2, 10 * p.scale * (FOCAL / 40));
  ctx.save();
  ctx.fillStyle = BOLT_COLOR;
  ctx.shadowColor = BOLT_COLOR;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShot(ctx: CanvasRenderingContext2D, shot: Shot, playerX: number, playerY: number): void {
  const p = project(shot.x, shot.y, shot.z, playerX, playerY);
  const size = Math.max(1.5, 6 * p.scale * (FOCAL / 40));
  ctx.save();
  ctx.fillStyle = SHOT_COLOR;
  ctx.shadowColor = SHOT_COLOR;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPort(ctx: CanvasRenderingContext2D, state: GameState): void {
  const windowStart = TRENCH_LENGTH - PORT_WINDOW;
  const progress = Math.min(1, Math.max(0, (state.distance - windowStart) / PORT_WINDOW));
  // Starts near the vanishing point and grows as the window progresses,
  // purely a visual cue — the actual hit check is aim-at-fire-time, not
  // a traveling object (see engine.ts).
  const z = FAR_Z * (1 - progress) + MIN_RENDER_Z * progress;
  const p = project(0, 0, z, state.player.x, state.player.y);
  const radius = Math.max(3, PORT_RADIUS * p.scale);

  ctx.save();
  ctx.strokeStyle = PORT_COLOR;
  ctx.shadowColor = PORT_COLOR;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCrosshair(ctx: CanvasRenderingContext2D): void {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  ctx.restore();
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawTrench(ctx, state.player.x, state.player.y);
  if (state.portActive) drawPort(ctx, state);
  for (const turret of state.turrets) drawTurret(ctx, turret, state.player.x, state.player.y);
  for (const bolt of state.bolts) drawBolt(ctx, bolt, state.player.x, state.player.y);
  for (const shot of state.shots) drawShot(ctx, shot, state.player.x, state.player.y);
  drawCrosshair(ctx);

  if (state.hitFlashS > 0) {
    ctx.save();
    ctx.globalAlpha = (state.hitFlashS / 0.35) * 0.35;
    ctx.fillStyle = '#ff2a1f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  if (state.portHitFlashS > 0) {
    ctx.save();
    ctx.globalAlpha = (state.portHitFlashS / 0.6) * 0.8;
    ctx.fillStyle = '#fff5cc';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#1a1410';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RUN CLEAR!', WIDTH / 2, HEIGHT / 2);
    ctx.restore();
  }
}
