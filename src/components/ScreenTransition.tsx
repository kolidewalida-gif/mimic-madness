import { ReactNode, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ScreenTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

export const ScreenTransition = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedKey(screenKey);
      setDisplayedChildren(children);
      return;
    }

    if (screenKey !== displayedKey) {
      // Play transition sound
      playSoundEffect('whoosh', 0.3);
      
      // Start exit animation
      setPhase('exit');
      
      const exitTimer = setTimeout(() => {
        // Update to new content
        setDisplayedKey(screenKey);
        setDisplayedChildren(children);
        setPhase('enter');
        
        const enterTimer = setTimeout(() => {
          setPhase('idle');
        }, 500);
        
        return () => clearTimeout(enterTimer);
      }, 400);

      return () => clearTimeout(exitTimer);
    } else {
      // Same key, just update children
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Transition overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-background z-[60] pointer-events-none transition-transform duration-500 ease-in-out",
          phase === 'exit' && "translate-y-0",
          phase === 'enter' && "-translate-y-full",
          phase === 'idle' && "-translate-y-full"
        )}
      >
        {/* Decorative elements during transition */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 border-4 border-primary rounded-full animate-spin" />
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "transition-all duration-500 ease-out",
          phase === 'exit' && "opacity-0 scale-95 blur-sm",
          phase === 'enter' && "opacity-100 scale-100 blur-0",
          phase === 'idle' && "opacity-100 scale-100",
          className
        )}
      >
        {displayedChildren}
      </div>

      {/* Particle effects during transition */}
      {(phase === 'exit' || phase === 'enter') && (
        <div className="fixed inset-0 pointer-events-none z-[55]">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.6,
                animation: `float ${1 + Math.random()}s ease-out infinite`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
