import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - v2
 * Fond noir, traits de pinceau ROUGES qui se tracent, SFX brosse synchronisé
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'strokes' | 'text' | 'fadeOut'>('strokes');
  const [textIndex, setTextIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const textParts = ['MI', '--', 'MIC', '--', 'MASTER'];

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

    // Red palette for strokes
    const reds = [
      'hsl(0, 85%, 55%)',
      'hsl(0, 80%, 48%)',
      'hsl(5, 75%, 42%)',
      'hsl(355, 90%, 60%)',
    ];

    const generateStroke = (): BrushStroke => {
      const points: { x: number; y: number }[] = [];
      const startX = Math.random() * cw * 0.4 - cw * 0.1;
      const startY = Math.random() * ch;
      const segments = 6 + Math.floor(Math.random() * 8);
      let x = startX;
      let y = startY;
      for (let i = 0; i < segments; i++) {
        x += 80 + Math.random() * 150;
        y += (Math.random() - 0.5) * 120;
        points.push({ x, y });
      }
      return {
        points,
        color: reds[Math.floor(Math.random() * reds.length)],
        width: 20 + Math.random() * 50,
        progress: 0,
        speed: 0.018 + Math.random() * 0.025,
      };
    };

    // Generate initial strokes
    for (let i = 0; i < 8; i++) {
      strokes.push(generateStroke());
    }

    let animationId: number;
    let sfxTimer: NodeJS.Timeout | null = null;

    // Play brush sfx on interval while strokes animate
    const playBrushSfx = () => {
      playSoundEffect('brushStroke' as any, 0.4);
    };
    playBrushSfx();
    sfxTimer = setInterval(playBrushSfx, 280);

    const drawStroke = (stroke: BrushStroke) => {
      const { points, color, width, progress } = stroke;
      if (points.length < 2) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = width;

      const totalLen = points.length - 1;
      const drawnSegments = Math.floor(progress * totalLen);
      const segmentProgress = (progress * totalLen) % 1;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < drawnSegments && i < points.length - 1; i++) {
        ctx.lineTo(points[i + 1].x, points[i + 1].y);
      }

      if (drawnSegments < points.length - 1) {
        const from = points[drawnSegments];
        const to = points[drawnSegments + 1];
        const ix = from.x + (to.x - from.x) * segmentProgress;
        const iy = from.y + (to.y - from.y) * segmentProgress;
        ctx.lineTo(ix, iy);
      }

      ctx.stroke();
    };

    const animate = () => {
      // Clear with subtle fade for trails
      ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
      ctx.fillRect(0, 0, cw, ch);

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
        // Move to text phase after a short pause
        setTimeout(() => setPhase('text'), 350);
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
      playSoundEffect('pop', 0.35);
      const timer = setTimeout(() => setTextIndex((prev) => prev + 1), 220);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase('fadeOut'), 600);
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
          {/* Brush strokes canvas */}
          <canvas ref={canvasRef} className="absolute inset-0" />

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
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="font-display text-4xl sm:text-6xl md:text-8xl font-black"
                style={{
                  fontFamily: "'Caveat', 'Space Grotesk', cursive",
                  color: part === '--' ? 'hsl(0, 70%, 40%)' : 'hsl(0, 85%, 55%)',
                  textShadow: '0 0 40px hsl(0 85% 55% / 0.7)',
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
