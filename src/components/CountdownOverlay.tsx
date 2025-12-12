import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface CountdownOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
  title?: string;
}

export const CountdownOverlay = ({ 
  isActive, 
  onComplete, 
  duration = 3,
  title = "La vidéo commence dans..."
}: CountdownOverlayProps) => {
  const [count, setCount] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);
  const [animateNumber, setAnimateNumber] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      setCount(duration);
    }
  }, [isActive, duration]);

  useEffect(() => {
    if (!isVisible || count <= 0) return;

    // Play countdown sound
    playSoundEffect('countdown', 0.5);
    setAnimateNumber(true);
    
    const animTimer = setTimeout(() => setAnimateNumber(false), 300);

    const timer = setTimeout(() => {
      if (count === 1) {
        playSoundEffect('start', 0.6);
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 500);
      } else {
        setCount(count - 1);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(animTimer);
    };
  }, [count, isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20"
            style={{
              width: `${(count + i) * 150}px`,
              height: `${(count + i) * 150}px`,
              animation: `pulse-ring ${1 + i * 0.3}s ease-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <p className="text-xl text-foreground-muted mb-8 font-display uppercase tracking-widest animate-fade-in">
          {title}
        </p>
        
        <div 
          className={cn(
            "relative inline-flex items-center justify-center w-48 h-48 rounded-full",
            "bg-gradient-to-br from-primary/30 to-secondary/30",
            "border-4 border-primary shadow-2xl shadow-primary/30",
            "transition-all duration-300",
            animateNumber && "scale-110"
          )}
        >
          {/* Rotating ring */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/50"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          
          <span 
            className={cn(
              "font-display text-9xl font-bold text-primary",
              "transition-all duration-200",
              animateNumber && "scale-125 text-white"
            )}
            style={{ 
              textShadow: '0 0 40px hsl(var(--primary) / 0.8), 0 0 80px hsl(var(--primary) / 0.4)'
            }}
          >
            {count}
          </span>
        </div>

        <div className="mt-10 flex justify-center gap-3">
          {[...Array(duration)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                i < duration - count + 1 
                  ? "bg-primary scale-100" 
                  : "bg-muted scale-75"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
