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
  | 'inkTransition';   // Page transition

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
