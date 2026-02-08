import { ReactNode, useEffect, useState, useRef, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useInkMode } from '@/hooks/useInkMode';

interface InkPageTransitionProps {
  children: ReactNode;
  screenKey: string;
  className?: string;
}

type InkTransitionStyle = 
  | 'inkSplash'     // Central ink splash that reveals new content
  | 'brushStroke'   // Horizontal brush stroke wipe
  | 'drip'          // Ink drips down
  | 'splatter'      // Random ink splatters
  | 'waveWipe'      // Wavy ink wipe
  | 'fadeInk';      // Simple ink fade

const INK_TRANSITIONS: InkTransitionStyle[] = [
  'inkSplash', 'brushStroke', 'drip', 'splatter', 'waveWipe', 'fadeInk'
];

/**
 * Ink-themed page transition component
 * Uses canvas-based ink effects for smooth transitions
 */
const InkPageTransitionComponent = ({ children, screenKey, className }: InkPageTransitionProps) => {
  const { isInkMode } = useInkMode();
  const [displayedKey, setDisplayedKey] = useState(screenKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [transitionStyle, setTransitionStyle] = useState<InkTransitionStyle>('inkSplash');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isFirstRender = useRef(true);
  const transitionIndex = useRef(0);
  const animationFrameRef = useRef<number>(0);

  const getNextTransitionStyle = (): InkTransitionStyle => {
    const style = INK_TRANSITIONS[transitionIndex.current % INK_TRANSITIONS.length];
    transitionIndex.current++;
    return style;
  };

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
    const maxFrames = 25; // ~400ms at 60fps

    const animate = () => {
      const progress = frame / maxFrames;
      
      // Clear
      ctx.clearRect(0, 0, width, height);

      switch (style) {
        case 'inkSplash': {
          // Central expanding ink splash
          const centerX = width / 2;
          const centerY = height / 2;
          const maxRadius = Math.sqrt(width * width + height * height) / 2;
          const radius = maxRadius * Math.pow(progress, 0.5);
          
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.7, 'rgba(220, 38, 38, 0.7)');
          gradient.addColorStop(0.9, 'rgba(10, 10, 10, 0.9)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          break;
        }

        case 'brushStroke': {
          // Horizontal brush stroke
          const strokeProgress = Math.pow(progress, 0.6);
          const strokeWidth = height * 1.5;
          const strokeX = -strokeWidth + (width + strokeWidth * 2) * strokeProgress;
          
          ctx.save();
          ctx.translate(strokeX, height / 2);
          ctx.rotate(-0.05);
          
          const gradient = ctx.createLinearGradient(-strokeWidth/2, 0, strokeWidth/2, 0);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
          gradient.addColorStop(0.3, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.8)');
          gradient.addColorStop(0.7, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(-strokeWidth/2, -height, strokeWidth, height * 2);
          ctx.restore();
          break;
        }

        case 'drip': {
          // Ink dripping from top
          const drips = 12;
          for (let i = 0; i < drips; i++) {
            const x = (width / drips) * i + (width / drips / 2);
            const delay = (i % 3) * 0.1;
            const dripProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
            const y = height * 1.2 * Math.pow(dripProgress, 0.8);
            const dripWidth = 30 + Math.sin(i * 1.5) * 15;
            
            const gradient = ctx.createLinearGradient(x, 0, x, y);
            gradient.addColorStop(0, i % 2 === 0 ? 'rgba(10, 10, 10, 0.95)' : 'rgba(220, 38, 38, 0.8)');
            gradient.addColorStop(0.8, i % 2 === 0 ? 'rgba(10, 10, 10, 0.9)' : 'rgba(180, 30, 30, 0.7)');
            gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
            
            ctx.beginPath();
            ctx.moveTo(x - dripWidth / 2, 0);
            ctx.lineTo(x + dripWidth / 2, 0);
            ctx.lineTo(x + dripWidth / 3, y);
            ctx.quadraticCurveTo(x, y + 30, x - dripWidth / 3, y);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          break;
        }

        case 'splatter': {
          // Random ink splatters
          const splatCount = 15;
          for (let i = 0; i < splatCount; i++) {
            const delay = (i / splatCount) * 0.6;
            const splatProgress = Math.max(0, Math.min(1, (progress - delay) / 0.4));
            if (splatProgress <= 0) continue;
            
            const x = (width * 0.1) + (width * 0.8) * ((i * 7) % 10) / 10;
            const y = (height * 0.1) + (height * 0.8) * ((i * 3) % 10) / 10;
            const size = (50 + (i % 5) * 30) * splatProgress;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            const isRed = i % 3 === 0;
            gradient.addColorStop(0, isRed ? 'rgba(220, 38, 38, 0.9)' : 'rgba(10, 10, 10, 0.95)');
            gradient.addColorStop(0.7, isRed ? 'rgba(180, 30, 30, 0.6)' : 'rgba(20, 20, 20, 0.7)');
            gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          break;
        }

        case 'waveWipe': {
          // Wavy ink wipe
          ctx.beginPath();
          ctx.moveTo(0, 0);
          
          const waveX = width * progress * 1.5;
          for (let y = 0; y <= height; y += 5) {
            const wave = Math.sin((y / height) * Math.PI * 4 + progress * 10) * 50;
            ctx.lineTo(waveX + wave, y);
          }
          ctx.lineTo(0, height);
          ctx.closePath();
          
          const gradient = ctx.createLinearGradient(0, 0, waveX, 0);
          gradient.addColorStop(0, 'rgba(10, 10, 10, 0.95)');
          gradient.addColorStop(0.8, 'rgba(220, 38, 38, 0.6)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gradient;
          ctx.fill();
          break;
        }

        case 'fadeInk':
        default: {
          // Simple fade with ink texture
          const alpha = Math.sin(progress * Math.PI);
          ctx.fillStyle = `rgba(10, 10, 10, ${alpha * 0.9})`;
          ctx.fillRect(0, 0, width, height);
          
          // Red accent glow
          const centerX = width / 2;
          const centerY = height / 2;
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
          gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha * 0.5})`);
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
      
      // Play ink transition sound
      if (isInkMode) {
        playInkSound('inkTransition', 0.4);
      }
      
      setPhase('exit');
      
      runInkAnimation(newStyle, () => {
        setDisplayedKey(screenKey);
        setDisplayedChildren(children);
        setPhase('enter');
        
        setTimeout(() => {
          setPhase('idle');
        }, 200);
      });
    } else {
      setDisplayedChildren(children);
    }
  }, [screenKey, children, displayedKey, isInkMode, runInkAnimation]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getTransitionClass = () => {
    if (phase === 'idle') return 'opacity-100 scale-100';
    if (phase === 'exit') return 'opacity-50 scale-[0.99]';
    return 'opacity-100 scale-100';
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-200 ease-out",
          getTransitionClass()
        )}
      >
        {displayedChildren}
      </div>
      
      {/* Ink animation canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ 
          width: '100vw', 
          height: '100vh',
          display: phase !== 'idle' ? 'block' : 'none'
        }}
      />
    </div>
  );
};

export const InkPageTransition = memo(InkPageTransitionComponent);
