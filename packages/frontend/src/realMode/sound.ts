/**
 * Synthesized with the Web Audio API, same reasoning as every game's own
 * sound.ts: no binary audio assets, nothing copyrighted. This module has
 * its own AudioContext (separate from any one game's) since Real Mode
 * events can fire on any game page — `ensureAudio()` is called from the
 * cabinet's Real Mode toggle button (see ../components/Cabinet.tsx),
 * which is a genuine user gesture even though the events themselves fire
 * on a random timer, not from a direct click. Gated on the sfx mute
 * (../audio/sfxMuteState) — these are one-shot event stingers, not music.
 */
import { isSfxMuted } from '../audio/sfxMuteState';

let audioCtx: AudioContext | null = null;

export function ensureAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
}

function noiseBurst(duration: number, gain: number, filterType?: BiquadFilterType, filterFreq?: number): void {
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

  if (filterType) {
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq ?? 800;
    source.connect(filter);
    filter.connect(g);
  } else {
    source.connect(g);
  }
  g.connect(ctx.destination);
  source.start(now);
}

function thump(freqFrom: number, freqTo: number, duration: number, type: OscillatorType, gain: number): void {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(freqFrom, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), now + duration);
  g.gain.setValueAtTime(0.001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + Math.min(0.02, duration / 4));
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// A chopped/gated noise burst — on-off-on-off rather than one smooth
// decay — reads as a glitchy signal dropout instead of a clean effect.
function machineFailure(): void {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const bufferSize = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  let t = now;
  const gateOn = 0.04;
  g.gain.setValueAtTime(0, now);
  for (let i = 0; i < 14 && t < now + 1.1; i++) {
    g.gain.setValueAtTime(0.22, t);
    g.gain.setValueAtTime(0, t + gateOn);
    t += gateOn + 0.03 * (0.6 + Math.random());
  }
  source.connect(g);
  g.connect(ctx.destination);
  source.start(now);
  source.stop(now + 1.3);
}

function foodSplat(): void {
  thump(160, 60, 0.22, 'sine', 0.3);
  noiseBurst(0.25, 0.25, 'lowpass', 900);
}

function boganAttack(): void {
  thump(180, 60, 0.32, 'sawtooth', 0.28);
  noiseBurst(0.3, 0.2, 'bandpass', 500);
}

// Several quick, slightly-randomly-timed thuds rather than one hit — a
// scuffle instead of a single punch.
function fight(): void {
  const hits = 4;
  for (let i = 0; i < hits; i++) {
    setTimeout(() => noiseBurst(0.12, 0.22, 'lowpass', 700 + Math.random() * 400), i * (110 + Math.random() * 70));
  }
}

// A classic two-tone "nee-naw" siren wail: one oscillator whose frequency
// sweeps back and forth a few times over ~2.4s.
function copsArrive(): void {
  if (isSfxMuted() || !audioCtx) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime;
  const duration = 2.4;
  const cycles = 4;
  const cycleLen = duration / cycles;
  for (let i = 0; i < cycles; i++) {
    const t0 = now + i * cycleLen;
    osc.frequency.setValueAtTime(500, t0);
    osc.frequency.linearRampToValueAtTime(900, t0 + cycleLen / 2);
    osc.frequency.linearRampToValueAtTime(500, t0 + cycleLen);
  }
  g.gain.setValueAtTime(0.16, now);
  g.gain.setValueAtTime(0.16, now + duration - 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

export const sfx = {
  machineFailure,
  foodSplat,
  boganAttack,
  fight,
  copsArrive,
};
