import { useCallback, useRef } from 'react';
import { useInkMode } from './useInkMode';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

/**
 * Ink Mode Sound Effects — full cartoon redesign.
 *
 * Every sound is layered, springy, and unmistakably cartoon:
 * - sliding pitches (cartoon "schwiiip")
 * - bouncy springs ("boing!")
 * - punchy thumps + harmonic zings
 * - golden bell "dings" with shimmer harmonics
 * - whooshes with filtered noise sweeps
 * - wobble jelly oscillators
 *
 * The API is unchanged: `playInkSound('cartoonPop', 0.4)` still works
 * everywhere it was previously used.
 */
type InkSoundType =
  // Original "ink" names, now repurposed as cartoon SFX:
  | 'brushStroke'        // schwiiip slide-up cartoon swipe
  | 'inkDrip'            // boing-drop bouncy drop
  | 'paperSlide'         // whoosh slide
  | 'inkSplash'          // splash burst (multi-layer)
  | 'brushTap'           // tiny pop tap
  | 'inkFlow'            // flowing whoosh
  | 'paperFold'          // crinkle wobble
  | 'brushSwipe'         // fast swipe
  | 'inkDry'             // small fizz
  | 'calligraphyStroke'  // smooth slide
  | 'inkClick'           // crisp click pop
  | 'inkHover'           // tiny tick hover
  | 'inkSuccess'         // 3-note triad win
  | 'inkError'           // sad descending honk
  | 'inkTransition'      // wide swoop transition
  // ── Cartoon SFX (originals) ────────────────────────────────────
  | 'cartoonBoing'       // ultra springy boing
  | 'cartoonPop'         // chunky bubble pop
  | 'cartoonSwoosh'      // big air whoosh
  | 'cartoonDing'        // bell ding with shimmer
  | 'cartoonFanfare'     // 3-note major triad fanfare
  | 'cartoonWobble'      // wobble jelly oscillator
  | 'cartoonZap';        // electric zap descend

let globalInkAudioContext: AudioContext | null = null;

const getInkAudioContext = (): AudioContext => {
  if (!globalInkAudioContext || globalInkAudioContext.state === 'closed') {
    globalInkAudioContext = new AudioContext();
  }
  if (globalInkAudioContext.state === 'suspended') {
    globalInkAudioContext.resume();
  }
  return globalInkAudioContext;
};

/* ==============================================================
   Helper utilities — small reusable building blocks
============================================================== */

/** Master gain shared by all sounds — wired to global SFX volume. */
const makeMasterGain = (ctx: AudioContext, baseVolume: number) => {
  const globalVolume = getSoundEffectsVolume();
  const master = ctx.createGain();
  master.gain.value = baseVolume * globalVolume;
  master.connect(ctx.destination);
  return master;
};

