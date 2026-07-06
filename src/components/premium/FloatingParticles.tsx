import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { isLowPowerDevice } from '@/lib/deviceCapabilities';

interface FloatingParticlesProps {
  count?: number;
  color?: 'primary' | 'accent' | 'white' | 'mixed';
  speed?: 'slow' | 'medium' | 'fast';
  size?: 'small' | 'medium' | 'large';
  glow?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  alphaDir: number;
}

export const FloatingParticles = ({
  count = 50,
  color = 'mixed',
  speed = 'medium',
  size = 'medium',
  glow = true,
  className = ''
}: FloatingParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  // Skip the canvas particle loop entirely on consoles/TVs/low-RAM devices.
  const lowPower = useRef(isLowPowerDevice()).current;

  const getColors = () => {
    switch (color) {
      case 'primary':
        return ['hsl(263, 70%, 50%)'];
      case 'accent':
        return ['hsl(180, 100%, 50%)'];
      case 'white':
        return ['rgba(255, 255, 255, 0.8)'];
      case 'mixed':
      default:
        return [
          'hsl(263, 70%, 50%)',
          'hsl(180, 100%, 50%)',
          'hsl(270, 60%, 60%)',
          'rgba(255, 255, 255, 0.6)'
        ];
    }
  };

  const getSpeedMultiplier = () => {
    switch (speed) {
      case 'slow': return 0.3;
      case 'fast': return 1.5;
      default: return 0.7;
    }
  };

  const getSizeRange = () => {
    switch (size) {
      case 'small': return { min: 1, max: 2 };
      case 'large': return { min: 3, max: 6 };
      default: return { min: 1.5, max: 4 };
    }
  };

  useEffect(() => {
    if (lowPower) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getColors();
    const speedMult = getSpeedMultiplier();
    const sizeRange = getSizeRange();

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * speedMult,
        vy: (Math.random() - 0.5) * speedMult,
        size: sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.3 + Math.random() * 0.7,
        alphaDir: Math.random() > 0.5 ? 0.01 : -0.01
      }));
    };

    resizeCanvas();
    initParticles();

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp: number) => {
      if (timestamp - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particlesRef.current.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        // Pulse alpha
        p.alpha += p.alphaDir;
        if (p.alpha <= 0.3 || p.alpha >= 1) p.alphaDir *= -1;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count, color, speed, size, glow, lowPower]);

  if (lowPower) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
