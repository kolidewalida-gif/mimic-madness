import { useCallback, useRef } from 'react';

type SoundType = 
  | 'click' | 'success' | 'vote' | 'transition' | 'countdown' | 'error' | 'whoosh' 
  | 'message' | 'join' | 'leave' | 'start' | 'record' | 'stop' | 'ding' | 'pop'
  // New professional sounds
  | 'messageSend' | 'messageReceive' | 'gifSend' | 'imageSend'
  | 'transitionGlitch' | 'transitionPortal' | 'transitionSwoosh' | 'transitionImpact'
  | 'dramatic' | 'reveal' | 'tension' | 'celebration' | 'cyber' | 'powerUp';

// Create sophisticated sounds using multiple oscillators, filters, and effects
const createRichSound = (ctx: AudioContext, type: SoundType, volume: number) => {
  const now = ctx.currentTime;
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

    // NEW: Message Send - satisfying "whoosh" up with sparkle
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
      
      // Rising swoosh
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
      osc2.type = 'triangle';
      
      // Sparkle at the end
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

    // NEW: Message Receive - gentle descending chime
    case 'messageReceive': {
      const notes = [1975.53, 1567.98, 1318.51]; // B6, G6, E6
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

    // NEW: GIF Send - playful bouncy sound
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

    // NEW: Image Send - camera shutter click
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
      
      // Click sound
      osc1.frequency.setValueAtTime(4000, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.02);
      osc1.type = 'square';
      
      // Mechanical sound
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

    // NEW: Transition Glitch - digital corruption sound
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

    // NEW: Transition Portal - ethereal vortex sound
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

    // NEW: Transition Swoosh - ultra dynamic whoosh
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

    // NEW: Transition Impact - heavy bass thud
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

    // NEW: Dramatic - epic tension builder
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

    // NEW: Reveal - mystical unveiling
    case 'reveal': {
      const shimmer = [2093, 2637, 3135, 3520]; // C7, E7, G7, A7
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

    // NEW: Tension - building suspense
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

    // NEW: Celebration - epic victory fanfare
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

    // NEW: Cyber - futuristic digital sound
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

    // NEW: Power Up - charging energy sound
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
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.1 },
        { freq: 783.99, time: 0.2 },
        { freq: 1046.50, time: 0.35 },
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