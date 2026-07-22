/**
 * Simple inline-SVG icons for games that are on the roadmap but not built
 * yet (see the "game" issues on GitHub). Stylized silhouettes in the site's
 * existing accent colors, not attempts at reproducing the original sprite
 * art. Once a game is actually implemented, give it its own icon alongside
 * its component (see TicTacToeIcon.tsx) and drop its entry here.
 */

export function DefenderIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <path d="M8 30 L38 16 L30 30 L38 44 Z" fill="var(--color-primary-hover)" />
    </svg>
  );
}

export function AsteroidsIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <path
        d="M20 8 L34 10 L46 20 L50 34 L40 46 L26 50 L12 42 L8 28 L14 16 Z"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M30 22 L36 34 L30 31 L24 34 Z" fill="var(--color-primary)" />
    </svg>
  );
}
