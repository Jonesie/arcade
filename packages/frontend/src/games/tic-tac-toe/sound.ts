/**
 * Synthesized with the Web Audio API, same reasoning as the other games'
 * sound modules: no binary audio assets. Tic-Tac-Toe had no sound at all
 * until now — there's no classic arcade original to draw on for a 3x3
 * board game, so this is a deliberately sparse, calm original loop (long
 * gaps between soft notes) befitting a quiet thinking game rather than an
 * arcade shooter, plus a couple of small move/result effects. Music and
 * sound effects are muted independently (two separate cabinet buttons) —
 * see ../../audio/musicMuteState and ../../audio/sfxMuteState.
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

// A descending-slide "sad trombone" note — a sawtooth oscillator with a
// linear pitch ramp down, mimicking a trombone slide, instead of a flat
// tone.
function trombone(freqFrom: number, freqTo: number, delay: number, duration: number) {
  setTimeout(() => {
    if (isSfxMuted() || !audioCtx) return;
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.linearRampToValueAtTime(freqTo, now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }, delay * 1000);
}

export const sfx = {
  x: () => tone(440, 0.08, 'triangle', 0.1),
  o: () => tone(349, 0.08, 'triangle', 0.1),
  // A quick four-note ascending fanfare for a win (GitHub issue #9),
  // paired with the Fireworks canvas burst.
  win: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => setTimeout(() => tone(freq, 0.18, 'triangle', 0.14), i * 90));
  },
  // Classic "sad trombone" wah-wah-wah-waaah for losing to the computer
  // (GitHub issue #9): three short descending slides, then a longer final
  // one bending further down.
  lose: () => {
    trombone(392, 370, 0, 0.28);
    trombone(370, 349, 0.3, 0.28);
    trombone(349, 330, 0.6, 0.28);
    trombone(330, 220, 0.9, 0.9);
  },
  draw: () => tone(220, 0.3, 'sine', 0.1),
};

// A sparse, slow major-key loop — mostly silence, a soft note every
// second or so — a calm "thinking" bed rather than anything driving.
// Self-rescheduling timeout, same pattern as the other games' music,
// gated on the music mute.
const MUSIC_NOTES = [392, 0, 494, 0, 440, 0, 523, 0, 440, 0, 392, 0];
const MUSIC_STEP_S = 0.9;

let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function musicTone(freq: number) {
  if (isMusicMuted() || !audioCtx || freq <= 0) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0.05, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + MUSIC_STEP_S * 0.9);
  osc.start(now);
  osc.stop(now + MUSIC_STEP_S * 0.9);
}

function scheduleMusicStep() {
  musicTone(MUSIC_NOTES[musicStep % MUSIC_NOTES.length]);
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
