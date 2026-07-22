/**
 * Site-wide music mute preference — independent from sfxMuteState.ts, so a
 * player can drop the background music but keep hearing shot/explosion
 * effects, or vice versa. Lives outside any single game because the
 * control for it (a cabinet button, see Cabinet.tsx) is persistent chrome
 * shown on every page, not part of any one game's HUD. Each game's
 * sound.ts reads `isMusicMuted()` before starting/continuing its music
 * loop, instead of keeping its own independent enabled flag.
 */

type Listener = (muted: boolean) => void;

let muted = false;
const listeners = new Set<Listener>();

export function isMusicMuted(): boolean {
  return muted;
}

export function setMusicMuted(value: boolean): void {
  if (muted === value) return;
  muted = value;
  for (const listener of listeners) listener(muted);
}

export function toggleMusicMuted(): boolean {
  setMusicMuted(!muted);
  return muted;
}

export function subscribeMusicMuted(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
