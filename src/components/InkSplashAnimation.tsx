import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - v3
 * Fond noir, vrais coups de pinceau ROUGES animés, SFX brosse synchronisé
 * Texte "MIMIC MASTER" avec contour cartoon noir pour lisibilité
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'strokes' | 'text' | 'fadeOut'>('strokes');
  const [textIndex, setTextIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const textParts = ['MIMIC', 'MASTER'];

  // ----- Brush stroke animation on canvas -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    interface BrushStroke {
      points: { x: number; y: number }[];
      color: string;
      width: number;
      progress: number;
      speed: number;
    }

    const strokes: BrushStroke[] = [];
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    // Red palette for strokes (crimson tones)
    const reds = [
      'hsl(0, 85%, 50%)',
      'hsl(355, 80%, 45%)',
      'hsl(5, 75%, 40%)',
      'hsl(0, 90%, 55%)',
      'hsl(350, 85%, 42%)',
    ];

    // Generate realistic brush stroke path (curved, organic)
    const generateStroke = (): BrushStroke => {
      const points: { x: number; y: number }[] = [];
      // Start from left side, sweep across
      const startX = -50 + Math.random() * 100;
      const startY = Math.random() * ch;
      const segments = 8 + Math.floor(Math.random() * 6);
      
      let x = startX;
      let y = startY;
      points.push({ x, y });
      
      // Create organic curved path
      for (let i = 0; i < segments; i++) {
        const progress = i / segments;
        // Sweep right with some vertical variation
        x += 60 + Math.random() * 120;
        y += (Math.random() - 0.5) * 80 * (1 - progress * 0.5);
        points.push({ x, y });
      }
      
      return {
        points,
        color: reds[Math.floor(Math.random() * reds.length)],
        width: 15 + Math.random() * 45,
        progress: 0,
        speed: 0.012 + Math.random() * 0.018,
      };
    };

    // Generate strokes spread across the screen
    for (let i = 0; i < 10; i++) {
      const stroke = generateStroke();
      // Distribute vertically
      stroke.points = stroke.points.map((p, idx) => ({
        x: p.x,
        y: p.y + (i - 5) * (ch / 12),
      }));
      strokes.push(stroke);
    }

    let animationId: number;
    let sfxTimer: NodeJS.Timeout | null = null;

    // Play brush sfx on interval while strokes animate
    const playBrushSfx = () => {
      playSoundEffect('brushStroke' as any, 0.5);
    };
    playBrushSfx();
    sfxTimer = setInterval(playBrushSfx, 220);

    // Draw a brush stroke with pressure variation
    const drawStroke = (stroke: BrushStroke) => {
      const { points, color, width, progress } = stroke;
      if (points.length < 2) return;

      const totalLen = points.length - 1;
      const drawnSegments = Math.floor(progress * totalLen);
      const segmentProgress = (progress * totalLen) % 1;

      // Draw each segment with varying width (brush pressure effect)
      for (let i = 0; i < drawnSegments && i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        
        // Pressure curve: thicker in middle, thinner at ends
        const t = i / (points.length - 1);
        const pressure = Math.sin(t * Math.PI) * 0.6 + 0.4;
        const segWidth = width * pressure;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = segWidth;
        ctx.globalAlpha = 0.85;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }

      // Draw partial segment
      if (drawnSegments < points.length - 1) {
        const from = points[drawnSegments];
        const to = points[drawnSegments + 1];
        const ix = from.x + (to.x - from.x) * segmentProgress;
        const iy = from.y + (to.y - from.y) * segmentProgress;
        
        const t = drawnSegments / (points.length - 1);
        const pressure = Math.sin(t * Math.PI) * 0.6 + 0.4;
        
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = width * pressure;
        ctx.globalAlpha = 0.85;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      // Don't clear - let strokes accumulate on black canvas
      let allDone = true;
      strokes.forEach((stroke) => {
        if (stroke.progress < 1) {
          stroke.progress = Math.min(1, stroke.progress + stroke.speed);
          allDone = false;
        }
        drawStroke(stroke);
      });

      if (!allDone) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Move to text phase after strokes complete
        if (sfxTimer) clearInterval(sfxTimer);
        setTimeout(() => setPhase('text'), 300);
      }
    };

    // Prefill background solid black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cw, ch);

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (sfxTimer) clearInterval(sfxTimer);
    };
  }, []);

  // ----- Text animation -----
  useEffect(() => {
    if (phase !== 'text') return;

    if (textIndex < textParts.length) {
      playSoundEffect('pop', 0.4);
      const timer = setTimeout(() => setTextIndex((prev) => prev + 1), 350);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase('fadeOut'), 700);
      return () => clearTimeout(timer);
    }
  }, [phase, textIndex, textParts.length]);

  // ----- Completion -----
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
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: '#0a0a0a' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Brush strokes canvas - behind text */}
          <canvas ref={canvasRef} className="absolute inset-0 z-0" />

          {/* Text overlay - ABOVE canvas with cartoon outline */}
          <div className="relative z-20 flex flex-col items-center justify-center gap-2">
            {textParts.map((part, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 60, scale: 0.7, rotate: -5 }}
                animate={
                  index < textIndex
                    ? { opacity: 1, y: 0, scale: 1, rotate: 0 }
                    : { opacity: 0, y: 60, scale: 0.7, rotate: -5 }
                }
                transition={{ 
                  duration: 0.4, 
                  ease: [0.34, 1.56, 0.64, 1], // Bounce effect
                }}
                className="font-display text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-tight"
                style={{
                  fontFamily: "'Caveat', 'Space Grotesk', cursive",
                  color: 'hsl(0, 85%, 55%)',
                  // Cartoon outline effect: multiple black shadows
                  textShadow: `
                    -4px -4px 0 #000,
                    4px -4px 0 #000,
                    -4px 4px 0 #000,
                    4px 4px 0 #000,
                    -4px 0 0 #000,
                    4px 0 0 #000,
                    0 -4px 0 #000,
                    0 4px 0 #000,
                    0 0 30px hsl(0 85% 55% / 0.5),
                    0 0 60px hsl(0 85% 55% / 0.3)
                  `,
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
