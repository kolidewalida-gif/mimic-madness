import { useCallback, useRef } from 'react';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

type SoundType = 
  | 'click' | 'success' | 'vote' | 'transition' | 'countdown' | 'error' | 'whoosh' 
  | 'message' | 'join' | 'leave' | 'start' | 'record' | 'stop' | 'ding' | 'pop'
  // Professional sounds
  | 'messageSend' | 'messageReceive' | 'gifSend' | 'imageSend'
  | 'transitionGlitch' | 'transitionPortal' | 'transitionSwoosh' | 'transitionImpact'
  | 'dramatic' | 'reveal' | 'tension' | 'celebration' | 'cyber' | 'powerUp'
  // Quiz sounds
  | 'quizCorrect' | 'quizWrong' | 'quizTick' | 'quizReveal' | 'quizRush' | 'quizTimeUp' | 'scoreUp'
  // New transition sounds
  | 'vortex' | 'electric' | 'hologram' | 'morph'
  // UI sounds
  | 'hover'
  // NEW: 50+ Additional sounds
  // UI Advanced
  | 'hoverSoft' | 'hoverMedium' | 'hoverStrong'
  | 'clickSoft' | 'clickMechanical' | 'clickGlass'
  | 'focusIn' | 'focusOut'
  | 'selectItem' | 'deselectItem'
  | 'expandMenu' | 'collapseMenu'
  | 'toggleOn' | 'toggleOff'
  | 'tabSwitch' | 'pageFlip'
  // Notifications
  | 'notifySuccess' | 'notifyError' | 'notifyWarning' | 'notifyInfo'
  | 'alertUrgent' | 'alertMild'
  | 'achievementEarned' | 'badgeUnlocked'
  | 'levelComplete' | 'gameOver'
  // Ambient
  | 'ambientWhoosh' | 'ambientChime'
  | 'suspenseBuild' | 'suspenseRelease'
  | 'anticipation' | 'resolution'
  // Transitions
  | 'transitionWoosh' | 'transitionZap' | 'transitionMagic'
  | 'transitionMechanical' | 'transitionDigital'
  | 'transitionOrganic' | 'transitionCosmic'
  // Quiz Enhanced
  | 'quizCountdown1' | 'quizCountdown2' | 'quizCountdown3'
  | 'quizBonus' | 'quizStreak' | 'quizCombo'
  | 'quizPerfect' | 'quizAlmostThere'
  // Game
  | 'coinDrop' | 'gemCollect' | 'xpGain'
  | 'healthUp' | 'healthDown'
  | 'shield' | 'powerDown'
  | 'teleport' | 'warp' | 'glitch'
  // Ink brush stroke for Ink theme animation
  | 'brushStroke';

