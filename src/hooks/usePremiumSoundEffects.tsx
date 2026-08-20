import { useCallback, useRef } from 'react';
import { registerAudioContext } from '@/lib/audioUnlock';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

export type PremiumSoundType = 
  // === CORE UI SOUNDS ===
  | 'click' | 'clickSoft' | 'clickHard' | 'clickGlass' | 'clickMetal'
  | 'hover' | 'hoverSoft' | 'hoverMedium' | 'hoverIntense'
  | 'focus' | 'blur'
  | 'toggle' | 'toggleOn' | 'toggleOff'
  | 'select' | 'deselect' | 'multiSelect'
  | 'expand' | 'collapse'
  | 'tab' | 'pageFlip'
  
  // === FEEDBACK SOUNDS ===
  | 'success' | 'successBig' | 'successSubtle'
  | 'error' | 'errorSoft' | 'errorHard'
  | 'warning' | 'warningUrgent'
  | 'info' | 'notification'
  
  // === GAME SOUNDS ===
  | 'start' | 'gameStart' | 'roundStart'
  | 'countdown1' | 'countdown2' | 'countdown3' | 'countdownGo'
  | 'score' | 'scoreUp' | 'scoreBonus' | 'combo'
  | 'correct' | 'wrong' | 'almostCorrect'
  | 'victory' | 'defeat' | 'draw'
  | 'levelUp' | 'unlock' | 'achievement'
  | 'powerUp' | 'powerDown'
  | 'coin' | 'gem' | 'star'
  | 'health' | 'damage' | 'shield'
  
  // === TRANSITION SOUNDS ===
  | 'whoosh' | 'whooshSoft' | 'whooshHard'
  | 'swoosh' | 'swipe'
  | 'pop' | 'popIn' | 'popOut'
  | 'slide' | 'slideIn' | 'slideOut'
  | 'morph' | 'transform'
  | 'glitch' | 'digital' | 'cyber'
  | 'portal' | 'warp' | 'teleport'
  | 'magic' | 'sparkle' | 'shimmer'
  | 'impact' | 'thud' | 'boom'
  | 'electric' | 'zap' | 'shock'
  | 'laser' | 'beam'
  
  // === AMBIENT SOUNDS ===
  | 'ambientChime' | 'ambientWhoosh'
  | 'suspense' | 'tension' | 'dramatic'
  | 'reveal' | 'unveil'
  | 'anticipation' | 'buildup' | 'release'
  
  // === COMMUNICATION SOUNDS ===
  | 'message' | 'messageSend' | 'messageReceive'
  | 'typing' | 'mention'
  | 'join' | 'leave' | 'connect' | 'disconnect'
  | 'invite' | 'accept' | 'decline'
  
  // === RECORDING SOUNDS ===
  | 'record' | 'recordStart' | 'recordStop'
  | 'play' | 'pause' | 'stop'
  | 'rewind' | 'fastForward'
  
  // === SPECIAL EFFECTS ===
  | 'celebration' | 'confetti' | 'firework'
  | 'fanfare' | 'drumroll' | 'tada'
  | 'ding' | 'bell' | 'chime'
  | 'blip' | 'beep' | 'boop';

