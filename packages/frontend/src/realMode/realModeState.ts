/**
 * Site-wide "Real Mode" preference (GitHub issue #6) — off by default,
 * toggled by the cabinet's red button (see ../components/Cabinet.tsx).
 * Same subscribe/toggle pattern as ../audio/musicMuteState and
 * ../audio/sfxMuteState, since this is the same kind of persistent
 * cross-page chrome preference, just not audio-specific.
 */

type Listener = (enabled: boolean) => void;

let enabled = false;
const listeners = new Set<Listener>();

export function isRealModeEnabled(): boolean {
  return enabled;
}

export function setRealModeEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  for (const listener of listeners) listener(enabled);
}

export function toggleRealMode(): boolean {
  setRealModeEnabled(!enabled);
  return enabled;
}

export function subscribeRealMode(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
