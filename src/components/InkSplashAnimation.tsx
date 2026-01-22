import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'splash' | 'text' | 'fadeOut'>('splash');
  const [textIndex, setTextIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const textParts = ['MI', '--', 'MIC', '--', 'MASTER'];
  
  // Ink splash animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    interface Splash {
      x: number;
      y: number;
      radius: number;
      targetRadius: number;
      droplets: { x: number; y: number; size: number; angle: number; distance: number }[];
    }
    
    const splashes: Splash[] = [];
    let animationId: number;
    
    const createSplash = (x: number, y: number, size: number) => {
      const droplets = [];
      const dropletCount = Math.floor(Math.random() * 15) + 10;
      
      for (let i = 0; i < dropletCount; i++) {
        droplets.push({
          x: 0,
          y: 0,
          size: Math.random() * 8 + 2,
          angle: Math.random() * Math.PI * 2,
          distance: Math.random() * size * 0.8 + 20,
        });
      }
      
      splashes.push({
        x,
        y,
        radius: 0,
        targetRadius: size,
        droplets,
      });
    };
    
    // Create initial splashes
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    setTimeout(() => createSplash(centerX - 100, centerY - 50, 120), 0);
    setTimeout(() => createSplash(centerX + 80, centerY + 30, 100), 150);
    setTimeout(() => createSplash(centerX - 50, centerY + 80, 80), 300);
    setTimeout(() => createSplash(centerX + 120, centerY - 60, 90), 450);
    setTimeout(() => createSplash(centerX, centerY, 150), 600);
    
    // Random edge splashes
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        switch (edge) {
          case 0: x = Math.random() * canvas.width; y = 0; break;
          case 1: x = canvas.width; y = Math.random() * canvas.height; break;
          case 2: x = Math.random() * canvas.width; y = canvas.height; break;
          default: x = 0; y = Math.random() * canvas.height;
        }
        createSplash(x, y, Math.random() * 60 + 40);
      }, i * 80 + 200);
    }
    
    const animate = () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      splashes.forEach((splash) => {
        // Animate main splash
        if (splash.radius < splash.targetRadius) {
          splash.radius += (splash.targetRadius - splash.radius) * 0.15;
        }
        
        // Draw main splash
        ctx.beginPath();
        ctx.fillStyle = '#000';
        
        // Irregular shape
        const points = 12;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const variance = 0.7 + Math.random() * 0.6;
          const r = splash.radius * variance;
          const x = splash.x + Math.cos(angle) * r;
          const y = splash.y + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.fill();
        
        // Draw droplets
        splash.droplets.forEach((droplet) => {
          const progress = Math.min(1, splash.radius / splash.targetRadius);
          const dx = splash.x + Math.cos(droplet.angle) * droplet.distance * progress;
          const dy = splash.y + Math.sin(droplet.angle) * droplet.distance * progress;
          
          ctx.beginPath();
          ctx.fillStyle = '#000';
          ctx.arc(dx, dy, droplet.size * progress, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Move to text phase
    setTimeout(() => setPhase('text'), 1200);
    
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  // Text animation
  useEffect(() => {
    if (phase !== 'text') return;
    
    if (textIndex < textParts.length) {
      const timer = setTimeout(() => {
        setTextIndex((prev) => prev + 1);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      // All text shown, fade out
      const timer = setTimeout(() => setPhase('fadeOut'), 800);
      return () => clearTimeout(timer);
    }
  }, [phase, textIndex, textParts.length]);
  
  // Complete animation
  useEffect(() => {
    if (phase === 'fadeOut') {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);
  
  return (
    <AnimatePresence>
      {phase !== 'fadeOut' ? (
        <motion.div
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Ink canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
          />
          
          {/* Text overlay */}
          <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
            {textParts.map((part, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={
                  index < textIndex
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 50, scale: 0.8 }
                }
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                className={`font-display text-4xl sm:text-6xl md:text-8xl font-black text-black ${
                  part === '--' ? 'opacity-50 mx-2' : ''
                }`}
                style={{
                  fontFamily: "'Caveat', 'Space Grotesk', cursive",
                  textShadow: '2px 2px 0 rgba(0,0,0,0.1)',
                }}
              >
                {part}
              </motion.span>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
