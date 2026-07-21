/**
 * Site-wide mute preference. Lives outside any single game because the
 * control for it (a cabinet button, see Cabinet.tsx) is persistent chrome
 * shown on every page, not part of any one game's HUD — so it can't be
 * owned by a single game's own sound module. Each game's sound.ts reads
 * `isMuted()` when it would otherwise play a tone, instead of keeping its
 * own independent enabled flag.
 */

type Listener = (muted: boolean) => void;

let muted = false;
const listeners = new Set<Listener>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  if (muted === value) return;
  muted = value;
  for (const listener of listeners) listener(muted);
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
