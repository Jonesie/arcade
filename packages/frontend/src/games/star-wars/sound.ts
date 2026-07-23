/**
 * Synthesized with the Web Audio API, same reasoning as every other
 * game's sound module: no binary audio assets, and deliberately no quote
 * of the original film score or its sound design — an original driving
 * theme and original effects in the same spirit (see GitHub issue #16's
 * sound note). Music and sound effects are muted independently (two
 * separate cabinet buttons) — see ../../audio/musicMuteState and
 * ../../audio/sfxMuteState.
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

// Same two-layer "pew" as every other shooter on this site (see
// GitHub issue's earlier "pew pew" pass) — a plunging sawtooth body plus
// a brighter, faster-decaying square sparkle.
function laserShot() {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const duration = 0.13;

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sawtooth';
  body.frequency.setValueAtTime(2400, now);
  body.frequency.exponentialRampToValueAtTime(180, now + duration);
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.16, now + 0.007);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(now);
  body.stop(now + duration);

  const sparkleDuration = duration * 0.7;
  const sparkle = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkle.type = 'square';
  sparkle.frequency.setValueAtTime(4800, now);
  sparkle.frequency.exponentialRampToValueAtTime(340, now + sparkleDuration);
  sparkleGain.gain.setValueAtTime(0.0001, now);
  sparkleGain.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + sparkleDuration);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(ctx.destination);
  sparkle.start(now);
  sparkle.stop(now + sparkleDuration);
}

export const sfx = {
  fire: () => laserShot(),
  turretDestroyed: () => {
    noise(0.22, 0.24);
    sweep(260, 60, 0.22, 'sawtooth', 0.18);
  },
  enemyBoltFired: () => sweep(900, 300, 0.1, 'sawtooth', 0.09),
  playerHit: () => {
    noise(0.28, 0.26);
    sweep(200, 60, 0.35, 'square', 0.16);
  },
  portHit: () => {
    [523, 659, 784, 988, 1319].forEach((freq, i) => tone(freq, 0.2, 'triangle', 0.17, i * 0.09));
  },
  gameOver: () => sweep(220, 55, 0.9, 'sawtooth', 0.2),
};

// An original driving ostinato — a fast, low, relentless repeated-note
// pulse (evoking the speed of the trench run) under a sparse higher
// motif — rather than any quote of the film score. Self-rescheduling
// timeout loop, same pattern as the other games' music, gated on the
// music mute rather than sfx.
const MUSIC_BASS = [110, 110, 131, 110, 98, 98, 131, 110];
const MUSIC_LEAD = [0, 0, 440, 0, 0, 0, 523, 494];
const MUSIC_STEP_S = 0.12;

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
  g.gain.exponentialRampToValueAtTime(0.001, now + MUSIC_STEP_S * 0.85);
  osc.start(now);
  osc.stop(now + MUSIC_STEP_S * 0.85);
}

function scheduleMusicStep() {
  musicNote(MUSIC_BASS[musicStep % MUSIC_BASS.length], 'sawtooth', 0.07);
  musicNote(MUSIC_LEAD[musicStep % MUSIC_LEAD.length], 'square', 0.06);
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
