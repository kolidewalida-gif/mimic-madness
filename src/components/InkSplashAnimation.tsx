import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ultra Premium Ink Splash Animation
 * Cinematic intro with dynamic ink particles, brush strokes, and epic reveal
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'ink-drop' | 'explosion' | 'title-reveal' | 'glow' | 'fadeout'>('ink-drop');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Synthesized sound effects
  const playSound = useCallback((type: 'drop' | 'explosion' | 'whoosh' | 'reveal' | 'bass' | 'shimmer') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    switch (type) {
      case 'drop': {
        // Deep water drop
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'explosion': {
        // Massive ink explosion
        const bufferSize = ctx.sampleRate * 1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const progress = i / bufferSize;
          const envelope = Math.pow(1 - progress, 0.5) * Math.sin(progress * Math.PI * 0.5);
          data[i] = (Math.random() * 2 - 1) * envelope;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, now + 1);
        source.connect(filter);
        filter.connect(masterGain);
        masterGain.gain.setValueAtTime(0.7, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 1);
        source.start(now);
        source.stop(now + 1);
        break;
      }
      case 'whoosh': {
        // Sweeping whoosh
        const bufferSize = ctx.sampleRate * 0.6;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const progress = i / bufferSize;
          data[i] = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.6);
        filter.Q.value = 3;
        source.connect(filter);
        filter.connect(masterGain);
        masterGain.gain.setValueAtTime(0.4, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
        source.start(now);
        source.stop(now + 0.6);
        break;
      }
      case 'reveal': {
        // Epic reveal sound
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(60, now);
        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.4, now + 0.15);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.8);
        gain1.gain.linearRampToValueAtTime(0, now + 1.5);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 1.5);
        break;
      }
      case 'bass': {
        // Deep bass hit
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'shimmer': {
        // High frequency shimmer
        for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200 + i * 200, now + i * 0.05);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(0.08, now + i * 0.05 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.4);
        }
        break;
      }
    }
  }, []);

  // Main canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      color: string;
      type: 'ink' | 'glow' | 'splash' | 'drip';
      rotation: number;
      rotationSpeed: number;
    }

    interface InkStroke {
      points: { x: number; y: number; size: number }[];
      progress: number;
      color: string;
      maxProgress: number;
    }

    const particles: Particle[] = [];
    const strokes: InkStroke[] = [];
    let inkDropRadius = 0;
    let explosionStarted = false;
    let frame = 0;

    // Create initial ink drop
    const createInkDrop = () => {
      inkDropRadius = 0;
    };

    // Create explosion particles
    const createExplosion = () => {
      // Main explosion particles
      for (let i = 0; i < 150; i++) {
        const angle = (Math.PI * 2 * i) / 150 + Math.random() * 0.4;
        const speed = 15 + Math.random() * 25;
        const isRed = Math.random() > 0.7;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 15,
          life: 0,
          maxLife: 80 + Math.random() * 60,
          color: isRed ? '#dc2626' : '#0a0a0a',
          type: 'ink',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        });
      }

      // Splash particles
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 15;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 100,
          y: centerY + (Math.random() - 0.5) * 100,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          size: 2 + Math.random() * 6,
          life: 0,
          maxLife: 50 + Math.random() * 40,
          color: Math.random() > 0.5 ? '#dc2626' : '#1a1a1a',
          type: 'splash',
          rotation: 0,
          rotationSpeed: 0,
        });
      }

      // Create ink strokes radiating outward
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
        const length = 150 + Math.random() * 200;
        const points = [];
        for (let j = 0; j < 20; j++) {
          const t = j / 20;
          const wobble = Math.sin(t * Math.PI * 4) * (10 + Math.random() * 15);
          points.push({
            x: centerX + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * wobble,
            y: centerY + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * wobble,
            size: 30 * (1 - t * 0.7) + Math.random() * 10,
          });
        }
        strokes.push({
          points,
          progress: 0,
          color: i % 2 === 0 ? 'rgba(220, 38, 38, 0.8)' : 'rgba(10, 10, 10, 0.9)',
          maxProgress: 20,
        });
      }
    };

    // Create glow particles for title phase
    const createGlowParticles = () => {
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: centerX + (Math.random() - 0.5) * 400,
          y: centerY + (Math.random() - 0.5) * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 2,
          size: 3 + Math.random() * 5,
          life: 0,
          maxLife: 100 + Math.random() * 50,
          color: '#dc2626',
          type: 'glow',
          rotation: 0,
          rotationSpeed: 0,
        });
      }
    };

    const animate = () => {
      // Clear with fade effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Ink drop phase
      if (phase === 'ink-drop' && !explosionStarted) {
        inkDropRadius += 8;
        
        // Draw expanding ink drop
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, inkDropRadius
        );
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0.9)');
        gradient.addColorStop(0.6, 'rgba(10, 10, 10, 0.7)');
        gradient.addColorStop(0.8, 'rgba(220, 38, 38, 0.5)');
        gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, inkDropRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Small drip particles
        if (frame % 3 === 0 && inkDropRadius < 100) {
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = inkDropRadius * 0.8;
            particles.push({
              x: centerX + Math.cos(angle) * dist,
              y: centerY + Math.sin(angle) * dist,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              size: 2 + Math.random() * 4,
              life: 0,
              maxLife: 30,
              color: Math.random() > 0.5 ? '#dc2626' : '#0a0a0a',
              type: 'drip',
              rotation: 0,
              rotationSpeed: 0,
            });
          }
        }

        if (inkDropRadius > 120) {
          explosionStarted = true;
          createExplosion();
        }
      }

      // Draw and update ink strokes
      strokes.forEach((stroke, si) => {
        if (stroke.progress < stroke.maxProgress) {
          stroke.progress += 1;
        }
        
        const visiblePoints = Math.floor((stroke.progress / stroke.maxProgress) * stroke.points.length);
        
        if (visiblePoints > 1) {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          
          for (let i = 1; i < visiblePoints && i < stroke.points.length; i++) {
            const p = stroke.points[i];
            const prev = stroke.points[i - 1];
            
            // Draw thick brush stroke
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = stroke.color;
            
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      });

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy += 0.2; // gravity
        p.life++;
        p.rotation += p.rotationSpeed;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.type === 'ink') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * alpha);
          if (p.color === '#dc2626') {
            gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(180, 30, 30, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(150, 20, 20, 0)`);
          } else {
            gradient.addColorStop(0, `rgba(20, 20, 20, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(10, 10, 10, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
          }
          
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * alpha, p.size * alpha * 0.7, 0, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'glow') {
          const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glowGradient.addColorStop(0, `rgba(220, 38, 38, ${alpha * 0.8})`);
          glowGradient.addColorStop(0.5, `rgba(220, 38, 38, ${alpha * 0.3})`);
          glowGradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = glowGradient;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fillStyle = p.color === '#dc2626' 
            ? `rgba(220, 38, 38, ${alpha})` 
            : `rgba(10, 10, 10, ${alpha})`;
          ctx.fill();
        }

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      // Add glow particles during glow phase
      if (phase === 'glow' && frame % 5 === 0) {
        createGlowParticles();
      }

      frame++;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    createInkDrop();
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase]);

  // Animation sequence
  useEffect(() => {
    audioContextRef.current = new AudioContext();

    // Phase 1: Ink drop
    setTimeout(() => playSound('drop'), 100);
    setTimeout(() => playSound('whoosh'), 300);

    // Phase 2: Explosion
    setTimeout(() => {
      setPhase('explosion');
      playSound('explosion');
      playSound('bass');
    }, 600);

    // Phase 3: Title reveal
    setTimeout(() => {
      setPhase('title-reveal');
      playSound('reveal');
      playSound('shimmer');
    }, 1400);

    // Phase 4: Glow
    setTimeout(() => {
      setPhase('glow');
    }, 2200);

    // Phase 5: Fadeout
    setTimeout(() => {
      setPhase('fadeout');
    }, 3500);

    // Complete
    setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      audioContextRef.current?.close();
    };
  }, [onComplete, playSound]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden">
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          opacity: phase === 'fadeout' ? 0 : 1, 
          transition: 'opacity 0.7s ease-out' 
        }}
      />

      {/* Dynamic red glow background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: ['ink-drop', 'explosion'].includes(phase) ? 0 : 1 
        }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[200px]"
          animate={{
            width: phase === 'glow' ? [600, 800, 600] : 600,
            height: phase === 'glow' ? [400, 600, 400] : 400,
            backgroundColor: ['rgba(220,38,38,0.3)', 'rgba(220,38,38,0.5)', 'rgba(220,38,38,0.3)'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[250px] h-[250px] bg-red-700/15 rounded-full blur-[100px]" />
      </motion.div>

      {/* Title reveal */}
      <AnimatePresence>
        {['title-reveal', 'glow', 'fadeout'].includes(phase) && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fadeout' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* MIMIC text */}
            <motion.div
              className="relative"
              initial={{ y: 80, opacity: 0, scale: 0.5, rotateX: 45 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1 
              }}
            >
              <h1
                className="text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#ffffff',
                  textShadow: `
                    4px 4px 0 #0a0a0a,
                    -4px -4px 0 #0a0a0a,
                    4px -4px 0 #0a0a0a,
                    -4px 4px 0 #0a0a0a,
                    8px 8px 0 #0a0a0a,
                    0 0 60px rgba(220,38,38,0.9),
                    0 0 120px rgba(220,38,38,0.6),
                    0 0 180px rgba(220,38,38,0.4)
                  `,
                }}
              >
                MIMIC
              </h1>
              {/* Animated underline */}
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-red-600 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>

            {/* MASTER text */}
            <motion.div
              className="relative -mt-6 md:-mt-10"
              initial={{ y: 80, opacity: 0, scale: 0.5, rotateX: -45 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.25 
              }}
            >
              <h1
                className="text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#dc2626',
                  textShadow: `
                    4px 4px 0 #0a0a0a,
                    -4px -4px 0 #0a0a0a,
                    4px -4px 0 #0a0a0a,
                    -4px 4px 0 #0a0a0a,
                    8px 8px 0 #0a0a0a,
                    0 0 60px rgba(220,38,38,0.9),
                    0 0 120px rgba(220,38,38,0.6)
                  `,
                }}
              >
                MASTER
              </h1>
            </motion.div>

            {/* Ink drips under text */}
            <motion.div
              className="absolute bottom-[30%] left-1/2 -translate-x-1/2 flex gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(to bottom, #dc2626, transparent)',
                  }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: 20 + Math.random() * 60, 
                    opacity: 0.8 
                  }}
                  transition={{ 
                    delay: 0.7 + i * 0.08, 
                    duration: 0.6, 
                    ease: 'easeOut' 
                  }}
                />
              ))}
            </motion.div>

            {/* Floating ink splatter decorations */}
            {phase === 'glow' && (
              <>
                <motion.div
                  className="absolute top-[20%] left-[15%] w-8 h-8 bg-red-600/40 rounded-full blur-sm"
                  animate={{ 
                    y: [0, -20, 0], 
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute top-[25%] right-[20%] w-6 h-6 bg-red-600/30 rounded-full blur-sm"
                  animate={{ 
                    y: [0, 15, 0], 
                    opacity: [0.3, 0.6, 0.3] 
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />
                <motion.div
                  className="absolute bottom-[25%] left-[25%] w-4 h-4 bg-red-600/50 rounded-full blur-sm"
                  animate={{ 
                    y: [0, -15, 0], 
                    opacity: [0.5, 1, 0.5] 
                  }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />
                <motion.div
                  className="absolute bottom-[30%] right-[15%] w-5 h-5 bg-red-600/35 rounded-full blur-sm"
                  animate={{ 
                    y: [0, 20, 0], 
                    opacity: [0.35, 0.7, 0.35] 
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,10,10,0.8) 100%)',
        }}
      />

      {/* Final fade overlay */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fadeout' ? 1 : 0 }}
        transition={{ duration: 0.7 }}
      />
    </div>
  );
};
