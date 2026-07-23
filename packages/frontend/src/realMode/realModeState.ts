/**
 * Site-wide "Real Mode" preference (GitHub issue #6) — off by default,
 * toggled by the cabinet's red button (see ../components/Cabinet.tsx).
 * Same subscribe/toggle pattern as ../audio/musicMuteState and
 * ../audio/sfxMuteState, since this is the same kind of persistent
 * cross-page chrome preference, just not audio-specific. Persisted
 * across refreshes (GitHub issue #17) — see ../state/persistedToggle.
 */
import { createPersistedToggle } from '../state/persistedToggle';

const realMode = createPersistedToggle('arcade.realMode', false);

export const isRealModeEnabled = realMode.get;
export const setRealModeEnabled = realMode.set;
export const toggleRealMode = realMode.toggle;
export const subscribeRealMode = realMode.subscribe;
