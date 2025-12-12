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
  const [phase, setPhase] = useState<'idle' | 'exit' | 'transition' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<'wipe' | 'zoom' | 'slide' | 'dissolve'>('wipe');
  const isFirstRender = useRef(true);

  // Cycle through different transition styles for variety
  const getNextTransitionStyle = () => {
    const styles: ('wipe' | 'zoom' | 'slide' | 'dissolve')[] = ['wipe', 'zoom', 'slide', 'dissolve'];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedKey(screenKey);
      setDisplayedChildren(children);
      return;
    }

    if (screenKey !== displayedKey) {
      const newStyle = getNextTransitionStyle();
      setTransitionStyle(newStyle);
      
      // Play transition sound
      playSoundEffect('whoosh', 0.4);
      
      // Start exit animation
      setPhase('exit');
      
      const exitTimer = setTimeout(() => {
        setPhase('transition');
        
        const transitionTimer = setTimeout(() => {
          // Update to new content
          setDisplayedKey(screenKey);
          setDisplayedChildren(children);
          setPhase('enter');
          
          playSoundEffect('transition', 0.3);
          
          const enterTimer = setTimeout(() => {
            setPhase('idle');
          }, 600);
          
          return () => clearTimeout(enterTimer);
        }, 400);
        
        return () => clearTimeout(transitionTimer);
      }, 400);

      return () => clearTimeout(exitTimer);
    } else {
      // Same key, just update children
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Wipe transition overlay */}
      {transitionStyle === 'wipe' && (
        <>
          <div 
            className={cn(
              "fixed inset-0 z-[60] pointer-events-none origin-left",
              "bg-gradient-to-r from-primary via-secondary to-primary",
              "transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]",
              phase === 'exit' && "translate-x-0 scale-x-100",
              phase === 'transition' && "translate-x-0 scale-x-100",
              phase === 'enter' && "translate-x-full",
              phase === 'idle' && "-translate-x-full"
            )}
            style={{
              transform: phase === 'exit' ? 'translateX(-100%) scaleX(1)' : 
                        phase === 'transition' ? 'translateX(0%) scaleX(1)' :
                        phase === 'enter' ? 'translateX(100%) scaleX(1)' : 
                        'translateX(-100%) scaleX(1)'
            }}
          >
            {/* Animated lines */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-1 bg-white/20"
                  style={{
                    left: `${(i + 1) * 12}%`,
                    animation: `slideDown ${0.3 + i * 0.05}s ease-out`,
                    animationDelay: `${i * 0.03}s`,
                  }}
                />
              ))}
            </div>
            
            {/* Center logo/icon during transition */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white/30 animate-ping" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Zoom transition overlay */}
      {transitionStyle === 'zoom' && (
        <div 
          className={cn(
            "fixed inset-0 z-[60] pointer-events-none flex items-center justify-center",
            "transition-all duration-500 ease-out",
            (phase === 'exit' || phase === 'transition') ? "opacity-100" : "opacity-0"
          )}
        >
          <div 
            className={cn(
              "rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              phase === 'exit' && "w-0 h-0",
              phase === 'transition' && "w-[300vmax] h-[300vmax]",
              phase === 'enter' && "w-[300vmax] h-[300vmax] opacity-0",
              phase === 'idle' && "w-0 h-0"
            )}
          >
            {/* Ripple effects */}
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
            <div className="absolute inset-4 rounded-full border-2 border-white/10 animate-ping" style={{ animationDelay: '0.1s' }} />
          </div>
        </div>
      )}

      {/* Slide transition overlay */}
      {transitionStyle === 'slide' && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
          {/* Multiple sliding panels */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-0 h-full transition-transform duration-500",
                "bg-gradient-to-b from-primary to-secondary"
              )}
              style={{
                width: '25%',
                left: `${i * 25}%`,
                transitionDelay: `${i * 0.05}s`,
                transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)',
                transform: (phase === 'exit' || phase === 'transition') 
                  ? 'translateY(0%)' 
                  : i % 2 === 0 ? 'translateY(-100%)' : 'translateY(100%)'
              }}
            >
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{ animation: 'shimmer 0.8s ease-out' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Dissolve transition overlay */}
      {transitionStyle === 'dissolve' && (
        <div 
          className={cn(
            "fixed inset-0 z-[60] pointer-events-none",
            "transition-opacity duration-500 ease-out",
            (phase === 'exit' || phase === 'transition') ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Particle grid */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
            {[...Array(48)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-primary transition-all duration-300",
                  (phase === 'exit' || phase === 'transition') ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )}
                style={{
                  transitionDelay: `${Math.random() * 0.3}s`,
                  background: `linear-gradient(135deg, hsl(var(--primary)) ${Math.random() * 50}%, hsl(var(--secondary)) 100%)`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        className={cn(
          "transition-all duration-500",
          // Exit animations
          phase === 'exit' && transitionStyle === 'wipe' && "opacity-0 scale-95 blur-sm",
          phase === 'exit' && transitionStyle === 'zoom' && "opacity-0 scale-110 blur-md",
          phase === 'exit' && transitionStyle === 'slide' && "opacity-0 -translate-y-8",
          phase === 'exit' && transitionStyle === 'dissolve' && "opacity-0 scale-98",
          // Transition phase
          phase === 'transition' && "opacity-0",
          // Enter animations  
          phase === 'enter' && transitionStyle === 'wipe' && "opacity-100 scale-100 blur-0 animate-fade-in",
          phase === 'enter' && transitionStyle === 'zoom' && "opacity-100 scale-100 blur-0 animate-scale-in",
          phase === 'enter' && transitionStyle === 'slide' && "opacity-100 translate-y-0 animate-fade-in",
          phase === 'enter' && transitionStyle === 'dissolve' && "opacity-100 scale-100 animate-fade-in",
          // Idle
          phase === 'idle' && "opacity-100 scale-100 blur-0",
          className
        )}
      >
        {displayedChildren}
      </div>

      {/* Floating particles during transition */}
      {(phase === 'exit' || phase === 'transition' || phase === 'enter') && (
        <div className="fixed inset-0 pointer-events-none z-[55] overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                opacity: 0.6,
                animation: `floatParticle ${1 + Math.random() * 2}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
