import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlowingOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'accent' | 'success' | 'rainbow';
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const GlowingOrb = ({
  size = 'md',
  color = 'primary',
  intensity = 'medium',
  animated = true,
  className = '',
  style = {}
}: GlowingOrbProps) => {
  const sizeMap = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
    xl: 'w-[32rem] h-[32rem]'
  };

  const intensityMap = {
    low: { blur: 60, opacity: 0.2 },
    medium: { blur: 100, opacity: 0.35 },
    high: { blur: 150, opacity: 0.5 }
  };

  const colorMap = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-success',
    rainbow: ''
  };

  const { blur, opacity } = intensityMap[intensity];

  return (
    <motion.div
      className={cn(
        'absolute rounded-full pointer-events-none',
        sizeMap[size],
        color !== 'rainbow' && colorMap[color],
        className
      )}
      style={{
        filter: `blur(${blur}px)`,
        opacity,
        background: color === 'rainbow'
          ? 'conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--success)), hsl(var(--warning)), hsl(var(--primary)))'
          : undefined,
        ...style
      }}
      animate={animated ? {
        scale: [1, 1.2, 1],
        x: [0, 30, -20, 0],
        y: [0, -20, 30, 0],
        rotate: color === 'rainbow' ? [0, 360] : 0
      } : undefined}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'easeInOut',
        rotate: { duration: 20, repeat: Infinity, ease: 'linear' }
      }}
    />
  );
};
