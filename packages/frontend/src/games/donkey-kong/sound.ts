/**
 * Synthesized with the Web Audio API, same reasoning as the other games'
 * sound modules: no binary audio assets, no risk of reproducing any of
 * the original's actual recordings — including its famous intro jingle,
 * which this deliberately doesn't quote. Music and sound effects are
 * muted independently (two separate cabinet buttons) — see
 * ../../audio/musicMuteState and ../../audio/sfxMuteState.
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

function tone(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0) {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
}

function sweep(freqFrom: number, freqTo: number, duration: number, type: OscillatorType, gain: number) {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, now);
  osc.frequency.exponentialRampToValueAtTime(freqTo, now + duration);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
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
  jump: () => sweep(300, 560, 0.14, 'square', 0.14),
  jumpOver: () => tone(1100, 0.08, 'square', 0.1),
  hammerPickup: () => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.14, 'triangle', 0.15, i * 0.07));
  },
  barrelSmash: () => {
    noise(0.2, 0.28);
    sweep(200, 60, 0.18, 'sawtooth', 0.18);
  },
  playerHit: () => {
    sweep(500, 90, 0.5, 'sawtooth', 0.22);
    noise(0.3, 0.15);
  },
  gameOver: () => sweep(220, 55, 0.9, 'sawtooth', 0.2),
  stageClear: () => {
    [523, 659, 784, 1047, 1319].forEach((freq, i) => tone(freq, 0.18, 'triangle', 0.16, i * 0.1));
  },
};

// An original bouncy adventure-serial theme (square lead over a triangle
// bass note each bar) rather than any quote of the actual arcade's iconic
// jingle — self-rescheduling timeout loop, same pattern as the other
// games' music, gated on the music mute rather than sfx.
const MUSIC_LEAD = [784, 880, 988, 880, 784, 660, 784, 0, 988, 1047, 1175, 1047, 988, 880, 988, 0];
const MUSIC_BASS = [196, 0, 220, 0, 196, 0, 165, 0, 247, 0, 262, 0, 247, 0, 220, 0];
const MUSIC_STEP_S = 0.16;

let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function musicNote(freq: number, type: OscillatorType, gain: number) {
  if (isMusicMuted() || !audioCtx || freq <= 0) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + MUSIC_STEP_S * 0.9);
  osc.start(now);
  osc.stop(now + MUSIC_STEP_S * 0.9);
}

function scheduleMusicStep() {
  musicNote(MUSIC_LEAD[musicStep % MUSIC_LEAD.length], 'square', 0.07);
  musicNote(MUSIC_BASS[musicStep % MUSIC_BASS.length], 'triangle', 0.09);
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
