/**
 * Simple inline-SVG icons for games that are on the roadmap but not built
 * yet (see the "game" issues on GitHub). Stylized silhouettes in the site's
 * existing accent colors, not attempts at reproducing the original sprite
 * art. Once a game is actually implemented, give it its own icon alongside
 * its component (see TicTacToeIcon.tsx) and drop its entry here.
 */

export function DonkeyKongIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <rect x="13" y="12" width="34" height="36" rx="11" fill="var(--color-danger)" />
      <rect x="13" y="20" width="34" height="3" fill="rgba(0, 0, 0, 0.35)" />
      <rect x="13" y="29" width="34" height="3" fill="rgba(0, 0, 0, 0.35)" />
      <rect x="13" y="38" width="34" height="3" fill="rgba(0, 0, 0, 0.35)" />
    </svg>
  );
}
