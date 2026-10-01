import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import styles from './imitation/BubbleCountdown.module.css';

interface CountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
  title?: string;
  /** Local epoch translated from the authoritative server playback anchor. */
  completeAt?: number;
}

export const CountdownOverlay = ({
  isActive,
  onComplete,
  duration = 3,
  title = 'La vidéo commence dans…',
  completeAt,
}: CountdownOverlayProps) => {
  const [count, setCount] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // The animation never controls playback: all clients follow the server deadline.
    const deadline = completeAt ?? Date.now() + duration * 1000;
    let completed = false;
    let announced: number | null = null;
    const update = () => {
      if (completed) return;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        completed = true;
        setIsVisible(false);
        playSoundEffect('start', 0.6);
        onCompleteRef.current();
        return;
      }
      const next = Math.min(duration, Math.ceil(remaining / 1000));
      if (next === announced) return;
      announced = next;
      setCount(next);
      setIsVisible(true);
      playSoundEffect('countdown', 0.5);
    };

    update();
    const timer = setInterval(update, 50);
    return () => { completed = true; clearInterval(timer); };
  }, [completeAt, duration, isActive]);

  const tone = count === 1 ? 'mint' : count === 2 ? 'peach' : 'lavender';
  return (
    <AnimatePresence>
      {isVisible && <motion.div
        className={styles.overlay}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}
      >
        <div className={styles.scene} data-tone={tone}>
          <div className={styles.heading}>
            <span className={styles.tag}><Play aria-hidden="true" /> Tout le monde ensemble</span>
            <h2>{title}</h2>
          </div>
          <div className={styles.stage} aria-hidden="true">
            <i className={styles.bubbleOne} /><i className={styles.bubbleTwo} /><i className={styles.bubbleThree} />
            <span className={styles.sparkOne}>✦</span><span className={styles.sparkTwo}>✦</span>
            <div className={styles.shadow} />
            <AnimatePresence initial={false}>
              <motion.div key={count} className={styles.orb}
                initial={reducedMotion ? false : { y: 35, scale: 0.78, opacity: 0, rotate: -7 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { y: -22, scale: 1.08, opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 20, opacity: { duration: 0.14 } }}
              ><span className={styles.number}>{count}</span></motion.div>
            </AnimatePresence>
          </div>
          <div className={styles.steps} aria-hidden="true">
            {Array.from({ length: duration }, (_, i) => duration - i).map(value =>
              <span key={value} className={value === count ? styles.current : value > count ? styles.done : undefined}>{value}</span>,
            )}
          </div>
          <p className={styles.note}>Ouvre grand les oreilles. Le jury, c’est vous !</p>
          <span className={styles.announcement} role="status" aria-live="assertive" aria-atomic="true">{title} {count}</span>
        </div>
      </motion.div>}
    </AnimatePresence>
  );
};
