import { ReactNode, useEffect, useState, useRef, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useInkMode } from '@/hooks/useInkMode';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreenTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

// Standard transitions
type TransitionStyle = 
  | 'fade' | 'slide' | 'zoom' | 'wipe' | 'dissolve'
  | 'slideUp' | 'slideDown' | 'scaleIn' | 'blur' | 'flip';

// Ink-specific transitions
type InkTransitionStyle = 
  | 'inkSplash' | 'brushStroke' | 'drip' | 'splatter' | 'waveWipe' | 'fadeInk';

const ALL_TRANSITIONS: TransitionStyle[] = [
  'fade', 'slide', 'zoom', 'wipe', 'dissolve',
  'slideUp', 'slideDown', 'scaleIn', 'blur', 'flip'
];

const INK_TRANSITIONS: InkTransitionStyle[] = [
  'inkSplash', 'brushStroke', 'drip', 'splatter', 'waveWipe', 'fadeInk'
];

const ScreenTransitionComponent = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const { isInkMode } = useInkMode();

  // Ink mode: a plain, fast cross-fade. No canvas splatter, no slide, no
  // sound — screen changes should feel instant, like Gartic Phone.
  if (isInkMode) {
    return (
      <div className={cn('relative', className)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screenKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'linear' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return <LegacyScreenTransition screenKey={screenKey} className={className}>{children}</LegacyScreenTransition>;
};

const LegacyScreenTransitionComponent = ({ children, screenKey, className }: ScreenTransitionProps) => {
  const { isInkMode } = useInkMode();
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle | InkTransitionStyle>('fade');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isFirstRender = useRef(true);
  const transitionIndex = useRef(0);
  const animationFrameRef = useRef<number>(0);

  const getNextTransitionStyle = (): TransitionStyle | InkTransitionStyle => {
    if (isInkMode) {
      const style = INK_TRANSITIONS[transitionIndex.current % INK_TRANSITIONS.length];
      transitionIndex.current++;
      return style;
    }
    const style = ALL_TRANSITIONS[transitionIndex.current % ALL_TRANSITIONS.length];
    transitionIndex.current++;
    return style;
  };

  // Ink canvas animation
  const runInkAnimation = useCallback((style: InkTransitionStyle, onComplete: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onComplete();
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onComplete();
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = window.innerWidth;
    const height = window.innerHeight;
    let frame = 0;
    const maxFrames = 20;

    const animate = () => {
      const progress = frame / maxFrames;
      ctx.clearRect(0, 0, width, height);

      switch (style) {
        case 'inkSplash': {
          const centerX = width / 2;
          const centerY = height / 2;
          const maxRadius = Math.sqrt(width * width + height * height) / 2;
          const radius = maxRadius * Math.pow(progress, 0.5);
          
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.7, 'rgba(220, 38, 38, 0.6)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          break;
        }

        case 'brushStroke': {
          const strokeProgress = Math.pow(progress, 0.6);
          const strokeX = width * strokeProgress;
          
          ctx.save();
          const gradient = ctx.createLinearGradient(strokeX - 100, 0, strokeX + 50, 0);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
          gradient.addColorStop(0.4, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.6, 'rgba(220, 38, 38, 0.7)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, strokeX + 50, height);
          ctx.restore();
          break;
        }

        case 'drip': {
          const drips = 8;
          for (let i = 0; i < drips; i++) {
            const x = (width / drips) * i + (width / drips / 2);
            const delay = (i % 3) * 0.1;
            const dripProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
            const y = height * 1.1 * Math.pow(dripProgress, 0.7);
            const dripWidth = 40 + Math.sin(i) * 20;
            
            ctx.beginPath();
            ctx.moveTo(x - dripWidth / 2, 0);
            ctx.lineTo(x + dripWidth / 2, 0);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fillStyle = i % 2 === 0 ? 'rgba(10, 10, 10, 0.95)' : 'rgba(220, 38, 38, 0.8)';
            ctx.fill();
          }
          break;
        }

        case 'splatter': {
          const splatCount = 10;
          for (let i = 0; i < splatCount; i++) {
            const delay = (i / splatCount) * 0.5;
            const splatProgress = Math.max(0, Math.min(1, (progress - delay) / 0.5));
            if (splatProgress <= 0) continue;
            
            const x = (width * 0.1) + (width * 0.8) * ((i * 7) % 10) / 10;
            const y = (height * 0.1) + (height * 0.8) * ((i * 3) % 10) / 10;
            const size = (60 + (i % 4) * 30) * splatProgress;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            const isRed = i % 3 === 0;
            gradient.addColorStop(0, isRed ? 'rgba(220, 38, 38, 0.9)' : 'rgba(10, 10, 10, 0.95)');
            gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          break;
        }

        case 'waveWipe': {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const waveX = width * progress * 1.3;
          for (let y = 0; y <= height; y += 5) {
            const wave = Math.sin((y / height) * Math.PI * 3 + progress * 8) * 40;
            ctx.lineTo(waveX + wave, y);
          }
          ctx.lineTo(0, height);
          ctx.closePath();
          
          const gradient = ctx.createLinearGradient(0, 0, waveX, 0);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.9, 'rgba(220, 38, 38, 0.5)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
          break;
        }

        case 'fadeInk':
        default: {
          const alpha = Math.sin(progress * Math.PI);
          ctx.fillStyle = `rgba(10, 10, 10, ${alpha * 0.9})`;
          ctx.fillRect(0, 0, width, height);
          
          const centerX = width / 2;
          const centerY = height / 2;
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 250);
          gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha * 0.4})`);
          gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          break;
        }
      }

      frame++;
      if (frame < maxFrames) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, width, height);
        onComplete();
      }
    };

    animate();
  }, []);

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
      
      // Play appropriate transition sound
      if (isInkMode) {
        playInkSound('inkTransition', 0.3);
      } else {
        playSoundEffect('whoosh', 0.3);
      }
      
      setPhase('exit');
      
      if (isInkMode && INK_TRANSITIONS.includes(newStyle as InkTransitionStyle)) {
        runInkAnimation(newStyle as InkTransitionStyle, () => {
          setDisplayedKey(screenKey);
          setDisplayedChildren(children);
          setPhase('enter');
          setTimeout(() => setPhase('idle'), 150);
        });
      } else {
        setTimeout(() => {
          setDisplayedKey(screenKey);
          setDisplayedChildren(children);
          setPhase('enter');
          setTimeout(() => setPhase('idle'), 200);
        }, 150);
      }
    } else {
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey, isInkMode, runInkAnimation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

    // For ink mode, use simpler transitions since canvas handles visuals
    if (isInkMode) {
      return phase === 'exit' ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100';
    }

    return exitClasses[transitionStyle as TransitionStyle] || 'opacity-0';
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-150 ease-out will-change-transform",
          getTransitionClass()
        )}
      >
        {displayedChildren}
      </div>
      
      {/* Ink animation canvas - only for ink mode */}
      {isInkMode && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ 
            width: '100vw', 
            height: '100vh',
            display: phase !== 'idle' ? 'block' : 'none'
          }}
        />
      )}
      
      {/* Standard overlay for non-ink mode */}
      {!isInkMode && phase !== 'idle' && (
        <div 
          className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm pointer-events-none"
          style={{ animation: 'fadeInOut 300ms ease-in-out' }}
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
const LegacyScreenTransition = memo(LegacyScreenTransitionComponent);
