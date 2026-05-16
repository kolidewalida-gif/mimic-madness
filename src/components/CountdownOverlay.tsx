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
  title = "La vidéo commence dans...",
}: CountdownOverlayProps) => {
  const [count, setCount] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      setCount(duration);
      setTick((t) => t + 1);
    }
  }, [isActive, duration]);

  useEffect(() => {
    if (!isVisible || count <= 0) return;

    playSoundEffect('countdown', 0.45);
    setTick((t) => t + 1);

    const timer = setTimeout(() => {
      if (count === 1) {
        playSoundEffect('start', 0.55);
        setTimeout(() => {
          setIsVisible(false);
          onComplete();
        }, 550);
      } else {
        setCount(count - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, isVisible, onComplete]);

  if (!isVisible) return null;

  // SVG progress ring geometry
  const size = 220;
  const stroke = 1.5;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-2xl animate-fade-in">
      {/* Faint ink corner marks */}
      <div className="pointer-events-none absolute inset-10 border border-primary/10" />
      <div className="pointer-events-none absolute top-8 left-8 w-6 h-px bg-primary/40" />
      <div className="pointer-events-none absolute top-8 left-8 h-6 w-px bg-primary/40" />
      <div className="pointer-events-none absolute top-8 right-8 w-6 h-px bg-primary/40" />
      <div className="pointer-events-none absolute top-8 right-8 h-6 w-px bg-primary/40" />
      <div className="pointer-events-none absolute bottom-8 left-8 w-6 h-px bg-primary/40" />
      <div className="pointer-events-none absolute bottom-8 left-8 h-6 w-px bg-primary/40" />
      <div className="pointer-events-none absolute bottom-8 right-8 w-6 h-px bg-primary/40" />
      <div className="pointer-events-none absolute bottom-8 right-8 h-6 w-px bg-primary/40" />

      <div className="relative flex flex-col items-center">
        {/* Title */}
        <p className="mb-12 text-[11px] font-display uppercase tracking-[0.5em] text-foreground/60">
          {title.replace('...', '')}
        </p>

        {/* Timer */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {/* Expanding ink ripples on each tick */}
          {[0, 1, 2].map((i) => (
            <span
              key={`${tick}-${i}`}
              className="absolute rounded-full border border-primary/30"
              style={{
                width: size,
                height: size,
                animation: `countdown-ripple 1s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                animationDelay: `${i * 0.12}s`,
                opacity: 0,
              }}
            />
          ))}

          {/* Static thin ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary) / 0.15)"
              strokeWidth={stroke}
            />
            <circle
              key={tick}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              style={{
                animation: 'countdown-sweep 1s linear forwards',
                filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.6))',
              }}
            />
          </svg>

          {/* Number */}
          <span
            key={count}
            className="font-display text-[7rem] leading-none font-light text-foreground tabular-nums"
            style={{
              animation: 'countdown-number 1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
              textShadow:
                '0 0 24px hsl(var(--primary) / 0.55), 0 0 60px hsl(var(--primary) / 0.25)',
            }}
          >
            {count}
          </span>
        </div>

        {/* Tick marks */}
        <div className="mt-10 flex items-center gap-4">
          {[...Array(duration)].map((_, i) => {
            const active = i < duration - count + 1;
            return (
              <span
                key={i}
                className={cn(
                  'h-px transition-all duration-500 ease-out',
                  active ? 'w-10 bg-primary' : 'w-6 bg-foreground/20',
                )}
                style={
                  active
                    ? { boxShadow: '0 0 8px hsl(var(--primary) / 0.7)' }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes countdown-ripple {
          0% { transform: scale(0.6); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes countdown-sweep {
          from { stroke-dashoffset: ${circumference}; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes countdown-number {
          0% { opacity: 0; transform: scale(0.7); letter-spacing: -0.05em; }
          25% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); letter-spacing: 0; }
        }
      `}</style>
    </div>
  );
};
