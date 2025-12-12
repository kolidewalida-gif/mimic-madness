import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  isVisible: boolean;
  className?: string;
}

export const PageTransition = ({ children, isVisible, className }: PageTransitionProps) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay before animation starts
      requestAnimationFrame(() => {
        setAnimationState('entering');
        setTimeout(() => setAnimationState('entered'), 500);
      });
    } else {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setAnimationState('exited');
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        animationState === 'entering' && 'opacity-0 scale-95 translate-y-4',
        animationState === 'entered' && 'opacity-100 scale-100 translate-y-0',
        animationState === 'exiting' && 'opacity-0 scale-95 -translate-y-4',
        animationState === 'exited' && 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
};
