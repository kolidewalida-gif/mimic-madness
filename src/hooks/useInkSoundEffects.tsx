import { useCallback, useRef } from 'react';
import { useInkMode } from './useInkMode';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

/**
 * Ink Mode Sound Effects - Minimalist, organic sounds for the black/red theme
 * These sounds are more subtle, brush-like, and calligraphic
 */
type InkSoundType = 
  | 'brushStroke'      // Brush painting sound
  | 'inkDrip'          // Ink dripping
  | 'paperSlide'       // Paper sliding
  | 'inkSplash'        // Ink splash
  | 'brushTap'         // Quick brush tap
  | 'inkFlow'          // Flowing ink sound
  | 'paperFold'        // Paper folding
  | 'brushSwipe'       // Quick swipe
  | 'inkDry'           // Ink drying (subtle crackle)
  | 'calligraphyStroke' // Elegant stroke
  | 'inkClick'         // Minimalist click
  | 'inkHover'         // Subtle hover sound
  | 'inkSuccess'       // Success with ink aesthetic
  | 'inkError'         // Error with ink aesthetic
  | 'inkTransition'    // Page transition
  // ── Cartoon SFX additions ─────────────────────────────────────────
  | 'cartoonBoing'     // Springy boing
  | 'cartoonPop'       // Bubble pop
  | 'cartoonSwoosh'    // Whoosh transition
  | 'cartoonDing'      // Bell ding (correct answer / reveal)
  | 'cartoonFanfare'   // Quick victory fanfare
  | 'cartoonWobble'    // Wobble jelly sound (selection)
  | 'cartoonZap';      // Zap/shock

let globalInkAudioContext: AudioContext | null = null;

const getInkAudioContext = () => {
  if (!globalInkAudioContext || globalInkAudioContext.state === 'closed') {
    globalInkAudioContext = new AudioContext();
  }
  if (globalInkAudioContext.state === 'suspended') {
    globalInkAudioContext.resume();
  }
  return globalInkAudioContext;
};

