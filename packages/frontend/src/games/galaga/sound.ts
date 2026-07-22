/**
 * Synthesized with the Web Audio API, same reasoning as
 * space-invaders/sound.ts: no binary audio assets, no risk of reproducing
 * the original game's actual recordings. Each game keeps its own small
 * sound module rather than sharing one, so games stay self-contained (see
 * doc/adding-a-game.md) — except mute itself, which is a site-wide cabinet
 * button rather than part of any one game's HUD (see ../../audio/muteState).
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
  enemyHit: () => tone(500, 0.08, 'triangle', 0.12),
  enemyKilled: () => noise(0.16, 0.22),
  enemyFire: () => tone(300, 0.12, 'sawtooth', 0.08),
  playerHit: () => noise(0.45, 0.28),
  waveClear: () => tone(660, 0.3, 'triangle', 0.16),
  gameOver: () => tone(110, 0.6, 'sawtooth', 0.2),
};

// A short looping background arpeggio — an original chiptune-style riff in
// the spirit of the arcade, not a reproduction of the real Galaga
// soundtrack (which is copyrighted). Runs off a self-rescheduling timeout
// rather than Web Audio's own clock, which is precise enough at this tempo
// and much simpler than a lookahead scheduler. `tone()` already no-ops
// while muted, so the scheduler just keeps ticking silently — toggling
// sound back on resumes immediately without restarting the loop.
const MUSIC_NOTES = [196, 233, 262, 233, 196, 175, 196, 233, 262, 311, 349, 311, 262, 233, 220, 196];
const MUSIC_STEP_S = 0.15;

let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function scheduleMusicStep() {
  tone(MUSIC_NOTES[musicStep % MUSIC_NOTES.length], MUSIC_STEP_S * 0.85, 'square', 0.045);
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
