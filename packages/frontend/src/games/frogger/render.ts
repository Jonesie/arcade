import { COLS, HOME_ROW, HOME_SLOT_COLS, isObstacleAt, laneAt, ROWS, type GameState } from '@arcade/shared';

export const CELL = 32;
export const WIDTH = COLS * CELL;
export const HEIGHT = ROWS * CELL;

const SAFE_COLOR = '#1d3d1f';
const ROAD_COLOR = '#232323';
const RIVER_COLOR = '#0f3a5c';
const HOME_COLOR = '#12321a';
const CAR_COLORS = ['#e5533d', '#e0a72a', '#9b59c8'];
const LOG_COLOR = '#6b4423';

export function render(canvas: HTMLCanvasElement | null, state: GameState, tick: number): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (let row = 0; row < ROWS; row++) {
    const lane = laneAt(row);
    let color = SAFE_COLOR;
    if (lane?.kind === 'road') color = ROAD_COLOR;
    else if (lane?.kind === 'river') color = RIVER_COLOR;
    else if (row === HOME_ROW) color = HOME_COLOR;
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL, WIDTH, CELL);
  }

  ctx.fillStyle = '#0a2010';
  for (let col = 0; col < COLS; col++) {
    if (!HOME_SLOT_COLS.includes(col)) {
      ctx.fillRect(col * CELL, HOME_ROW * CELL, CELL, CELL);
    }
  }
  HOME_SLOT_COLS.forEach((col, i) => {
    ctx.fillStyle = state.slotsFilled[i] ? '#3fae52' : '#12321a';
    ctx.fillRect(col * CELL + 3, HOME_ROW * CELL + 3, CELL - 6, CELL - 6);
    if (state.slotsFilled[i]) {
      ctx.fillStyle = '#5cf27a';
      ctx.beginPath();
      ctx.arc(col * CELL + CELL / 2, HOME_ROW * CELL + CELL / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  for (let row = 0; row < ROWS; row++) {
    const lane = laneAt(row);
    if (!lane) continue;
    ctx.fillStyle = lane.kind === 'road' ? CAR_COLORS[row % CAR_COLORS.length] : LOG_COLOR;
    for (let col = 0; col < COLS; col++) {
      if (isObstacleAt(lane, col, tick, state.level)) {
        ctx.fillRect(col * CELL, row * CELL + 3, CELL, CELL - 6);
      }
    }
  }

  const x = state.frogCol * CELL;
  const y = state.frogRow * CELL;
  ctx.fillStyle = '#5cf27a';
  ctx.beginPath();
  ctx.ellipse(x + CELL / 2, y + CELL / 2, CELL / 2 - 4, CELL / 2 - 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a2010';
  ctx.beginPath();
  ctx.arc(x + CELL / 2 - 6, y + CELL / 2 - 5, 2.4, 0, Math.PI * 2);
  ctx.arc(x + CELL / 2 + 6, y + CELL / 2 - 5, 2.4, 0, Math.PI * 2);
  ctx.fill();
}
