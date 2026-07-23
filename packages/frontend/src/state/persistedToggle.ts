/**
 * Factory for a boolean site-wide preference that's both a live pub/sub
 * singleton and persisted to localStorage, so it survives a refresh
 * (GitHub issue #17 — "buttons should remember state"). Replaces the
 * identical hand-rolled subscribe/get/set/toggle pattern that used to be
 * duplicated across musicMuteState.ts, sfxMuteState.ts, and
 * realModeState.ts, each of which is now a thin wrapper around this.
 *
 * localStorage access is wrapped in try/catch — some contexts (private
 * browsing, storage disabled) throw just from touching it, and a
 * preference that's merely session-only there is a reasonable fallback
 * rather than breaking the toggle entirely.
 */
type Listener = (value: boolean) => void;

function readStored(key: string, defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : raw === 'true';
  } catch {
    return defaultValue;
  }
}

function writeStored(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore — the in-memory value still works for the rest of this session.
  }
}

export interface PersistedToggle {
  get: () => boolean;
  set: (value: boolean) => void;
  toggle: () => boolean;
  subscribe: (listener: Listener) => () => void;
}

export function createPersistedToggle(storageKey: string, defaultValue: boolean): PersistedToggle {
  let value = readStored(storageKey, defaultValue);
  const listeners = new Set<Listener>();

  function get(): boolean {
    return value;
  }

  function set(next: boolean): void {
    if (value === next) return;
    value = next;
    writeStored(storageKey, next);
    for (const listener of listeners) listener(value);
  }

  function toggle(): boolean {
    set(!value);
    return value;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { get, set, toggle, subscribe };
}
