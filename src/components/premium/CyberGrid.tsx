import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CyberGridProps {
  color?: 'primary' | 'accent' | 'white';
  opacity?: number;
  animated?: boolean;
  perspective?: boolean;
  className?: string;
}

export const CyberGrid = ({
  color = 'primary',
  opacity = 0.1,
  animated = true,
  perspective = true,
  className = ''
}: CyberGridProps) => {
  const colorMap = {
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    white: 'rgba(255, 255, 255, 1)'
  };

  const gridColor = colorMap[color];

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Main grid */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${gridColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: perspective ? 'perspective(500px) rotateX(60deg)' : undefined,
          transformOrigin: 'center top',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 80%)'
        }}
        animate={animated ? {
          backgroundPosition: ['0px 0px', '0px 50px']
        } : undefined}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Horizon glow line */}
      {perspective && (
        <div
          className="absolute top-1/3 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${gridColor}, transparent)`,
            boxShadow: `0 0 20px ${gridColor}, 0 0 40px ${gridColor}`,
            opacity: opacity * 3
          }}
        />
      )}

      {/* Scan line effect */}
      {animated && (
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${gridColor} 50%, transparent 100%)`,
            boxShadow: `0 0 10px ${gridColor}`
          }}
          animate={{
            top: ['-10%', '110%']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </div>
  );
};
