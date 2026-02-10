import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ultra Premium Ink Splash Animation V3
 * Cinematic multi-phase intro with shockwave, ink rain, calligraphy reveal
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'gathering' | 'impact' | 'shockwave' | 'rain' | 'title' | 'glow' | 'fadeout'>('gathering');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Sound engine
  const playSound = useCallback((type: 'gather' | 'impact' | 'shockwave' | 'rain' | 'reveal' | 'bass' | 'shimmer' | 'rumble') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    switch (type) {
      case 'gather': {
        // Rising tension
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(40, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.3, now + 0.5);
        g.gain.linearRampToValueAtTime(0.5, now + 0.9);
        g.gain.linearRampToValueAtTime(0, now + 1.1);
        osc.connect(g); g.connect(master);
        osc.start(now); osc.stop(now + 1.1);
        // Add sub-rumble
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(25, now);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0, now);
        sg.gain.linearRampToValueAtTime(0.4, now + 0.8);
        sg.gain.linearRampToValueAtTime(0, now + 1.1);
        sub.connect(sg); sg.connect(master);
        sub.start(now); sub.stop(now + 1.1);
        break;
      }
      case 'impact': {
        // Massive impact
        const len = ctx.sampleRate * 0.8;
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < len; i++) {
            const p = i / len;
            const env = Math.pow(1 - p, 0.3);
            d[i] = (Math.random() * 2 - 1) * env * 0.9;
          }
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(60, now);
        lp.frequency.exponentialRampToValueAtTime(5000, now + 0.05);
        lp.frequency.exponentialRampToValueAtTime(100, now + 0.8);
        src.connect(lp); lp.connect(master);
        master.gain.setValueAtTime(0.8, now);
        master.gain.linearRampToValueAtTime(0, now + 0.8);
        src.start(now); src.stop(now + 0.8);
        // Bass thud
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(80, now);
        bass.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.7, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        bass.connect(bg); bg.connect(master);
        bass.start(now); bass.stop(now + 0.5);
        break;
      }
      case 'shockwave': {
        // Swooping shockwave
        const len = ctx.sampleRate * 0.6;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const p = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(100, now);
        bp.frequency.exponentialRampToValueAtTime(6000, now + 0.15);
        bp.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        bp.Q.value = 2;
        src.connect(bp); bp.connect(master);
        master.gain.setValueAtTime(0.5, now);
        master.gain.linearRampToValueAtTime(0, now + 0.6);
        src.start(now); src.stop(now + 0.6);
        break;
      }
      case 'rain': {
        // Ink rain patter
        for (let i = 0; i < 8; i++) {
          const delay = i * 0.06 + Math.random() * 0.03;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500 + Math.random() * 400, now + delay);
          osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.08);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.15, now + delay);
          g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
          osc.connect(g); g.connect(master);
          osc.start(now + delay); osc.stop(now + delay + 0.1);
        }
        break;
      }
      case 'reveal': {
        // Epic chord reveal
        [55, 110, 165, 220, 330].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = i < 2 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.15 / (i + 1), now + 0.2);
          g.gain.linearRampToValueAtTime(0.1 / (i + 1), now + 1);
          g.gain.exponentialRampToValueAtTime(0.001, now + 2);
          osc.connect(g); g.connect(master);
          osc.start(now); osc.stop(now + 2);
        });
        break;
      }
      case 'shimmer': {
        for (let i = 0; i < 8; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const f = 1000 + i * 300 + Math.random() * 200;
          osc.frequency.setValueAtTime(f, now + i * 0.04);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.04);
          g.gain.linearRampToValueAtTime(0.06, now + i * 0.04 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.3);
          osc.connect(g); g.connect(master);
          osc.start(now + i * 0.04); osc.stop(now + i * 0.04 + 0.3);
        }
        break;
      }
      case 'rumble': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(30, now);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, now);
        g.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.connect(g); g.connect(master);
        osc.start(now); osc.stop(now + 1.5);
        break;
      }
    }
  }, []);

  // Mouse tracking for interactive particles during intro
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Main canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;

    interface P {
      x: number; y: number; vx: number; vy: number;
      size: number; life: number; maxLife: number;
      color: string; type: 'ink' | 'glow' | 'spark' | 'drip' | 'rain' | 'ring' | 'mouse';
      rot: number; rotS: number; stretch: number;
    }

    const particles: P[] = [];
    let shockRadius = 0;
    let shockAlpha = 0;
    let frame = 0;
    let screenShake = 0;

    // Gathering phase: particles converge to center
    const spawnGatherParticles = () => {
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 500;
        const isRed = Math.random() > 0.6;
        particles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: 0, vy: 0,
          size: 4 + Math.random() * 12,
          life: 0, maxLife: 999,
          color: isRed ? '#dc2626' : '#1a1a1a',
          type: 'ink', rot: Math.random() * Math.PI * 2,
          rotS: (Math.random() - 0.5) * 0.1, stretch: 0.6 + Math.random() * 0.4,
        });
      }
    };

    // Explosion particles
    const createExplosion = () => {
      for (let i = 0; i < 250; i++) {
        const angle = (Math.PI * 2 * i) / 250 + Math.random() * 0.3;
        const speed = 8 + Math.random() * 35;
        const isRed = Math.random() > 0.6;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 20,
          life: 0, maxLife: 60 + Math.random() * 80,
          color: isRed ? '#dc2626' : '#0a0a0a',
          type: 'ink', rot: Math.random() * Math.PI * 2,
          rotS: (Math.random() - 0.5) * 0.15, stretch: 0.5 + Math.random() * 0.5,
        });
      }
      // Bright sparks
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 30;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 3,
          life: 0, maxLife: 30 + Math.random() * 40,
          color: '#ff4444',
          type: 'spark', rot: 0, rotS: 0, stretch: 1,
        });
      }
      // Ink drips
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 200,
          y: cy - 50 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 5,
          size: 3 + Math.random() * 8,
          life: 0, maxLife: 120,
          color: Math.random() > 0.5 ? '#dc2626' : '#1a1a1a',
          type: 'drip', rot: 0, rotS: 0, stretch: 1,
        });
      }
      shockRadius = 0;
      shockAlpha = 1;
      screenShake = 15;
    };

    // Rain phase
    const spawnRain = () => {
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: Math.random() * W,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 2,
          vy: 8 + Math.random() * 12,
          size: 2 + Math.random() * 4,
          life: 0, maxLife: 80 + Math.random() * 40,
          color: Math.random() > 0.4 ? '#dc2626' : '#1a1a1a',
          type: 'rain', rot: 0, rotS: 0, stretch: 2 + Math.random() * 3,
        });
      }
    };

    // Glow particles
    const spawnGlow = () => {
      particles.push({
        x: cx + (Math.random() - 0.5) * 500,
        y: cy + (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.5 - Math.random() * 2,
        size: 3 + Math.random() * 6,
        life: 0, maxLife: 80 + Math.random() * 60,
        color: '#dc2626',
        type: 'glow', rot: 0, rotS: 0, stretch: 1,
      });
    };

    // Mouse-reactive particles
    const spawnMouseParticles = () => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx === 0 && my === 0) return;
      particles.push({
        x: mx + (Math.random() - 0.5) * 20,
        y: my + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 1,
        size: 2 + Math.random() * 5,
        life: 0, maxLife: 30 + Math.random() * 20,
        color: Math.random() > 0.5 ? '#dc2626' : '#1a1a1a',
        type: 'mouse', rot: 0, rotS: 0, stretch: 1,
      });
    };

    let gatherSpawned = false;

    const animate = () => {
      // Screen shake offset
      const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      screenShake *= 0.9;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Clear with slight trail
      ctx.fillStyle = phase === 'gathering' ? 'rgba(10,10,10,0.08)' : 'rgba(10,10,10,0.12)';
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Phase-specific spawning
      if (phase === 'gathering' && !gatherSpawned) {
        spawnGatherParticles();
        gatherSpawned = true;
      }

      if (phase === 'rain' && frame % 2 === 0) spawnRain();
      if ((phase === 'glow' || phase === 'title') && frame % 4 === 0) spawnGlow();
      if (frame % 3 === 0) spawnMouseParticles();

      // Gathering convergence
      if (phase === 'gathering') {
        for (const p of particles) {
          if (p.type === 'ink' && p.maxLife === 999) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = 0.02 + (frame * 0.001);
            p.vx += (dx / dist) * force * 3;
            p.vy += (dy / dist) * force * 3;
            p.vx *= 0.95;
            p.vy *= 0.95;
          }
        }
      }

      // Shockwave ring
      if (shockAlpha > 0.01) {
        shockRadius += 20;
        shockAlpha *= 0.92;
        ctx.beginPath();
        ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(220, 38, 38, ${shockAlpha})`;
        ctx.lineWidth = 4 + shockAlpha * 10;
        ctx.stroke();
        // Second ring
        ctx.beginPath();
        ctx.arc(cx, cy, shockRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw center glow during gathering
      if (phase === 'gathering') {
        const gatherProgress = Math.min(1, frame / 50);
        const gR = 80 * gatherProgress;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
        grad.addColorStop(0, `rgba(220, 38, 38, ${0.6 * gatherProgress})`);
        grad.addColorStop(0.5, `rgba(220, 38, 38, ${0.2 * gatherProgress})`);
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, gR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.rot += p.rotS;

        if (p.type !== 'ink' || p.maxLife !== 999) {
          p.vy += 0.15;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        const alpha = p.maxLife === 999 ? 1 : Math.max(0, 1 - p.life / p.maxLife);
        const sz = p.size * (p.maxLife === 999 ? 1 : alpha);

        if (sz < 0.3 || (p.maxLife !== 999 && p.life >= p.maxLife)) {
          particles.splice(i, 1);
          continue;
        }

        if (p.type === 'spark') {
          // Bright elongated spark
          ctx.save();
          ctx.translate(p.x, p.y);
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
          ctx.fillRect(-sz * 3, -sz * 0.3, sz * 6, sz * 0.6);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.fillRect(-sz * 1.5, -sz * 0.15, sz * 3, sz * 0.3);
          ctx.restore();
        } else if (p.type === 'glow') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
          g.addColorStop(0, `rgba(220, 38, 38, ${alpha * 0.6})`);
          g.addColorStop(0.3, `rgba(220, 38, 38, ${alpha * 0.2})`);
          g.addColorStop(1, 'rgba(220, 38, 38, 0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 4, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        } else if (p.type === 'rain') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.color === '#dc2626'
            ? `rgba(220, 38, 38, ${alpha * 0.7})`
            : `rgba(20, 20, 20, ${alpha * 0.8})`;
          ctx.fillRect(-sz * 0.3, -sz * p.stretch, sz * 0.6, sz * p.stretch * 2);
          ctx.restore();
        } else if (p.type === 'drip') {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, sz * 0.6, sz * 1.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = p.color === '#dc2626'
            ? `rgba(220, 38, 38, ${alpha})`
            : `rgba(15, 15, 15, ${alpha})`;
          ctx.fill();
        } else if (p.type === 'mouse') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
          g.addColorStop(0, p.color === '#dc2626' ? `rgba(220,38,38,${alpha})` : `rgba(20,20,20,${alpha})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        } else {
          // Ink blob
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
          if (p.color === '#dc2626') {
            g.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
            g.addColorStop(0.6, `rgba(180, 25, 25, ${alpha * 0.6})`);
            g.addColorStop(1, 'rgba(150, 20, 20, 0)');
          } else {
            g.addColorStop(0, `rgba(20, 20, 20, ${alpha})`);
            g.addColorStop(0.6, `rgba(10, 10, 10, ${alpha * 0.6})`);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }
          ctx.beginPath();
          ctx.ellipse(0, 0, sz, sz * p.stretch, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.restore();
        }
      }

      // Limit particles
      if (particles.length > 600) particles.splice(0, particles.length - 600);

      ctx.restore();
      frame++;
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // Sequence
  useEffect(() => {
    audioCtxRef.current = new AudioContext();

    // Phase 1: Gathering (0-1.2s)
    playSound('gather');
    playSound('rumble');

    // Phase 2: Impact (1.2s)
    setTimeout(() => {
      setPhase('impact');
      playSound('impact');
    }, 1200);

    // Phase 3: Shockwave (1.5s)
    setTimeout(() => {
      setPhase('shockwave');
      playSound('shockwave');
    }, 1500);

    // Phase 4: Ink rain (2s)
    setTimeout(() => {
      setPhase('rain');
      playSound('rain');
    }, 2000);

    // Phase 5: Title (2.6s)
    setTimeout(() => {
      setPhase('title');
      playSound('reveal');
      playSound('shimmer');
    }, 2600);

    // Phase 6: Glow (3.8s)
    setTimeout(() => {
      setPhase('glow');
    }, 3800);

    // Phase 7: Fadeout (5s)
    setTimeout(() => {
      setPhase('fadeout');
    }, 5000);

    // Complete (5.8s)
    setTimeout(onComplete, 5800);

    return () => { audioCtxRef.current?.close(); };
  }, [onComplete, playSound]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden cursor-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: phase === 'fadeout' ? 0 : 1, transition: 'opacity 0.8s ease-out' }}
      />

      {/* Red ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: ['gathering', 'impact'].includes(phase) ? 0.3 : 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[250px]"
          animate={{
            width: phase === 'glow' ? [500, 900, 500] : 400,
            height: phase === 'glow' ? [400, 700, 400] : 300,
            backgroundColor: ['rgba(220,38,38,0.25)', 'rgba(220,38,38,0.5)', 'rgba(220,38,38,0.25)'],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute top-1/4 left-1/5 w-[250px] h-[250px] bg-red-600/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/5 w-[200px] h-[200px] bg-red-700/10 rounded-full blur-[80px]" />
      </motion.div>

      {/* Title reveal */}
      <AnimatePresence>
        {['title', 'glow', 'fadeout'].includes(phase) && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fadeout' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* MIMIC */}
            <motion.div
              className="relative"
              initial={{ y: 100, opacity: 0, scale: 0.3, rotateX: 60 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            >
              <h1
                className="text-8xl md:text-9xl lg:text-[13rem] font-black tracking-tighter select-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#ffffff',
                  textShadow: `
                    4px 4px 0 #0a0a0a, -4px -4px 0 #0a0a0a,
                    4px -4px 0 #0a0a0a, -4px 4px 0 #0a0a0a,
                    8px 8px 0 #0a0a0a,
                    0 0 40px rgba(220,38,38,0.9),
                    0 0 80px rgba(220,38,38,0.7),
                    0 0 120px rgba(220,38,38,0.5),
                    0 0 200px rgba(220,38,38,0.3)
                  `,
                }}
              >
                MIMIC
              </h1>
              {/* Brush underline */}
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-2 rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #dc2626, #dc2626, transparent)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>

            {/* MASTER */}
            <motion.div
              className="relative -mt-4 md:-mt-8"
              initial={{ y: 100, opacity: 0, scale: 0.3, rotateX: -60 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <h1
                className="text-8xl md:text-9xl lg:text-[13rem] font-black tracking-tighter select-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#dc2626',
                  textShadow: `
                    4px 4px 0 #0a0a0a, -4px -4px 0 #0a0a0a,
                    4px -4px 0 #0a0a0a, -4px 4px 0 #0a0a0a,
                    8px 8px 0 #0a0a0a,
                    0 0 40px rgba(220,38,38,1),
                    0 0 80px rgba(220,38,38,0.7),
                    0 0 160px rgba(220,38,38,0.4)
                  `,
                }}
              >
                MASTER
              </h1>
            </motion.div>

            {/* Ink drips */}
            <motion.div
              className="absolute bottom-[28%] left-1/2 -translate-x-1/2 flex gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, #dc2626, transparent)' }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 15 + Math.random() * 80, opacity: 0.8 }}
                  transition={{ delay: 0.7 + i * 0.06, duration: 0.8, ease: 'easeOut' }}
                />
              ))}
            </motion.div>

            {/* Floating orbs during glow */}
            {phase === 'glow' && [...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full blur-sm"
                style={{
                  width: 6 + i * 3,
                  height: 6 + i * 3,
                  background: `rgba(220, 38, 38, ${0.3 + i * 0.08})`,
                  top: `${20 + i * 12}%`,
                  left: `${15 + (i % 2 === 0 ? i * 15 : 60 + i * 5)}%`,
                }}
                animate={{
                  y: [0, -20 - i * 5, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,10,0.85) 100%)' }}
      />

      {/* Final fade */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fadeout' ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      />
    </div>
  );
};
