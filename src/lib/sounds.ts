/**
 * Synth-based sound effects for FitQuest.
 *
 * No bundled audio files — every sound is generated on the fly with Web Audio
 * oscillators, noise buffers, and short envelopes. Keeps the bundle tiny and
 * sidesteps licensing entirely. The aesthetic is deliberately "retro RPG":
 * short, punchy, harmonically simple.
 *
 * All exports return cleanly even when sound is disabled (see `useSound`) —
 * callers don't have to gate anything; the orchestrator does.
 */

type SoundContext = AudioContext;

let cachedCtx: SoundContext | null = null;

function getCtx(): SoundContext | null {
  if (typeof window === 'undefined') return null;
  if (cachedCtx && cachedCtx.state !== 'closed') return cachedCtx;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  cachedCtx = new Ctx();
  return cachedCtx;
}

/**
 * Browsers gate audio behind a user gesture. Call this from a click/keydown
 * handler the first time you want sound to be possible — typically from the
 * sound toggle.
 */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Suspended state will retry on next gesture.
    }
  }
}

// ── Envelope helpers ─────────────────────────────────────────────────────────

interface EnvelopeOpts {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  peak?: number;
}

function envelope(
  ctx: AudioContext,
  gain: GainNode,
  startAt: number,
  duration: number,
  opts: EnvelopeOpts = {},
) {
  const attack = opts.attack ?? 0.005;
  const decay = opts.decay ?? 0.06;
  const sustain = opts.sustain ?? 0.3;
  const release = opts.release ?? Math.max(0.08, duration - attack - decay);
  const peak = opts.peak ?? 0.6;

  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.linearRampToValueAtTime(peak * sustain, startAt + attack + decay);
  gain.gain.linearRampToValueAtTime(0, startAt + attack + decay + release);
}

function noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function tone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  opts: { type?: OscillatorType; volume?: number; envelope?: EnvelopeOpts; detune?: number } = {},
) {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(freq, startAt);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, startAt);

  const gain = ctx.createGain();
  envelope(ctx, gain, startAt, duration, { peak: opts.volume ?? 0.25, ...(opts.envelope ?? {}) });

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function noise(
  ctx: AudioContext,
  startAt: number,
  duration: number,
  opts: { volume?: number; bandpass?: { freq: number; q: number } } = {},
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration + 0.1);

  const gain = ctx.createGain();
  envelope(ctx, gain, startAt, duration, { peak: opts.volume ?? 0.15 });

  if (opts.bandpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opts.bandpass.freq, startAt);
    filter.Q.setValueAtTime(opts.bandpass.q, startAt);
    src.connect(filter).connect(gain).connect(ctx.destination);
  } else {
    src.connect(gain).connect(ctx.destination);
  }

  src.start(startAt);
  src.stop(startAt + duration + 0.05);
}

// ── Sound recipes ────────────────────────────────────────────────────────────

export function playClick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, 880, t, 0.04, { type: 'square', volume: 0.12 });
}

export function playDiceRoll(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Quick rattle: ten tiny noise blips with descending pitch
  for (let i = 0; i < 10; i += 1) {
    noise(ctx, t + i * 0.035, 0.04, {
      volume: 0.1,
      bandpass: { freq: 2000 - i * 100, q: 4 },
    });
  }
  // Settle bell
  tone(ctx, 660, t + 0.4, 0.18, { type: 'triangle', volume: 0.2 });
}

export function playAttack(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Sword swoosh: filtered noise burst
  noise(ctx, t, 0.18, { volume: 0.25, bandpass: { freq: 1200, q: 1 } });
  // Impact thump
  tone(ctx, 110, t + 0.08, 0.08, { type: 'sine', volume: 0.4 });
}

export function playMagic(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Sparkle: ascending sine arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    tone(ctx, f, t + i * 0.05, 0.18, { type: 'sine', volume: 0.18 });
  });
  // High shimmer
  tone(ctx, 1568, t + 0.25, 0.18, { type: 'triangle', volume: 0.1 });
}

export function playHit(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Heavy thud
  tone(ctx, 80, t, 0.1, { type: 'sine', volume: 0.4 });
  noise(ctx, t, 0.07, { volume: 0.18, bandpass: { freq: 400, q: 2 } });
}