// Create sophisticated sounds using Web Audio API
const createPremiumSound = (ctx: AudioContext, type: PremiumSoundType, baseVolume: number) => {
  const now = ctx.currentTime;
  const globalVolume = getSoundEffectsVolume();
  const volume = baseVolume * globalVolume;
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // Helper to create filtered oscillator
  const createOsc = (freq: number, oscType: OscillatorType = 'sine', duration: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.frequency.setValueAtTime(freq, now);
    osc.type = oscType;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
    return { osc, gain };
  };

  // Helper to create noise
  const createNoise = (duration: number, filterFreq: number = 1000) => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.start(now);
    noise.stop(now + duration);
    return { noise, filter, gain };
  };

  switch (type) {
    // === CLICK SOUNDS ===
    case 'click': {
      const { osc } = createOsc(1200, 'sine', 0.06);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      createOsc(2400, 'triangle', 0.04);
      break;
    }
    case 'clickSoft': {
      createOsc(800, 'sine', 0.04);
      break;
    }
    case 'clickHard': {
      createOsc(1500, 'square', 0.05);
      createOsc(100, 'sine', 0.03);
      createNoise(0.02, 2000);
      break;
    }
    case 'clickGlass': {
      [4000, 5500, 7000].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 10);
      });
      break;
    }
    case 'clickMetal': {
      createOsc(3000, 'sawtooth', 0.08);
      createOsc(1500, 'square', 0.06);
      createNoise(0.03, 3000);
      break;
    }

    // === HOVER SOUNDS ===
    case 'hover':
    case 'hoverSoft': {
      createOsc(2000, 'sine', 0.04);
      break;
    }
    case 'hoverMedium': {
      const { osc } = createOsc(1500, 'sine', 0.06);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.04);
      break;
    }
    case 'hoverIntense': {
      createOsc(1800, 'sine', 0.08);
      createOsc(2200, 'triangle', 0.08);
      break;
    }

    // === TOGGLE SOUNDS ===
    case 'toggle':
    case 'toggleOn': {
      const { osc } = createOsc(600, 'sine', 0.1);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      break;
    }
    case 'toggleOff': {
      const { osc } = createOsc(1000, 'sine', 0.1);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
      break;
    }

    // === SUCCESS SOUNDS ===
    case 'success': {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.3), i * 80);
      });
      break;
    }
    case 'successBig': {
      const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      fanfare.forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.4);
          createOsc(freq * 2, 'triangle', 0.2);
        }, i * 100);
      });
      break;
    }
    case 'successSubtle': {
      createOsc(880, 'sine', 0.15);
      setTimeout(() => createOsc(1100, 'sine', 0.15), 50);
      break;
    }

    // === ERROR SOUNDS ===
    case 'error': {
      createOsc(200, 'sawtooth', 0.4);
      createOsc(205, 'sawtooth', 0.4);
      break;
    }
    case 'errorSoft': {
      const { osc } = createOsc(400, 'sine', 0.2);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      break;
    }
    case 'errorHard': {
      createOsc(150, 'square', 0.3);
      createOsc(155, 'square', 0.3);
      createNoise(0.1, 500);
      break;
    }

    // === GAME START SOUNDS ===
    case 'start':
    case 'gameStart': {
      const notes = [261.63, 329.63, 392, 523.25, 659.25];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.25);
          createOsc(freq * 1.5, 'triangle', 0.15);
        }, i * 80);
      });
      break;
    }
    case 'roundStart': {
      createOsc(440, 'sine', 0.2);
      setTimeout(() => createOsc(880, 'sine', 0.3), 150);
      break;
    }

    // === COUNTDOWN SOUNDS ===
    case 'countdown3': {
      createOsc(440, 'sine', 0.15);
      break;
    }
    case 'countdown2': {
      createOsc(523.25, 'sine', 0.15);
      break;
    }
    case 'countdown1': {
      createOsc(659.25, 'sine', 0.15);
      break;
    }
    case 'countdownGo': {
      [880, 1046.50, 1318.51].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.3), i * 50);
      });
      break;
    }

    // === SCORE SOUNDS ===
    case 'score':
    case 'scoreUp': {
      const { osc } = createOsc(600, 'sine', 0.2);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      break;
    }
    case 'scoreBonus': {
      [800, 1000, 1200, 1600].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 40);
      });
      break;
    }
    case 'combo': {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.12);
          createOsc(freq * 2, 'triangle', 0.08);
        }, i * 30);
      });
      break;
    }

    // === CORRECT/WRONG ===
    case 'correct': {
      createOsc(880, 'sine', 0.15);
      setTimeout(() => createOsc(1100, 'sine', 0.2), 80);
      break;
    }
    case 'wrong': {
      createOsc(300, 'sawtooth', 0.3);
      createOsc(290, 'sawtooth', 0.3);
      break;
    }
    case 'almostCorrect': {
      createOsc(600, 'triangle', 0.2);
      setTimeout(() => createOsc(500, 'triangle', 0.15), 100);
      break;
    }

    // === VICTORY/DEFEAT ===
    case 'victory': {
      const melody = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
      melody.forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.3);
          createOsc(freq / 2, 'triangle', 0.2);
        }, i * 100);
      });
      break;
    }
    case 'defeat': {
      const notes = [400, 350, 300, 250, 200];
      notes.forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.25), i * 150);
      });
      break;
    }
    case 'draw': {
      createOsc(440, 'sine', 0.3);
      createOsc(440, 'triangle', 0.3);
      break;
    }

    // === TRANSITION SOUNDS ===
    case 'whoosh':
    case 'swoosh': {
      const { osc } = createOsc(200, 'sine', 0.15);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
      createNoise(0.15, 3000);
      break;
    }
    case 'whooshSoft': {
      const { osc } = createOsc(300, 'sine', 0.1);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
      break;
    }
    case 'whooshHard': {
      const { osc } = createOsc(100, 'sawtooth', 0.2);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
      createNoise(0.2, 5000);
      break;
    }

    // === POP SOUNDS ===
    case 'pop':
    case 'popIn': {
      const { osc } = createOsc(400, 'sine', 0.08);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
      break;
    }
    case 'popOut': {
      const { osc } = createOsc(800, 'sine', 0.08);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      break;
    }

    // === GLITCH/CYBER SOUNDS ===
    case 'glitch': {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          createOsc(100 + Math.random() * 2000, 'square', 0.02);
        }, i * 20);
      }
      createNoise(0.1, 2000);
      break;
    }
    case 'digital':
    case 'cyber': {
      const { osc } = createOsc(100, 'square', 0.15);
      osc.frequency.setValueAtTime(100, now);
      for (let i = 0; i < 10; i++) {
        osc.frequency.setValueAtTime(100 + Math.random() * 1000, now + i * 0.015);
      }
      break;
    }

    // === PORTAL/WARP SOUNDS ===
    case 'portal':
    case 'warp':
    case 'teleport': {
      const { osc } = createOsc(2000, 'sine', 0.4);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      createOsc(100, 'sawtooth', 0.3);
      break;
    }

    // === MAGIC SOUNDS ===
    case 'magic':
    case 'sparkle': {
      [2000, 2500, 3000, 3500, 4000].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 30);
      });
      break;
    }
    case 'shimmer': {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createOsc(2000 + Math.random() * 2000, 'sine', 0.1), i * 40);
      }
      break;
    }

    // === IMPACT SOUNDS ===
    case 'impact':
    case 'thud': {
      createOsc(80, 'sine', 0.3);
      createNoise(0.1, 500);
      break;
    }
    case 'boom': {
      createOsc(60, 'sine', 0.5);
      createOsc(80, 'triangle', 0.4);
      createNoise(0.2, 800);
      break;
    }

    // === ELECTRIC SOUNDS ===
    case 'electric':
    case 'zap': {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          createOsc(1000 + Math.random() * 3000, 'sawtooth', 0.03);
        }, i * 15);
      }
      break;
    }
    case 'shock': {
      createNoise(0.15, 4000);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => createOsc(500 + Math.random() * 2000, 'square', 0.02), i * 20);
      }
      break;
    }

    // === LASER SOUNDS ===
    case 'laser':
    case 'beam': {
      const { osc } = createOsc(3000, 'sawtooth', 0.15);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
      break;
    }

    // === MESSAGE SOUNDS ===
    case 'message':
    case 'messageSend': {
      createOsc(800, 'sine', 0.08);
      setTimeout(() => createOsc(1000, 'sine', 0.1), 50);
      break;
    }
    case 'messageReceive': {
      createOsc(600, 'sine', 0.1);
      setTimeout(() => createOsc(800, 'sine', 0.15), 80);
      break;
    }

    // === JOIN/LEAVE SOUNDS ===
    case 'join':
    case 'connect': {
      [400, 600, 800].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 60);
      });
      break;
    }
    case 'leave':
    case 'disconnect': {
      [800, 600, 400].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 60);
      });
      break;
    }

    // === INVITE SOUNDS ===
    case 'invite': {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.2), i * 100);
      });
      break;
    }
    case 'accept': {
      createOsc(800, 'sine', 0.1);
      setTimeout(() => createOsc(1200, 'sine', 0.15), 80);
      break;
    }
    case 'decline': {
      createOsc(600, 'sine', 0.15);
      setTimeout(() => createOsc(400, 'sine', 0.2), 100);
      break;
    }

    // === RECORDING SOUNDS ===
    case 'record':
    case 'recordStart': {
      createOsc(880, 'sine', 0.1);
      setTimeout(() => createOsc(880, 'sine', 0.1), 150);
      setTimeout(() => createOsc(880, 'sine', 0.15), 300);
      break;
    }
    case 'recordStop': {
      createOsc(660, 'sine', 0.2);
      break;
    }
    case 'play': {
      const { osc } = createOsc(440, 'triangle', 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      break;
    }
    case 'pause':
    case 'stop': {
      createOsc(440, 'sine', 0.1);
      createOsc(440, 'sine', 0.1);
      break;
    }

    // === CELEBRATION SOUNDS ===
    case 'celebration':
    case 'confetti': {
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          createOsc(800 + Math.random() * 1500, 'sine', 0.1);
        }, i * 30);
      }
      break;
    }
    case 'firework': {
      const { osc } = createOsc(200, 'sine', 0.3);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          setTimeout(() => createOsc(1000 + Math.random() * 2000, 'sine', 0.15), i * 20);
        }
      }, 250);
      break;
    }
    case 'fanfare': {
      const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 659.25, 783.99];
      const durations = [0.1, 0.1, 0.1, 0.15, 0.3, 0.15, 0.4];
      let time = 0;
      melody.forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', durations[i]), time);
        time += durations[i] * 1000 + 50;
      });
      break;
    }
    case 'drumroll': {
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          createOsc(100 + Math.random() * 50, 'triangle', 0.05);
          createNoise(0.03, 1000);
        }, i * 30);
      }
      break;
    }
    case 'tada': {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.3);
          createOsc(freq * 2, 'triangle', 0.2);
        }, i * 80);
      });
      break;
    }

    // === DING/BELL SOUNDS ===
    case 'ding':
    case 'bell':
    case 'chime': {
      [1200, 1500, 1800].forEach((freq, i) => {
        const { osc, gain } = createOsc(freq, 'sine', 0.5);
        gain.gain.setValueAtTime(volume * (1 - i * 0.2), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      });
      break;
    }

    // === BLIP/BEEP SOUNDS ===
    case 'blip': {
      createOsc(1000, 'sine', 0.05);
      break;
    }
    case 'beep': {
      createOsc(800, 'square', 0.1);
      break;
    }
    case 'boop': {
      const { osc } = createOsc(600, 'sine', 0.08);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
      break;
    }

    // === LEVEL/UNLOCK SOUNDS ===
    case 'levelUp': {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          createOsc(freq, 'sine', 0.25);
          createOsc(freq * 1.5, 'triangle', 0.15);
        }, i * 100);
      });
      break;
    }
    case 'unlock':
    case 'achievement': {
      const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      fanfare.forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.35), i * 100);
      });
      for (let i = 0; i < 5; i++) {
        setTimeout(() => createOsc(3000 + Math.random() * 2000, 'sine', 0.1), 500 + i * 40);
      }
      break;
    }

    // === POWER UP/DOWN ===
    case 'powerUp': {
      const { osc } = createOsc(200, 'sawtooth', 0.4);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.35);
      break;
    }
    case 'powerDown': {
      const { osc } = createOsc(1500, 'sawtooth', 0.4);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.35);
      break;
    }

    // === COLLECTIBLE SOUNDS ===
    case 'coin': {
      createOsc(1400, 'sine', 0.08);
      setTimeout(() => createOsc(1800, 'sine', 0.12), 60);
      break;
    }
    case 'gem': {
      [1200, 1500, 1800, 2200].forEach((freq, i) => {
        setTimeout(() => createOsc(freq, 'sine', 0.15), i * 30);
      });
      break;
    }
    case 'star': {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => createOsc(2000 + i * 200, 'sine', 0.12), i * 25);
      }
      break;
    }

    // === DEFAULT FALLBACK ===
    default: {
      createOsc(800, 'sine', 0.1);
      break;
    }
  }
};

// Singleton AudioContext
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = registerAudioContext(new AudioContext());
  }
  return audioContext;
};

// Export standalone function for playing sounds
export const playPremiumSound = (type: PremiumSoundType, volume: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    // Relance suivie et retentée au prochain geste : un `resume()` isolé laissait
    // le contexte suspendu à vie quand il naissait hors interaction.
    if (ctx.state === 'suspended') {
      registerAudioContext(ctx);
    }
    createPremiumSound(ctx, type, volume);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

// Hook for using premium sounds
export const usePremiumSoundEffects = () => {
  const contextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: PremiumSoundType, volume: number = 0.5) => {
    try {
      if (!contextRef.current) {
        contextRef.current = registerAudioContext(new AudioContext());
      }

      if (contextRef.current.state === 'suspended') {
        registerAudioContext(contextRef.current);
      }

      createPremiumSound(contextRef.current, type, volume);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, []);

  return { playSound };
};
