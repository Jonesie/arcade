import { ALIEN_W, PLAYER_H, PLAYER_W, PLAYER_Y, ROW_COLORS, WIDTH, HEIGHT, alienRect, type GameState } from './engine';

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, frame: 0 | 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y, ALIEN_W - 8, 6);
  ctx.fillRect(x, y + 6, ALIEN_W, 6);
  if (frame === 0) {
    ctx.fillRect(x + 2, y + 12, 4, 4);
    ctx.fillRect(x + ALIEN_W - 6, y + 12, 4, 4);
  } else {
    ctx.fillRect(x, y + 12, 4, 4);
    ctx.fillRect(x + ALIEN_W - 4, y + 12, 4, 4);
  }
}

export function render(canvas: HTMLCanvasElement | null, state: GameState): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#050308';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const alien of state.aliens) {
    if (!alien.alive) continue;
    const rect = alienRect(state, alien);
    drawAlien(ctx, rect.x, rect.y, ROW_COLORS[alien.row] ?? '#fff', state.formation.frame);
  }

  if (state.ufo) {
    ctx.fillStyle = '#ff5fa2';
    ctx.fillRect(state.ufo.x, 16, 28, 10);
    ctx.fillRect(state.ufo.x + 8, 12, 12, 4);
  }

  if (state.playerBullet) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(state.playerBullet.x, state.playerBullet.y, 2, 8);
  }
  ctx.fillStyle = '#f7e05f';
  for (const bullet of state.alienBullets) {
    ctx.fillRect(bullet.x, bullet.y, 2, 8);
  }

  const flashHidden = state.player.invulnS > 0 && Math.floor(state.player.invulnS * 10) % 2 === 0;
  if (!flashHidden) {
    ctx.fillStyle = '#5cf27a';
    ctx.fillRect(state.player.x, PLAYER_Y + 6, PLAYER_W, PLAYER_H - 6);
    ctx.fillRect(state.player.x + PLAYER_W / 2 - 3, PLAYER_Y, 6, 8);
  }
}
