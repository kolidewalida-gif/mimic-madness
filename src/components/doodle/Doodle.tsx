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
