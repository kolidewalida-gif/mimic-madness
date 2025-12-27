import { useEffect, useRef, memo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

// Netflix-style colors
const COLORS = [
  'hsl(357, 92%, 47%)',
  'hsl(0, 0%, 40%)',
  'hsl(357, 92%, 35%)',
];

const DynamicBackgroundComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameTime = useRef<number>(0);
  const FPS_INTERVAL = 1000 / 30; // Cap at 30 FPS for performance

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      const particles: Particle[] = [];
      // Reduce particle count significantly
      const particleCount = Math.min(25, Math.floor((width * height) / 50000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 1.5 + 0.5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: Math.random() * 0.25 + 0.1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.008 + 0.004,
        });
      }
      particlesRef.current = particles;
    };

    resizeCanvas();
    
    // Debounced resize
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(resizeCanvas, 200);
    };
    window.addEventListener('resize', handleResize);

    const animate = (timestamp: number) => {
      // FPS limiting
      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      ctx.clearRect(0, 0, width, height);
      const particles = particlesRef.current;

      // Batch draw particles - simplified, no connecting lines
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.08;
        const pulseSize = p.size + Math.sin(p.pulse) * 0.2;
        
        // Simple circle without gradient for performance
        ctx.beginPath();
        ctx.fillStyle = p.color.replace(')', `, ${pulseAlpha})`).replace('hsl', 'hsla');
        ctx.arc(p.x, p.y, pulseSize * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
};

export const DynamicBackground = memo(DynamicBackgroundComponent);