const createInkSound = (ctx: AudioContext, type: InkSoundType, baseVolume: number) => {
  const now = ctx.currentTime;
  const globalVolume = getSoundEffectsVolume();
  const volume = baseVolume * globalVolume;
  
  if (volume === 0) return;

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(volume, now);

  switch (type) {
    case 'brushStroke': {
      // White noise filtered to sound like brush on paper
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.3);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(2000, now + 0.2);
      filter.Q.value = 1;
      
      source.connect(filter);
      filter.connect(masterGain);
      
      masterGain.gain.setValueAtTime(volume * 0.4, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.4);
      
      source.start(now);
      source.stop(now + 0.4);
      break;
    }

    case 'inkDrip': {
      // Soft drip sound
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'paperSlide': {
      // Subtle paper sliding
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const envelope = Math.pow(1 - progress, 2);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      
      source.connect(filter);
      filter.connect(masterGain);
      
      masterGain.gain.setValueAtTime(volume * 0.2, now);
      
      source.start(now);
      source.stop(now + 0.3);
      break;
    }

    case 'inkSplash': {
      // Ink splash - multiple drops
      for (let i = 0; i < 3; i++) {
        const delay = i * 0.05;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300 - i * 50, now + delay);
        osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(volume * 0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      }
      break;
    }

    case 'brushTap': {
      // Quick tap
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case 'inkFlow': {
      // Smooth flowing sound
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.3);
      osc.frequency.linearRampToValueAtTime(100, now + 0.6);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.1);
      gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }

    case 'calligraphyStroke': {
      // Elegant, flowing stroke with harmonics
      const fundamental = ctx.createOscillator();
      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(200, now);
      fundamental.frequency.linearRampToValueAtTime(350, now + 0.15);
      fundamental.frequency.linearRampToValueAtTime(180, now + 0.35);
      
      const harmonic = ctx.createOscillator();
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(400, now);
      harmonic.frequency.linearRampToValueAtTime(700, now + 0.15);
      harmonic.frequency.linearRampToValueAtTime(360, now + 0.35);
      
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(volume * 0.2, now + 0.05);
      gain1.gain.linearRampToValueAtTime(volume * 0.15, now + 0.2);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(volume * 0.08, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      fundamental.connect(gain1);
      harmonic.connect(gain2);
      gain1.connect(masterGain);
      gain2.connect(masterGain);
      
      fundamental.start(now);
      fundamental.stop(now + 0.35);
      harmonic.start(now);
      harmonic.stop(now + 0.25);
      break;
    }

    case 'inkClick': {
      // Minimal, satisfying click
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case 'inkHover': {
      // Very subtle hover
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }

    case 'inkSuccess': {
      // Success with ink aesthetic - ascending tones
      [300, 400, 500].forEach((freq, i) => {
        const delay = i * 0.08;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(volume * 0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
      break;
    }

    case 'inkError': {
      // Error - low, subtle rumble
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.2);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }

    case 'inkTransition': {
      // Page transition - swoosh with ink character
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const envelope = Math.sin(progress * Math.PI);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.5);
      filter.Q.value = 2;
      
      source.connect(filter);
      filter.connect(masterGain);
      
      masterGain.gain.setValueAtTime(volume * 0.3, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
      
      source.start(now);
      source.stop(now + 0.5);
      break;
    }

    // ── Cartoon SFX ──────────────────────────────────────────────────
    case 'cartoonBoing': {
      // Springy descending boing
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 14;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain).connect(osc.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain).connect(masterGain);
      lfo.start(now);
      osc.start(now);
      osc.stop(now + 0.4);
      lfo.stop(now + 0.4);
      break;
    }

    case 'cartoonPop': {
      // Bubble pop
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain).connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
      break;
    }

    case 'cartoonSwoosh': {
      // Whoosh with band-pass
      const bufferSize = ctx.sampleRate * 0.35;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
      filter.Q.value = 6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      source.connect(filter).connect(gain).connect(masterGain);
      source.start(now);
      source.stop(now + 0.35);
      break;
    }

    case 'cartoonDing': {
      // Bell-like ding
      const fundamental = 880;
      const overtones = [1, 2.7, 5.4];
      overtones.forEach((mult, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = fundamental * mult;
        const g = ctx.createGain();
        const amp = volume * (0.4 / (idx + 1));
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(amp, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6 / (idx + 1));
        osc.connect(g).connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.7);
      });
      break;
    }

    case 'cartoonFanfare': {
      // 3-note ascending major triad
      const notes = [523, 659, 784]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const start = now + i * 0.1;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(volume * 0.3, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(g).connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.45);
      });
      break;
    }

    case 'cartoonWobble': {
      // Wobble jelly: vibrato sine
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 320;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 8;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain).connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g).connect(masterGain);
      lfo.start(now);
      osc.start(now);
      osc.stop(now + 0.32);
      lfo.stop(now + 0.32);
      break;
    }

    case 'cartoonZap': {
      // Zap: sawtooth descending fast
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume * 0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(filter).connect(g).connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
      break;
    }

    default: {
      // Fallback to simple click
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }
};

/**
 * Play an Ink-themed sound effect
 */
export const playInkSound = (type: InkSoundType, volume: number = 0.3) => {
  try {
    const ctx = getInkAudioContext();
    createInkSound(ctx, type, volume);
  } catch (error) {
    console.warn('Failed to play ink sound:', error);
  }
};

/**
 * Hook for Ink-themed sound effects
 * Automatically uses Ink sounds when in Ink mode, falls back to standard sounds otherwise
 */
export const useInkSoundEffects = () => {
  const { isInkMode } = useInkMode();
  
  const playSound = useCallback((type: InkSoundType, volume: number = 0.3) => {
    if (!isInkMode) return; // Only play in Ink mode
    playInkSound(type, volume);
  }, [isInkMode]);

  return { playSound, playInkSound, isInkMode };
};

export type { InkSoundType };
