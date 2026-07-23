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

// Stroke-only "vector monitor" wireframe rather than a filled shape (see
// DonkeyKongIcon above) — fitting for a vector-graphics game, and a
// generic wedge/chevron rather than any recognizable ship silhouette
// (see the trademark-care note on GitHub issue #16).
export function StarWarsIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <polygon points="30,10 46,46 30,38 14,46" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      <line x1="30" y1="10" x2="30" y2="38" stroke="var(--color-primary)" strokeWidth="2" />
    </svg>
  );
}
