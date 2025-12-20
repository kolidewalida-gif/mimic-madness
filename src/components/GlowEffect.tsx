import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlowEffectProps {
  children: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'purple' | 'blue';
  intensity?: 'low' | 'medium' | 'high';
  animate?: boolean;
  className?: string;
}

export const GlowEffect = ({
  children,
  color = 'primary',
  intensity = 'medium',
  animate = true,
  className = ''
}: GlowEffectProps) => {
  const colorMap = {
    primary: 'rgba(229, 9, 20, VAR)',
    success: 'rgba(34, 197, 94, VAR)',
    warning: 'rgba(234, 179, 8, VAR)',
    purple: 'rgba(168, 85, 247, VAR)',
    blue: 'rgba(59, 130, 246, VAR)'
  };

  const intensityMap = {
    low: { opacity: 0.2, blur: 15, spread: 5 },
    medium: { opacity: 0.35, blur: 25, spread: 10 },
    high: { opacity: 0.5, blur: 40, spread: 15 }
  };

  const { opacity, blur, spread } = intensityMap[intensity];
  const glowColor = colorMap[color].replace('VAR', opacity.toString());

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn('absolute inset-0 rounded-inherit -z-10', animate && 'animate-glow-pulse')}
        style={{
          boxShadow: `0 0 ${blur}px ${spread}px ${glowColor}`,
          filter: `blur(${blur / 3}px)`
        }}
      />
      {children}
    </div>
  );
};
