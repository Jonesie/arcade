/**
 * Simple inline-SVG icons for games that are on the roadmap but not built
 * yet (see the "game" issues on GitHub). Stylized silhouettes in the site's
 * existing accent colors, not attempts at reproducing the original sprite
 * art. Once a game is actually implemented, give it its own icon alongside
 * its component (see TicTacToeIcon.tsx) and drop its entry here.
 */

export function FroggerIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <g fill="var(--color-success)">
        <ellipse cx="30" cy="34" rx="16" ry="13" />
        <circle cx="20" cy="18" r="6" />
        <circle cx="40" cy="18" r="6" />
        <ellipse cx="10" cy="42" rx="5" ry="3" />
        <ellipse cx="50" cy="42" rx="5" ry="3" />
        <ellipse cx="16" cy="52" rx="5" ry="3" />
        <ellipse cx="44" cy="52" rx="5" ry="3" />
      </g>
      <circle cx="20" cy="17" r="2.4" fill="var(--color-bg)" />
      <circle cx="40" cy="17" r="2.4" fill="var(--color-bg)" />
    </svg>
  );
}

export function DefenderIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <path d="M8 30 L38 16 L30 30 L38 44 Z" fill="var(--color-primary-hover)" />
    </svg>
  );
}
