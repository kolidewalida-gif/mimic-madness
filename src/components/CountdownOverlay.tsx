import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface CountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
  title?: string;
  /** Local epoch translated from the authoritative server playback anchor. */
  completeAt?: number;
}

const SHADOW = '3px 3px 0 var(--ink-line), -2px -2px 0 var(--ink-line), 2px -2px 0 var(--ink-line), -2px 2px 0 var(--ink-line)';
const FONT = "'Outfit', sans-serif";

const COLORS = ['#ef4444', '#f59e0b', '#34d399'];
const EMOJIS = ['3️⃣', '2️⃣', '1️⃣'];

export const CountdownOverlay = ({
  isActive,
  onComplete,
  duration = 3,
  title = 'La vidéo commence dans…',
  completeAt,
}: CountdownOverlayProps) => {
  const [count, setCount] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [tick, setTick] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      setStarted(false);
      return;
    }

    let completed = false;
    const deadline = completeAt ?? Date.now() + duration * 1000;
    setIsVisible(true);
    setStarted(true);

    const update = () => {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        if (completed) return;
        completed = true;
        playSoundEffect('start', 0.6);
        setIsVisible(false);
        onCompleteRef.current();
        return;
      }

      const nextCount = Math.max(1, Math.min(duration, Math.ceil(remainingMs / 1000)));
      setCount((previous) => {
        if (previous !== nextCount) {
          playSoundEffect('countdown', 0.5);
          setTick((value) => value + 1);
        }
        return nextCount;
      });
    };

    setCount(Math.max(1, Math.min(duration, Math.ceil((deadline - Date.now()) / 1000))));
    playSoundEffect('countdown', 0.5);
    setTick((value) => value + 1);
    update();
    const timer = setInterval(update, 100);
    return () => {
      completed = true;
      clearInterval(timer);
    };
  }, [completeAt, duration, isActive]);

  if (!isVisible) return null;

  const colorIdx = duration - count;
  const color = COLORS[Math.min(colorIdx, COLORS.length - 1)];
  const emoji = EMOJIS[Math.min(colorIdx, EMOJIS.length - 1)];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: 'rgba(10,5,16,0.92)', backdropFilter: 'blur(12px)' }}>

      {/* Animated background blobs */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)`, filter: 'blur(80px)' }} />
      </motion.div>

      {/* Graffiti corner marks */}
      {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 pointer-events-none`}
          style={{ borderTop: i < 2 ? `3px solid ${color}66` : 'none', borderBottom: i >= 2 ? `3px solid ${color}66` : 'none', borderLeft: i % 2 === 0 ? `3px solid ${color}66` : 'none', borderRight: i % 2 === 1 ? `3px solid ${color}66` : 'none' }} />
      ))}

      <div className="relative flex flex-col items-center gap-6">
        {/* Title */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-5 py-2 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
          <p className="text-lg font-black text-white/80 uppercase tracking-widest"
            style={{ fontFamily: FONT, textShadow: SHADOW }}>
            {title}
          </p>
        </motion.div>

        {/* Big number */}
        <AnimatePresence mode="wait">
          {started && (
            <motion.div key={`${tick}-${count}`}
              initial={{ scale: 2, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="relative flex items-center justify-center"
              style={{ width: 200, height: 200 }}>

              {/* Outer ring */}
              <motion.div className="absolute inset-0 rounded-full"
                style={{ border: `6px solid ${color}`, boxShadow: `0 0 30px ${color}66, inset 0 0 30px ${color}22` }}
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />

              {/* Inner circle */}
              <div className="absolute inset-4 rounded-full"
                style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `4px solid var(--ink-line)` }} />

              {/* Number */}
              <span className="relative text-[120px] font-black leading-none"
                style={{ fontFamily: FONT, color, textShadow: `${SHADOW}, 0 0 40px ${color}` }}>
                {count}
              </span>

              {/* Emoji badge */}
              <motion.div className="absolute -top-3 -right-3 text-4xl"
                animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.6, repeat: Infinity }}>
                {emoji}
              </motion.div>

              {/* Burst particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div key={`${tick}-p-${i}`}
                  className="absolute w-3 h-3 rounded-full"
                  style={{ background: color, top: '50%', left: '50%' }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 120, y: Math.sin((i / 8) * Math.PI * 2) * 120, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tick dots */}
        <div className="flex items-center gap-3">
          {[...Array(duration)].map((_, i) => {
            const active = started && i < duration - count + 1;
            return (
              <motion.div key={i}
                animate={active ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="rounded-full"
                style={{ width: active ? 16 : 10, height: active ? 16 : 10, background: active ? color : 'rgba(255,255,255,0.2)', boxShadow: active ? `0 0 10px ${color}` : 'none', transition: 'all 0.3s' }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};