// Create sophisticated sounds using multiple oscillators, filters, and effects
const createRichSound = (ctx: AudioContext, type: SoundType, baseVolume: number) => {
  const now = ctx.currentTime;
  // Apply global sound effects volume
  const globalVolume = getSoundEffectsVolume();
  const volume = baseVolume * globalVolume;
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  switch (type) {
    case 'click': {
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

    // ===== NEW UI SOUNDS =====
    case 'hoverSoft': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(2000, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case 'hoverMedium': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.04);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }

    case 'hoverStrong': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(1800, now);
      osc2.frequency.setValueAtTime(2200, now);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.08);
      osc2.stop(now + 0.08);
      break;
    }

    case 'clickSoft': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }

    case 'clickMechanical': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, now);
      osc1.frequency.setValueAtTime(3000, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.02);
      osc2.frequency.setValueAtTime(100, now);
      osc1.type = 'square';
      osc2.type = 'sawtooth';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.05);
      osc2.stop(now + 0.05);
      break;
    }

    case 'clickGlass': {
      const freqs = [4000, 5500, 7000];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.01);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.2, now + i * 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.02);
        osc.start(now + i * 0.01);
        osc.stop(now + 0.2);
      });
      break;
    }

    case 'focusIn': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'focusOut': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }

    case 'selectItem': {
      const notes = [523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.3, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.03);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.2);
      });
      break;
    }

    case 'deselectItem': {
      const notes = [659.25, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.25, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + i * 0.03);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.18);
      });
      break;
    }

    case 'expandMenu': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'collapseMenu': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.12);
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'toggleOn': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case 'toggleOff': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case 'tabSwitch': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.05);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }

    case 'pageFlip': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.Q.setValueAtTime(2, now);
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }

    // ===== NOTIFICATION SOUNDS =====
    case 'notifySuccess': {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.7);
      });
      break;
    }

    case 'notifyError': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(200, now);
      osc2.frequency.setValueAtTime(205, now);
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
      break;
    }

    case 'notifyWarning': {
      const notes = [440, 523.25, 440];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.1);
        osc.start(now + i * 0.12);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'notifyInfo': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1174.66, now + 0.08);
      osc1.type = 'sine';
      osc2.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.3);
      break;
    }

    case 'alertUrgent': {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(880, now + i * 0.15);
        osc.type = 'square';
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      }
      break;
    }

    case 'alertMild': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(660, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case 'achievementEarned': {
      const fanfare = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.1 },
        { freq: 783.99, time: 0.2 },
        { freq: 1046.50, time: 0.35 },
        { freq: 1318.51, time: 0.5 },
      ];
      fanfare.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + time);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.4, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);
        osc.start(now + time);
        osc.stop(now + time + 0.35);
      });
      // Sparkle
      for (let i = 0; i < 5; i++) {
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.connect(sparkleGain);
        sparkleGain.connect(masterGain);
        sparkle.frequency.setValueAtTime(2500 + Math.random() * 2000, now + 0.5 + i * 0.05);
        sparkle.type = 'sine';
        sparkleGain.gain.setValueAtTime(volume * 0.15, now + 0.5 + i * 0.05);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7 + i * 0.05);
        sparkle.start(now + 0.5 + i * 0.05);
        sparkle.stop(now + 0.8);
      }
      break;
    }

    case 'badgeUnlocked': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(300, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      osc2.frequency.setValueAtTime(450, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
      break;
    }

    case 'levelComplete': {
      const notes = [392, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.05);
        osc.start(now + i * 0.08);
        osc.stop(now + 1);
      });
      break;
    }

    case 'gameOver': {
      const notes = [523.25, 392, 329.63, 261.63];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.25);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.4);
        osc.start(now + i * 0.25);
        osc.stop(now + 1.5);
      });
      break;
    }

    // ===== AMBIENT SOUNDS =====
    case 'ambientWhoosh': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.6);
      filter.Q.setValueAtTime(1, now);
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.6);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
      break;
    }

    case 'ambientChime': {
      const notes = [1318.51, 1567.98, 2093.00, 2637.02];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.15, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1 + i * 0.1);
        osc.start(now + i * 0.15);
        osc.stop(now + 1.5);
      });
      break;
    }

    case 'suspenseBuild': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1500, now + 1.5);
      lfo.frequency.setValueAtTime(2, now);
      lfo.frequency.linearRampToValueAtTime(15, now + 1.5);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(5, now);
      lfoGain.gain.linearRampToValueAtTime(30, now + 1.5);
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(150, now + 1.5);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.5);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 2);
      osc.stop(now + 2);
      break;
    }

    case 'suspenseRelease': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }

    case 'anticipation': {
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(200 + i * 100, now + i * 0.15);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * (0.2 + i * 0.05), now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
        osc.start(now + i * 0.15);
        osc.stop(now + 1);
      }
      break;
    }

    case 'resolution': {
      const chord = [261.63, 329.63, 392.00, 523.25];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
        osc.start(now);
        osc.stop(now + 1);
      });
      break;
    }

    // ===== TRANSITION SOUNDS =====
    case 'transitionWoosh': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(5000, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      filter.Q.setValueAtTime(2, now);
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.45);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }

    case 'transitionZap': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(3000, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'transitionMagic': {
      const notes = [1318.51, 1567.98, 2093.00, 2637.02, 3135.96];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.25, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.7);
      });
      break;
    }

    case 'transitionMechanical': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      osc1.frequency.setValueAtTime(60, now);
      osc2.frequency.setValueAtTime(120, now);
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
      break;
    }

    case 'transitionDigital': {
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(500 + Math.random() * 2000, now + i * 0.03);
        osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        gain.gain.setValueAtTime(volume * 0.25, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.04);
        osc.start(now + i * 0.03);
        osc.stop(now + 0.25);
      }
      break;
    }

    case 'transitionOrganic': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.Q.setValueAtTime(5, now);
      lfo.frequency.setValueAtTime(6, now);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(150, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.5);
      osc.stop(now + 0.5);
      break;
    }

    case 'transitionCosmic': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.8);
      filter.Q.setValueAtTime(3, now);
      lfo.frequency.setValueAtTime(5, now);
      lfo.frequency.linearRampToValueAtTime(15, now + 0.4);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(30, now);
      osc1.frequency.setValueAtTime(100, now);
      osc1.frequency.exponentialRampToValueAtTime(300, now + 0.4);
      osc2.frequency.setValueAtTime(150, now);
      osc2.frequency.exponentialRampToValueAtTime(450, now + 0.4);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + 0.9);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
      break;
    }

    // ===== QUIZ ENHANCED SOUNDS =====
    case 'quizCountdown1': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(880, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'quizCountdown2': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1046.50, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'quizCountdown3': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1318.51, now);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'quizBonus': {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.04);
        osc.start(now + i * 0.05);
        osc.stop(now + 0.6);
      });
      break;
    }

    case 'quizStreak': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
      osc2.frequency.setValueAtTime(600, now);
      osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.3);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
      break;
    }

    case 'quizCombo': {
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(600 + i * 200, now + i * 0.08);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.5);
      }
      break;
    }

    case 'quizPerfect': {
      const fanfare = [
        { notes: [523.25, 659.25, 783.99], time: 0 },
        { notes: [587.33, 739.99, 880], time: 0.12 },
        { notes: [659.25, 830.61, 987.77], time: 0.24 },
        { notes: [783.99, 987.77, 1174.66], time: 0.36 },
        { notes: [1046.50, 1318.51, 1567.98], time: 0.5 },
      ];
      fanfare.forEach(({ notes, time }) => {
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.setValueAtTime(freq, now + time);
          osc.type = i === 0 ? 'sine' : 'triangle';
          gain.gain.setValueAtTime(volume * (0.35 - i * 0.08), now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35);
          osc.start(now + time);
          osc.stop(now + time + 0.4);
        });
      });
      break;
    }

    case 'quizAlmostThere': {
      const notes = [523.25, 622.25, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.3, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
        osc.start(now + i * 0.12);
        osc.stop(now + 0.5);
      });
      break;
    }

    // ===== GAME SOUNDS =====
    case 'coinDrop': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.setValueAtTime(2000, now + 0.05);
      osc.frequency.setValueAtTime(1800, now + 0.1);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'gemCollect': {
      const notes = [1318.51, 1567.98, 2093.00];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.05);
        osc.start(now + i * 0.06);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'xpGain': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case 'healthUp': {
      const notes = [392, 523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.08);
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'healthDown': {
      const notes = [659.25, 523.25, 392];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(volume * 0.3, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + i * 0.08);
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5);
      });
      break;
    }

    case 'shield': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
      break;
    }

    case 'powerDown': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
      break;
    }

    case 'teleport': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(5, now);
      lfo.frequency.setValueAtTime(20, now);
      lfo.frequency.linearRampToValueAtTime(50, now + 0.3);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.35);
      osc.stop(now + 0.35);
      break;
    }

    case 'warp': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      osc1.frequency.setValueAtTime(100, now);
      osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
      osc1.frequency.exponentialRampToValueAtTime(150, now + 0.5);
      osc2.frequency.setValueAtTime(103, now);
      osc2.frequency.exponentialRampToValueAtTime(1003, now + 0.25);
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
      break;
    }

    case 'glitch': {
      for (let i = 0; i < 10; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        const startTime = now + i * 0.025;
        const freq = 200 + Math.random() * 1500;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, startTime);
        filter.Q.setValueAtTime(8, startTime);
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.setValueAtTime(freq * (0.5 + Math.random()), startTime + 0.01);
        osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        gain.gain.setValueAtTime(volume * (0.15 + Math.random() * 0.2), startTime);
        gain.gain.setValueAtTime(0, startTime + 0.02);
        osc.start(startTime);
        osc.stop(startTime + 0.025);
      }
      break;
    }
    
    case 'success': {
      const frequencies = [523.25, 659.25, 783.99, 1046.50];
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
      // Warm "tock" — soft sine body + subtle harmonic, low-pass smoothed
      const body = ctx.createOscillator();
      const harm = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      body.connect(gain);
      harm.connect(gain);
      gain.connect(filter);
      filter.connect(masterGain);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(0.8, now);

      body.type = 'sine';
      body.frequency.setValueAtTime(660, now);
      body.frequency.exponentialRampToValueAtTime(440, now + 0.18);

      harm.type = 'triangle';
      harm.frequency.setValueAtTime(1320, now);
      harm.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.45, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      masterGain.gain.setValueAtTime(1, now);

      body.start(now);
      harm.start(now);
      body.stop(now + 0.3);
      harm.stop(now + 0.18);
      break;
    }
    
    case 'error': {
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
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(masterGain);
      gain2.connect(masterGain);
      
      osc1.frequency.setValueAtTime(1318.51, now);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(1567.98, now + 0.08);
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

    case 'messageSend': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const sparkleGain = ctx.createGain();
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc3.connect(sparkleGain);
      sparkleGain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.12);
      filter.Q.setValueAtTime(3, now);
      
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
      osc2.type = 'triangle';
      
      osc3.frequency.setValueAtTime(2637, now + 0.1);
      osc3.type = 'sine';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      sparkleGain.gain.setValueAtTime(0, now);
      sparkleGain.gain.setValueAtTime(volume * 0.3, now + 0.1);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc3.start(now + 0.1);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.15);
      osc3.stop(now + 0.25);
      break;
    }

    case 'messageReceive': {
      const notes = [1975.53, 1567.98, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now + i * 0.06);
        
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.35, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.05);
        
        osc.start(now + i * 0.06);
        osc.stop(now + 0.4);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }

    case 'gifSend': {
      const bounces = [
        { freq: 523.25, time: 0, dur: 0.08 },
        { freq: 783.99, time: 0.08, dur: 0.06 },
        { freq: 1046.50, time: 0.14, dur: 0.1 },
      ];
      
      bounces.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(freq, now + time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + time + dur);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(volume * 0.5, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur + 0.05);
        
        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }

    case 'imageSend': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noise = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(filter);
      noise.connect(filter);
      filter.connect(gain2);
      gain1.connect(masterGain);
      gain2.connect(masterGain);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, now);
      
      osc1.frequency.setValueAtTime(4000, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.02);
      osc1.type = 'square';
      
      osc2.frequency.setValueAtTime(150, now + 0.02);
      osc2.type = 'sawtooth';
      
      noise.frequency.setValueAtTime(100, now + 0.02);
      noise.type = 'sawtooth';
      
      gain1.gain.setValueAtTime(volume * 0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(volume * 0.3, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now + 0.02);
      noise.start(now + 0.02);
      osc1.stop(now + 0.04);
      osc2.stop(now + 0.08);
      noise.stop(now + 0.08);
      break;
    }

    case 'transitionGlitch': {
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        const startTime = now + i * 0.03;
        const freq = 100 + Math.random() * 2000;
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, startTime);
        filter.Q.setValueAtTime(10, startTime);
        
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.setValueAtTime(freq * (0.5 + Math.random()), startTime + 0.015);
        osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        
        gain.gain.setValueAtTime(volume * (0.2 + Math.random() * 0.3), startTime);
        gain.gain.setValueAtTime(0, startTime + 0.02);
        
        osc.start(startTime);
        osc.stop(startTime + 0.025);
      }
      masterGain.gain.setValueAtTime(1, now);
      break;
    }

    case 'transitionPortal': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
      
      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.6);
      filter.Q.setValueAtTime(5, now);
      
      lfo.frequency.setValueAtTime(8, now);
      lfo.frequency.linearRampToValueAtTime(20, now + 0.3);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(50, now);
      
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.3);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.6);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(225, now);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.3);
      osc2.type = 'triangle';
      
      osc3.frequency.setValueAtTime(450, now);
      osc3.type = 'sine';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      masterGain.gain.setValueAtTime(1, now);
      
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      lfo.stop(now + 0.7);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
      osc3.stop(now + 0.7);
      break;
    }

    case 'transitionSwoosh': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter1 = ctx.createBiquadFilter();
      const filter2 = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc1.connect(filter1);
      osc2.connect(filter2);
      filter1.connect(gain);
      filter2.connect(gain);
      gain.connect(masterGain);
      
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(80, now);
      filter1.frequency.exponentialRampToValueAtTime(6000, now + 0.2);
      filter1.frequency.exponentialRampToValueAtTime(150, now + 0.5);
      filter1.Q.setValueAtTime(2, now);
      
      filter2.type = 'highpass';
      filter2.frequency.setValueAtTime(1000, now);
      
      osc1.frequency.setValueAtTime(60, now);
      osc1.frequency.exponentialRampToValueAtTime(4000, now + 0.25);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.55);
      osc1.type = 'sawtooth';
      
      osc2.frequency.setValueAtTime(2000, now);
      osc2.frequency.exponentialRampToValueAtTime(8000, now + 0.15);
      osc2.type = 'sine';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.2);
      break;
    }

    case 'transitionImpact': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();
      const gain = ctx.createGain();
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(compressor);
      compressor.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.Q.setValueAtTime(5, now);
      
      compressor.threshold.setValueAtTime(-24, now);
      compressor.ratio.setValueAtTime(12, now);
      
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(120, now);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      osc2.type = 'triangle';
      
      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.35);
      break;
    }

    case 'dramatic': {
      const bass = ctx.createOscillator();
      const mid = ctx.createOscillator();
      const high = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      bass.connect(gain);
      mid.connect(filter);
      high.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
      
      bass.frequency.setValueAtTime(55, now);
      bass.type = 'sine';
      
      mid.frequency.setValueAtTime(110, now);
      mid.frequency.linearRampToValueAtTime(220, now + 0.6);
      mid.type = 'sawtooth';
      
      high.frequency.setValueAtTime(440, now + 0.2);
      high.type = 'triangle';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      masterGain.gain.setValueAtTime(1, now);
      
      bass.start(now);
      mid.start(now);
      high.start(now + 0.2);
      bass.stop(now + 0.8);
      mid.stop(now + 0.8);
      high.stop(now + 0.8);
      break;
    }

    case 'reveal': {
      const shimmer = [2093, 2637, 3135, 3520];
      shimmer.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, now + i * 0.05);
        filter.Q.setValueAtTime(3, now);
        
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.3, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.08);
        
        osc.start(now + i * 0.05);
        osc.stop(now + 0.7);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }

    case 'tension': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(1500, now + 1);
      
      lfo.frequency.setValueAtTime(2, now);
      lfo.frequency.linearRampToValueAtTime(15, now + 1);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(10, now);
      lfoGain.gain.linearRampToValueAtTime(50, now + 1);
      
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(200, now + 1);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      masterGain.gain.setValueAtTime(1, now);
      
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 1.2);
      osc.stop(now + 1.2);
      break;
    }

    case 'celebration': {
      const fanfare = [
        { notes: [523.25, 659.25, 783.99], time: 0 },
        { notes: [587.33, 739.99, 880], time: 0.15 },
        { notes: [659.25, 830.61, 987.77], time: 0.3 },
        { notes: [783.99, 987.77, 1174.66], time: 0.45 },
        { notes: [1046.50, 1318.51, 1567.98], time: 0.65 },
      ];
      
      fanfare.forEach(({ notes, time }) => {
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(masterGain);
          
          osc.frequency.setValueAtTime(freq, now + time);
          osc.type = i === 0 ? 'sine' : 'triangle';
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(volume * (0.4 - i * 0.1), now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.4);
          
          osc.start(now + time);
          osc.stop(now + time + 0.5);
        });
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }

    case 'cyber': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(8, now);
      
      lfo.frequency.setValueAtTime(30, now);
      lfo.type = 'square';
      lfoGain.gain.setValueAtTime(500, now);
      
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      osc1.type = 'square';
      
      osc2.frequency.setValueAtTime(403, now);
      osc2.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      masterGain.gain.setValueAtTime(1, now);
      
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + 0.35);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
      break;
    }

    case 'powerUp': {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(4000, now + 0.4);
      filter.Q.setValueAtTime(3, now);
      
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
      osc.type = 'sawtooth';
      
      osc2.frequency.setValueAtTime(103, now);
      osc2.frequency.exponentialRampToValueAtTime(2006, now + 0.4);
      osc2.type = 'square';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.5);
      osc2.stop(now + 0.5);
      break;
    }
    
    case 'join': {
      const frequencies = [392, 523.25, 659.25];
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
      const frequencies = [659.25, 523.25, 392];
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
      // Elegant chime — soft bell-like cluster with long tail
      const notes = [
        { freq: 587.33, time: 0 },     // D5
        { freq: 880.0,  time: 0.05 },  // A5
        { freq: 1174.66, time: 0.12 }, // D6
      ];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.Q.setValueAtTime(0.7, now);
      filter.connect(masterGain);

      notes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const partial = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        partial.connect(gain);
        gain.connect(filter);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        partial.type = 'sine';
        partial.frequency.setValueAtTime(freq * 2.01, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.9);

        osc.start(now + time);
        partial.start(now + time);
        osc.stop(now + time + 0.95);
        partial.stop(now + time + 0.6);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'record': {
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
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      
      osc1.frequency.setValueAtTime(2093, now);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(4186, now);
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
    
    case 'quizCorrect': {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.5, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);
        osc.start(now + i * 0.06);
        osc.stop(now + 0.6);
      });
      for (let i = 0; i < 5; i++) {
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.connect(sparkleGain);
        sparkleGain.connect(masterGain);
        sparkle.frequency.setValueAtTime(2000 + Math.random() * 2000, now + 0.2 + i * 0.04);
        sparkle.type = 'sine';
        sparkleGain.gain.setValueAtTime(volume * 0.15, now + 0.2 + i * 0.04);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.04);
        sparkle.start(now + 0.2 + i * 0.04);
        sparkle.stop(now + 0.4 + i * 0.04);
      }
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'quizWrong': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(filter);
      filter.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      osc1.type = 'sawtooth';
      
      osc2.frequency.setValueAtTime(203, now);
      osc2.frequency.exponentialRampToValueAtTime(103, now + 0.3);
      osc2.type = 'square';
      
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
      break;
    }
    
    case 'quizTick': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(800, now);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
    
    case 'quizReveal': {
      const notes = [392, 493.88, 587.33, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + i * 0.08);
        osc.start(now + i * 0.1);
        osc.stop(now + 0.6);
      });
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'quizRush': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(masterGain);
      
      lfo.frequency.setValueAtTime(4, now);
      lfo.frequency.linearRampToValueAtTime(12, now + 0.5);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(20, now);
      lfoGain.gain.linearRampToValueAtTime(50, now + 0.5);
      
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.5);
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      masterGain.gain.setValueAtTime(1, now);
      
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.6);
      osc.stop(now + 0.6);
      break;
    }
    
    case 'quizTimeUp': {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(880, now + i * 0.15);
        osc.type = 'square';
        
        gain.gain.setValueAtTime(volume * 0.4, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
        
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      }
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'scoreUp': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
    
    case 'vortex': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.Q.setValueAtTime(5, now);
      
      lfo.frequency.setValueAtTime(2, now);
      lfo.frequency.linearRampToValueAtTime(20, now + 0.6);
      lfo.type = 'sine';
      lfoGain.gain.setValueAtTime(200, now);
      lfoGain.gain.linearRampToValueAtTime(1000, now + 0.6);
      
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      osc1.frequency.exponentialRampToValueAtTime(200, now + 0.8);
      osc1.type = 'sawtooth';
      
      osc2.frequency.setValueAtTime(203, now);
      osc2.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      
      masterGain.gain.setValueAtTime(1, now);
      
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + 0.9);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
      break;
    }
    
    case 'electric': {
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        const startTime = now + i * 0.04 + Math.random() * 0.02;
        osc.frequency.setValueAtTime(1000 + Math.random() * 3000, startTime);
        osc.type = 'sawtooth';
        
        gain.gain.setValueAtTime(volume * (0.2 + Math.random() * 0.2), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
        
        osc.start(startTime);
        osc.stop(startTime + 0.04);
      }
      masterGain.gain.setValueAtTime(1, now);
      break;
    }
    
    case 'hologram': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
      filter.Q.setValueAtTime(8, now);
      
      osc1.frequency.setValueAtTime(800, now);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(803, now);
      osc2.type = 'sine';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
      break;
    }
    
    case 'morph': {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.linearRampToValueAtTime(2000, now + 0.25);
      filter.frequency.linearRampToValueAtTime(800, now + 0.5);
      filter.Q.setValueAtTime(3, now);
      
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.25);
      osc.frequency.linearRampToValueAtTime(300, now + 0.5);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }
    
    case 'hover': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.frequency.setValueAtTime(2000, now);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume * 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      masterGain.gain.setValueAtTime(1, now);
      
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    // ===== INK BRUSH STROKE (for Ink theme animation) =====
    case 'brushStroke': {
      // White-noise burst filtered to emulate brush on canvas
      const bufferSize = ctx.sampleRate * 0.15; // 150 ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(3000, now);
      lowpass.frequency.exponentialRampToValueAtTime(600, now + 0.12);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(150, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(gain);
      gain.connect(masterGain);

      noise.start(now);
      noise.stop(now + 0.18);
      break;
    }

    default:
      break;
  }
};

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: SoundType, volume: number = 0.3) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      createRichSound(audioContextRef.current, type, volume);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }, []);

  return { playSound };
};

// Global function to play sounds without hook
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
  } catch (error) {
    console.warn('Could not play sound:', error);
  }
};
