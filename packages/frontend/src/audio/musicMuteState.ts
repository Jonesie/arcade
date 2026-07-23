/**
 * Site-wide music mute preference — independent from sfxMuteState.ts, so a
 * player can drop the background music but keep hearing shot/explosion
 * effects, or vice versa. Lives outside any single game because the
 * control for it (a cabinet button, see Cabinet.tsx) is persistent chrome
 * shown on every page, not part of any one game's HUD. Each game's
 * sound.ts reads `isMusicMuted()` before starting/continuing its music
 * loop, instead of keeping its own independent enabled flag. Persisted
 * across refreshes (GitHub issue #17) — see ../state/persistedToggle.
 */
import { createPersistedToggle } from '../state/persistedToggle';

const musicMuted = createPersistedToggle('arcade.musicMuted', false);

export const isMusicMuted = musicMuted.get;
export const setMusicMuted = musicMuted.set;
export const toggleMusicMuted = musicMuted.toggle;
export const subscribeMusicMuted = musicMuted.subscribe;
