import {
  APE_POS,
  BARREL_RADIUS,
  GIRDERS,
  GIRL_POS,
  LADDERS,
  WIDTH,
  HEIGHT,
  playerRenderY,
  type Barrel,
  type GameState,
  type Player,
} from './engine';

const GIRDER_COLOR = '#c0392b';
const GIRDER_RIVET = 'rgba(0, 0, 0, 0.35)';
const LADDER_COLOR = '#e8b04b';
const BARREL_BODY = '#8a5a2b';
const BARREL_RING = '#5c3a1a';
const PLAYER_COLOR = '#4da6ff';
const APE_COLOR = '#3a2a20';
const GIRL_COLOR = '#ff7fb0';

function drawGirder(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.save();
  ctx.strokeStyle = GIRDER_COLOR;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const length = Math.hypot(x2 - x1, y2 - y1);
  const rivetCount = Math.floor(length / 22);
  ctx.fillStyle = GIRDER_RIVET;
  for (let i = 1; i < rivetCount; i++) {
    const t = i / rivetCount;
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLadder(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBottom: number): void {
  ctx.save();
  ctx.strokeStyle = LADDER_COLOR;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, yTop);
  ctx.lineTo(x - 6, yBottom);
  ctx.moveTo(x + 6, yTop);
  ctx.lineTo(x + 6, yBottom);
  ctx.stroke();

  const rungCount = Math.max(2, Math.floor((yBottom - yTop) / 14));
  for (let i = 1; i < rungCount; i++) {
    const y = yTop + ((yBottom - yTop) * i) / rungCount;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBarrel(ctx: CanvasRenderingContext2D, barrel: Barrel): void {
  ctx.save();
  ctx.translate(barrel.x, barrel.y);
  ctx.beginPath();
  ctx.arc(0, 0, BARREL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = BARREL_BODY;
  ctx.fill();
  ctx.strokeStyle = BARREL_RING;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // A rolling-motion cue: two ring lines that shift with x, since the
  // canvas doesn't otherwise show barrels spinning.
  const phase = (barrel.x / 6) % (Math.PI * 2);
  for (const offset of [-3, 3]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, BARREL_RADIUS - 1, Math.abs(Math.sin(phase + offset)) * 3 + 1, 0, 0, Math.PI * 2);
    ctx.strokeStyle = BARREL_RING;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const y = playerRenderY(player);
  ctx.save();
  ctx.translate(player.x, y);
  ctx.scale(player.facing, 1);

  // Legs
  ctx.fillStyle = PLAYER_COLOR;
  ctx.fillRect(-6, 2, 5, 9);
  ctx.fillRect(1, 2, 5, 9);
  // Body
  ctx.fillRect(-6, -8, 12, 12);
  // Head
  ctx.beginPath();
  ctx.arc(0, -13, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f2d6b3';
  ctx.fill();

  if (player.hammerS > 0) {
    ctx.save();
    ctx.translate(8, -4);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#a9a4c9';
    ctx.fillRect(-1.5, -10, 3, 14);
    ctx.fillStyle = '#7c6cf0';
    ctx.fillRect(-6, -14, 12, 6);
    ctx.restore();
  }

  ctx.restore();
}

// A generic big-ape silhouette (see the trademark-care note on GitHub
// issue #15 — no likeness of the original character), animated with a
// continuous idle sway/bob plus a distinct throw pose synced to
// state.apeThrowS so it visibly winds up and hurls each barrel rather
// than sitting still while they appear.
function drawApe(ctx: CanvasRenderingContext2D, throwS: number): void {
  const now = performance.now() / 1000;
  const bob = Math.sin(now * 1.6) * 2;
  // A slow side-to-side pace across the platform, not just an in-place
  // wobble — noticeably "moving around" rather than standing still.
  const sway = Math.sin(now * 0.45) * 16;
  const throwing = throwS > 0;
  // 0 -> 1 -> 0 across the throw window: wind-up then release.
  const throwPhase = throwing ? Math.sin((1 - throwS / 0.35) * Math.PI) : 0;

  ctx.save();
  ctx.translate(APE_POS.x + sway, APE_POS.y + bob);

  // Legs
  ctx.fillStyle = '#241811';
  ctx.fillRect(-13, 6, 9, 10);
  ctx.fillRect(4, 6, 9, 10);

  // Body (tapered, wider at the base)
  ctx.fillStyle = APE_COLOR;
  ctx.beginPath();
  ctx.moveTo(-17, 8);
  ctx.quadraticCurveTo(-20, -10, -11, -24);
  ctx.quadraticCurveTo(0, -30, 11, -24);
  ctx.quadraticCurveTo(20, -10, 17, 8);
  ctx.closePath();
  ctx.fill();

  // Chest patch
  ctx.fillStyle = '#5a4432';
  ctx.beginPath();
  ctx.ellipse(0, -8, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = APE_COLOR;
  ctx.beginPath();
  ctx.arc(0, -30, 11, 0, Math.PI * 2);
  ctx.fill();
  // Brow
  ctx.fillStyle = '#241811';
  ctx.fillRect(-7, -33, 14, 3);

  // Far arm (throws with the near/left arm, so this one stays put)
  ctx.fillStyle = APE_COLOR;
  ctx.beginPath();
  ctx.ellipse(15, -14 + bob * 0.3, 6, 13, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Near (throwing) arm — swings from a low rest position up overhead
  // through the wind-up/release.
  const armLift = throwing ? throwPhase : Math.sin(now * 1.6 + 1) * 0.06;
  ctx.save();
  ctx.translate(-13, -18);
  ctx.rotate(-armLift * 2.6);
  ctx.fillStyle = APE_COLOR;
  ctx.beginPath();
  ctx.ellipse(0, 10, 6.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawGirl(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(GIRL_POS.x, GIRL_POS.y);
  ctx.fillStyle = GIRL_COLOR;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.lineTo(4, -16);
  ctx.lineTo(-4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -20, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = '#f2d6b3';
  ctx.fill();
  ctx.restore();
}

function drawHammers(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const hammer of state.hammers) {
    if (hammer.taken) continue;
    const girder = GIRDERS[hammer.girderIndex];
    const t = (hammer.x - girder.x1) / (girder.x2 - girder.x1);
    const y = girder.y1 + (girder.y2 - girder.y1) * t;
    ctx.save();
    ctx.translate(hammer.x, y - 10);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#a9a4c9';
    ctx.fillRect(-1.5, -8, 3, 14);
    ctx.fillStyle = '#7c6cf0';
    ctx.fillRect(-6, -13, 12, 7);
    ctx.restore();
  }
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0e0a12';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const girder of GIRDERS) drawGirder(ctx, girder.x1, girder.y1, girder.x2, girder.y2);
  for (const ladder of LADDERS) {
    const below = GIRDERS[ladder.gapIndex];
    const above = GIRDERS[ladder.gapIndex + 1];
    const tBelow = (ladder.x - below.x1) / (below.x2 - below.x1);
    const tAbove = (ladder.x - above.x1) / (above.x2 - above.x1);
    const yBottom = below.y1 + (below.y2 - below.y1) * tBelow;
    const yTop = above.y1 + (above.y2 - above.y1) * tAbove;
    drawLadder(ctx, ladder.x, yTop, yBottom);
  }

  drawHammers(ctx, state);
  drawApe(ctx, state.apeThrowS);
  drawGirl(ctx);
  for (const barrel of state.barrels) drawBarrel(ctx, barrel);
  drawPlayer(ctx, state.player);

  if (state.stageCleared) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE CLEAR!', WIDTH / 2, HEIGHT / 2);
    ctx.restore();
  }
}
