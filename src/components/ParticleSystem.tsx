import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

interface ParticleSystemProps {
  type?: 'confetti' | 'sparkles' | 'stars' | 'fire' | 'snow' | 'rain' | 'bubbles' | 'embers';
  count?: number;
  colors?: string[];
  speed?: number;
  gravity?: number;
  spread?: number;
  duration?: number;
  loop?: boolean;
  className?: string;
}

export const ParticleSystem = ({
  type = 'confetti',
  count = 50,
  colors = ['#E50914', '#FFD700', '#FFFFFF', '#FF4444', '#B20710'],
  speed = 1,
  gravity = 0.1,
  spread = 360,
  duration = 3000,
  loop = false,
  className = ''
}: ParticleSystemProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createParticle = (): Particle => {
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;
      const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
      const velocity = (2 + Math.random() * 3) * speed;

      const baseParticle = {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - (type === 'confetti' ? 5 : 0),
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      };

      switch (type) {
        case 'snow':
          return { ...baseParticle, x: Math.random() * canvas.offsetWidth, y: -10, vy: 0.5 + Math.random(), vx: (Math.random() - 0.5) * 0.5, size: 2 + Math.random() * 4 };
        case 'rain':
          return { ...baseParticle, x: Math.random() * canvas.offsetWidth, y: -10, vy: 8 + Math.random() * 4, vx: 0, size: 1, color: 'rgba(150, 200, 255, 0.6)' };
        case 'fire':
          return { ...baseParticle, x: centerX + (Math.random() - 0.5) * 50, y: canvas.offsetHeight, vy: -2 - Math.random() * 3, vx: (Math.random() - 0.5), color: colors[Math.floor(Math.random() * 3)] };
        case 'bubbles':
          return { ...baseParticle, x: Math.random() * canvas.offsetWidth, y: canvas.offsetHeight + 10, vy: -1 - Math.random() * 2, vx: (Math.random() - 0.5) * 0.5, size: 5 + Math.random() * 15 };
        default:
          return baseParticle;
      }
    };

    particlesRef.current = Array.from({ length: count }, createParticle);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity * (type === 'fire' || type === 'bubbles' ? -0.5 : 1);
        p.rotation += p.rotationSpeed;
        p.life -= 0.01 / p.maxLife;

        if (p.life <= 0 && loop) {
          particlesRef.current[i] = createParticle();
        }

        if (p.life > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.life);

          if (type === 'sparkles' || type === 'stars') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
              const angle = (j * 72 - 90) * (Math.PI / 180);
              const r = j % 2 === 0 ? p.size : p.size / 2;
              ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
          } else if (type === 'bubbles') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (type === 'rain' ? 4 : 1));
          }

          ctx.restore();
        }
      });

      const allDead = particlesRef.current.every(p => p.life <= 0);
      if (!allDead || loop) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    const timeout = !loop ? setTimeout(() => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }, duration) : undefined;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeout) clearTimeout(timeout);
    };
  }, [type, count, colors, speed, gravity, spread, duration, loop]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
