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

// A quick descending-pitch sweep reads as a much more "pew pew" laser
// blaster than a flat tone — used for the player's own shot.
function sweep(freqFrom: number, freqTo: number, duration: number, type: OscillatorType, gain: number) {
  if (isMuted() || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(freqFrom, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), now + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
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
  shoot: () => sweep(1400, 500, 0.09, 'square', 0.11),
  invaderHit: () => noise(0.12, 0.2),
  ufoHit: () => tone(1200, 0.22, 'sawtooth', 0.15),
  playerHit: () => noise(0.45, 0.28),
  march: (beat: number) => tone(MARCH_NOTES[beat % MARCH_NOTES.length], 0.1, 'square', 0.09),
  waveClear: () => tone(660, 0.3, 'triangle', 0.16),
  gameOver: () => tone(110, 0.6, 'sawtooth', 0.2),
};
