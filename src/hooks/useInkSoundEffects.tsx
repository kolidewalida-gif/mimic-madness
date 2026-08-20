import { useCallback, useRef } from 'react';
import { registerAudioContext } from '@/lib/audioUnlock';
import { playSample } from '@/lib/sfx/samples';
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
export type InkSoundType =
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
    globalInkAudioContext = registerAudioContext(new AudioContext());
    return globalInkAudioContext;
  }
  // Relance suivie : un `resume()` non attendu et jamais retenté laissait le
  // contexte suspendu pour toute la session dès qu'il naissait hors geste.
  if (globalInkAudioContext.state === 'suspended') {
    registerAudioContext(globalInkAudioContext);
  }
  return globalInkAudioContext;
};

/* ==============================================================
   Helper utilities — small reusable building blocks
============================================================== */

/** Master gain shared by all sounds — wired to global SFX volume + soft limiter. */
const makeMasterGain = (ctx: AudioContext, baseVolume: number) => {
  const globalVolume = getSoundEffectsVolume();
  // Compressor acts as a soft limiter to prevent clipping on layered sounds
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  compressor.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = baseVolume * globalVolume;
  // Warm tone shaping: a gentle low-pass keeps highs soft & cozy so every
  // sound feels rounded, premium and "ploop"-like rather than harsh.
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 4800;
  warm.Q.value = 0.4;
  master.connect(warm);
  warm.connect(compressor);
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
      // Warm rubbery "ploop": rounded sine drop + soft rebound bounce + cozy sub.
      // Soft attack, smooth frequencies, satisfying and friendly — no harsh click.
      sweepTone(ctx, master, now, 0.15, 560, 210, 'sine', 0.5, 0.012);
      // Rubbery rebound (gentle bounce back up)
      sweepTone(ctx, master, now + 0.055, 0.1, 210, 320, 'sine', 0.16, 0.01);
      // Warm sub weight
      tone(ctx, master, now, 0.09, 80, 'sine', 0.22, 0.008);
      // Very soft rounded "lip" transient (no noise)
      tone(ctx, master, now, 0.05, 1500, 'sine', 0.06, 0.006);
      break;
    }

    case 'brushTap':
    case 'inkHover':
    case 'inkDry': {
      // Tiny soft ploop — higher, quieter, quick rounded blip + micro rebound
      sweepTone(ctx, master, now, 0.09, 880, 520, 'sine', 0.2, 0.008);
      sweepTone(ctx, master, now + 0.035, 0.06, 520, 660, 'sine', 0.07, 0.006);
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
      // Big cinematic air whoosh — wider, deeper, more layered
      // Low rumble sweep
      noiseBurst(ctx, master, now, 0.5, 'bandpass', 400, 1.5, 0.28, {
        from: 150,
        to: 3000,
      });
      // Mid-range body
      noiseBurst(ctx, master, now + 0.03, 0.42, 'bandpass', 1200, 3, 0.22, {
        from: 400,
        to: 5000,
      });
      // High air texture
      noiseBurst(ctx, master, now + 0.06, 0.35, 'highpass', 3000, 1, 0.12, {
        from: 2000,
        to: 8000,
      });
      // Tonal sweep for pitch movement
      sweepTone(ctx, master, now + 0.04, 0.38, 280, 1400, 'sine', 0.15);
      sweepTone(ctx, master, now + 0.08, 0.32, 1400, 280, 'triangle', 0.1);
      // Sub thump at start
      tone(ctx, master, now, 0.08, 60, 'sine', 0.2, 0.003);
      break;
    }

    /* ===========================================================
       BOINGS / BOUNCES / DROPS
    =========================================================== */
    case 'cartoonBoing':
    case 'inkDrip': {
      // Ultra springy boing — 4 bounces with decreasing amplitude + sub impact
      const baseFreq = type === 'inkDrip' ? 300 : 440;
      // Sub impact on first bounce
      tone(ctx, master, now, 0.1, 65, 'sine', 0.35, 0.003);
      noiseBurst(ctx, master, now, 0.04, 'lowpass', 600, 1, 0.15);
      // 4 bounces (down-up-down-up) with decreasing energy
      [0, 0.08, 0.16, 0.24].forEach((offset, i) => {
        const energy = 0.45 - i * 0.1;
        const freqMult = 1 - i * 0.03;
        // Down sweep
        sweepTone(
          ctx, master, now + offset, 0.09,
          baseFreq * freqMult * 1.1,
          baseFreq * freqMult * 0.5,
          'sine', energy, 0.003,
        );
        // Up sweep (bounce back)
        sweepTone(
          ctx, master, now + offset + 0.045, 0.08,
          baseFreq * freqMult * 0.5,
          baseFreq * freqMult * 1.05,
          'sine', energy * 0.55, 0.003,
        );
      });
      // Harmonic shimmer on top
      sweepTone(ctx, master, now, 0.3, baseFreq * 2, baseFreq * 1.5, 'triangle', 0.08);
      break;
    }

    /* ===========================================================
       BELLS / DINGS
    =========================================================== */
    case 'cartoonDing':
    case 'inkSuccess': {
      // Rich bell "ding!" with golden shimmer + reverb tail
      const fundamentals = type === 'inkSuccess' ? [880, 1108, 1320] : [988];
      fundamentals.forEach((f, fi) => {
        const startOffset = fi * 0.08;
        // Fundamental + 5 harmonics for rich bell timbre
        tone(ctx, master, now + startOffset, 0.7, f, 'sine', 0.32, 0.003);
        tone(ctx, master, now + startOffset, 0.6, f * 2, 'sine', 0.2, 0.003);
        tone(ctx, master, now + startOffset, 0.5, f * 3, 'sine', 0.1, 0.003);
        tone(ctx, master, now + startOffset, 0.45, f * 4, 'sine', 0.05, 0.003);
        tone(ctx, master, now + startOffset, 0.4, f * 5, 'sine', 0.025, 0.003);
        // Detuned copy for chorus/shimmer effect
        tone(ctx, master, now + startOffset, 0.55, f * 1.002, 'sine', 0.12, 0.005, 8);
        tone(ctx, master, now + startOffset, 0.5, f * 2.003, 'sine', 0.06, 0.005, -6);
      });
      // Soft rounded attack (no harsh noise)
      tone(ctx, master, now, 0.04, 2400, 'sine', 0.07, 0.006);
      // Sub warmth
      tone(ctx, master, now, 0.15, 220, 'sine', 0.12, 0.008);
      break;
    }

    /* ===========================================================
       FANFARE — 3-note triad
    =========================================================== */
    case 'cartoonFanfare': {
      // Epic 4-note ascending major triad fanfare with big finish
      const notes = [523, 659, 784, 1046]; // C5 - E5 - G5 - C6
      notes.forEach((freq, i) => {
        const start = now + i * 0.1;
        const isLast = i === notes.length - 1;
        const dur = isLast ? 0.8 : 0.4;
        const vol = isLast ? 0.38 : 0.28;
        // Main tone + octave + fifth harmonic
        tone(ctx, master, start, dur, freq, 'triangle', vol, 0.003);
        tone(ctx, master, start, dur * 0.9, freq * 2, 'sine', vol * 0.5, 0.005);
        tone(ctx, master, start, dur * 0.8, freq * 1.5, 'sine', vol * 0.2, 0.005);
        // Detuned shimmer
        tone(ctx, master, start, dur * 0.85, freq * 1.003, 'sine', vol * 0.15, 0.005, 5);
      });
      // Big warm hit on the final note (rounded, not harsh)
      const finalStart = now + 0.3;
      tone(ctx, master, finalStart, 0.06, 1800, 'sine', 0.1, 0.006);
      tone(ctx, master, finalStart, 0.14, 110, 'sine', 0.22, 0.006); // sub punch
      // Sparkle tail (soft)
      [2093, 2637, 3136].forEach((f, i) => {
        tone(ctx, master, now + 0.35 + i * 0.04, 0.35, f, 'sine', 0.05, 0.012);
      });
      break;
    }

    /* ===========================================================
       WOBBLE / JELLY (selection)
    =========================================================== */
    case 'cartoonWobble':
    case 'paperFold': {
      // Rich jelly wobble — dual LFO + harmonic body
      wobbleTone(ctx, master, now, 0.4, 360, 20, 90, 0.3);
      wobbleTone(ctx, master, now + 0.02, 0.35, 720, 16, 50, 0.12); // octave shimmer
      sweepTone(ctx, master, now, 0.2, 200, 520, 'sine', 0.2);
      // Soft noise texture
      noiseBurst(ctx, master, now, 0.08, 'bandpass', 800, 3, 0.06);
      break;
    }

    /* ===========================================================
       ZAP / SHOCK
    =========================================================== */
    case 'cartoonZap':
    case 'inkError': {
      // Soft rounded "aw" descend — warm and gentle, not harsh
      sweepTone(ctx, master, now, 0.22, 520, 140, 'triangle', 0.34, 0.012);
      // Warm sub for a little weight
      tone(ctx, master, now, 0.1, 78, 'sine', 0.2, 0.008);
      // Gentle low rumble texture (filtered, soft)
      noiseBurst(ctx, master, now, 0.12, 'lowpass', 600, 1, 0.08, { from: 900, to: 200 });
      if (type === 'inkError') {
        // Soft sad two-note fall
        sweepTone(ctx, master, now + 0.14, 0.26, 360, 130, 'sine', 0.18, 0.012);
      }
      break;
    }

    /* ===========================================================
       INK SPLASH (multi-layer)
    =========================================================== */
    case 'inkSplash': {
      // Rich multi-layer splash burst — like paint hitting a wall
      // Low body splash
      noiseBurst(ctx, master, now, 0.35, 'lowpass', 1500, 1, 0.38, {
        from: 4500,
        to: 150,
      });
      // Mid splatter texture
      noiseBurst(ctx, master, now + 0.02, 0.28, 'bandpass', 2500, 3, 0.2, {
        from: 3000,
        to: 800,
      });
      // Tonal pop
      sweepTone(ctx, master, now, 0.15, 900, 200, 'sine', 0.3);
      // Secondary tonal ring
      sweepTone(ctx, master, now + 0.04, 0.22, 1600, 500, 'triangle', 0.14);
      // Sub impact
      tone(ctx, master, now, 0.08, 80, 'sine', 0.28, 0.003);
      // High sparkle
      tone(ctx, master, now + 0.06, 0.15, 2400, 'sine', 0.06, 0.01);
      break;
    }
  }
};

/* ==============================================================
   Public API — unchanged contract
============================================================== */

export const playInkSound = (type: InkSoundType, volume: number = 0.3) => {
  try {
    // Échantillon généré quand il en existe un ; sinon la synthèse cartoon.
    if (playSample(type, volume)) return;
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
        if (playSample(type, volume)) return;
        if (!audioContextRef.current) {
          audioContextRef.current = registerAudioContext(new AudioContext());
        }
        if (audioContextRef.current.state === 'suspended') {
          registerAudioContext(audioContextRef.current);
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
