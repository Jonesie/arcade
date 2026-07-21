export function TicTacToeIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <g stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round">
        <line x1="20" y1="4" x2="20" y2="56" />
        <line x1="40" y1="4" x2="40" y2="56" />
        <line x1="4" y1="20" x2="56" y2="20" />
        <line x1="4" y1="40" x2="56" y2="40" />
      </g>
      <g stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round">
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="8" y2="16" />
        <line x1="44" y1="44" x2="52" y2="52" />
        <line x1="52" y1="44" x2="44" y2="52" />
      </g>
      <circle cx="30" cy="30" r="7" fill="none" stroke="var(--color-success)" strokeWidth="3" />
    </svg>
  );
}
