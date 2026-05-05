import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ShimmerEffectProps {
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'accent' | 'white';
  speed?: 'slow' | 'medium' | 'fast';
  intensity?: 'low' | 'medium' | 'high';
}

export const ShimmerEffect = ({
  children,
  className = '',
  color = 'white',
  speed = 'medium',
  intensity = 'medium'
}: ShimmerEffectProps) => {
  const colorMap = {
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    white: 'rgba(255, 255, 255, 1)'
  };

  const speedMap = {
    slow: '3s',
    medium: '2s',
    fast: '1s'
  };

  const intensityMap = {
    low: 0.1,
    medium: 0.3,
    high: 0.5
  };

  const shimmerColor = colorMap[color];
  const opacity = intensityMap[intensity];

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            ${shimmerColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 50%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          animation: `shimmer ${speedMap[speed]} linear infinite`
        }}
      />
    </div>
  );
};
