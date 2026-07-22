/**
 * Synthesized with the Web Audio API, same reasoning as the other games'
 * sound modules: no binary audio assets, no risk of reproducing any
 * original recordings. Issue #14 only asked for shoot/explosion effects
 * (no music), so that's all this covers.
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

export const sfx = {
  shoot: () => laserShot(),
  explosion: () => noise(0.25, 0.25),
  shipDestroyed: () => noise(0.55, 0.3),
  gameOver: () => tone(110, 0.6, 'sawtooth', 0.2),
};
