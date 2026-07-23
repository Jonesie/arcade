/**
 * Site-wide sound-effects mute preference — independent from
 * musicMuteState.ts, so a player can drop shot/explosion effects but keep
 * the background music, or vice versa. Lives outside any single game for
 * the same reason as musicMuteState.ts: the control for it (a cabinet
 * button, see Cabinet.tsx) is persistent chrome shown on every page, not
 * part of any one game's HUD. Each game's sound.ts reads `isSfxMuted()`
 * before playing a one-shot effect. Persisted across refreshes (GitHub
 * issue #17) — see ../state/persistedToggle.
 */
import { createPersistedToggle } from '../state/persistedToggle';

const sfxMuted = createPersistedToggle('arcade.sfxMuted', false);

export const isSfxMuted = sfxMuted.get;
export const setSfxMuted = sfxMuted.set;
export const toggleSfxMuted = sfxMuted.toggle;
export const subscribeSfxMuted = sfxMuted.subscribe;
