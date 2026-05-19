import { memo, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInkMode } from '@/hooks/useInkMode';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

interface InkCartoonTransitionProps {
  children: ReactNode;
  /** Unique key for the current screen — change to trigger transition */
  screenKey: string;
  className?: string;
}

type CartoonStyle =
  | 'splash'       // central ink splash that grows + shrinks
  | 'paint-roll'   // horizontal paint roller wipe
  | 'comic-burst'  // pow! comic-style starburst
  | 'fold'         // 3D paper-fold effect
  | 'swoosh';      // diagonal stripe swoosh

const STYLES: CartoonStyle[] = ['splash', 'paint-roll', 'comic-burst', 'fold', 'swoosh'];

const PALETTE = ['#a855f7', '#06b6d4', '#fbbf24', '#ef4444', '#34d399', '#ec4899'];

/**
 * Cartoon graffiti transition — a big, punchy overlay animation that
 * masks the screen swap with bouncy SVG/CSS shapes (no canvas ray-cast).
 *
 * Each transition picks a random style + accent color, plays a layered
 * SFX combo (swoosh + boing or pop + fanfare), and animates with
 * Framer Motion springs for a juicy cartoon feel.
 */
const InkCartoonTransitionComponent = ({
  children,
  screenKey,
  className,
}: InkCartoonTransitionProps) => {
  const { isInkMode } = useInkMode();
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [overlay, setOverlay] = useState<{
    style: CartoonStyle;
    color: string;
    secondary: string;
    id: number;
  } | null>(null);
  const isFirstRender = useRef(true);
  const overlayCounter = useRef(0);
  const transitionIndex = useRef(Math.floor(Math.random() * STYLES.length));

  const triggerTransition = useCallback(
    (newKey: string, newChildren: ReactNode) => {
      // Pick style + color
      const style = STYLES[transitionIndex.current % STYLES.length];
      transitionIndex.current++;
      const colorIndex = Math.floor(Math.random() * PALETTE.length);
      const color = PALETTE[colorIndex];
      const secondary = PALETTE[(colorIndex + 2) % PALETTE.length];

      overlayCounter.current++;
      setOverlay({
        style,
        color,
        secondary,
        id: overlayCounter.current,
      });

      // Layered cartoon SFX combo
      try {
        switch (style) {
          case 'splash':
            playInkSound('inkSplash', 0.45);
            playInkSound('cartoonPop', 0.3);
            break;
          case 'paint-roll':
            playInkSound('cartoonSwoosh', 0.45);
            playInkSound('brushStroke', 0.3);
            break;
          case 'comic-burst':
            playInkSound('cartoonZap', 0.45);
            playInkSound('cartoonPop', 0.3);
            break;
          case 'fold':
            playInkSound('paperFold', 0.4);
            playInkSound('cartoonWobble', 0.25);
            break;
          case 'swoosh':
            playInkSound('cartoonSwoosh', 0.5);
            playInkSound('cartoonBoing', 0.25);
            break;
        }
      } catch {
        /* noop: audio context not ready */
      }

      // Swap content mid-transition (around the peak of the overlay)
      window.setTimeout(() => {
        setDisplayedKey(newKey);
        setDisplayedChildren(newChildren);
      }, 320);

      // Clear overlay
      window.setTimeout(() => {
        setOverlay(null);
      }, 700);
    },
    [],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedKey(screenKey);
      setDisplayedChildren(children);
      return;
    }
    if (screenKey === displayedKey) {
      // Same key, just update children silently
      setDisplayedChildren(children);
      return;
    }
    if (!isInkMode) {
      // No transition outside ink mode
      setDisplayedKey(screenKey);
      setDisplayedChildren(children);
      return;
    }
    triggerTransition(screenKey, children);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey, children, isInkMode]);

  return (
    <div className={cn('relative', className)}>
      <div key={displayedKey} className="w-full h-full">
        {displayedChildren}
      </div>

      {/* Cartoon overlay layer */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            key={overlay.id}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
          >
            {overlay.style === 'splash' && (
              <SplashOverlay color={overlay.color} secondary={overlay.secondary} />
            )}
            {overlay.style === 'paint-roll' && (
              <PaintRollOverlay color={overlay.color} secondary={overlay.secondary} />
            )}
            {overlay.style === 'comic-burst' && (
              <ComicBurstOverlay color={overlay.color} secondary={overlay.secondary} />
            )}
            {overlay.style === 'fold' && (
              <FoldOverlay color={overlay.color} secondary={overlay.secondary} />
            )}
            {overlay.style === 'swoosh' && (
              <SwooshOverlay color={overlay.color} secondary={overlay.secondary} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InkCartoonTransition = memo(InkCartoonTransitionComponent);

/* ============================================================
   Overlay variants
============================================================ */

/** Splash — central ink splash that bounces in then out. */
const SplashOverlay = ({
  color,
  secondary,
}: {
  color: string;
  secondary: string;
}) => (
  <motion.div className="absolute inset-0 flex items-center justify-center">
    <motion.svg
      viewBox="0 0 800 800"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: [0, 1.4, 1.2], rotate: [0, 25, 30] }}
      exit={{ scale: 0, rotate: 60, opacity: 0 }}
      transition={{
        duration: 0.7,
        times: [0, 0.45, 1],
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      <path
        d="M400,80 Q480,40 560,120 Q680,80 720,200 Q800,280 700,360 Q780,440 660,520 Q720,640 560,640 Q480,720 400,680 Q320,720 240,640 Q80,640 140,520 Q20,440 100,360 Q0,280 80,200 Q120,80 240,120 Q320,40 400,80 Z"
        fill={color}
        stroke="#0a0810"
        strokeWidth="14"
        strokeLinejoin="round"
      />
    </motion.svg>
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: [0, 1.4, 1.2, 1], rotate: [-10, 5, -3, 0] }}
      exit={{ scale: 0 }}
      transition={{
        duration: 0.6,
        times: [0, 0.3, 0.6, 1],
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="relative font-black text-7xl md:text-9xl text-white"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow:
          '4px 4px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 3px 3px 0 #0a0810',
      }}
    >
      SPLAT!
    </motion.div>
    {/* Decorative droplets */}
    {[
      { x: '20%', y: '25%', size: 30, delay: 0.05 },
      { x: '78%', y: '22%', size: 24, delay: 0.1 },
      { x: '15%', y: '75%', size: 32, delay: 0.08 },
      { x: '82%', y: '78%', size: 26, delay: 0.12 },
    ].map((d, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          left: d.x,
          top: d.y,
          width: d.size,
          height: d.size,
          background: secondary,
          border: '3px solid #0a0810',
        }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        exit={{ scale: 0 }}
        transition={{
          duration: 0.45,
          delay: d.delay,
          ease: [0.34, 1.56, 0.64, 1],
        }}
      />
    ))}
  </motion.div>
);

/** Paint roll — horizontal stripe wipe with paint splatter. */
const PaintRollOverlay = ({
  color,
  secondary,
}: {
  color: string;
  secondary: string;
}) => (
  <>
    <motion.div
      className="absolute top-0 bottom-0 left-0"
      initial={{ width: 0 }}
      animate={{ width: '100%' }}
      exit={{ width: 0, x: '100%' }}
      transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        borderRight: '6px solid #0a0810',
        boxShadow: '8px 0 0 #0a0810',
      }}
    />
    {/* Splatter dots on the leading edge */}
    {[20, 35, 55, 70, 85].map((y, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          top: `${y}%`,
          width: 28 + (i % 2) * 14,
          height: 28 + (i % 2) * 14,
          background: i % 2 === 0 ? secondary : '#fbbf24',
          border: '3px solid #0a0810',
        }}
        initial={{ left: '-5%', scale: 0 }}
        animate={{ left: ['-5%', '105%'], scale: [0, 1.2, 1, 0] }}
        transition={{
          duration: 0.6,
          delay: 0.05 + (i % 3) * 0.04,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
    ))}
  </>
);

