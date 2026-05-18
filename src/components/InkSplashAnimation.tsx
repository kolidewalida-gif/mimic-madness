import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

type Phase = 'pulse' | 'reveal' | 'flash' | 'done';

/**
 * Cinematic Ink Intro V5 — fast, modern, AAA launcher feel
 * Total duration ~ 2.4 seconds.
 *
 * Phases:
 *   pulse  (0.5s)  — a single accent dot pulses, audio "ping"
 *   reveal (1.0s)  — title slides up + accent line sweeps + glitch chars
 *   flash  (0.4s)  — white flash transition
 *   done   (0.5s)  — fade out
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<Phase>('pulse');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Audio engine -------------------------------------------------------
  const playSound = useCallback(
    (type: 'ping' | 'whoosh' | 'flash' | 'thump') => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.connect(ctx.destination);

      switch (type) {
        case 'ping': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.22, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(g).connect(out);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }
        case 'whoosh': {
          // White noise swept through a band-pass — cinematic transition whoosh
          const bufSize = ctx.sampleRate * 0.5;
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.exponentialRampToValueAtTime(4000, now + 0.45);
          filter.Q.value = 4;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.35, now + 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          noise.connect(filter).connect(g).connect(out);
          noise.start(now);
          noise.stop(now + 0.5);
          break;
        }
        case 'thump': {
          // Sub bass kick on title reveal
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.25);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.4, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(g).connect(out);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }
        case 'flash': {
          // Bright sparkle / hat
          const bufSize = ctx.sampleRate * 0.15;
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 5000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.4, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          noise.connect(filter).connect(g).connect(out);
          noise.start(now);
          noise.stop(now + 0.15);
          break;
        }
      }
    },
    [],
  );

  // --- Phase orchestration -----------------------------------------------
  useEffect(() => {
    // Init audio context (must be after user gesture in some browsers,
    // but works in most cases since this is rendered after click)
    try {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[InkIntro] AudioContext unavailable:', e);
    }

    let cancelled = false;

    const run = async () => {
      // Phase 1: pulse
      playSound('ping');
      await wait(500);
      if (cancelled) return;

      // Phase 2: reveal
      setPhase('reveal');
      playSound('thump');
      playSound('whoosh');
      await wait(1000);
      if (cancelled) return;

      // Phase 3: flash
      setPhase('flash');
      playSound('flash');
      await wait(400);
      if (cancelled) return;

      // Phase 4: done
      setPhase('done');
      await wait(500);
      if (!cancelled) onComplete();
    };

    run();

    return () => {
      cancelled = true;
      try {
        audioCtxRef.current?.close();
      } catch { /* noop: audio ctx already closed */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#08070d] flex items-center justify-center overflow-hidden select-none">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient red glow */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: phase === 'pulse' ? 0.2 : phase === 'reveal' ? 0.5 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,43,43,0.25) 0%, transparent 60%)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/70 pointer-events-none" />

      {/* Phase 1 — single pulsing dot */}
      <AnimatePresence>
        {phase === 'pulse' && (
          <motion.div
            key="pulse-dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 1.3, 0.8], opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 0.7, 1] }}
            className="relative"
          >
            {/* Outer halo */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 4], opacity: [0.6, 0] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                width: 80,
                height: 80,
                background:
                  'radial-gradient(circle, rgba(255,43,43,0.6) 0%, transparent 70%)',
                left: -30,
                top: -30,
              }}
            />
            {/* Inner dot */}
            <div
              className="w-5 h-5 rounded-full"
              style={{
                background: '#ff2b2b',
                boxShadow:
                  '0 0 30px #ff2b2b, 0 0 60px #ff2b2b88, 0 0 90px #ff2b2b44',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2 — title reveal */}
      <AnimatePresence>
        {(phase === 'reveal' || phase === 'flash') && (
          <motion.div
            key="title-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-center"
          >
            {/* Top accent line — sweeps in */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="h-px w-[280px] mb-4 origin-center"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #ff2b2b, transparent)',
                boxShadow: '0 0 12px #ff2b2b',
              }}
            />

            {/* Top label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-[10px] tracking-[0.5em] text-[#ff2b2b] font-bold uppercase mb-3"
              style={{ textShadow: '0 0 8px #ff2b2b88' }}
            >
              Ink Mode
            </motion.div>

            {/* Title — split animation */}
            <div className="flex items-baseline gap-3 md:gap-5 overflow-hidden">
              {'MIMIC'.split('').map((char, i) => (
                <motion.span
                  key={`m-${i}`}
                  initial={{ y: 80, opacity: 0, rotateX: -90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.25 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-6xl md:text-8xl font-black leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#ff2b2b',
                    textShadow:
                      '0 0 30px rgba(255,43,43,0.8), 0 0 60px rgba(255,43,43,0.4), 0 4px 12px rgba(0,0,0,0.8)',
                    WebkitTextStroke: '1px rgba(0,0,0,0.4)',
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            <div className="flex items-baseline gap-3 md:gap-5 overflow-hidden -mt-4">
              {'MASTER'.split('').map((char, i) => (
                <motion.span
                  key={`mr-${i}`}
                  initial={{ y: 80, opacity: 0, rotateX: -90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.5 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-6xl md:text-8xl font-black leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#ffffff',
                    textShadow:
                      '0 0 30px rgba(255,43,43,0.5), 0 0 60px rgba(255,43,43,0.3), 0 4px 12px rgba(0,0,0,0.8)',
                    WebkitTextStroke: '1px rgba(0,0,0,0.4)',
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Bottom accent line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-px w-[280px] mt-4 origin-center"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #ff2b2b, transparent)',
                boxShadow: '0 0 12px #ff2b2b',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3 — white flash overlay */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, times: [0, 0.3, 1] }}
            className="absolute inset-0 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Phase 4 — fade to black */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[#08070d]"
          />
        )}
      </AnimatePresence>

      {/* Skip button */}
      <button
        type="button"
        onClick={onComplete}
        className="absolute bottom-6 right-6 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[0.2em] text-white/60 hover:text-white uppercase font-bold transition-colors"
      >
        Passer
      </button>

      <style>{`
        .bg-gradient-radial { background: radial-gradient(circle at center, var(--tw-gradient-stops)); }
      `}</style>
    </div>
  );
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
