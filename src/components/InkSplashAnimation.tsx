import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Intro V8 — SLAM effect.
 *
 * Flow (total ~3s):
 *   0.0s — Screen black
 *   0.2s — Ink drops fall from top (3 big splashes)
 *   0.6s — Ink covers entire screen (wipe from center)
 *   1.0s — Logo SLAMS in from above with screen shake
 *   1.5s — Subtitle fades in + sparkle burst
 *   2.2s — Everything fades to game
 *   2.8s — onComplete()
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [stage, setStage] = useState(0);
  const cancelledRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // SFX
  const playBoom = () => {
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.6;
      out.connect(ctx.destination);
      // Low boom
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.8, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 0.45);
      // Noise burst
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      noise.connect(ng).connect(out);
      noise.start(now);
      noise.stop(now + 0.22);
    } catch { /* noop */ }
  };

  const playChime = () => {
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.4;
      out.connect(ctx.destination);
      [523, 659, 784, 1046].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + i * 0.06);
        g.gain.linearRampToValueAtTime(0.3, now + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5);
        osc.connect(g).connect(out);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.55);
      });
    } catch { /* noop */ }
  };

  // Orchestration
  useEffect(() => {
    cancelledRef.current = false;
    try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* noop */ }

    if (reducedMotion) {
      setStage(4);
      const t = setTimeout(() => { if (!cancelledRef.current) onComplete(); }, 500);
      return () => { cancelledRef.current = true; clearTimeout(t); };
    }

    const timers: number[] = [];
    const q = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (!cancelledRef.current) fn(); }, ms)); };

    q(200, () => setStage(1));           // Ink drops
    q(600, () => { setStage(2); playBoom(); }); // Ink flood
    q(1000, () => { setStage(3); playBoom(); }); // Logo slam
    q(1500, () => { setStage(4); playChime(); }); // Subtitle + sparkles
    q(2400, () => setStage(5));          // Fade out
    q(2800, () => onComplete());         // Done

    return () => { cancelledRef.current = true; timers.forEach(clearTimeout); try { audioRef.current?.close(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ink drops data
  const drops = useMemo(() => [
    { x: '25%', delay: 0, size: 180, color: '#a855f7' },
    { x: '55%', delay: 0.08, size: 220, color: '#7c3aed' },
    { x: '78%', delay: 0.15, size: 160, color: '#6d28d9' },
  ], []);

  // Sparkle positions
  const sparkles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: Math.cos((i / 20) * Math.PI * 2) * (200 + Math.random() * 100),
      y: Math.sin((i / 20) * Math.PI * 2) * (150 + Math.random() * 80),
      size: 10 + Math.random() * 14,
      delay: Math.random() * 0.2,
      color: ['#fbbf24', '#f472b6', '#06b6d4', '#ffffff', '#a855f7'][i % 5],
    })),
  []);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none" style={{ background: '#0a0510' }}>

      {/* ═══ STAGE 1: Ink drops falling ═══ */}
      {drops.map((drop, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: drop.x, top: '-10%', width: drop.size, height: drop.size, background: drop.color }}
          initial={{ y: 0, scale: 0.5, opacity: 0 }}
          animate={stage >= 1 ? { y: '120vh', scale: [0.5, 1.5, 1], opacity: [0, 1, 0.8] } : {}}
          transition={{ duration: 0.5, delay: drop.delay, ease: [0.55, 0, 1, 0.45] }}
        />
      ))}

      {/* ═══ STAGE 2: Ink flood (circle expanding from center) ═══ */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, #1a0d2e, #0a0510)' }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={stage >= 2 ? { width: '300vmax', height: '300vmax', opacity: 1 } : {}}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* Ink splatter SVG overlay */}
      {stage >= 2 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <svg viewBox="0 0 800 600" className="w-[80vw] max-w-[700px] h-auto opacity-30">
            <path d="M400,50 Q500,20 580,100 Q700,60 720,200 Q800,300 680,380 Q750,480 580,520 Q500,580 400,540 Q300,580 220,520 Q50,480 120,380 Q0,300 80,200 Q100,60 220,100 Q300,20 400,50Z"
              fill="#a855f7" stroke="none" />
          </svg>
        </motion.div>
      )}

      {/* ═══ STAGE 3: Logo SLAM ═══ */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ y: -300, scale: 1.5, opacity: 0 }}
          animate={stage >= 3 ? { y: [null, 0, 8, 0], scale: [1.5, 1, 1.02, 1], opacity: 1 } : {}}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], times: [0, 0.6, 0.8, 1] }}
        >
          {/* MIMIC */}
          <motion.h1
            className="leading-none font-black"
            style={{
              fontSize: 'clamp(80px, 16vw, 160px)',
              fontFamily: "'Caveat', cursive",
              color: '#a855f7',
              textShadow: '5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 0 0 40px #a855f766',
            }}
            animate={stage >= 3 ? { rotate: [-2, 0] } : {}}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            MIMIC
          </motion.h1>
          {/* MASTER */}
          <motion.h1
            className="leading-none font-black -mt-4 md:-mt-6"
            style={{
              fontSize: 'clamp(80px, 16vw, 160px)',
              fontFamily: "'Caveat', cursive",
              color: '#fbbf24',
              textShadow: '5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 0 0 40px #fbbf2466',
            }}
            initial={{ y: 50, opacity: 0 }}
            animate={stage >= 3 ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
          >
            MASTER
          </motion.h1>
        </motion.div>
      </div>

      {/* ═══ STAGE 4: Subtitle + Sparkles ═══ */}
      <motion.div
        className="absolute bottom-[25%] left-1/2 -translate-x-1/2"
        initial={{ y: 20, opacity: 0, scale: 0.8 }}
        animate={stage >= 4 ? { y: 0, opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3, type: 'spring', damping: 15 }}
      >
        <div className="px-5 py-2 rounded-2xl" style={{
          background: 'linear-gradient(180deg, #06b6d4, #0891b2)',
          border: '3px solid #0a0810',
          boxShadow: '0 4px 0 #0a0810, 0 0 20px #06b6d444',
        }}>
          <span className="text-lg md:text-xl font-black text-white uppercase tracking-[0.3em]"
            style={{ fontFamily: "'Caveat', cursive", textShadow: '2px 2px 0 #0a0810' }}>
            Ink Mode
          </span>
        </div>
      </motion.div>

      {/* Sparkle burst */}
      {stage >= 4 && sparkles.map((s, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2"
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: s.delay, ease: 'easeOut' }}
        >
          <svg width={s.size} height={s.size} viewBox="0 0 24 24">
            <path d="M12,1 L14,9 L22,11 L14,13 L12,21 L10,13 L2,11 L10,9 Z"
              fill={s.color} stroke="#0a0810" strokeWidth="1" />
          </svg>
        </motion.div>
      ))}

      {/* ═══ STAGE 5: Fade out ═══ */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#0a0510' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 5 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Screen shake on slam */}
      {stage === 3 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ x: [0, -6, 6, -4, 4, 0], y: [0, 4, -4, 2, -2, 0] }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Skip button */}
      <button
        type="button"
        onClick={() => { cancelledRef.current = true; onComplete(); }}
        className="absolute bottom-5 right-5 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 text-sm font-bold transition-colors z-10"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        Passer →
      </button>
    </div>
  );
};