/** Comic burst — POW! starburst that scales up. */
const ComicBurstOverlay = ({
  color,
  secondary,
}: {
  color: string;
  secondary: string;
}) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    initial={{ background: 'rgba(0,0,0,0)' }}
    animate={{ background: 'rgba(10,8,16,0.9)' }}
    exit={{ background: 'rgba(0,0,0,0)' }}
    transition={{ duration: 0.3 }}
  >
    <motion.svg
      viewBox="0 0 600 600"
      width="80%"
      height="80%"
      className="max-w-2xl max-h-2xl"
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: [0, 1.3, 1.1], rotate: [-45, 12, 8] }}
      exit={{ scale: 0, rotate: 60 }}
      transition={{
        duration: 0.55,
        times: [0, 0.4, 1],
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {/* Outer star */}
      <path
        d="M300,30 L350,140 L460,90 L420,200 L530,200 L450,290 L560,330 L450,360 L530,450 L420,440 L460,560 L350,500 L300,580 L250,500 L140,560 L180,440 L70,450 L150,360 L40,330 L150,290 L70,200 L180,200 L140,90 L250,140 Z"
        fill={color}
        stroke="#0a0810"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      {/* Inner star */}
      <path
        d="M300,120 L325,180 L390,160 L360,225 L420,240 L370,290 L420,335 L355,330 L385,395 L320,365 L300,430 L280,365 L215,395 L245,330 L180,335 L230,290 L180,240 L240,225 L210,160 L275,180 Z"
        fill={secondary}
        stroke="#0a0810"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </motion.svg>
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: [0, 1.4, 1.1], rotate: [-10, 8, 4] }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        duration: 0.55,
        times: [0, 0.45, 1],
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="absolute font-black text-7xl md:text-9xl text-white"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow:
          '5px 5px 0 #0a0810, -3px -3px 0 #0a0810, 3px -3px 0 #0a0810, -3px 3px 0 #0a0810, 3px 3px 0 #0a0810',
      }}
    >
      POW!
    </motion.div>
  </motion.div>
);

