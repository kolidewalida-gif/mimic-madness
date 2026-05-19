import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

type Phase = 'punch' | 'splat' | 'title' | 'pop' | 'done';

/**
 * Cartoon Ink Intro V6 — graffiti style, ultra dynamique.
 * Total duration ~ 2.4 seconds.
 *
 * Phases:
 *   punch  (0.45s) — small zoom-in dot punches into view → SPLAT! sound
 *   splat  (0.55s) — big gradient ink blob explodes outward + 8 droplets
 *   title  (0.85s) — MIMIC MASTER drops letter by letter with bounce
 *   pop    (0.4s)  — sparkle burst all around
 *   done   (0.15s) — quick fade out
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<Phase>('punch');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const palette = useMemo(
    () => ({
      primary: '#a855f7', // purple — main accent
      secondary: '#fbbf24', // gold — sparkles
      accent: '#06b6d4', // cyan
      pop: '#ef4444', // red
      pink: '#f472b6',
    }),
    [],
  );

  /* ============================================================
     Audio engine — cartoon SFX (boings, splats, ding sparkles)
  ============================================================ */
  const playSound = useCallback(
    (type: 'punch' | 'splat' | 'boing' | 'sparkle' | 'fanfare') => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.6;
      out.connect(ctx.destination);

      switch (type) {
        case 'punch': {
          // Quick wood-block thump
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
          // Layered noise splash + tonal pop
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

          // Tonal pop on top
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
          // 3 stacked springy boings — 1 per letter wave
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
            g.gain.exponentialRampToValueAtTime(
              0.001,
              now + offset + 0.18,
            );
            osc.connect(g).connect(out);
            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
          });
          break;
        }
        case 'sparkle': {
          // Cartoon shimmer — 3-note up arpeggio
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
          // Big closing chord
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
     Phase orchestration
  ============================================================ */
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[InkIntro] AudioContext unavailable:', e);
    }

    let cancelled = false;
    const run = async () => {
      // Phase 1 — punch
      playSound('punch');
      await wait(450);
      if (cancelled) return;

      // Phase 2 — splat
      setPhase('splat');
      playSound('splat');
      await wait(550);
      if (cancelled) return;

      // Phase 3 — title
      setPhase('title');
      playSound('boing');
      await wait(850);
      if (cancelled) return;

      // Phase 4 — pop
      setPhase('pop');
      playSound('sparkle');
      playSound('fanfare');
      await wait(400);
      if (cancelled) return;

      // Phase 5 — done
      setPhase('done');
      await wait(150);
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

  // 8 droplets for the splash burst
  const droplets = useMemo(
    () => [
      { angle: 0, dist: 220, size: 38, color: palette.primary },
      { angle: 45, dist: 200, size: 28, color: palette.secondary },
      { angle: 90, dist: 240, size: 42, color: palette.accent },
      { angle: 135, dist: 180, size: 24, color: palette.pink },
      { angle: 180, dist: 230, size: 36, color: palette.primary },
      { angle: 225, dist: 200, size: 30, color: palette.pop },
      { angle: 270, dist: 210, size: 32, color: palette.secondary },
      { angle: 315, dist: 195, size: 26, color: palette.accent },
    ],
    [palette],
  );

  // 16 sparkles around the title for the pop phase
  const sparkles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const dist = 280 + Math.random() * 80;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 12 + Math.random() * 12,
          delay: Math.random() * 0.15,
          color: [palette.secondary, palette.pink, palette.accent, '#ffffff'][
            i % 4
          ],
        };
      }),
    [palette],
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none"
      style={{
        background:
          'linear-gradient(135deg, #1a0d2e 0%, #0a0510 50%, #160a26 100%)',
      }}
    >
      {/* Doodle pattern background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
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

      {/* Ambient halo */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity:
            phase === 'punch'
              ? 0.15
              : phase === 'splat'
                ? 0.55
                : phase === 'title'
                  ? 0.4
                  : phase === 'pop'
                    ? 0.6
                    : 0,
        }}
        transition={{ duration: 0.4 }}
        style={{
          background: `radial-gradient(ellipse at center, ${palette.primary}66 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/70 pointer-events-none" />

      {/* ============== PHASE 1 — PUNCH (small dot zooms in) ============== */}
      <AnimatePresence>
        {phase === 'punch' && (
          <motion.div
            key="punch-dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0.9], opacity: [0, 1, 1] }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 0.45,
              times: [0, 0.7, 1],
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="relative w-20 h-20 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.pop})`,
              border: '5px solid #0a0810',
              boxShadow: `0 6px 0 #0a0810, 0 0 40px ${palette.primary}cc`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ============== PHASE 2 — SPLAT (gradient blob + droplets) ============== */}
      <AnimatePresence>
        {phase === 'splat' && (
          <motion.div
            key="splat-blob"
            className="relative"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: [0, 1.6, 1.3], rotate: [0, 25, 30] }}
            exit={{ scale: 1.8, opacity: 0, rotate: 60 }}
            transition={{
              duration: 0.55,
              times: [0, 0.45, 1],
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {/* Big graffiti splash */}
            <svg
              viewBox="0 0 800 800"
              className="w-[640px] h-[640px] max-w-[80vw] max-h-[80vh]"
            >
              <path
                d="M400,80 Q480,40 560,120 Q680,80 720,200 Q800,280 700,360 Q780,440 660,520 Q720,640 560,640 Q480,720 400,680 Q320,720 240,640 Q80,640 140,520 Q20,440 100,360 Q0,280 80,200 Q120,80 240,120 Q320,40 400,80 Z"
                fill={palette.primary}
                stroke="#0a0810"
                strokeWidth="14"
                strokeLinejoin="round"
              />
              <circle cx="400" cy="400" r="160" fill={palette.secondary} stroke="#0a0810" strokeWidth="10" />
            </svg>

            {/* Droplets */}
            {droplets.map((d, i) => {
              const rad = (d.angle * Math.PI) / 180;
              const x = Math.cos(rad) * d.dist;
              const y = Math.sin(rad) * d.dist;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: d.size,
                    height: d.size,
                    background: d.color,
                    border: '4px solid #0a0810',
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: x - d.size / 2,
                    y: y - d.size / 2,
                    scale: [0, 1.3, 1],
                    opacity: [0, 1, 1],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.05 + i * 0.025,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== PHASE 3 & 4 — TITLE + SPARKLES ============== */}
      <AnimatePresence>
        {(phase === 'title' || phase === 'pop') && (
          <motion.div
            key="title-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-center"
          >
            {/* Sub-label */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: -2 }}
              transition={{
                duration: 0.4,
                delay: 0.15,
                type: 'spring',
                stiffness: 280,
                damping: 16,
              }}
              className="mb-3 px-4 py-1.5 rounded-2xl"
              style={{
                background: `linear-gradient(180deg, ${palette.secondary}, #d97706)`,
                border: '3px solid #0a0810',
                boxShadow: '0 4px 0 #0a0810',
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
            <div className="flex items-baseline gap-2 md:gap-3">
              {'MIMIC'.split('').map((char, i) => (
                <motion.span
                  key={`m-${i}`}
                  initial={{ y: -150, opacity: 0, rotate: -45, scale: 0.5 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: i % 2 === 0 ? -3 : 3,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.55,
                    delay: 0.2 + i * 0.06,
                    type: 'spring',
                    stiffness: 220,
                    damping: 12,
                  }}
                  className="text-7xl md:text-9xl font-black leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: palette.primary,
                    textShadow: `5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 3px 3px 0 #0a0810, 0 0 30px ${palette.primary}aa`,
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* MASTER */}
            <div className="flex items-baseline gap-2 md:gap-3 -mt-3 md:-mt-4">
              {'MASTER'.split('').map((char, i) => (
                <motion.span
                  key={`mr-${i}`}
                  initial={{ y: 150, opacity: 0, rotate: 45, scale: 0.5 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: i % 2 === 0 ? 3 : -3,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.55,
                    delay: 0.45 + i * 0.06,
                    type: 'spring',
                    stiffness: 220,
                    damping: 12,
                  }}
                  className="text-7xl md:text-9xl font-black leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: palette.secondary,
                    textShadow: `5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 3px 3px 0 #0a0810, 0 0 30px ${palette.secondary}aa`,
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Sparkles burst on phase 'pop' */}
            {phase === 'pop' &&
              sparkles.map((s, i) => (
                <motion.div
                  key={`sp-${i}`}
                  className="absolute"
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: s.x,
                    y: s.y,
                    scale: [0, 1.4, 1, 0],
                    opacity: [0, 1, 1, 0],
                    rotate: 180,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: s.delay,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  style={{
                    width: s.size,
                    height: s.size,
                    left: '50%',
                    top: '50%',
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-full h-full">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== PHASE 5 — FADE OUT ============== */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#0a0510]"
          />
        )}
      </AnimatePresence>

      {/* Skip button */}
      <motion.button
        type="button"
        onClick={onComplete}
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute bottom-6 right-6 px-3 py-2 rounded-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '2.5px solid #0a0810',
          boxShadow: '0 3px 0 #0a0810',
          color: 'white',
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

      <style>{`
        .bg-gradient-radial { background: radial-gradient(circle at center, var(--tw-gradient-stops)); }
      `}</style>
    </div>
  );
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