/** Quick exponential decay envelope on a gain node. */
const decayEnvelope = (
  ctx: AudioContext,
  gainNode: GainNode,
  start: number,
  attack: number,
  peak: number,
  duration: number,
) => {
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(peak, start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
};

/** Filtered noise burst — ideal for whooshes and splashes. */
const noiseBurst = (
  ctx: AudioContext,
  master: GainNode,
  start: number,
  duration: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  filterQ: number,
  peak: number,
  freqSweep?: { from: number; to: number },
) => {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = filterQ;
  if (freqSweep) {
    filter.frequency.setValueAtTime(freqSweep.from, start);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(20, freqSweep.to),
      start + duration,
    );
  } else {
    filter.frequency.value = filterFreq;
  }
  const gain = ctx.createGain();
  decayEnvelope(ctx, gain, start, 0.01, peak, duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
  source.stop(start + duration + 0.05);
};

/** Pitch-sweeping tone — cartoon slides, boings, etc. */
const sweepTone = (
  ctx: AudioContext,
  master: GainNode,
  start: number,
  duration: number,
  fromFreq: number,
  toFreq: number,
  type: OscillatorType,
  peak: number,
  attack = 0.01,
) => {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, start);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, toFreq),
    start + duration,
  );
  const gain = ctx.createGain();
  decayEnvelope(ctx, gain, start, attack, peak, duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/** Steady tone with a quick punch envelope. */
const tone = (
  ctx: AudioContext,
  master: GainNode,
  start: number,
  duration: number,
  freq: number,
  type: OscillatorType,
  peak: number,
  attack = 0.005,
  detune = 0,
) => {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const gain = ctx.createGain();
  decayEnvelope(ctx, gain, start, attack, peak, duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/** Wobble LFO modulated tone — jelly/wobble effects. */
const wobbleTone = (
  ctx: AudioContext,
  master: GainNode,
  start: number,
  duration: number,
  baseFreq: number,
  wobbleHz: number,
  wobbleDepth: number,
  peak: number,
) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = baseFreq;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = wobbleHz;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = wobbleDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  const gain = ctx.createGain();
  decayEnvelope(ctx, gain, start, 0.02, peak, duration);

  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  lfo.start(start);
  osc.stop(start + duration + 0.05);
  lfo.stop(start + duration + 0.05);
};

/* ==============================================================
   Sound recipes
============================================================== */

const createInkSound = (
  ctx: AudioContext,
  type: InkSoundType,
  baseVolume: number,
) => {
  const master = makeMasterGain(ctx, baseVolume);
  const now = ctx.currentTime;

  switch (type) {
    /* ===========================================================
       SHORT POPS / TAPS / CLICKS
    =========================================================== */
    case 'cartoonPop':
    case 'inkClick': {
      // Chunky bubble pop: descending sine + small noise click
      sweepTone(ctx, master, now, 0.18, 600, 200, 'sine', 0.6);
      tone(ctx, master, now, 0.04, 1800, 'triangle', 0.25);
      noiseBurst(ctx, master, now, 0.05, 'highpass', 1200, 1, 0.18);
      break;
    }

    case 'brushTap':
    case 'inkHover':
    case 'inkDry': {
      // Tiny tick — quick high blip
      sweepTone(ctx, master, now, 0.07, 1400, 600, 'triangle', 0.22);
      noiseBurst(ctx, master, now, 0.03, 'highpass', 2000, 1, 0.08);
      break;
    }

    /* ===========================================================
       SLIDES / SWIPES / SWOOSHES
    =========================================================== */
    case 'brushStroke':
    case 'calligraphyStroke': {
      // Schwiiip slide-up
      sweepTone(ctx, master, now, 0.32, 200, 1100, 'sawtooth', 0.32);
      noiseBurst(ctx, master, now, 0.32, 'bandpass', 1500, 6, 0.16, {
        from: 600,
        to: 2400,
      });
      break;
    }

    case 'brushSwipe':
    case 'paperSlide': {
      // Fast horizontal swipe
      sweepTone(ctx, master, now, 0.22, 900, 300, 'triangle', 0.28);
      noiseBurst(ctx, master, now, 0.22, 'bandpass', 2000, 4, 0.18, {
        from: 2500,
        to: 600,
      });
      break;
    }

    case 'cartoonSwoosh':
    case 'inkTransition':
    case 'inkFlow': {
      // Big air whoosh
      noiseBurst(ctx, master, now, 0.45, 'bandpass', 800, 2, 0.32, {
        from: 200,
        to: 4000,
      });
      sweepTone(ctx, master, now + 0.05, 0.35, 350, 1200, 'sine', 0.18);
      sweepTone(ctx, master, now + 0.1, 0.3, 1200, 350, 'triangle', 0.12);
      break;
    }

    /* ===========================================================
       BOINGS / BOUNCES / DROPS
    =========================================================== */
    case 'cartoonBoing':
    case 'inkDrip': {
      // Springy bouncy boing — 3 quick wobbles up-down
      const baseFreq = type === 'inkDrip' ? 320 : 420;
      [0, 0.1, 0.2].forEach((offset, i) => {
        const peak = 0.4 - i * 0.1;
        sweepTone(
          ctx,
          master,
          now + offset,
          0.12,
          baseFreq * (1 + i * 0.05),
          baseFreq * (0.55 + i * 0.05),
          'sine',
          peak,
          0.005,
        );
        sweepTone(
          ctx,
          master,
          now + offset + 0.06,
          0.1,
          baseFreq * (0.55 + i * 0.05),
          baseFreq * (0.95 + i * 0.05),
          'sine',
          peak * 0.6,
          0.005,
        );
      });
      // Soft noise click on impact
      noiseBurst(ctx, master, now, 0.05, 'lowpass', 800, 1, 0.12);
      break;
    }

    /* ===========================================================
       BELLS / DINGS
    =========================================================== */
    case 'cartoonDing':
    case 'inkSuccess': {
      // Bell-like "ding!" with golden shimmer
      const fundamentals = type === 'inkSuccess' ? [880, 1108] : [988];
      fundamentals.forEach((f) => {
        tone(ctx, master, now, 0.6, f, 'sine', 0.35, 0.005);
        tone(ctx, master, now, 0.5, f * 2, 'sine', 0.18, 0.005);
        tone(ctx, master, now, 0.45, f * 3, 'sine', 0.08, 0.005);
        tone(ctx, master, now, 0.4, f * 4, 'sine', 0.04, 0.005);
      });
      // Tiny percussive attack
      noiseBurst(ctx, master, now, 0.04, 'highpass', 4000, 1, 0.18);
      break;
    }

    /* ===========================================================
       FANFARE — 3-note triad
    =========================================================== */
    case 'cartoonFanfare': {
      // C5 - E5 - G5 ascending major triad with shimmer
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const start = now + i * 0.12;
        tone(ctx, master, start, 0.5, freq, 'triangle', 0.32);
        tone(ctx, master, start, 0.45, freq * 2, 'sine', 0.16);
        tone(ctx, master, start, 0.4, freq * 3, 'sine', 0.06);
      });
      // Big closing ding
      const endStart = now + 0.4;
      tone(ctx, master, endStart, 0.7, 1046, 'triangle', 0.32);
      tone(ctx, master, endStart, 0.6, 2092, 'sine', 0.14);
      noiseBurst(ctx, master, endStart, 0.06, 'highpass', 5000, 1, 0.22);
      break;
    }

    /* ===========================================================
       WOBBLE / JELLY (selection)
    =========================================================== */
    case 'cartoonWobble':
    case 'paperFold': {
      // Jelly bounce — wobble LFO + soft sweep
      wobbleTone(ctx, master, now, 0.35, 380, 18, 80, 0.32);
      sweepTone(ctx, master, now, 0.18, 220, 480, 'sine', 0.18);
      break;
    }

    /* ===========================================================
       ZAP / SHOCK
    =========================================================== */
    case 'cartoonZap':
    case 'inkError': {
      // Descending sawtooth zap with noise crackle
      sweepTone(ctx, master, now, 0.22, 1400, 80, 'sawtooth', 0.42);
      sweepTone(ctx, master, now + 0.02, 0.18, 1100, 60, 'square', 0.18);
      noiseBurst(ctx, master, now, 0.16, 'bandpass', 1500, 4, 0.22, {
        from: 3500,
        to: 200,
      });
      // Sub punch
      tone(ctx, master, now, 0.12, 80, 'sine', 0.3);
      break;
    }

    /* ===========================================================
       INK SPLASH (multi-layer)
    =========================================================== */
    case 'inkSplash': {
      // Quick noise splash + tonal pop
      noiseBurst(ctx, master, now, 0.32, 'lowpass', 2000, 1, 0.4, {
        from: 4000,
        to: 200,
      });
      sweepTone(ctx, master, now, 0.18, 800, 240, 'sine', 0.32);
      sweepTone(ctx, master, now + 0.05, 0.25, 1500, 600, 'triangle', 0.14);
      break;
    }
  }
};

/* ==============================================================
   Public API — unchanged contract
============================================================== */

export const playInkSound = (type: InkSoundType, volume: number = 0.3) => {
  try {
    const ctx = getInkAudioContext();
    createInkSound(ctx, type, volume);
  } catch (error) {
    console.warn('Could not play ink sound:', error);
  }
};

export const useInkSoundEffects = () => {
  const { isInkMode } = useInkMode();
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(
    (type: InkSoundType, volume: number = 0.3) => {
      if (!isInkMode) return;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        createInkSound(audioContextRef.current, type, volume);
      } catch (error) {
        console.warn('Could not play ink sound:', error);
      }
    },
    [isInkMode],
  );

  return { playSound };
};
