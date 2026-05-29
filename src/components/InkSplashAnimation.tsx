import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Intro V9 — "MASTERPIECE"
 *
 * A multi-act cinematic intro for Ink mode. Canvas-driven ink physics +
 * Framer Motion logo choreography + WebAudio sound design.
 *
 * ACTS (total ~4.2s):
 *   Act 1 (0.0–0.9s)  — Ink drops plummet & splatter (canvas physics)
 *   Act 2 (0.9–1.7s)  — Ink floods the screen in an organic wipe
 *   Act 3 (1.7–2.9s)  — Logo letters SLAM in one-by-one with ink trails + shake
 *   Act 4 (2.9–3.7s)  — Sparkle supernova + subtitle stamp + glow pulse
 *   Act 5 (3.7–4.2s)  — Cinematic fade to the game
 */

const FONT = "'Caveat', cursive";
const PURPLE = '#a855f7';
const GOLD = '#fbbf24';
const CYAN = '#06b6d4';
const PINK = '#f472b6';

export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [act, setAct] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelledRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // ───────────────────────────── SOUND DESIGN ─────────────────────────────
  const ac = () => {
    const ctx = audioRef.current;
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  const playSplat = useCallback((pitch = 1) => {
    const ctx = ac(); if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.4;
    out.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200 * pitch, now);
    filt.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filt).connect(g).connect(out);
    noise.start(now); noise.stop(now + 0.18);
  }, []);

  const playBoom = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.7;
    out.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g).connect(out);
    osc.start(now); osc.stop(now + 0.6);
    // sub click
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.value = 60;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.3, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    click.connect(cg).connect(out);
    click.start(now); click.stop(now + 0.1);
  }, []);

  const playChime = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.35;
    out.connect(ctx.destination);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const t = now + i * 0.05;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g).connect(out);
      osc.start(t); osc.stop(t + 0.65);
    });
  }, []);

  const playWhoosh = useCallback(() => {
    const ctx = ac(); if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.3;
    out.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(300, now);
    filt.frequency.exponentialRampToValueAtTime(3000, now + 0.4);
    filt.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.connect(filt).connect(g).connect(out);
    noise.start(now); noise.stop(now + 0.52);
  }, []);

  // ───────────────────────── CANVAS INK PHYSICS ───────────────────────────
  // Splatter blobs that grow with organic wobble. Driven by act timing.
  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    interface Blob { x: number; y: number; r: number; tr: number; color: string; born: number; wobble: number; }
    const blobs: Blob[] = [];
    interface Drop { x: number; y: number; vy: number; r: number; color: string; landed: boolean; }
    const drops: Drop[] = [];

    const palette = [PURPLE, '#7c3aed', '#6d28d9', '#9333ea'];

    // Spawn falling drops staggered
    const spawnDrops = () => {
      for (let i = 0; i < 5; i++) {
        drops.push({
          x: W() * (0.12 + Math.random() * 0.76),
          y: -80 - Math.random() * 200,
          vy: 18 + Math.random() * 10,
          r: 26 + Math.random() * 34,
          color: palette[i % palette.length],
          landed: false,
        });
      }
    };

    const addSplat = (x: number, y: number, r: number, color: string) => {
      blobs.push({ x, y, r: 0, tr: r, color, born: performance.now(), wobble: Math.random() * Math.PI * 2 });
      // satellite droplets
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = r * (0.8 + Math.random() * 1.2);
        blobs.push({
          x: x + Math.cos(ang) * dist,
          y: y + Math.sin(ang) * dist,
          r: 0,
          tr: r * (0.15 + Math.random() * 0.35),
          color,
          born: performance.now(),
          wobble: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawBlob = (b: Blob, t: number) => {
      const pts = 14;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const wob = 1 + Math.sin(a * 3 + b.wobble + t * 0.001) * 0.12 + Math.cos(a * 5 + b.wobble) * 0.06;
        const rr = b.r * wob;
        const px = b.x + Math.cos(a) * rr;
        const py = b.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = b.color;
      ctx.fill();
    };

    let running = true;
    const loop = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, W(), H());

      // update + draw drops
      for (const d of drops) {
        if (!d.landed) {
          d.y += d.vy;
          d.vy += 1.4; // gravity
          if (d.y >= H() * (0.45 + Math.random() * 0.1)) {
            d.landed = true;
            addSplat(d.x, d.y, d.r * 2.4, d.color);
            playSplat(0.8 + Math.random() * 0.6);
          }
        }
        if (!d.landed) {
          // trailing teardrop
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, d.r * 0.5, d.r, 0, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.fill();
          // tail
          ctx.beginPath();
          ctx.moveTo(d.x - d.r * 0.5, d.y);
          ctx.quadraticCurveTo(d.x, d.y - d.r * 2.5, d.x + d.r * 0.5, d.y);
          ctx.fillStyle = d.color;
          ctx.fill();
        }
      }

      // grow + draw blobs
      for (const b of blobs) {
        b.r += (b.tr - b.r) * 0.18;
        drawBlob(b, t);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    spawnDrops();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // ───────────────────────────── ORCHESTRATION ────────────────────────────
  useEffect(() => {
    cancelledRef.current = false;
    try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* noop */ }

    if (reducedMotion) {
      setAct(5);
      const t = setTimeout(() => { if (!cancelledRef.current) onComplete(); }, 400);
      return () => { cancelledRef.current = true; clearTimeout(t); };
    }

    const timers: number[] = [];
    const q = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (!cancelledRef.current) fn(); }, ms)); };

    q(50, () => playWhoosh());
    q(900, () => { setAct(2); playBoom(); });    // flood
    q(1700, () => { setAct(3); playBoom(); });   // logo slam
    q(2900, () => { setAct(4); playChime(); });  // sparkle + subtitle
    q(3700, () => setAct(5));                    // fade
    q(4200, () => onComplete());                 // done

    return () => {
      cancelledRef.current = true;
      timers.forEach(clearTimeout);
      try { audioRef.current?.close(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Letters for the slam-in reveal
  const mimic = 'MIMIC'.split('');
  const master = 'MASTER'.split('');

  // Sparkle supernova
  const sparkles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const ang = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 180 + Math.random() * 280;
      return {
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        size: 8 + Math.random() * 20,
        delay: Math.random() * 0.25,
        rot: Math.random() * 360,
        color: [GOLD, PINK, CYAN, '#ffffff', PURPLE][i % 5],
      };
    }),
  []);

  const letterTransition = (i: number) => ({
    duration: 0.4,
    delay: i * 0.07,
    ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  });

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center, #160a26 0%, #0a0510 70%)' }}>

      {/* Subtle animated vignette grain */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.0, 0.15, 0.0] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ background: 'radial-gradient(circle at 30% 20%, #a855f733, transparent 50%), radial-gradient(circle at 70% 80%, #06b6d422, transparent 50%)' }}
      />

      {/* ═══ Canvas ink physics (acts 1-2) ═══ */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ═══ ACT 2: Ink flood wipe ═══ */}
      <motion.div
        className="absolute top-1/2 left-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, #1f1138, #0a0510)`, translateX: '-50%', translateY: '-50%' }}
        initial={{ width: 0, height: 0 }}
        animate={act >= 2 ? { width: '320vmax', height: '320vmax' } : {}}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />

      {/* Big organic splatter behind logo */}
      {act >= 2 && (
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ scale: 0, opacity: 0, rotate: -8 }}
          animate={{ scale: [0, 1.25, 1], opacity: 0.9, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}>
          <svg viewBox="0 0 800 600" className="w-[92vw] max-w-[860px] h-auto">
            <defs>
              <radialGradient id="inkGrad" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#2a1650" />
                <stop offset="70%" stopColor="#1a0d2e" />
                <stop offset="100%" stopColor="#12081f" />
              </radialGradient>
            </defs>
            <path d="M400,40 Q520,10 600,90 Q720,50 740,190 Q830,290 700,390 Q780,500 590,540 Q510,600 400,555 Q290,600 210,540 Q20,500 100,390 Q-30,290 60,190 Q80,50 200,90 Q280,10 400,40Z"
              fill="url(#inkGrad)" />
          </svg>
        </motion.div>
      )}

      {/* ═══ ACT 3: Logo letter-by-letter slam ═══ */}
      {act >= 3 && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          animate={{ x: [0, -8, 8, -5, 5, -2, 0], y: [0, 5, -5, 3, -3, 0] }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {/* MIMIC */}
          <div className="flex">
            {mimic.map((ch, i) => (
              <motion.span
                key={`m${i}`}
                className="leading-none font-black inline-block"
                style={{
                  fontSize: 'clamp(72px, 15vw, 170px)',
                  fontFamily: FONT,
                  color: PURPLE,
                  textShadow: '6px 6px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 0 0 50px #a855f788',
                }}
                initial={{ y: -260, scale: 2, opacity: 0, rotate: -15 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: i % 2 === 0 ? -3 : 3 }}
                transition={letterTransition(i)}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          {/* MASTER */}
          <div className="flex -mt-3 md:-mt-6">
            {master.map((ch, i) => (
              <motion.span
                key={`s${i}`}
                className="leading-none font-black inline-block"
                style={{
                  fontSize: 'clamp(72px, 15vw, 170px)',
                  fontFamily: FONT,
                  color: GOLD,
                  textShadow: '6px 6px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 0 0 50px #fbbf2488',
                }}
                initial={{ y: 260, scale: 2, opacity: 0, rotate: 15 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: i % 2 === 0 ? 3 : -3 }}
                transition={letterTransition(i + 2)}
              >
                {ch}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ ACT 4: Sparkle supernova + subtitle ═══ */}
      {act >= 4 && (
        <>
          {sparkles.map((s, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2"
              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
              animate={{ x: s.x, y: s.y, scale: [0, 1.6, 0], opacity: [0, 1, 0], rotate: s.rot }}
              transition={{ duration: 0.8, delay: s.delay, ease: 'easeOut' }}
            >
              <svg width={s.size} height={s.size} viewBox="0 0 24 24">
                <path d="M12,0 L14.5,8.5 L23,11 L14.5,13.5 L12,22 L9.5,13.5 L1,11 L9.5,8.5 Z"
                  fill={s.color} stroke="#0a0810" strokeWidth="1" />
              </svg>
            </motion.div>
          ))}

          {/* Glow pulse ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
            style={{ translateX: '-50%', translateY: '-50%', border: `4px solid ${GOLD}` }}
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{ width: '90vmin', height: '90vmin', opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Subtitle stamp */}
          <motion.div
            className="absolute bottom-[20%] left-1/2"
            style={{ translateX: '-50%' }}
            initial={{ scale: 2.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: -2 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
          >
            <div className="px-6 py-2.5 rounded-2xl" style={{
              background: `linear-gradient(180deg, ${CYAN}, #0891b2)`,
              border: '4px solid #0a0810',
              boxShadow: `0 5px 0 #0a0810, 0 0 28px ${CYAN}66`,
            }}>
              <span className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.35em]"
                style={{ fontFamily: FONT, textShadow: '2px 2px 0 #0a0810' }}>
                Ink&nbsp;Mode
              </span>
            </div>
          </motion.div>
        </>
      )}

      {/* ═══ ACT 5: Cinematic fade ═══ */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#0a0510' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: act >= 5 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Skip button */}
      <button
        type="button"
        onClick={() => { cancelledRef.current = true; onComplete(); }}
        className="absolute bottom-5 right-5 px-4 py-2 rounded-xl text-white/40 hover:text-white text-base font-black transition-colors z-10"
        style={{ fontFamily: FONT, textShadow: '1px 1px 0 #0a0810' }}
      >
        Passer →
      </button>
    </div>
  );
};
