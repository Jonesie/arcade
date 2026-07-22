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
