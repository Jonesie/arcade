/**
 * Site-wide sound-effects mute preference — independent from
 * musicMuteState.ts, so a player can drop shot/explosion effects but keep
 * the background music, or vice versa. Lives outside any single game for
 * the same reason as musicMuteState.ts: the control for it (a cabinet
 * button, see Cabinet.tsx) is persistent chrome shown on every page, not
 * part of any one game's HUD. Each game's sound.ts reads `isSfxMuted()`
 * before playing a one-shot effect.
 */

type Listener = (muted: boolean) => void;

let muted = false;
const listeners = new Set<Listener>();

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  if (muted === value) return;
  muted = value;
  for (const listener of listeners) listener(muted);
}

export function toggleSfxMuted(): boolean {
  setSfxMuted(!muted);
  return muted;
}

export function subscribeSfxMuted(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
