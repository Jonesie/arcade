/**
 * Synthesized with the Web Audio API, same reasoning as the other games'
 * sound modules: no binary audio assets, no risk of reproducing any
 * original recordings. Defender gets more attention here than the other
 * games — frequency *sweeps* instead of flat tones for anything that
 * should feel like it's falling, panicking, or dying (the humanoid's
 * scream, the smart bomb), a two-layer "pew" for the laser (see
 * laserShot), and a persistent thrust drone that's ramped rather than
 * retriggered every frame, so holding a direction doesn't sound like a
 * machine gun of clicks.
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

function chime(): void {
  tone(660, 0.09, 'square', 0.11);
  setTimeout(() => tone(880, 0.09, 'square', 0.11), 70);
  setTimeout(() => tone(1175, 0.16, 'square', 0.13), 140);
}

export const sfx = {
  shoot: () => laserShot(),
  enemyKilled: () => {
    noise(0.22, 0.2);
    tone(90, 0.22, 'triangle', 0.16);
  },
  humanoidGrabbed: () => sweep(750, 220, 0.35, 'sawtooth', 0.12),
  humanoidRescued: () => chime(),
  humanoidLost: () => sweep(500, 70, 0.45, 'sawtooth', 0.16),
  smartBomb: () => {
    noise(0.6, 0.28);
    sweep(240, 35, 0.6, 'sawtooth', 0.22);
  },
  playerHit: () => noise(0.45, 0.28),
  waveClear: () => tone(523, 0.28, 'triangle', 0.15),
  gameOver: () => sweep(220, 60, 0.7, 'sawtooth', 0.2),
};

// A low, continuous engine hum while thrusting — ramped smoothly via
// setTargetAtTime rather than started/stopped every frame, so tapping a
// direction key doesn't produce a click and holding it doesn't retrigger
// anything. The oscillator itself is created once and left running at
// zero gain between thrust bursts; only stopThrust() (on game end) tears
// it down.
let thrustOsc: OscillatorNode | null = null;
let thrustGain: GainNode | null = null;

export function setThrust(active: boolean): void {
  if (!audioCtx) return;
  const shouldSound = active && !isMuted();

  if (!thrustOsc) {
    thrustOsc = audioCtx.createOscillator();
    thrustGain = audioCtx.createGain();
    thrustOsc.type = 'sawtooth';
    thrustOsc.frequency.value = 65;
    thrustGain.gain.value = 0;
    thrustOsc.connect(thrustGain);
    thrustGain.connect(audioCtx.destination);
    thrustOsc.start();
  }

  const now = audioCtx.currentTime;
  thrustGain!.gain.setTargetAtTime(shouldSound ? 0.05 : 0, now, 0.08);
}

export function stopThrust(): void {
  if (thrustOsc) {
    thrustOsc.stop();
    thrustOsc.disconnect();
    thrustGain?.disconnect();
    thrustOsc = null;
    thrustGain = null;
  }
}
