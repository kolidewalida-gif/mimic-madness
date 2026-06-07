import { memo } from 'react';
import { motion } from 'framer-motion';

interface InkAnimatedBackgroundProps {
  accent?: string;
}

/**
 * Animated ambient layer for the Ink home menu background.
 * - Drifting colored ink blobs (parallax-like motion)
 * - Slowly rotating conic sheen
 * - Floating ink droplets
 * Pure CSS / Framer Motion, GPU-friendly, pointer-events: none.
 */
const InkAnimatedBackgroundComponent = ({
  accent = '#a855f7',
}: InkAnimatedBackgroundProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Slowly rotating conic sheen */}
      <motion.div
        className="absolute -inset-[20%]"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${accent}11 60deg, transparent 120deg, ${accent}0a 200deg, transparent 280deg, ${accent}11 340deg, transparent 360deg)`,
          filter: 'blur(40px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      {/* Drifting ink blobs */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 720,
          height: 720,
          left: '-10%',
          top: '-15%',
          background: `radial-gradient(circle, ${accent}55 0%, transparent 65%)`,
          filter: 'blur(90px)',
        }}
        animate={{
          x: [0, 120, -40, 0],
          y: [0, 80, 160, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 640,
          height: 640,
          right: '-12%',
          bottom: '-18%',
          background: `radial-gradient(circle, #ec489955 0%, transparent 65%)`,
          filter: 'blur(100px)',
        }}
        animate={{
          x: [0, -140, 60, 0],
          y: [0, -90, -40, 0],
          scale: [1, 1.1, 1.2, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          left: '40%',
          top: '55%',
          background: `radial-gradient(circle, #3b82f644 0%, transparent 65%)`,
          filter: 'blur(110px)',
        }}
        animate={{
          x: [0, -80, 100, 0],
          y: [0, 40, -60, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating ink droplets */}
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 4 + ((i * 7) % 9);
        const left = (i * 53) % 100;
        const top = (i * 31) % 100;
        const dur = 8 + (i % 6) * 1.7;
        const delay = (i % 5) * 0.6;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              background: i % 2 === 0 ? accent : '#ffffff',
              opacity: 0.22,
              filter: 'blur(1px)',
              boxShadow: `0 0 10px ${accent}99`,
            }}
            animate={{
              y: [0, -30, 0, 25, 0],
              x: [0, 12, -8, 6, 0],
              opacity: [0.1, 0.35, 0.1, 0.3, 0.1],
            }}
            transition={{
              duration: dur,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Subtle grain via SVG noise */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />
    </div>
  );
};

export const InkAnimatedBackground = memo(InkAnimatedBackgroundComponent);