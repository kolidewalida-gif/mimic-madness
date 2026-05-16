import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

type Phase = 'drop' | 'splash' | 'write' | 'hold' | 'fadeout';

/**
 * Ink Splash Animation V4 — Calligraphy reveal
 * A single ink drop falls, splashes into a pool that explodes into splatters,
 * then the title "MIMIC MASTER" is written stroke-by-stroke like real calligraphy.
 * Shorter, punchier and more elegant than V3.
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<Phase>('drop');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  // --- Sound engine ---------------------------------------------------------
  const playSound = useCallback((type: 'whistle' | 'splash' | 'brush' | 'chord') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    switch (type) {
      case 'whistle': {
        // Descending whistle while the drop falls
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.1);
        g.gain.linearRampToValueAtTime(0, now + 0.75);
        osc.connect(g); g.connect(master);
        osc.start(now); osc.stop(now + 0.8);
        break;
      }
      case 'splash': {
        // Wet splash impact
        const len = ctx.sampleRate * 0.5;
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = buf.getChannelData(ch);
          for (let i = 0; i < len; i++) {
            const p = i / len;
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - p, 1.5) * 0.7;
          }
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(800, now);
        lp.frequency.exponentialRampToValueAtTime(120, now + 0.4);
        src.connect(lp); lp.connect(master);
        master.gain.setValueAtTime(0.6, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        src.start(now); src.stop(now + 0.5);
        // Deep thud
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(90, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.6, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        bass.connect(bg); bg.connect(master);
        bass.start(now); bass.stop(now + 0.5);
        break;
      }
      case 'brush': {
        // Brush stroke sweep
        const len = ctx.sampleRate * 1.2;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const p = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.35;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2200, now);
        bp.frequency.linearRampToValueAtTime(900, now + 1.2);
        bp.Q.value = 0.8;
        src.connect(bp); bp.connect(master);
        master.gain.setValueAtTime(0.4, now);
        master.gain.linearRampToValueAtTime(0, now + 1.2);
        src.start(now); src.stop(now + 1.2);
        break;
      }
      case 'chord': {
        // Cinematic reveal chord (minor → major resolve)
        [110, 165, 220, 277, 330, 440].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = i < 3 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.13 / (i * 0.4 + 1), now + 0.25);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          osc.connect(g); g.connect(master);
          osc.start(now); osc.stop(now + 1.8);
        });
        break;
      }
    }
  }, []);

  // --- Particle canvas (splash + ambient ink) ------------------------------
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
      color: 'red' | 'black';
      type: 'splash' | 'drip' | 'mist' | 'ambient';
      grav: number;
    }
    const particles: P[] = [];
    let splashTriggered = false;
    let frame = 0;
    let shake = 0;

    const splash = () => {
      // Radial splatter
      for (let i = 0; i < 180; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.pow(Math.random(), 0.5) * 28;
        const isRed = Math.random() > 0.55;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 6,
          size: 3 + Math.random() * 14,
          life: 0, maxLife: 70 + Math.random() * 70,
          color: isRed ? 'red' : 'black',
          type: 'splash',
          grav: 0.35,
        });
      }
      // Long arcing drips
      for (let i = 0; i < 18; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const speed = 14 + Math.random() * 18;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed * 0.6,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 7,
          life: 0, maxLife: 130,
          color: Math.random() > 0.5 ? 'red' : 'black',
          type: 'drip',
          grav: 0.5,
        });
      }
      // Fine mist
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 6;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 2.5,
          life: 0, maxLife: 40 + Math.random() * 30,
          color: 'red',
          type: 'mist',
          grav: 0.05,
        });
      }
      shake = 18;
    };

    const spawnAmbient = () => {
      particles.push({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.4 - Math.random() * 1.2,
        size: 2 + Math.random() * 4,
        life: 0, maxLife: 180 + Math.random() * 80,
        color: 'red',
        type: 'ambient',
        grav: 0,
      });
    };

    const animate = () => {
      const sx = shake > 0.1 ? (Math.random() - 0.5) * shake : 0;
      const sy = shake > 0.1 ? (Math.random() - 0.5) * shake : 0;
      shake *= 0.88;

      ctx.save();
      ctx.translate(sx, sy);

      // Trail wash
      ctx.fillStyle = 'rgba(10,10,10,0.18)';
      ctx.fillRect(-20, -20, W + 40, H + 40);

      if (phase === 'splash' && !splashTriggered) {
        splash();
        splashTriggered = true;
      }

      if ((phase === 'write' || phase === 'hold') && frame % 4 === 0) {
        spawnAmbient();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.grav;
        p.vx *= 0.985;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0) { particles.splice(i, 1); continue; }

        const sz = p.size * (p.type === 'ambient' ? alpha : Math.pow(alpha, 0.4));
        const rgb = p.color === 'red' ? '220, 38, 38' : '15, 15, 15';

        if (p.type === 'mist' || p.type === 'ambient') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3);
          g.addColorStop(0, `rgba(${rgb}, ${alpha * 0.7})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Inky blob, slightly elongated along motion
          const angle = Math.atan2(p.vy, p.vx);
          const speed = Math.min(2.2, Math.hypot(p.vx, p.vy) / 8);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
          g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
          g.addColorStop(0.55, `rgba(${rgb}, ${alpha * 0.55})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * (1 + speed), sz, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (particles.length > 700) particles.splice(0, particles.length - 700);

      ctx.restore();
      frame++;
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // --- Phase sequencer ------------------------------------------------------
  useEffect(() => {
    audioCtxRef.current = new AudioContext();

    playSound('whistle');
    const t1 = setTimeout(() => { setPhase('splash'); playSound('splash'); }, 750);
    const t2 = setTimeout(() => { setPhase('write'); playSound('brush'); }, 1150);
    const t3 = setTimeout(() => { setPhase('hold'); playSound('chord'); }, 2350);
    const t4 = setTimeout(() => { setPhase('fadeout'); }, 3700);
    const t5 = setTimeout(onComplete, 4400);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
      audioCtxRef.current?.close();
    };
  }, [onComplete, playSound]);

  const showTitle = phase === 'write' || phase === 'hold' || phase === 'fadeout';

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] overflow-hidden cursor-none">
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: phase === 'fadeout' ? 0 : 1, transition: 'opacity 0.6s ease-out' }}
      />

      {/* Ambient red glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[180px] pointer-events-none"
        initial={{ width: 100, height: 100, opacity: 0 }}
        animate={{
          width: showTitle ? 900 : 200,
          height: showTitle ? 600 : 200,
          opacity: phase === 'fadeout' ? 0 : showTitle ? 0.55 : 0.3,
          backgroundColor: 'rgba(220,38,38,0.5)',
        }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Falling ink drop */}
      <AnimatePresence>
        {phase === 'drop' && (
          <motion.div
            key="drop"
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            initial={{ top: '-10%', scaleY: 1.4, scaleX: 0.7, opacity: 0 }}
            animate={{ top: '50%', scaleY: 2.2, scaleX: 0.5, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.7, 0, 0.84, 0] }}
          >
            <div
              className="w-10 h-10 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff4d4d, #dc2626 55%, #7a1414 100%)',
                boxShadow: '0 0 40px rgba(220,38,38,0.7), 0 0 80px rgba(220,38,38,0.4)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ink pool (grows from impact) */}
      <AnimatePresence>
        {(phase === 'splash' || phase === 'write' || phase === 'hold' || phase === 'fadeout') && (
          <motion.div
            key="pool"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: phase === 'splash' ? 220 : 120,
              height: phase === 'splash' ? 140 : 80,
              opacity: phase === 'fadeout' ? 0 : 0.9,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(ellipse at center, #0a0a0a 40%, rgba(10,10,10,0) 80%)',
              filter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Title — calligraphy reveal */}
      <AnimatePresence>
        {showTitle && (
          <motion.div
            key="title"
            className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fadeout' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background brush stroke that "paints" behind the text */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[260px] md:h-[340px] origin-left"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'min(1100px, 85vw)', opacity: 0.85 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, #0a0a0a 8%, #0a0a0a 92%, transparent 100%)',
                transform: 'translate(-50%, -50%) skewY(-1.5deg)',
                filter: 'blur(1px)',
                maskImage:
                  'radial-gradient(ellipse 60% 50% at 50% 50%, #000 60%, transparent 100%)',
              }}
            />

            {/* MIMIC */}
            <motion.h1
              className="relative text-7xl md:text-9xl lg:text-[12rem] font-black tracking-tight select-none leading-none"
              initial={{ opacity: 0, x: -120, filter: 'blur(14px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#ffffff',
                textShadow:
                  '3px 3px 0 #0a0a0a, -3px -3px 0 #0a0a0a, 0 0 40px rgba(220,38,38,0.9), 0 0 100px rgba(220,38,38,0.5)',
              }}
            >
              MIMIC
              <motion.span
                className="absolute -bottom-2 left-0 h-[6px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #dc2626 30%, #dc2626 70%, transparent)' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.h1>

            {/* MASTER */}
            <motion.h1
              className="relative -mt-3 md:-mt-6 text-7xl md:text-9xl lg:text-[12rem] font-black tracking-tight select-none leading-none"
              initial={{ opacity: 0, x: 120, filter: 'blur(14px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#dc2626',
                textShadow:
                  '3px 3px 0 #0a0a0a, -3px -3px 0 #0a0a0a, 0 0 40px rgba(220,38,38,1), 0 0 120px rgba(220,38,38,0.6)',
              }}
            >
              MASTER
            </motion.h1>

            {/* Ink drips under the title */}
            <div className="absolute top-[62%] left-1/2 -translate-x-1/2 flex gap-3 md:gap-5">
              {[...Array(11)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] md:w-[5px] rounded-full"
                  style={{ background: 'linear-gradient(to bottom, #dc2626, transparent)' }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 20 + Math.random() * 110, opacity: 0.85 }}
                  transition={{ delay: 0.9 + i * 0.04, duration: 0.7, ease: 'easeOut' }}
                />
              ))}
            </div>

            {/* Floating orbs during hold */}
            {phase === 'hold' &&
              [...Array(7)].map((_, i) => (
                <motion.div
                  key={`orb-${i}`}
                  className="absolute rounded-full blur-sm"
                  style={{
                    width: 5 + i * 2.5,
                    height: 5 + i * 2.5,
                    background: `rgba(220, 38, 38, ${0.35 + i * 0.07})`,
                    top: `${22 + i * 9}%`,
                    left: `${12 + (i % 2 === 0 ? i * 13 : 62 + i * 4)}%`,
                  }}
                  animate={{
                    y: [0, -18 - i * 4, 0],
                    opacity: [0.3, 0.85, 0.3],
                    scale: [1, 1.25, 1],
                  }}
                  transition={{ duration: 1.4 + i * 0.25, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(10,10,10,0.9) 100%)' }}
      />

      {/* Final fade to black */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fadeout' ? 1 : 0 }}
        transition={{ duration: 0.7, ease: 'easeIn' }}
      />
    </div>
  );
};