/** Fold — 3D paper fold effect using two halves. */
const FoldOverlay = ({
  color,
  secondary,
}: {
  color: string;
  secondary: string;
}) => (
  <>
    {/* Top half slides up */}
    <motion.div
      className="absolute top-0 left-0 right-0 h-1/2"
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        borderBottom: '6px solid #0a0810',
        boxShadow: '0 8px 0 #0a0810',
      }}
      initial={{ y: '-100%' }}
      animate={{ y: ['100%', '0%', '0%', '-100%'] }}
      transition={{
        duration: 0.7,
        times: [0, 0.35, 0.6, 1],
        ease: [0.65, 0, 0.35, 1],
      }}
    />
    {/* Bottom half slides down */}
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1/2"
      style={{
        background: `linear-gradient(0deg, ${secondary}, ${secondary}cc)`,
        borderTop: '6px solid #0a0810',
        boxShadow: '0 -8px 0 #0a0810',
      }}
      initial={{ y: '100%' }}
      animate={{ y: ['-100%', '0%', '0%', '100%'] }}
      transition={{
        duration: 0.7,
        times: [0, 0.35, 0.6, 1],
        ease: [0.65, 0, 0.35, 1],
      }}
    />
  </>
);

/** Swoosh — diagonal stripe sweep with second stripe behind. */
const SwooshOverlay = ({
  color,
  secondary,
}: {
  color: string;
  secondary: string;
}) => (
  <>
    {/* Background stripe */}
    <motion.div
      className="absolute top-0 bottom-0"
      style={{
        background: `linear-gradient(180deg, ${secondary}, ${secondary}cc)`,
        width: '160%',
        height: '100%',
        transform: 'skewX(-20deg)',
        borderLeft: '6px solid #0a0810',
        borderRight: '6px solid #0a0810',
      }}
      initial={{ left: '-180%' }}
      animate={{ left: ['-180%', '0%', '120%'] }}
      transition={{
        duration: 0.65,
        times: [0, 0.45, 1],
        ease: [0.65, 0, 0.35, 1],
      }}
    />
    {/* Foreground stripe — slightly delayed for depth */}
    <motion.div
      className="absolute top-0 bottom-0"
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        width: '120%',
        height: '100%',
        transform: 'skewX(-20deg)',
        borderLeft: '8px solid #0a0810',
        borderRight: '8px solid #0a0810',
        boxShadow: '0 0 30px rgba(0,0,0,0.5)',
      }}
      initial={{ left: '-150%' }}
      animate={{ left: ['-150%', '0%', '120%'] }}
      transition={{
        duration: 0.65,
        delay: 0.08,
        times: [0, 0.45, 1],
        ease: [0.65, 0, 0.35, 1],
      }}
    />
  </>
);
