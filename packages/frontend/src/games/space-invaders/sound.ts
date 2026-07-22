/**
 * Sound effects synthesized with the Web Audio API rather than shipped as
 * audio files — no binary assets to add to the repo, and no risk of
 * reproducing the original game's actual copyrighted sound recordings.
 * `AudioContext` needs a user gesture before it can play; `ensureAudio()` is
 * called from the "Start"/"Play again" button handlers, which counts.
 *
 * Mute is a site-wide preference (a cabinet button, not part of this
 * game's own HUD) — see ../../audio/muteState.
 */
import { isMuted } from '../../audio/muteState';

let audioCtx: AudioContext | null = null;

export function ensureAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
}

function tone(freq: number, duration: number, type: OscillatorType, gain: number) {
  if (isMuted() || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

// The player's own shot: a fast-plunging sawtooth (the core "pew" swoop)
// layered with a quieter, brighter octave-up square that decays faster —
// that second layer is what gives it some bite/sparkle right at the
// start instead of reading as a single flat blip.
function laserShot() {
  if (isMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const duration = 0.14;

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(2200, now);
  body.frequency.exponentialRampToValueAtTime(160, now + duration);
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.18, now + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(now);
  body.stop(now + duration);

  const sparkleDuration = duration * 0.7;
  const sparkle = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkle.type = 'square';
  sparkle.frequency.setValueAtTime(4400, now);
  sparkle.frequency.exponentialRampToValueAtTime(320, now + sparkleDuration);
  sparkleGain.gain.setValueAtTime(0.0001, now);
  sparkleGain.gain.exponentialRampToValueAtTime(0.06, now + 0.006);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + sparkleDuration);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(ctx.destination);
  sparkle.start(now);
  sparkle.stop(now + sparkleDuration);
}

function noise(duration: number, gain: number) {
  if (isMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(g);
  g.connect(ctx.destination);
  source.start(now);
}

const MARCH_NOTES = [220, 196, 175, 165];

export const sfx = {
  shoot: () => laserShot(),
  invaderHit: () => noise(0.12, 0.2),
  ufoHit: () => tone(1200, 0.22, 'sawtooth', 0.15),
  playerHit: () => noise(0.45, 0.28),
  march: (beat: number) => tone(MARCH_NOTES[beat % MARCH_NOTES.length], 0.1, 'square', 0.09),
  waveClear: () => tone(660, 0.3, 'triangle', 0.16),
  gameOver: () => tone(110, 0.6, 'sawtooth', 0.2),
};
