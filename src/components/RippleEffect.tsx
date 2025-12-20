import { useState, useCallback, ReactNode, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleEffectProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  className?: string;
  disabled?: boolean;
}

export const RippleEffect = ({
  children,
  color = 'hsl(var(--primary) / 0.3)',
  duration = 600,
  className = '',
  disabled = false
}: RippleEffectProps) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: Ripple = { id: Date.now(), x, y, size };
    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, duration);
  }, [disabled, duration]);

  return (
    <div className={cn('relative overflow-hidden', className)} onClick={handleClick}>
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none animate-hoverRipple"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            background: color,
            animationDuration: `${duration}ms`
          }}
        />
      ))}
    </div>
  );
};
