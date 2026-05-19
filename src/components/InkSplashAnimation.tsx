import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Cartoon Ink Intro V7 — buttery smooth, no layout-jumps.
 *
 * Design principles for fluid animation:
 *   1. All layers are absolute & full-screen — they never resize.
 *   2. We animate ONLY `transform` + `opacity` (GPU-accelerated, no reflow).
 *   3. Letters live in fixed-width slots → rotation never shifts neighbours.
 *   4. Phases use a single source of truth (a numeric "stage") so layers
 *      cross-fade with consistent timing instead of mounting/unmounting.
 *   5. AudioContext is resumed inside the first user-gesture path.
 *   6. `prefers-reduced-motion` shortens the animation to a quick fade.
 *
 * Total runtime: ~2.6 s.
 *   stage 0: 0.00s — punch (small dot zoom-in)
 *   stage 1: 0.45s — splat (big blob + droplets)
 *   stage 2: 1.00s — title drop (letter by letter)
 *   stage 3: 1.85s — sparkle pop
 *   stage 4: 2.30s — fade out
 *   end:     2.60s — onComplete()
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [stage, setStage] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cancelledRef = useRef(false);

  const palette = useMemo(
    () => ({
      primary: '#a855f7',
      secondary: '#fbbf24',
      accent: '#06b6d4',
      pop: '#ef4444',
      pink: '#f472b6',
    }),
    [],
  );

  /* ============================================================
     Detect prefers-reduced-motion to shorten the animation.
  ============================================================ */
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /* ============================================================
     Audio engine — cartoon SFX, all routed through a master gain.
  ============================================================ */
  const playSound = useCallback(
    (type: 'punch' | 'splat' | 'boing' | 'sparkle' | 'fanfare') => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      try {
        // Resume if Chrome auto-paused the context
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch {
        /* noop */
      }
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.55;
      out.connect(ctx.destination);

      switch (type) {
        case 'punch': {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.6, now + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(g).connect(out);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
        case 'splat': {
          const bufSize = Math.floor(ctx.sampleRate * 0.4);
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++)
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(4000, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
          filter.Q.value = 1;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.55, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          noise.connect(filter).connect(g).connect(out);
          noise.start(now);
          noise.stop(now + 0.42);

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(0, now);
          g2.gain.linearRampToValueAtTime(0.32, now + 0.005);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(g2).connect(out);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
        case 'boing': {
          [0, 0.12, 0.22].forEach((offset, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420 + i * 30, now + offset);
            osc.frequency.exponentialRampToValueAtTime(
              250 - i * 15,
              now + offset + 0.06,
            );
            osc.frequency.exponentialRampToValueAtTime(
              450 - i * 15,
              now + offset + 0.12,
            );
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + offset);
            g.gain.linearRampToValueAtTime(0.32 - i * 0.05, now + offset + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
            osc.connect(g).connect(out);
            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
          });
          break;
        }
        case 'sparkle': {
          [880, 1175, 1568].forEach((freq, i) => {
            const start = now + i * 0.06;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, start);
            g.gain.linearRampToValueAtTime(0.22, start + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.connect(g).connect(out);
            osc.start(start);
            osc.stop(start + 0.28);
          });
          break;
        }
        case 'fanfare': {
          [523, 659, 784, 1046].forEach((freq) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.25, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(g).connect(out);
            osc.start(now);
            osc.stop(now + 0.65);
          });
          break;
        }
      }
    },
    [],
  );

  /* ============================================================
     Phase orchestration — single chain, no overlapping unmounts.
  ============================================================ */
  useEffect(() => {
    cancelledRef.current = false;

    try {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[InkIntro] AudioContext unavailable:', e);
    }

    if (reducedMotion) {
      // Quick mode: 0.6s fade then done
      setStage(2);
      const timer = window.setTimeout(() => {
        if (!cancelledRef.current) onComplete();
      }, 600);
      return () => {
        cancelledRef.current = true;
        window.clearTimeout(timer);
      };
    }

    let s = 0;
    const timeouts: number[] = [];
    const queue = (delay: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        if (!cancelledRef.current) fn();
      }, delay);
      timeouts.push(id);
    };

    // Stage 0 — punch (immediate)
    playSound('punch');

    // Stage 1 — splat
    queue(450, () => {
      s = 1;
      setStage(1);
      playSound('splat');
    });

    // Stage 2 — title drop
    queue(1000, () => {
      s = 2;
      setStage(2);
      playSound('boing');
    });

    // Stage 3 — sparkle pop
    queue(1850, () => {
      s = 3;
      setStage(3);
      playSound('sparkle');
      playSound('fanfare');
    });

    // Stage 4 — fade
    queue(2300, () => {
      s = 4;
      setStage(4);
    });

    // Done
    queue(2600, () => {
      onComplete();
    });

    return () => {
      cancelledRef.current = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      try {
        audioCtxRef.current?.close();
      } catch {
        /* noop: audio ctx already closed */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     Memoised data
  ============================================================ */
  const droplets = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 200 + (i % 2) * 30;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: i % 2 === 0 ? 36 : 26,
          color: [
            palette.primary,
            palette.secondary,
            palette.accent,
            palette.pink,
            palette.primary,
            palette.pop,
            palette.secondary,
            palette.accent,
          ][i],
          delay: 0.05 + i * 0.025,
        };
      }),
    [palette],
  );

  const sparkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
        const distance = 280 + Math.random() * 80;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 14 + Math.floor(Math.random() * 10),
          delay: Math.random() * 0.15,
          color: [palette.secondary, palette.pink, palette.accent, '#ffffff'][i % 4],
        };
      }),
    [palette],
  );

  const TITLE_TOP = 'MIMIC';
  const TITLE_BOTTOM = 'MASTER';

  /* Letter slot — fixed width per letter so rotations never shift neighbours */
  const LetterSlot = ({
    char,
    color,
    delay,
    fromY,
    rotateActive,
  }: {
    char: string;
    color: string;
    delay: number;
    fromY: number;
    rotateActive: number;
  }) => (
    <span
      className="relative inline-block"
      style={{
        width: '0.7em',
        textAlign: 'center',
        // Reserve a stable line-box; rotation happens inside.
      }}
    >
      <motion.span
        className="inline-block"
        initial={{ y: fromY, scale: 0.5, rotate: 0, opacity: 0 }}
        animate={
          stage >= 2
            ? { y: 0, scale: 1, rotate: rotateActive, opacity: 1 }
            : { y: fromY, scale: 0.5, rotate: 0, opacity: 0 }
        }
        transition={{
          duration: 0.55,
          delay,
          type: 'spring',
          stiffness: 220,
          damping: 12,
        }}
        style={{
          fontFamily: "'Caveat', cursive",
          color,
          textShadow: `5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 3px 3px 0 #0a0810, 0 0 30px ${color}aa`,
          willChange: 'transform, opacity',
          transformOrigin: 'center center',
        }}
      >
        {char}
      </motion.span>
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{
        background:
          'linear-gradient(135deg, #1a0d2e 0%, #0a0510 50%, #160a26 100%)',
      }}
    >
      {/* Doodle pattern background — non-animated */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.06 }}
      >
        <defs>
          <pattern
            id="splash-doodle"
            x="0"
            y="0"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M10,30 Q30,10 50,30 T90,30 M20,80 Q40,60 60,80 T100,80 M60,40 L70,30 M30,90 L40,80"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#splash-doodle)" />
      </svg>

      {/* Ambient halo — opacity-only animation, no reflow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity:
            stage === 0
              ? 0.18
              : stage === 1
                ? 0.55
                : stage === 2
                  ? 0.45
                  : stage === 3
                    ? 0.6
                    : 0,
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: `radial-gradient(ellipse at center, ${palette.primary}66 0%, transparent 60%)`,
          filter: 'blur(40px)',
          willChange: 'opacity',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Center stage — all layers stacked, animations cross-fade */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ perspective: '1000px' }}
      >
        {/* ==== LAYER 1: PUNCH DOT ==== */}
        <motion.div
          className="absolute"
          initial={{ scale: 0, opacity: 0 }}
          animate={
            stage === 0
              ? { scale: [0, 1.2, 0.9], opacity: 1 }
              : { scale: 1.5, opacity: 0 }
          }
          transition={{
            duration: 0.45,
            ease: [0.34, 1.56, 0.64, 1],
            times: stage === 0 ? [0, 0.7, 1] : undefined,
          }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette.primary}, ${palette.pop})`,
            border: '5px solid #0a0810',
            boxShadow: `0 6px 0 #0a0810, 0 0 40px ${palette.primary}cc`,
            willChange: 'transform, opacity',
          }}
        />

        {/* ==== LAYER 2: SPLAT BLOB + DROPLETS ==== */}
        <motion.div
          className="absolute"
          initial={{ scale: 0, opacity: 0, rotate: -45 }}
          animate={
            stage === 1
              ? { scale: [0, 1.4, 1.2], opacity: 1, rotate: [0, 25, 30] }
              : stage > 1
                ? { scale: 1.2, opacity: 0, rotate: 30 }
                : { scale: 0, opacity: 0, rotate: -45 }
          }
          transition={{
            duration: 0.55,
            ease: [0.34, 1.56, 0.64, 1],
            times: stage === 1 ? [0, 0.45, 1] : undefined,
          }}
          style={{
            width: 640,
            maxWidth: '80vw',
            height: 640,
            maxHeight: '80vh',
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
          }}
        >
          <svg viewBox="0 0 800 800" className="w-full h-full block">
            <path
              d="M400,80 Q480,40 560,120 Q680,80 720,200 Q800,280 700,360 Q780,440 660,520 Q720,640 560,640 Q480,720 400,680 Q320,720 240,640 Q80,640 140,520 Q20,440 100,360 Q0,280 80,200 Q120,80 240,120 Q320,40 400,80 Z"
              fill={palette.primary}
              stroke="#0a0810"
              strokeWidth="14"
              strokeLinejoin="round"
            />
            <circle
              cx="400"
              cy="400"
              r="160"
              fill={palette.secondary}
              stroke="#0a0810"
              strokeWidth="10"
            />
          </svg>
        </motion.div>

        {/* ==== LAYER 2b: DROPLETS (separated so they keep their own transforms) ==== */}
        {droplets.map((d, i) => (
          <motion.div
            key={`droplet-${i}`}
            className="absolute rounded-full"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={
              stage === 1
                ? { x: d.x, y: d.y, scale: [0, 1.3, 1], opacity: 1 }
                : stage > 1
                  ? { x: d.x, y: d.y, scale: 0, opacity: 0 }
                  : { x: 0, y: 0, scale: 0, opacity: 0 }
            }
            transition={{
              duration: 0.55,
              delay: stage === 1 ? d.delay : 0,
              ease: [0.34, 1.56, 0.64, 1],
              times: stage === 1 ? [0, 0.7, 1] : undefined,
            }}
            style={{
              width: d.size,
              height: d.size,
              background: d.color,
              border: '4px solid #0a0810',
              willChange: 'transform, opacity',
            }}
          />
        ))}

        {/* ==== LAYER 3: TITLE BLOCK ==== */}
        <motion.div
          className="absolute flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{
            opacity: stage >= 2 && stage < 4 ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ willChange: 'opacity' }}
        >
          {/* Sub-label badge */}
          <motion.div
            initial={{ y: -10, scale: 0.5, rotate: -8, opacity: 0 }}
            animate={
              stage >= 2
                ? { y: 0, scale: 1, rotate: -2, opacity: 1 }
                : { y: -10, scale: 0.5, rotate: -8, opacity: 0 }
            }
            transition={{
              duration: 0.4,
              delay: 0.05,
              type: 'spring',
              stiffness: 280,
              damping: 16,
            }}
            className="mb-3 px-4 py-1.5 rounded-2xl"
            style={{
              background: `linear-gradient(180deg, ${palette.secondary}, #d97706)`,
              border: '3px solid #0a0810',
              boxShadow: '0 4px 0 #0a0810',
              willChange: 'transform, opacity',
              transformOrigin: 'center center',
            }}
          >
            <span
              className="text-base md:text-lg font-black uppercase tracking-[0.3em] text-white leading-none"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow:
                  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
              }}
            >
              Ink Mode
            </span>
          </motion.div>

          {/* MIMIC */}
          <div
            className="flex items-baseline justify-center"
            style={{
              fontSize: 'clamp(72px, 14vw, 144px)',
              lineHeight: 1,
              fontWeight: 900,
            }}
          >
            {TITLE_TOP.split('').map((char, i) => (
              <LetterSlot
                key={`top-${i}`}
                char={char}
                color={palette.primary}
                delay={0.15 + i * 0.06}
                fromY={-150}
                rotateActive={i % 2 === 0 ? -3 : 3}
              />
            ))}
          </div>

          {/* MASTER (slight overlap with stable margin) */}
          <div
            className="flex items-baseline justify-center"
            style={{
              fontSize: 'clamp(72px, 14vw, 144px)',
              lineHeight: 1,
              fontWeight: 900,
              marginTop: '-0.25em',
            }}
          >
            {TITLE_BOTTOM.split('').map((char, i) => (
              <LetterSlot
                key={`bot-${i}`}
                char={char}
                color={palette.secondary}
                delay={0.4 + i * 0.06}
                fromY={150}
                rotateActive={i % 2 === 0 ? 3 : -3}
              />
            ))}
          </div>
        </motion.div>

        {/* ==== LAYER 4: SPARKLES ==== */}
        {sparkles.map((s, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
            animate={
              stage === 3
                ? {
                    x: s.x,
                    y: s.y,
                    scale: [0, 1.4, 1, 0],
                    opacity: [0, 1, 1, 0],
                    rotate: 180,
                  }
                : { x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }
            }
            transition={{
              duration: 0.6,
              delay: stage === 3 ? s.delay : 0,
              ease: [0.34, 1.56, 0.64, 1],
              times: stage === 3 ? [0, 0.3, 0.65, 1] : undefined,
            }}
            style={{
              width: s.size,
              height: s.size,
              willChange: 'transform, opacity',
              transformOrigin: 'center center',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full block">
              <path
                d="M12,1 L14,9 L22,11 L14,13 L12,21 L10,13 L2,11 L10,9 Z"
                fill={s.color}
                stroke="#0a0810"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* ==== LAYER 5: FADE OUT OVERLAY ==== */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 4 ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeIn' }}
        style={{
          background: '#0a0510',
          willChange: 'opacity',
        }}
      />

      {/* Skip button */}
      <motion.button
        type="button"
        onClick={() => {
          cancelledRef.current = true;
          onComplete();
        }}
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute bottom-6 right-6 px-3 py-2 rounded-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '2.5px solid #0a0810',
          boxShadow: '0 3px 0 #0a0810',
          color: 'white',
          willChange: 'transform',
        }}
      >
        <span
          className="text-base font-black uppercase tracking-wider leading-none"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow:
              '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
          }}
        >
          Passer →
        </span>
      </motion.button>
    </div>
  );
};
