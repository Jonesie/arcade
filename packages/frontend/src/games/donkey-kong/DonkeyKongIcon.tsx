// A generic girders/ladder/barrel silhouette rather than any likeness of
// the original's trademarked characters (see GitHub issue #15's scope
// note) — same stylized-shapes approach as every other game's icon here.
export function DonkeyKongIcon() {
  return (
    <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true">
      <line x1="8" y1="44" x2="52" y2="36" stroke="var(--color-danger)" strokeWidth="5" strokeLinecap="round" />
      <line x1="8" y1="20" x2="52" y2="12" stroke="var(--color-danger)" strokeWidth="5" strokeLinecap="round" />
      <line x1="20" y1="16" x2="20" y2="40" stroke="var(--color-text-muted)" strokeWidth="2" />
      <line x1="28" y1="14" x2="28" y2="38" stroke="var(--color-text-muted)" strokeWidth="2" />
      <line x1="20" y1="22" x2="28" y2="21" stroke="var(--color-text-muted)" strokeWidth="2" />
      <line x1="20" y1="30" x2="28" y2="29" stroke="var(--color-text-muted)" strokeWidth="2" />
      <circle cx="42" cy="28" r="7" fill="var(--color-primary)" />
    </svg>
  );
}
