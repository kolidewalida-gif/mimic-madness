import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  effect?: 'typewriter' | 'fadeIn' | 'wave' | 'bounce' | 'glitch' | 'reveal' | 'gradient';
  duration?: number;
  delay?: number;
  className?: string;
  charDelay?: number;
}

export const AnimatedText = ({
  text,
  effect = 'fadeIn',
  duration = 50,
  delay = 0,
  className = '',
  charDelay = 30
}: AnimatedTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (effect === 'typewriter' && isVisible) {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayedText(text.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, duration);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }
  }, [text, effect, duration, isVisible]);

  if (effect === 'typewriter') {
    return (
      <span className={cn('inline-block', className)}>
        {displayedText}
        <span className="animate-typewriterCursor border-r-2 border-primary ml-0.5">&nbsp;</span>
      </span>
    );
  }

  if (effect === 'wave' || effect === 'bounce') {
    return (
      <span className={cn('inline-flex', className)}>
        {text.split('').map((char, i) => (
          <span
            key={i}
            className={cn(
              'inline-block',
              effect === 'wave' && 'animate-letterWave',
              effect === 'bounce' && 'animate-letterBounce'
            )}
            style={{
              animationDelay: `${delay + i * charDelay}ms`,
              animationFillMode: 'both'
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    );
  }

  if (effect === 'glitch') {
    return (
      <span className={cn('relative inline-block', className)}>
        <span className="animate-textGlitch">{text}</span>
        <span className="absolute inset-0 text-primary/50 animate-glitch-r" style={{ clipPath: 'inset(0 0 50% 0)' }}>{text}</span>
        <span className="absolute inset-0 text-blue-500/50 animate-glitch-b" style={{ clipPath: 'inset(50% 0 0 0)' }}>{text}</span>
      </span>
    );
  }

  if (effect === 'gradient') {
    return (
      <span
        className={cn('inline-block bg-clip-text text-transparent animate-textGradientShift', className)}
        style={{
          backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
          backgroundSize: '200% auto'
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-block',
        isVisible && effect === 'fadeIn' && 'animate-charFadeIn',
        isVisible && effect === 'reveal' && 'animate-textReveal',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {text}
    </span>
  );
};
