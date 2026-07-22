import { ASTEROID_SIZES, HEIGHT, SHIP_RADIUS, WIDTH, type Asteroid, type GameState, type Ship } from './engine';

// Solid, colored rock tones rather than the original's white wireframe
// (see GitHub issue #14) — a slightly different shade per size so the
// splits read clearly as getting smaller, not just "more circles."
const ASTEROID_COLORS = { large: '#9b8b73', medium: '#8a7355', small: '#6f5643' } as const;

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid, color: string): void {
  const radius = ASTEROID_SIZES[asteroid.size].radius;
  const n = asteroid.shape.length;
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const r = radius * asteroid.shape[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_RADIUS - 4);
  ctx.lineTo(SHIP_RADIUS * 0.85, SHIP_RADIUS + 3);
  ctx.lineTo(0, SHIP_RADIUS * 0.35);
  ctx.lineTo(-SHIP_RADIUS * 0.85, SHIP_RADIUS + 3);
  ctx.closePath();
  ctx.fillStyle = '#5cf27a';
  ctx.fill();
  ctx.restore();
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#050308';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const asteroid of state.asteroids) {
    drawAsteroid(ctx, asteroid, ASTEROID_COLORS[asteroid.size]);
  }

  ctx.fillStyle = '#fff5f2';
  for (const bullet of state.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flash the ship while its post-respawn invulnerability is active, same
  // pattern as the other games' hit-flash.
  const hidden = state.ship.invulnS > 0 && Math.floor(state.ship.invulnS * 10) % 2 === 0;
  if (!hidden) drawShip(ctx, state.ship);
}
