import { ReactNode, useEffect, useState, useRef, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ScreenTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

// Simplified transitions for better performance - only 10 fast ones
type TransitionStyle = 
  | 'fade' | 'slide' | 'zoom' | 'wipe' | 'dissolve'
  | 'slideUp' | 'slideDown' | 'scaleIn' | 'blur' | 'flip';

const ALL_TRANSITIONS: TransitionStyle[] = [
  'fade', 'slide', 'zoom', 'wipe', 'dissolve',
  'slideUp', 'slideDown', 'scaleIn', 'blur', 'flip'
];

const ScreenTransitionComponent = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('fade');
  const isFirstRender = useRef(true);
  const transitionIndex = useRef(0);

  const getNextTransitionStyle = (): TransitionStyle => {
    const style = ALL_TRANSITIONS[transitionIndex.current % ALL_TRANSITIONS.length];
    transitionIndex.current++;
    return style;
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
      
      playSoundEffect('whoosh', 0.3);
      setPhase('exit');
      
      const exitTimer = setTimeout(() => {
        setDisplayedKey(screenKey);
        setDisplayedChildren(children);
        setPhase('enter');
        
        const enterTimer = setTimeout(() => {
          setPhase('idle');
        }, 300);
        
        return () => clearTimeout(enterTimer);
      }, 200);

      return () => clearTimeout(exitTimer);
    } else {
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey]);

  const getTransitionClass = () => {
    if (phase === 'idle') return 'opacity-100 translate-x-0 translate-y-0 scale-100 blur-0';
    
    const exitClasses: Record<TransitionStyle, string> = {
      fade: 'opacity-0',
      slide: phase === 'exit' ? 'opacity-0 -translate-x-8' : 'opacity-0 translate-x-8',
      zoom: 'opacity-0 scale-95',
      wipe: 'opacity-0',
      dissolve: 'opacity-0 scale-105',
      slideUp: phase === 'exit' ? 'opacity-0 -translate-y-8' : 'opacity-0 translate-y-8',
      slideDown: phase === 'exit' ? 'opacity-0 translate-y-8' : 'opacity-0 -translate-y-8',
      scaleIn: 'opacity-0 scale-90',
      blur: 'opacity-0 blur-md',
      flip: 'opacity-0 rotateY-12',
    };

    return exitClasses[transitionStyle];
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-200 ease-out will-change-transform",
          getTransitionClass()
        )}
      >
        {displayedChildren}
      </div>
      
      {/* Simple overlay during transition */}
      {phase !== 'idle' && (
        <div 
          className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm pointer-events-none"
          style={{
            animation: 'fadeInOut 400ms ease-in-out'
          }}
        />
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export const ScreenTransition = memo(ScreenTransitionComponent);
