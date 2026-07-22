import { GROUND_Y, HEIGHT, SHIP_H, SHIP_W, WIDTH, WORLD_WIDTH, wrapDelta, wrapPos, type GameState, type Humanoid } from './engine';

// Two parallax star layers, generated once at module load and positioned
// in *world* space so they scroll and wrap exactly like everything else
// (see wrapDelta below) — the only difference is each layer's delta from
// the camera is scaled down before being drawn, so far stars crawl by
// slower than near ones, which is what actually sells "this is a big
// scrolling world" rather than a static backdrop.
interface Star {
  x: number;
  y: number;
  layer: 0 | 1;
  size: number;
}

const STAR_COUNT = 100;
const STARS: Star[] = Array.from({ length: STAR_COUNT }, () => ({
  x: Math.random() * WORLD_WIDTH,
  y: 8 + Math.random() * (GROUND_Y - 50),
  layer: Math.random() < 0.55 ? 0 : 1,
  size: Math.random() < 0.5 ? 1 : 2,
}));
const PARALLAX_FACTOR: Record<0 | 1, number> = { 0: 0.35, 1: 0.65 };

const RADAR_X = 8;
const RADAR_Y = 6;
const RADAR_W = WIDTH - 16;
const RADAR_H = 14;

/** Gentle periodic rolling-hill line — a pure function of world x (built
 * from sines whose frequencies are whole multiples of the world's period)
 * so it lines up seamlessly at the wrap seam without storing anything. */
function terrainOffset(worldX: number): number {
  const t = (worldX / WORLD_WIDTH) * Math.PI * 2;
  return Math.sin(t * 3) * 5 + Math.sin(t * 7 + 1.3) * 3;
}

function screenX(cameraX: number, worldX: number): number {
  return WIDTH / 2 + wrapDelta(cameraX, worldX, WORLD_WIDTH);
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, hidden: boolean): void {
  if (hidden) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.beginPath();
  ctx.moveTo(SHIP_W / 2, 0);
  ctx.lineTo(-SHIP_W / 2, -SHIP_H / 2);
  ctx.lineTo(-SHIP_W / 4, 0);
  ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);
  ctx.closePath();
  ctx.fillStyle = '#5cf27a';
  ctx.fill();
  ctx.restore();
}

function drawHumanoid(ctx: CanvasRenderingContext2D, x: number, y: number, humanoid: Humanoid): void {
  const color = humanoid.state === 'falling' ? '#ffe14d' : '#5fa8ff';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2, y - 4, 4, 6);
  ctx.fillRect(x - 4, y - 4, 2, 4);
  ctx.fillRect(x + 2, y - 4, 2, 4);
  ctx.fillRect(x - 3, y + 2, 2, 3);
  ctx.fillRect(x + 1, y + 2, 2, 3);
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cameraX = state.player.x;

  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of STARS) {
    const delta = wrapDelta(cameraX, star.x, WORLD_WIDTH) * PARALLAX_FACTOR[star.layer];
    const x = WIDTH / 2 + delta;
    if (x < -4 || x > WIDTH + 4) continue;
    ctx.fillStyle = star.layer === 1 ? 'rgba(220, 220, 255, 0.8)' : 'rgba(150, 150, 200, 0.5)';
    ctx.fillRect(x, star.y, star.size, star.size);
  }

  // Ground: a gentle rolling line rather than a flat bar, sampled densely
  // enough that the wrap seam is invisible.
  ctx.strokeStyle = '#2a6b3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let sx = 0; sx <= WIDTH; sx += 8) {
    const worldX = wrapPos(cameraX - WIDTH / 2 + sx, WORLD_WIDTH);
    const y = GROUND_Y + terrainOffset(worldX);
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(42, 107, 58, 0.25)';
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();

  for (const humanoid of state.humanoids) {
    if (humanoid.state === 'dead') continue;
    const x = screenX(cameraX, humanoid.x);
    if (x < -10 || x > WIDTH + 10) continue;
    const y = GROUND_Y - humanoid.y;
    drawHumanoid(ctx, x, y, humanoid);
  }

  for (const enemy of state.enemies) {
    const x = screenX(cameraX, enemy.x);
    if (x < -20 || x > WIDTH + 20) continue;
    if (enemy.kind === 'lander') {
      ctx.fillStyle = enemy.carryingHumanoidId != null ? '#ff8a4d' : '#ff4d6a';
      ctx.beginPath();
      ctx.ellipse(x, enemy.y, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, enemy.y - 4, 5, 4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#b06bff';
      ctx.beginPath();
      ctx.moveTo(x - 12, enemy.y);
      ctx.lineTo(x, enemy.y - 6);
      ctx.lineTo(x + 12, enemy.y);
      ctx.lineTo(x, enemy.y + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = '#ff5f5f';
  for (const bomb of state.bombs) {
    const x = screenX(cameraX, bomb.x);
    if (x < -6 || x > WIDTH + 6) continue;
    ctx.beginPath();
    ctx.arc(x, bomb.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff98a';
  for (const bullet of state.bullets) {
    const x = screenX(cameraX, bullet.x);
    if (x < -8 || x > WIDTH + 8) continue;
    ctx.fillRect(x - (bullet.vx > 0 ? 6 : 0), bullet.y - 1, 6, 2);
  }

  const hidden = state.player.invulnS > 0 && Math.floor(state.player.invulnS * 10) % 2 === 0;
  drawShip(ctx, WIDTH / 2, state.player.y, state.player.facing, hidden);

  // Radar: the whole world laid out linearly (not camera-relative — this
  // is the "see the whole planet at once" map, same idea as the original
  // cabinet's radar strip), with a viewport box and colored blips.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(RADAR_X, RADAR_Y, RADAR_W, RADAR_H);

  const halfView = WIDTH / 2;
  const viewStart = wrapPos(cameraX - halfView, WORLD_WIDTH) / WORLD_WIDTH;
  const viewEnd = wrapPos(cameraX + halfView, WORLD_WIDTH) / WORLD_WIDTH;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  if (viewStart <= viewEnd) {
    ctx.fillRect(RADAR_X + viewStart * RADAR_W, RADAR_Y, (viewEnd - viewStart) * RADAR_W, RADAR_H);
  } else {
    ctx.fillRect(RADAR_X + viewStart * RADAR_W, RADAR_Y, RADAR_W - viewStart * RADAR_W, RADAR_H);
    ctx.fillRect(RADAR_X, RADAR_Y, viewEnd * RADAR_W, RADAR_H);
  }

  for (const humanoid of state.humanoids) {
    if (humanoid.state === 'dead' || humanoid.state === 'falling') continue;
    ctx.fillStyle = humanoid.state === 'grabbed' ? '#ffe14d' : '#5fa8ff';
    const rx = RADAR_X + (humanoid.x / WORLD_WIDTH) * RADAR_W;
    ctx.fillRect(rx - 1, RADAR_Y + 3, 2, RADAR_H - 6);
  }
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.kind === 'lander' ? '#ff4d6a' : '#b06bff';
    const rx = RADAR_X + (enemy.x / WORLD_WIDTH) * RADAR_W;
    ctx.fillRect(rx - 1, RADAR_Y + 2, 2, RADAR_H - 4);
  }
  const px = RADAR_X + (state.player.x / WORLD_WIDTH) * RADAR_W;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px, RADAR_Y - 2);
  ctx.lineTo(px - 3, RADAR_Y + RADAR_H + 2);
  ctx.lineTo(px + 3, RADAR_Y + RADAR_H + 2);
  ctx.closePath();
  ctx.fill();
}
