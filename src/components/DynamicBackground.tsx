import { useEffect, useRef } from 'react';

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

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

export const DynamicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Colors from design system
    const colors = [
      'hsl(180, 100%, 50%)',  // Cyan primary
      'hsl(320, 100%, 60%)',  // Pink secondary
      'hsl(270, 100%, 65%)',  // Purple accent
      'hsl(150, 100%, 45%)',  // Green success
    ];

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.2,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        });
      }
      particlesRef.current = particles;
    };

    // Initialize shooting stars
    const initShootingStars = () => {
      shootingStarsRef.current = Array(3).fill(null).map(() => ({
        x: 0,
        y: 0,
        length: 0,
        speed: 0,
        angle: 0,
        alpha: 0,
        active: false,
      }));
    };

    const spawnShootingStar = () => {
      const star = shootingStarsRef.current.find(s => !s.active);
      if (star && Math.random() < 0.002) {
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height * 0.5;
        star.length = Math.random() * 80 + 40;
        star.speed = Math.random() * 8 + 4;
        star.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        star.alpha = 1;
        star.active = true;
      }
    };

    const updateShootingStars = () => {
      shootingStarsRef.current.forEach(star => {
        if (star.active) {
          star.x += Math.cos(star.angle) * star.speed;
          star.y += Math.sin(star.angle) * star.speed;
          star.alpha -= 0.015;
          
          if (star.alpha <= 0 || star.x > canvas.width || star.y > canvas.height) {
            star.active = false;
          }
        }
      });
    };

    const drawShootingStars = () => {
      shootingStarsRef.current.forEach(star => {
        if (star.active) {
          const gradient = ctx.createLinearGradient(
            star.x, star.y,
            star.x - Math.cos(star.angle) * star.length,
            star.y - Math.sin(star.angle) * star.length
          );
          gradient.addColorStop(0, `hsla(180, 100%, 80%, ${star.alpha})`);
          gradient.addColorStop(1, 'hsla(180, 100%, 80%, 0)');
          
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(
            star.x - Math.cos(star.angle) * star.length,
            star.y - Math.sin(star.angle) * star.length
          );
          ctx.stroke();
        }
      });
    };

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    initParticles();
    initShootingStars();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connecting lines between close particles
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(180, 100%, 50%, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // Update and draw particles
      particlesRef.current.forEach(p => {
        // Mouse attraction
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200 && dist > 0) {
          p.vx += (dx / dist) * 0.02;
          p.vy += (dy / dist) * 0.02;
        }

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle with pulsing glow
        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.2;
        const pulseSize = p.size + Math.sin(p.pulse) * 0.5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseSize * 4);
        gradient.addColorStop(0, p.color.replace(')', `, ${pulseAlpha * 0.5})`).replace('hsl', 'hsla'));
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, pulseSize * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.fillStyle = p.color.replace(')', `, ${pulseAlpha})`).replace('hsl', 'hsla');
        ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // Shooting stars
      spawnShootingStar();
      updateShootingStars();
      drawShootingStars();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
};