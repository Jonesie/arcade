import { ENEMY_W, HEIGHT, PLAYER_H, PLAYER_W, PLAYER_Y, TIERS, WIDTH, type GameState } from './engine';

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y, ENEMY_W - 8, 4);
  ctx.fillRect(x, y + 4, ENEMY_W, 8);
  ctx.fillRect(x + 2, y + 12, 4, 4);
  ctx.fillRect(x + ENEMY_W - 6, y + 12, 4, 4);
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#050308';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const enemy of state.enemies) {
    const cfg = TIERS[enemy.tier];
    const color = enemy.damaged && cfg.damagedColor ? cfg.damagedColor : cfg.color;
    drawEnemy(ctx, enemy.x, enemy.y, color);
  }

  // A glowing bolt reads as more "pew pew" than a flat white sliver.
  ctx.save();
  ctx.shadowColor = '#8fe3ff';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#eafcff';
  for (const bullet of state.playerBullets) {
    ctx.fillRect(bullet.x - 0.5, bullet.y, 3, 10);
  }
  ctx.restore();
  ctx.fillStyle = '#ff5f5f';
  for (const bullet of state.enemyBullets) {
    ctx.fillRect(bullet.x, bullet.y, 2, 8);
  }

  const flashHidden = state.player.invulnS > 0 && Math.floor(state.player.invulnS * 10) % 2 === 0;
  if (!flashHidden) {
    ctx.fillStyle = '#5cf27a';
    ctx.fillRect(state.player.x, PLAYER_Y + 6, PLAYER_W, PLAYER_H - 6);
    ctx.fillRect(state.player.x + PLAYER_W / 2 - 3, PLAYER_Y, 6, 8);
  }
}
