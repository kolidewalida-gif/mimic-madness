import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - v4
 * Fond noir, vrais coups de pinceau ROUGES animés avec effets calligraphiques
 * Texte "MIMIC MASTER" avec contour cartoon noir et glow rouge
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
      points: { x: number; y: number; pressure: number }[];
      color: string;
      baseWidth: number;
      progress: number;
      speed: number;
      delay: number;
    }

    const strokes: BrushStroke[] = [];
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    // Red palette with depth variation
    const reds = [
      'hsl(0, 85%, 50%)',
      'hsl(355, 80%, 45%)',
      'hsl(5, 75%, 55%)',
      'hsl(0, 90%, 48%)',
      'hsl(350, 85%, 42%)',
      'hsl(8, 85%, 52%)',
    ];

    // Generate realistic brush stroke path with pressure
    const generateStroke = (yOffset: number, delay: number): BrushStroke => {
      const points: { x: number; y: number; pressure: number }[] = [];
      const startX = -100 + Math.random() * 50;
      const startY = ch * 0.3 + yOffset + (Math.random() - 0.5) * 60;
      const segments = 12 + Math.floor(Math.random() * 8);
      
      let x = startX;
      let y = startY;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Pressure curve: start light, heavy in middle, light at end
        const pressure = Math.sin(t * Math.PI) * 0.7 + 0.3;
        points.push({ x, y, pressure });
        
        // Flow across with organic curves
        x += (cw + 200) / segments + (Math.random() - 0.5) * 40;
        y += Math.sin(t * Math.PI * 2) * 20 + (Math.random() - 0.5) * 30;
      }
      
      return {
        points,
        color: reds[Math.floor(Math.random() * reds.length)],
        baseWidth: 20 + Math.random() * 40,
        progress: 0,
        speed: 0.015 + Math.random() * 0.01,
        delay,
      };
    };

    // Generate strokes with staggered delays
    const strokeCount = 8;
    for (let i = 0; i < strokeCount; i++) {
      const yOffset = (i - strokeCount / 2) * (ch * 0.12);
      const delay = i * 0.08; // Stagger start times
      strokes.push(generateStroke(yOffset, delay));
    }

    let animationId: number;
    let startTime = 0;
    let lastSfxTime = 0;

    // Draw brush stroke with pressure and ink texture
    const drawStroke = (stroke: BrushStroke, currentTime: number) => {
      const { points, color, baseWidth, progress, delay } = stroke;
      if (points.length < 2) return;
      
      // Account for delay
      const adjustedProgress = Math.max(0, (currentTime - delay) / (1 - delay));
      if (adjustedProgress <= 0) return;
      
      const effectiveProgress = Math.min(1, adjustedProgress);
      const totalLen = points.length - 1;
      const drawnSegments = Math.floor(effectiveProgress * totalLen);
      const segmentProgress = (effectiveProgress * totalLen) % 1;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw completed segments
      for (let i = 0; i < drawnSegments && i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        
        // Width based on pressure
        const avgPressure = (from.pressure + to.pressure) / 2;
        const segWidth = baseWidth * avgPressure;
        
        // Slight opacity variation for texture
        ctx.globalAlpha = 0.75 + Math.random() * 0.2;
        ctx.strokeStyle = color;
        ctx.lineWidth = segWidth;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        
        // Add subtle ink splatter near edges
        if (Math.random() > 0.85) {
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(
            to.x + (Math.random() - 0.5) * segWidth,
            to.y + (Math.random() - 0.5) * segWidth,
            Math.random() * 3 + 1,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Draw partial segment (current brush position)
      if (drawnSegments < points.length - 1 && segmentProgress > 0) {
        const from = points[drawnSegments];
        const to = points[drawnSegments + 1];
        const ix = from.x + (to.x - from.x) * segmentProgress;
        const iy = from.y + (to.y - from.y) * segmentProgress;
        
        const avgPressure = (from.pressure + to.pressure) / 2;
        
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = color;
        ctx.lineWidth = baseWidth * avgPressure;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    };

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000; // seconds
      
      // Play brush sound at intervals
      if (elapsed - lastSfxTime > 0.15 && elapsed < 1.5) {
        playInkSound('brushStroke', 0.4);
        lastSfxTime = elapsed;
      }
      
      // Update stroke progress
      let allDone = true;
      strokes.forEach((stroke) => {
        const adjustedElapsed = Math.max(0, elapsed - stroke.delay);
        stroke.progress = Math.min(1, adjustedElapsed * stroke.speed * 60);
        if (stroke.progress < 1) allDone = false;
        drawStroke(stroke, elapsed);
      });

      if (!allDone && elapsed < 3) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Move to text phase
        setTimeout(() => setPhase('text'), 200);
      }
    };

    // Prefill background solid black
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cw, ch);

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // ----- Text animation -----
  useEffect(() => {
    if (phase !== 'text') return;

    if (textIndex < textParts.length) {
      playInkSound('calligraphyStroke', 0.5);
      const timer = setTimeout(() => setTextIndex((prev) => prev + 1), 400);
      return () => clearTimeout(timer);
    } else {
      playInkSound('inkFlow', 0.3);
      const timer = setTimeout(() => setPhase('fadeOut'), 800);
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
