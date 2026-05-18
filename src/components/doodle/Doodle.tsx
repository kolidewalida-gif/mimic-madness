import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Shared cartoon "doodle" UI primitives used across Ink-mode game screens.
 * Hand-drawn wobbly SVG borders, ovals, arrows, stamps and buttons.
 */

interface DoodleBorderProps {
  color: string;
  className?: string;
  filled?: boolean;
  rotation?: number;
  /** When true, uses a thicker stroke for emphasis */
  thick?: boolean;
}

export const DoodleBorder = ({
  color,
  className,
  filled = false,
  rotation = 0,
  thick = false,
}: DoodleBorderProps) => (
  <svg
    className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <path
      d="M5,12
         Q3,8 7,5
         Q15,3 25,4
         Q40,2 55,5
         Q70,3 85,5
         Q95,4 96,12
         Q98,30 96,50
         Q98,70 95,88
         Q96,95 88,96
         Q70,98 50,96
         Q30,98 12,96
         Q4,97 4,90
         Q3,70 5,50
         Q3,30 5,12 Z"
      fill={filled ? color : 'none'}
      fillOpacity={filled ? 0.08 : 0}
      stroke={color}
      strokeWidth={thick ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export const DoodleOval = ({
  color,
  className,
  filled = false,
}: {
  color: string;
  className?: string;
  filled?: boolean;
}) => (
  <svg
    className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <path
      d="M50,8
         Q70,7 82,18
         Q94,32 92,52
         Q90,72 76,86
         Q60,96 42,92
         Q24,90 12,76
         Q4,60 8,40
         Q14,20 30,12
         Q40,8 50,8 Z"
      fill={filled ? color : 'none'}
      fillOpacity={filled ? 0.12 : 0}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export const DoodleArrow = ({
  color,
  className,
}: {
  color: string;
  className?: string;
}) => (
  <svg
    className={cn('w-10 h-10 flex-shrink-0', className)}
    viewBox="0 0 40 40"
    fill="none"
  >
    <path
      d="M4,20 Q12,18 24,20 Q30,21 33,20"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28,14 L34,20 L28,26"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StampBadge = ({
  color,
  children,
  rotate = -8,
}: {
  color: string;
  children: ReactNode;
  rotate?: number;
}) => (
  <div
    className="relative px-3 py-1 inline-flex items-center justify-center"
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <DoodleBorder color={color} filled rotation={2} />
    <span
      className="relative text-[10px] font-black uppercase tracking-[0.15em]"
      style={{ color, fontFamily: "'Caveat', cursive" }}
    >
      {children}
    </span>
  </div>
);

export const DoodleButton = ({
  children,
  onClick,
  color,
  disabled = false,
  variant = 'filled',
  className = '',
  compact = false,
  size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  color: string;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: compact ? 'px-3 py-2 text-base' : 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 transition-opacity',
        sizes[size],
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <DoodleBorder color={color} filled={variant === 'filled'} rotation={-1} />
      <span
        className="relative font-black flex items-center gap-2"
        style={{
          fontFamily: "'Caveat', cursive",
          color,
        }}
      >
        {children}
      </span>
    </motion.button>
  );
};

/**
 * Cartoon container with phase-tinted halos, scribble pattern, and gradient background.
 * Use as a top-level wrapper for Ink-themed game screens.
 */
export const DoodleStage = ({
  accent,
  children,
  className,
}: {
  accent: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('min-h-screen bg-[#0a0810] text-white relative overflow-x-hidden', className)}>
    {/* Phase-tinted background — subtle, single soft halo */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c0813] via-[#0a0810] to-[#0c0814]" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0"
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
          style={{
            background: `radial-gradient(ellipse, ${accent}33 0%, transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
      </motion.div>
      <svg className="absolute inset-0 w-full h-full opacity-[0.02]">
        <defs>
          <pattern id="scribble" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M10,30 Q30,10 50,30 T90,30 M20,80 Q40,60 60,80 T100,80"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scribble)" />
      </svg>
    </div>
    {children}
  </div>
);


/* ============================================================
   Cartoon VFX & UI primitives — modals, confetti, splash
============================================================ */

import { AnimatePresence } from 'framer-motion';

/**
 * Cartoon modal wrapper — backdrop + doodle-bordered card with rotation entry.
 */
export const DoodleModal = ({
  open,
  onClose,
  accent = '#f87171',
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose?: () => void;
  accent?: string;
  children: ReactNode;
  maxWidth?: string;
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: -1 }}
          exit={{ opacity: 0, scale: 0.7, rotate: 6 }}
          transition={{ type: 'spring', damping: 16, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className={cn('relative w-full', maxWidth)}
        >
          <div className="relative px-6 py-6">
            <DoodleBorder color={accent} filled rotation={-1} thick />
            <div className="relative">{children}</div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Cartoon confetti — bursts of colorful doodle particles.
 * Use after victories, big actions, transitions.
 */
export const DoodleConfetti = ({
  show,
  count = 28,
  colors = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#c084fc', '#f472b6'],
}: {
  show: boolean;
  count?: number;
  colors?: string[];
}) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {Array.from({ length: count }).map((_, i) => {
          const color = colors[i % colors.length];
          const startX = 50 + (Math.random() - 0.5) * 20;
          const endX = startX + (Math.random() - 0.5) * 80;
          const endY = 110 + Math.random() * 30;
          const duration = 1.2 + Math.random() * 1.2;
          const delay = Math.random() * 0.4;
          const size = 8 + Math.random() * 14;
          const rotation = Math.random() * 720 - 360;
          const shape = i % 4;

          return (
            <motion.div
              key={i}
              initial={{
                left: `${startX}%`,
                top: '40%',
                opacity: 0,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                left: `${endX}%`,
                top: `${endY}%`,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5],
                rotate: rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration,
                delay,
                ease: 'easeOut',
                times: [0, 0.1, 0.7, 1],
              }}
              className="absolute"
              style={{ width: size, height: size }}
            >
              {shape === 0 && (
                <div
                  className="w-full h-full rounded-sm"
                  style={{ background: color }}
                />
              )}
              {shape === 1 && (
                <div
                  className="w-full h-full rounded-full"
                  style={{ background: color }}
                />
              )}
              {shape === 2 && (
                <svg viewBox="0 0 20 20" className="w-full h-full">
                  <path
                    d="M10,2 L13,9 L20,10 L13,11 L10,18 L7,11 L0,10 L7,9 Z"
                    fill={color}
                  />
                </svg>
              )}
              {shape === 3 && (
                <svg viewBox="0 0 20 20" className="w-full h-full">
                  <path
                    d="M2,10 Q6,2 10,10 Q14,18 18,10"
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </motion.div>
          );
        })}
      </div>
    )}
  </AnimatePresence>
);

/**
 * Cartoon ink splash — blooms outward from a point, used for big reveals.
 */
export const DoodleSplash = ({
  show,
  color = '#f87171',
  origin = { x: 50, y: 50 },
}: {
  show: boolean;
  color?: string;
  origin?: { x: number; y: number };
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-[90]"
        style={{ left: 0, top: 0 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: [0, 1.5, 1], rotate: 30 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute"
          style={{
            left: `${origin.x}%`,
            top: `${origin.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <svg viewBox="0 0 200 200" className="w-[400px] h-[400px]">
            <path
              d="M100,20
                 Q140,10 160,40
                 Q190,50 180,90
                 Q200,120 170,140
                 Q170,180 130,180
                 Q110,200 90,180
                 Q60,200 40,170
                 Q10,160 20,120
                 Q0,90 30,70
                 Q30,30 70,30
                 Q90,10 100,20 Z"
              fill={color}
              fillOpacity="0.18"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Big rotating cartoon emoji or icon — perfect for celebration screens.
 */
export const DoodleSpotlight = ({
  children,
  color = '#fbbf24',
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) => (
  <div className={cn('relative inline-flex items-center justify-center', className)}>
    {/* Rotating sun rays */}
    <motion.svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 200 200"
      animate={{ rotate: 360 }}
      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '160%', height: '160%' }}
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 360) / 12;
        return (
          <line
            key={i}
            x1="100"
            y1="100"
            x2="100"
            y2="20"
            stroke={color}
            strokeWidth="3"
            strokeOpacity="0.25"
            strokeLinecap="round"
            transform={`rotate(${angle} 100 100)`}
          />
        );
      })}
    </motion.svg>
    <div className="relative">{children}</div>
  </div>
);

/**
 * Wobble animation — pumping bounce loop, for icons and emoji.
 */
export const DoodleWobble = ({
  children,
  intensity = 1,
}: {
  children: ReactNode;
  intensity?: number;
}) => (
  <motion.div
    animate={{
      rotate: [-3 * intensity, 3 * intensity, -3 * intensity],
      scale: [1, 1.05, 1],
    }}
    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);
