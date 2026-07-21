const INVADER_ROWS = ['.XX.XX.', 'XXXXXXX', 'XX.X.XX', 'XXXXXXX', 'X.X.X.X'];

export function SpaceInvadersIcon() {
  const cell = 8;
  const offsetX = 2;
  const offsetY = 10;
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <g fill="var(--color-primary)">
        {INVADER_ROWS.flatMap((row, y) =>
          row
            .split('')
            .map((c, x) =>
              c === 'X' ? (
                <rect key={`${x}-${y}`} x={offsetX + x * cell} y={offsetY + y * cell} width={cell} height={cell} />
              ) : null,
            ),
        )}
      </g>
    </svg>
  );
}
