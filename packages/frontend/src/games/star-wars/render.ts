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
// Hoops cycle through this depth range and wrap, rather than sitting at
// fixed z values — without this, the tunnel geometry never changed
// frame to frame and only the (sparser) turrets/bolts showed any
// motion, which read as the ship sitting still while a few objects
// drifted past instead of flying forward down the shaft.
const HOOP_CYCLE = FAR_Z - MIN_RENDER_Z;
const HOOP_SPACING = HOOP_CYCLE / HOOP_COUNT;

function positiveMod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function drawTrench(ctx: CanvasRenderingContext2D, playerX: number, playerY: number, distance: number): void {
  const hoops: { tl: Projected; tr: Projected; bl: Projected; br: Projected }[] = [];
  for (let i = 0; i < HOOP_COUNT; i++) {
    const z = MIN_RENDER_Z + positiveMod(HOOP_CYCLE - i * HOOP_SPACING - distance, HOOP_CYCLE);
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

// A small gun emplacement — wide base, domed turret head, muzzle dot —
// rather than a plain square, so it reads as "enemy to shoot" and not
// as a wall segment or obstacle sitting in the flight path (turrets
// are wall/floor/ceiling-mounted; see spawnTurret in engine.ts).
function drawTurret(ctx: CanvasRenderingContext2D, turret: Turret, playerX: number, playerY: number): void {
  const p = project(turret.x, turret.y, turret.z, playerX, playerY);
  const size = Math.max(2, 16 * p.scale * (FOCAL / 40));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = TURRET_COLOR;
  ctx.fillStyle = 'rgba(255, 138, 61, 0.3)';
  ctx.lineWidth = Math.max(1, size * 0.08);

  ctx.beginPath();
  ctx.rect(-size / 2, size * 0.12, size, size * 0.34);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, size * 0.12, size * 0.34, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = turret.hasFired ? 'rgba(255, 90, 70, 0.95)' : 'rgba(255, 200, 140, 0.9)';
  ctx.arc(0, -size * 0.04, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
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

// A small stylized-fighter gunsight (swept wings + nose/tail ticks),
// echoing the reticle glyph in the reference arcade cabinet, rather
// than a plain "+" crosshair.
function drawShipReticle(ctx: CanvasRenderingContext2D): void {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(234, 252, 255, 0.85)';
  ctx.fillStyle = 'rgba(234, 252, 255, 0.85)';
  ctx.shadowColor = 'rgba(234, 252, 255, 0.6)';
  ctx.shadowBlur = 3;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 15, cy + 7);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 15, cy + 7);
  ctx.moveTo(cx, cy - 11);
  ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + 9);
  ctx.stroke();
  ctx.restore();
}

const COCKPIT_COLOR = '#2fe86b';
const PILLAR_WIDTH = 26;
const DASH_HEIGHT = 46;
const DASH_LIGHT_COLORS = ['#ff5252', '#ffd23f', '#ff5252', '#ffd23f', '#ff5252', '#ffd23f'];

// Fixed cockpit chrome drawn in screen space (not affected by player
// position) — canopy pillars down each side and a dashboard console
// along the bottom, framing the trench view the way the reference
// arcade cabinet's cockpit yoke frames its vector screen.
function drawPillar(ctx: CanvasRenderingContext2D, side: 1 | -1): void {
  const outerX = side === 1 ? 0 : WIDTH;
  const innerX = side === 1 ? PILLAR_WIDTH : WIDTH - PILLAR_WIDTH;

  ctx.beginPath();
  ctx.moveTo(outerX, 0);
  ctx.lineTo(innerX, 28);
  ctx.lineTo(innerX, HEIGHT - DASH_HEIGHT);
  ctx.lineTo(outerX, HEIGHT - DASH_HEIGHT + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rivet/hatch lines for panel texture — a vector display only draws
  // lines, so line density (not fill shading) is what makes this read
  // as a solid strut rather than empty space.
  const hatchTop = 34;
  const hatchBottom = HEIGHT - DASH_HEIGHT - 8;
  const hatchCount = 6;
  for (let i = 0; i < hatchCount; i++) {
    const t = i / (hatchCount - 1);
    const y = hatchTop + t * (hatchBottom - hatchTop);
    const xInner = side === 1 ? innerX - 5 : innerX + 5;
    const xOuter = side === 1 ? outerX + 5 : outerX - 5;
    ctx.beginPath();
    ctx.moveTo(xOuter, y);
    ctx.lineTo(xInner, y - 6);
    ctx.stroke();
  }
}

function drawCockpitFrame(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = '#24402f';
  ctx.strokeStyle = COCKPIT_COLOR;
  ctx.shadowColor = TRENCH_GLOW;
  ctx.shadowBlur = 2;
  ctx.lineWidth = 2;

  drawPillar(ctx, 1);
  drawPillar(ctx, -1);

  const dashY = HEIGHT - DASH_HEIGHT;
  ctx.fillStyle = '#182a20';
  ctx.fillRect(0, dashY, WIDTH, DASH_HEIGHT);
  ctx.beginPath();
  ctx.moveTo(0, dashY);
  ctx.lineTo(WIDTH, dashY);
  ctx.stroke();

  const lightY = dashY + 15;
  for (let i = 0; i < DASH_LIGHT_COLORS.length; i++) {
    const lx = 44 + (i * (WIDTH - 88)) / (DASH_LIGHT_COLORS.length - 1);
    ctx.fillStyle = DASH_LIGHT_COLORS[i];
    ctx.shadowColor = DASH_LIGHT_COLORS[i];
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(lx, lightY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawTrench(ctx, state.player.x, state.player.y, state.distance);
  if (state.portActive) drawPort(ctx, state);
  for (const turret of state.turrets) drawTurret(ctx, turret, state.player.x, state.player.y);
  for (const bolt of state.bolts) drawBolt(ctx, bolt, state.player.x, state.player.y);
  for (const shot of state.shots) drawShot(ctx, shot, state.player.x, state.player.y);
  drawCockpitFrame(ctx);
  drawShipReticle(ctx);

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
