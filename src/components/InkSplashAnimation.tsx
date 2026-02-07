import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import inkSplashImage from '@/assets/ink-splash.png';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - Ultra Premium Version
 * Features custom synthesized sound effects and stunning visuals
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'splash' | 'title' | 'fadeout'>('splash');
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create custom sound effect
  const playSound = (type: 'splash' | 'whoosh' | 'impact' | 'drip' | 'reveal') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    if (type === 'splash') {
      // Deep ink splash sound
      const bufferSize = ctx.sampleRate * 0.6;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.3);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.7;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1500, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.6);
      source.connect(filter);
      filter.connect(masterGain);
      masterGain.gain.setValueAtTime(0.6, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
      source.start(now);
      source.stop(now + 0.6);
    } else if (type === 'whoosh') {
      // Sweeping whoosh
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI) * 0.5;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.5);
      filter.Q.value = 2;
      source.connect(filter);
      filter.connect(masterGain);
      masterGain.gain.setValueAtTime(0.4, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
      source.start(now);
      source.stop(now + 0.5);
    } else if (type === 'impact') {
      // Heavy impact thud
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
      
      // Add distortion layer
      const noise = ctx.createBufferSource();
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
      }
      noise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.1);
    } else if (type === 'drip') {
      // Ink drip sounds
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const startFreq = 600 + Math.random() * 300;
        osc.frequency.setValueAtTime(startFreq, now + i * 0.08);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + i * 0.08 + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.12);
      }
    } else if (type === 'reveal') {
      // Majestic reveal sound
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(80, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.5);
      gain1.gain.linearRampToValueAtTime(0, now + 1);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 1);
      
      // Shimmer layer
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now);
      osc2.frequency.linearRampToValueAtTime(800, now + 0.8);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + 0.8);
    }
  };

  // Ink particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      color: string;
    }> = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create initial splash particles
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.3;
      const speed = 8 + Math.random() * 15;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 8,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        color: Math.random() > 0.3 ? '#0a0a0a' : '#dc2626',
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.vy += 0.15; // gravity
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color === '#0a0a0a' 
          ? `rgba(10, 10, 10, ${alpha})` 
          : `rgba(220, 38, 38, ${alpha * 0.8})`;
        ctx.fill();

        // Ink trail
        if (frame % 3 === 0 && p.life < p.maxLife * 0.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = p.color === '#0a0a0a'
            ? `rgba(10, 10, 10, ${alpha * 0.3})`
            : `rgba(220, 38, 38, ${alpha * 0.2})`;
          ctx.fill();
        }

        if (p.life >= p.maxLife) {
          particles.splice(index, 1);
        }
      });

      frame++;
      if (particles.length > 0 && phase === 'splash') {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [phase]);

  // Animation sequence
  useEffect(() => {
    audioContextRef.current = new AudioContext();

    // Splash phase
    setTimeout(() => playSound('splash'), 100);
    setTimeout(() => playSound('whoosh'), 200);
    setTimeout(() => playSound('drip'), 400);

    // Title phase
    setTimeout(() => {
      setPhase('title');
      playSound('impact');
      setTimeout(() => playSound('reveal'), 100);
    }, 800);

    // Fadeout phase
    setTimeout(() => {
      setPhase('fadeout');
    }, 3000);

    // Complete
    setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      audioContextRef.current?.close();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden">
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: phase === 'splash' ? 1 : 0, transition: 'opacity 0.5s' }}
      />

      {/* Red glow effects */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'title' ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-red-600/20 rounded-full blur-[150px]" />
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-red-700/15 rounded-full blur-[80px]" />
      </motion.div>

      {/* Ink splash image */}
      <AnimatePresence>
        {phase !== 'fadeout' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ 
              scale: phase === 'splash' ? [0, 1.2, 1] : 1, 
              opacity: 1, 
              rotate: 0 
            }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.img
              src={inkSplashImage}
              alt="Ink Splash"
              className="w-[600px] h-auto max-w-[80vw] drop-shadow-2xl"
              animate={{
                filter: phase === 'title' 
                  ? ['drop-shadow(0 0 30px rgba(220,38,38,0.5))', 'drop-shadow(0 0 60px rgba(220,38,38,0.8))', 'drop-shadow(0 0 30px rgba(220,38,38,0.5))']
                  : 'none'
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title text */}
      <AnimatePresence>
        {phase === 'title' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h1
              className="text-7xl md:text-8xl lg:text-9xl font-black text-center"
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#f5f5f5',
                textShadow: `
                  3px 3px 0 #0a0a0a,
                  -3px -3px 0 #0a0a0a,
                  3px -3px 0 #0a0a0a,
                  -3px 3px 0 #0a0a0a,
                  0 0 40px rgba(220,38,38,0.8),
                  0 0 80px rgba(220,38,38,0.5),
                  0 0 120px rgba(220,38,38,0.3)
                `,
              }}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            >
              MIMIC
            </motion.h1>
            <motion.h1
              className="text-7xl md:text-8xl lg:text-9xl font-black text-center -mt-4 md:-mt-6"
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#dc2626',
                textShadow: `
                  3px 3px 0 #0a0a0a,
                  -3px -3px 0 #0a0a0a,
                  3px -3px 0 #0a0a0a,
                  -3px 3px 0 #0a0a0a,
                  0 0 40px rgba(220,38,38,0.8),
                  0 0 80px rgba(220,38,38,0.5)
                `,
              }}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
            >
              MASTER
            </motion.h1>

            {/* Ink drips under text */}
            <motion.div
              className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex gap-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 rounded-full bg-gradient-to-b from-red-600 to-transparent"
                  initial={{ height: 0 }}
                  animate={{ height: 30 + Math.random() * 50 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fadeout overlay */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fadeout' ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};
