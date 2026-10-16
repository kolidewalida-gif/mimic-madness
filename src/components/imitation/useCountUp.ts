import { useEffect, useRef, useState } from 'react';
import { prefersCalmMotion } from './BubbleGame';

/* jsdom et certains navigateurs embarqués n'ont pas requestAnimationFrame. */
const nextFrame = (callback: (now: number) => void): number =>
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(() => callback(performance.now()), 16);
const cancelFrame = (handle: number) => {
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(handle);
  else window.clearTimeout(handle);
};

/**
 * Un score qui monte jusqu'à sa valeur, comme un compteur de borne d'arcade.
 * Sans mouvement (préférence du joueur, appareil économe), la valeur est
 * affichée directement.
 */
export const useCountUp = (
  target: number,
  { duration = 1100, delay = 0, enabled = true, onTick }: { duration?: number; delay?: number; enabled?: boolean; onTick?: () => void } = {},
): number => {
  const animate = enabled && Number.isFinite(target) && !prefersCalmMotion();
  const [value, setValue] = useState(() => (animate ? 0 : target));
  const tickRef = useRef(onTick);
  useEffect(() => { tickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    if (!animate) {
      setValue(target);
      return undefined;
    }
    let frame = 0;
    let start = 0;
    let lastTick = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1 && now - lastTick > 75) {
        lastTick = now;
        tickRef.current?.();
      }
      if (progress < 1) frame = nextFrame(step);
    };
    const timer = window.setTimeout(() => { frame = nextFrame(step); }, delay);
    return () => {
      window.clearTimeout(timer);
      if (frame) cancelFrame(frame);
    };
  }, [animate, delay, duration, target]);

  return value;
};
