/**
 * Synthesized with the Web Audio API — same reasoning as the other games'
 * sound modules. Music and sound effects are muted independently (two
 * separate cabinet buttons) — see ../../audio/musicMuteState and
 * ../../audio/sfxMuteState. The real Frogger has a cheerful, bouncy little
 * loop running throughout play; the one below is an original tune in that
 * same light, playful spirit rather than a reproduction of it.
 */
import { isMusicMuted } from '../../audio/musicMuteState';
import { isSfxMuted } from '../../audio/sfxMuteState';

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
  if (isSfxMuted() || !audioCtx) return;
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

function noise(duration: number, gain: number) {
  if (isSfxMuted() || !audioCtx) return;
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

export const sfx = {
  hop: () => tone(520, 0.06, 'square', 0.09),
  slotFilled: () => tone(880, 0.25, 'triangle', 0.16),
  levelClear: () => tone(660, 0.35, 'triangle', 0.18),
  died: () => noise(0.4, 0.25),
  gameOver: () => tone(110, 0.6, 'sawtooth', 0.2),
};

// A light, bouncy major-key loop — self-rescheduling timeout, same
// pattern as the other games' music, gated on the music mute.
const MUSIC_NOTES = [523, 659, 784, 659, 523, 659, 784, 1047, 988, 784, 659, 523, 587, 698, 880, 698];
const MUSIC_STEP_S = 0.16;

let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function musicTone(freq: number, duration: number, type: OscillatorType, gain: number) {
  if (isMusicMuted() || !audioCtx) return;
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

function scheduleMusicStep() {
  musicTone(MUSIC_NOTES[musicStep % MUSIC_NOTES.length], MUSIC_STEP_S * 0.8, 'triangle', 0.05);
  musicStep += 1;
  musicTimer = setTimeout(scheduleMusicStep, MUSIC_STEP_S * 1000);
}

export function startMusic(): void {
  if (musicTimer) return;
  musicStep = 0;
  scheduleMusicStep();
}

export function stopMusic(): void {
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}
