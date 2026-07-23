// A converging-lines "trench" wireframe plus a generic wedge fighter
// silhouette — stroke-only, fitting a vector-graphics game, and
// deliberately generic rather than any recognizable ship/station
// likeness (see the trademark-care note on GitHub issue #16).
export function StarWarsIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <path
        d="M6 12 L30 28 L54 12 M6 48 L30 28 L54 48"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1.5"
      />
      <polygon points="30,20 42,40 30,34 18,40" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
    </svg>
  );
}
