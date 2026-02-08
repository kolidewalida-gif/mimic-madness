import { useEffect, useRef, memo, useCallback } from 'react';
import { useInkMode } from '@/hooks/useInkMode';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'drop' | 'splash' | 'trail';
}

/**
 * Ink Cursor Particles - Creates ink drop effect following the mouse cursor
 * Only active in Ink mode
 */
const InkCursorParticlesComponent = () => {
  const { isInkMode } = useInkMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 });
  const animationFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  const spawnParticles = useCallback((x: number, y: number, velocity: number) => {
    const particles = particlesRef.current;
    const now = Date.now();
    
    // Spawn rate based on velocity
    const spawnInterval = Math.max(16, 50 - velocity);
    if (now - lastSpawnRef.current < spawnInterval) return;
    lastSpawnRef.current = now;

    // Main ink drop
    const isRed = Math.random() > 0.7;
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      size: 3 + Math.random() * 4,
      life: 0,
      maxLife: 40 + Math.random() * 30,
      color: isRed ? '#dc2626' : '#1a1a1a',
      type: 'drop',
    });

    // Splash particles when moving fast
    if (velocity > 10) {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 2,
          life: 0,
          maxLife: 20 + Math.random() * 20,
          color: Math.random() > 0.5 ? '#dc2626' : '#0a0a0a',
          type: 'splash',
        });
      }
    }

    // Trail particles
    if (velocity > 5) {
      particles.push({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 5,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        color: isRed ? 'rgba(220, 38, 38, 0.5)' : 'rgba(10, 10, 10, 0.6)',
        type: 'trail',
      });
    }

    // Limit particles
    if (particles.length > 100) {
      particles.splice(0, particles.length - 100);
    }
  }, []);

  useEffect(() => {
    if (!isInkMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const handleMouseMove = (e: MouseEvent) => {
      const prev = mouseRef.current;
      const velocity = Math.sqrt(
        Math.pow(e.clientX - prev.x, 2) + Math.pow(e.clientY - prev.y, 2)
      );
      
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        prevX: prev.x,
        prevY: prev.y,
      };

      spawnParticles(e.clientX, e.clientY, velocity);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const particles = particlesRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        const size = p.size * alpha;

        if (p.type === 'drop') {
          // Draw ink drop with gradient
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
          if (p.color === '#dc2626') {
            gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
            gradient.addColorStop(0.6, `rgba(180, 30, 30, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(150, 20, 20, 0)`);
          } else {
            gradient.addColorStop(0, `rgba(26, 26, 26, ${alpha})`);
            gradient.addColorStop(0.6, `rgba(10, 10, 10, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
          }
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (p.type === 'splash') {
          // Small splash particles
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color.includes('dc2626') 
            ? `rgba(220, 38, 38, ${alpha * 0.8})` 
            : `rgba(10, 10, 10, ${alpha * 0.8})`;
          ctx.fill();
        } else {
          // Trail - fading ink spots
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.5;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Remove dead particles
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInkMode, spawnParticles]);

  if (!isInkMode) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9998]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export const InkCursorParticles = memo(InkCursorParticlesComponent);
