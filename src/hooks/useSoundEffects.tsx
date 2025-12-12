import { useCallback, useRef } from 'react';

type SoundType = 'click' | 'success' | 'vote' | 'transition' | 'countdown' | 'error' | 'whoosh' | 'message' | 'join' | 'leave' | 'start' | 'record' | 'stop' | 'ding' | 'pop';

// Create more sophisticated sounds using multiple oscillators and filters
const createRichSound = (ctx: AudioContext, type: SoundType, volume: number) => {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  switch (type) {
    case 'click': {
      // Crisp click with harmonics
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(masterGain);
      gain2.connect(masterGain);
      
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(2400, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.02);
      osc2.type = 'triangle';
      
      gain1.gain.setValueAtTime(volume * 0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      gain2.gain.setValueAtTime(volume * 0.3, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.06);
      osc2.stop(now + 0.04);
      break;
    }
    
    case 'success': {
      // Triumphant chord progression
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.05);
        
        osc.start(now + i * 0.08);
        osc.stop(now + 0.8);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'vote': {
      // Satisfying pop with shimmer
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain1 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain1);
      gain1.connect(filter);
      filter.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      
      osc1.frequency.setValueAtTime(600, now);
      osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(1200, now);
      osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
      osc2.type = 'triangle';
      
      gain1.gain.setValueAtTime(volume * 0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.15);
      break;
    }
    
    case 'transition': {
      // Smooth swoosh with reverb-like tail
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
      filter.Q.setValueAtTime(2, now);
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    
    case 'countdown': {
      // Sharp tick with resonance
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, now);
      
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      osc.type = 'square';
      
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }
    
    case 'error': {
      // Dissonant buzz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.setValueAtTime(120, now + 0.15);
      osc1.type = 'sawtooth';
      
      osc2.frequency.setValueAtTime(185, now);
      osc2.frequency.setValueAtTime(125, now + 0.15);
      osc2.type = 'square';
      
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
      break;
    }
    
    case 'whoosh': {
      // Dynamic whoosh with noise-like character
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);
      filter.Q.setValueAtTime(1, now);
      
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.45);
      break;
    }
    
    case 'message': {
      // Pleasant notification ding
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(masterGain);
      gain2.connect(masterGain);
      
      osc1.frequency.setValueAtTime(1318.51, now); // E6
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(1567.98, now + 0.08); // G6
      osc2.type = 'sine';
      
      gain1.gain.setValueAtTime(volume * 0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(volume * 0.4, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.25);
      break;
    }
    
    case 'join': {
      // Welcoming ascending tone
      const frequencies = [392, 523.25, 659.25]; // G4, C5, E5
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.5, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.05);
        
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'leave': {
      // Descending farewell tone
      const frequencies = [659.25, 523.25, 392]; // E5, C5, G4
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.05);
        
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'start': {
      // Energetic game start fanfare
      const notes = [
        { freq: 523.25, time: 0 },      // C5
        { freq: 659.25, time: 0.1 },    // E5
        { freq: 783.99, time: 0.2 },    // G5
        { freq: 1046.50, time: 0.35 },  // C6
      ];
      
      notes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(freq, now + time);
        osc.type = 'triangle';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.6, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);
        
        osc.start(now + time);
        osc.stop(now + time + 0.35);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'record': {
      // Recording start beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(880, now);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.setValueAtTime(0, now + 0.15);
      gain.gain.setValueAtTime(volume * 0.5, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
    
    case 'stop': {
      // Recording stop beep (lower)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(440, now);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    
    case 'ding': {
      // Crystal clear ding
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      
      osc1.frequency.setValueAtTime(2093, now); // C7
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(4186, now); // C8 harmonic
      osc2.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.3);
      break;
    }
    
    case 'pop': {
      // Bubbly pop sound
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
      
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }
  }
};

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType, volume: number = 0.3) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      createRichSound(ctx, type, volume);
    } catch (e) {
      console.warn('Sound effect failed:', e);
    }
  }, [getAudioContext]);

  return { playSound };
};

// Global singleton for components that can't use hooks
let globalAudioContext: AudioContext | null = null;

export const playSoundEffect = (type: SoundType, volume: number = 0.3) => {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume();
    }
    
    createRichSound(globalAudioContext, type, volume);
  } catch (e) {
    console.warn('Sound effect failed:', e);
  }
};