export function playCrit(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Big hit + bright ring
  tone(ctx, 70, t, 0.14, { type: 'sine', volume: 0.5 });
  noise(ctx, t, 0.12, { volume: 0.22, bandpass: { freq: 500, q: 2 } });
  tone(ctx, 1320, t + 0.05, 0.25, { type: 'triangle', volume: 0.22 });
}

export function playFail(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Two descending sad notes
  tone(ctx, 392, t, 0.18, { type: 'triangle', volume: 0.22 });
  tone(ctx, 311, t + 0.16, 0.28, { type: 'triangle', volume: 0.22 });
}

export function playClaim(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Coin chime — descending major thirds
  const notes = [988, 784, 1175]; // B5 G5 D6
  notes.forEach((f, i) => {
    tone(ctx, f, t + i * 0.07, 0.2, { type: 'triangle', volume: 0.22 });
  });
}

export function playLoot(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Quick pickup sparkle
  tone(ctx, 1175, t, 0.08, { type: 'triangle', volume: 0.22 });
  tone(ctx, 1568, t + 0.06, 0.12, { type: 'triangle', volume: 0.2 });
}

export function playLevelUp(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Heroic ascending arpeggio + sustained chord
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    tone(ctx, f, t + i * 0.09, 0.22, { type: 'square', volume: 0.18 });
    tone(ctx, f, t + i * 0.09, 0.22, { type: 'triangle', volume: 0.12, detune: -5 });
  });
  // Sustained final chord
  [523.25, 659.25, 783.99].forEach((f) => {
    tone(ctx, f, t + 0.42, 0.65, { type: 'triangle', volume: 0.15 });
  });
}

export function playVictory(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Triumphant 5-note fanfare in C major
  const seq: [number, number, number][] = [
    [523.25, 0.0, 0.18], // C5
    [659.25, 0.18, 0.18], // E5
    [783.99, 0.36, 0.18], // G5
    [1046.5, 0.54, 0.36], // C6 long
    [1318.51, 0.92, 0.5], // E6 final
  ];
  seq.forEach(([f, offset, dur]) => {
    tone(ctx, f, t + offset, dur, { type: 'square', volume: 0.18 });
    tone(ctx, f, t + offset, dur, { type: 'triangle', volume: 0.14, detune: -7 });
  });
}

export function playLegendary(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Bigger fanfare — broader harmonics + sustained pad
  const seq: [number, number, number][] = [
    [523.25, 0.0, 0.22],
    [659.25, 0.18, 0.22],
    [783.99, 0.36, 0.22],
    [1046.5, 0.54, 0.5],
    [1318.51, 0.95, 0.7],
  ];
  seq.forEach(([f, offset, dur]) => {
    tone(ctx, f, t + offset, dur, { type: 'sawtooth', volume: 0.12 });
    tone(ctx, f, t + offset, dur, { type: 'triangle', volume: 0.18 });
    tone(ctx, f * 0.5, t + offset, dur, { type: 'sine', volume: 0.16 });
  });
  // Sparkle tail
  for (let i = 0; i < 6; i += 1) {
    tone(ctx, 2093 + Math.random() * 800, t + 1.4 + i * 0.08, 0.18, {
      type: 'triangle',
      volume: 0.08,
    });
  }
}

export function playAchievement(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Bright two-chord stinger
  [659.25, 880, 1318.51].forEach((f) => {
    tone(ctx, f, t, 0.18, { type: 'triangle', volume: 0.18 });
  });
  [783.99, 1046.5, 1568].forEach((f) => {
    tone(ctx, f, t + 0.18, 0.45, { type: 'triangle', volume: 0.18 });
  });
}

export function playStreak(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Crackling flame: short noise + rising tone
  noise(ctx, t, 0.18, { volume: 0.12, bandpass: { freq: 1800, q: 1.5 } });
  tone(ctx, 440, t, 0.18, { type: 'triangle', volume: 0.18 });
  tone(ctx, 659.25, t + 0.12, 0.3, { type: 'triangle', volume: 0.2 });
}

export function playPersonalRecord(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Trophy ring — bright sustained chord
  [659.25, 988, 1318.51].forEach((f) => {
    tone(ctx, f, t, 0.5, { type: 'triangle', volume: 0.18 });
  });
}
