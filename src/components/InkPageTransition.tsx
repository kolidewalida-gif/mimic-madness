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
  | 'inkSplash'      // Central radial ink splash with particles
  | 'brushStroke'    // Diagonal calligraphic brush wipe
  | 'drip'           // Cinematic ink drip curtain
  | 'splatter'       // Multi-burst ink splatters with shockwave
  | 'waveWipe'       // Wavy ink wipe + foam particles
  | 'shatter'        // Ink shards exploding outward
  | 'katanaSlash'    // Red katana slash + bleed
  | 'inkBleed'       // Edges bleed inward from all sides
  | 'tendrils'       // Organic ink tendrils growing
  | 'pageRip';       // Paper rip diagonal with crimson edge

const INK_TRANSITIONS: InkTransitionStyle[] = [
  'inkSplash', 'katanaSlash', 'shatter', 'brushStroke',
  'tendrils', 'inkBleed', 'pageRip', 'drip', 'splatter', 'waveWipe',
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = window.innerWidth;
    const height = window.innerHeight;
    let frame = 0;
    const maxFrames = 42; // ~700ms at 60fps for cinematic feel

    // Easing helpers
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = () => {
      const progress = frame / maxFrames;
      
      // Clear
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      switch (style) {
        case 'inkSplash': {
          // Central expanding ink splash + particle shockwave
          const centerX = width / 2;
          const centerY = height / 2;
          const maxRadius = Math.sqrt(width * width + height * height) / 2;
          const eased = easeOutExpo(progress);
          const radius = maxRadius * eased;

          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, 'rgba(8, 8, 10, 0.97)');
          gradient.addColorStop(0.55, 'rgba(20, 6, 8, 0.92)');
          gradient.addColorStop(0.78, 'rgba(220, 38, 38, 0.78)');
          gradient.addColorStop(0.92, 'rgba(140, 20, 22, 0.55)');
          gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Particle shockwave ring
          const particles = 36;
          for (let i = 0; i < particles; i++) {
            const ang = (i / particles) * Math.PI * 2 + progress * 0.4;
            const dist = radius * (0.85 + ((i * 13) % 7) / 50);
            const px = centerX + Math.cos(ang) * dist;
            const py = centerY + Math.sin(ang) * dist;
            const sz = 4 + ((i * 5) % 9) + (1 - progress) * 6;
            ctx.beginPath();
            ctx.fillStyle = i % 4 === 0 ? `rgba(220, 38, 38, ${0.7 * (1 - progress * 0.5)})` : `rgba(15, 15, 15, ${0.85 * (1 - progress * 0.3)})`;
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'brushStroke': {
          // Three parallel calligraphic brush strokes, staggered
          const baseAngle = -0.12;
          for (let s = 0; s < 3; s++) {
            const offset = (s - 1) * 80;
            const delay = s * 0.08;
            const sp = easeOutCubic(Math.max(0, Math.min(1, (progress - delay) / (1 - delay))));
            const strokeWidth = height * 1.8;
            const strokeX = -strokeWidth + (width + strokeWidth * 2) * sp;

            ctx.save();
            ctx.translate(strokeX, height / 2 + offset);
            ctx.rotate(baseAngle);

            const grad = ctx.createLinearGradient(-strokeWidth / 2, 0, strokeWidth / 2, 0);
            grad.addColorStop(0, 'rgba(10, 10, 10, 0)');
            grad.addColorStop(0.25, 'rgba(10, 10, 10, 0.96)');
            grad.addColorStop(0.5, s === 1 ? 'rgba(220, 38, 38, 0.92)' : 'rgba(10, 10, 10, 0.96)');
            grad.addColorStop(0.75, 'rgba(10, 10, 10, 0.96)');
            grad.addColorStop(1, 'rgba(10, 10, 10, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(-strokeWidth / 2, -height * 0.18, strokeWidth, height * 0.36);
            ctx.restore();
          }

          // Ink droplets following the stroke
          for (let i = 0; i < 18; i++) {
            const t = ((i * 0.07) + progress) % 1;
            const x = width * t;
            const y = height / 2 + Math.sin(i * 1.7) * 80;
            const a = (1 - Math.abs(t - 0.5) * 2) * 0.8;
            ctx.beginPath();
            ctx.fillStyle = i % 5 === 0 ? `rgba(220, 38, 38, ${a})` : `rgba(15, 15, 15, ${a})`;
            ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'drip': {
          // Cinematic ink curtain dripping from top with elongated tendrils
          const drips = 18;
          for (let i = 0; i < drips; i++) {
            const x = (width / drips) * i + (width / drips / 2);
            const delay = (i % 4) * 0.08;
            const sp = easeOutCubic(Math.max(0, Math.min(1, (progress - delay) / (1 - delay))));
            const y = height * 1.25 * sp;
            const dripWidth = 28 + Math.sin(i * 1.5) * 18;
            const isRed = i % 5 === 0;

            const grad = ctx.createLinearGradient(x, 0, x, y);
            grad.addColorStop(0, isRed ? 'rgba(220, 38, 38, 0.92)' : 'rgba(10, 10, 10, 0.96)');
            grad.addColorStop(0.7, isRed ? 'rgba(150, 24, 26, 0.78)' : 'rgba(10, 10, 10, 0.92)');
            grad.addColorStop(1, 'rgba(10, 10, 10, 0)');

            ctx.beginPath();
            ctx.moveTo(x - dripWidth / 2, -10);
            ctx.lineTo(x + dripWidth / 2, -10);
            ctx.quadraticCurveTo(x + dripWidth, y * 0.4, x + dripWidth / 4, y);
            ctx.quadraticCurveTo(x, y + 36, x - dripWidth / 4, y);
            ctx.quadraticCurveTo(x - dripWidth, y * 0.4, x - dripWidth / 2, -10);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            // Ink droplet at the tip
            if (sp > 0.6) {
              ctx.beginPath();
              ctx.fillStyle = isRed ? 'rgba(220, 38, 38, 0.9)' : 'rgba(15, 15, 15, 0.95)';
              ctx.arc(x, y + 8, 6 + Math.sin(i) * 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case 'splatter': {
          // Multi-burst splatters with central shockwave
          const splatCount = 24;
          for (let i = 0; i < splatCount; i++) {
            const delay = (i / splatCount) * 0.5;
            const sp = easeOutExpo(Math.max(0, Math.min(1, (progress - delay) / 0.5)));
            if (sp <= 0) continue;
            const x = (width * 0.08) + (width * 0.84) * (((i * 7919) % 1000) / 1000);
            const y = (height * 0.08) + (height * 0.84) * (((i * 3137) % 1000) / 1000);
            const size = (60 + (i % 6) * 40) * sp;
            const isRed = i % 3 === 0;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
            grad.addColorStop(0, isRed ? 'rgba(220, 38, 38, 0.95)' : 'rgba(8, 8, 10, 0.97)');
            grad.addColorStop(0.6, isRed ? 'rgba(170, 26, 30, 0.65)' : 'rgba(18, 18, 18, 0.75)');
            grad.addColorStop(1, 'rgba(10, 10, 10, 0)');
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Outward droplets
            for (let d = 0; d < 5; d++) {
              const a = (d / 5) * Math.PI * 2 + i;
              const dx = x + Math.cos(a) * size * 1.3;
              const dy = y + Math.sin(a) * size * 1.3;
              ctx.beginPath();
              ctx.fillStyle = isRed ? `rgba(220, 38, 38, ${0.6 * sp})` : `rgba(15, 15, 15, ${0.8 * sp})`;
              ctx.arc(dx, dy, 3 + (d % 3), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case 'waveWipe': {
          // Wavy ink tsunami wipe + foam
          const eased = easeInOutCubic(progress);
          const waveX = width * eased * 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let y = 0; y <= height; y += 4) {
            const wave = Math.sin((y / height) * Math.PI * 5 + progress * 12) * 70
                       + Math.sin((y / height) * Math.PI * 2 + progress * 6) * 30;
            ctx.lineTo(waveX + wave, y);
          }
          ctx.lineTo(0, height);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, 0, waveX, 0);
          grad.addColorStop(0, 'rgba(8, 8, 10, 0.97)');
          grad.addColorStop(0.7, 'rgba(20, 6, 8, 0.92)');
          grad.addColorStop(0.92, 'rgba(220, 38, 38, 0.75)');
          grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
          ctx.fillStyle = grad;
          ctx.fill();

          // Foam particles on the wave crest
          for (let i = 0; i < 22; i++) {
            const y = (height / 22) * i + 10;
            const wave = Math.sin((y / height) * Math.PI * 5 + progress * 12) * 70;
            const x = waveX + wave + 12 + (i % 5) * 8;
            ctx.beginPath();
            ctx.fillStyle = i % 3 === 0 ? `rgba(220, 38, 38, ${0.8 * eased})` : `rgba(20, 20, 20, ${0.9 * eased})`;
            ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'shatter': {
          // Ink shards exploding outward from center
          const cx = width / 2;
          const cy = height / 2;
          const shards = 28;
          const eased = easeOutCubic(progress);

          // Underlying dark veil that recedes
          ctx.fillStyle = `rgba(10, 10, 10, ${0.95 * (1 - eased)})`;
          ctx.fillRect(0, 0, width, height);

          for (let i = 0; i < shards; i++) {
            const ang = (i / shards) * Math.PI * 2;
            const dist = eased * Math.max(width, height) * 0.8;
            const x = cx + Math.cos(ang) * dist;
            const y = cy + Math.sin(ang) * dist;
            const size = 80 + (i % 5) * 40;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(ang + progress * 4);
            ctx.beginPath();
            ctx.moveTo(-size / 2, -8);
            ctx.lineTo(size / 2, -2);
            ctx.lineTo(size / 2 - 10, 6);
            ctx.lineTo(-size / 2 - 4, 4);
            ctx.closePath();
            ctx.fillStyle = i % 4 === 0
              ? `rgba(220, 38, 38, ${0.9 * (1 - eased * 0.6)})`
              : `rgba(10, 10, 10, ${0.95 * (1 - eased * 0.5)})`;
            ctx.fill();
            ctx.restore();
          }
          break;
        }

        case 'katanaSlash': {
          // Diagonal red katana slash + ink bleeds out from cut
          const eased = easeOutExpo(progress);

          // Background veil
          ctx.fillStyle = `rgba(10, 10, 10, ${0.92 * Math.sin(progress * Math.PI)})`;
          ctx.fillRect(0, 0, width, height);

          // The slash itself: long diagonal line
          const angle = -0.38;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate(angle);

          const slashLen = Math.sqrt(width * width + height * height) * 1.2;
          const reveal = slashLen * eased;

          // Glow
          ctx.shadowColor = 'rgba(220, 38, 38, 0.95)';
          ctx.shadowBlur = 40;
          ctx.fillStyle = 'rgba(255, 60, 60, 0.95)';
          ctx.fillRect(-slashLen / 2, -3, reveal, 6);
          ctx.shadowBlur = 0;

          // Ink bleeding from the cut (above & below)
          const bleed = 60 * easeOutCubic(progress);
          const gradTop = ctx.createLinearGradient(0, -bleed, 0, 0);
          gradTop.addColorStop(0, 'rgba(10, 10, 10, 0)');
          gradTop.addColorStop(1, 'rgba(140, 18, 22, 0.85)');
          ctx.fillStyle = gradTop;
          ctx.fillRect(-slashLen / 2, -bleed, reveal, bleed);

          const gradBot = ctx.createLinearGradient(0, 0, 0, bleed * 1.4);
          gradBot.addColorStop(0, 'rgba(180, 24, 28, 0.85)');
          gradBot.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gradBot;
          ctx.fillRect(-slashLen / 2, 0, reveal, bleed * 1.4);

          // Droplets falling from the slash
          for (let i = 0; i < 14; i++) {
            const dx = -slashLen / 2 + (reveal * (i / 14));
            const fall = Math.max(0, (progress - 0.4) * 2);
            const dy = bleed + fall * 200 * (1 + (i % 3) * 0.3);
            ctx.beginPath();
            ctx.fillStyle = `rgba(220, 38, 38, ${0.85 * (1 - fall * 0.5)})`;
            ctx.arc(dx, dy, 4 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }

        case 'inkBleed': {
          // Ink bleeds inward from all four edges
          const eased = easeOutCubic(progress);
          const depth = Math.max(width, height) * 0.6 * eased;

          // Top
          const gT = ctx.createLinearGradient(0, 0, 0, depth);
          gT.addColorStop(0, 'rgba(10, 10, 10, 0.97)');
          gT.addColorStop(0.7, 'rgba(140, 18, 22, 0.6)');
          gT.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gT;
          ctx.fillRect(0, 0, width, depth);

          // Bottom
          const gB = ctx.createLinearGradient(0, height, 0, height - depth);
          gB.addColorStop(0, 'rgba(10, 10, 10, 0.97)');
          gB.addColorStop(0.7, 'rgba(140, 18, 22, 0.6)');
          gB.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gB;
          ctx.fillRect(0, height - depth, width, depth);

          // Left
          const gL = ctx.createLinearGradient(0, 0, depth, 0);
          gL.addColorStop(0, 'rgba(10, 10, 10, 0.97)');
          gL.addColorStop(0.7, 'rgba(140, 18, 22, 0.6)');
          gL.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gL;
          ctx.fillRect(0, 0, depth, height);

          // Right
          const gR = ctx.createLinearGradient(width, 0, width - depth, 0);
          gR.addColorStop(0, 'rgba(10, 10, 10, 0.97)');
          gR.addColorStop(0.7, 'rgba(140, 18, 22, 0.6)');
          gR.addColorStop(1, 'rgba(10, 10, 10, 0)');
          ctx.fillStyle = gR;
          ctx.fillRect(width - depth, 0, depth, height);

          // Organic blobs on each edge
          for (let i = 0; i < 16; i++) {
            const side = i % 4;
            const t = ((i / 4) | 0) / 4 + (i * 0.08);
            let x = 0, y = 0;
            if (side === 0) { x = width * (t % 1); y = depth * 0.7; }
            else if (side === 1) { x = width - depth * 0.7; y = height * (t % 1); }
            else if (side === 2) { x = width * (t % 1); y = height - depth * 0.7; }
            else { x = depth * 0.7; y = height * (t % 1); }
            const size = 50 + (i % 4) * 25;
            const g = ctx.createRadialGradient(x, y, 0, x, y, size);
            g.addColorStop(0, i % 3 === 0 ? 'rgba(220, 38, 38, 0.7)' : 'rgba(10, 10, 10, 0.9)');
            g.addColorStop(1, 'rgba(10, 10, 10, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'tendrils': {
          // Organic ink tendrils growing from random anchors
          const cx = width / 2;
          const cy = height / 2;
          const veil = Math.sin(progress * Math.PI) * 0.5;
          ctx.fillStyle = `rgba(10, 10, 10, ${veil})`;
          ctx.fillRect(0, 0, width, height);

          const tendrils = 10;
          for (let i = 0; i < tendrils; i++) {
            const startAng = (i / tendrils) * Math.PI * 2;
            const startR = 40;
            const sx = cx + Math.cos(startAng) * startR;
            const sy = cy + Math.sin(startAng) * startR;
            const len = Math.max(width, height) * 0.7 * easeOutCubic(progress);
            const ex = cx + Math.cos(startAng) * (startR + len);
            const ey = cy + Math.sin(startAng) * (startR + len);
            const ctrl1x = cx + Math.cos(startAng + 0.4) * (startR + len * 0.4);
            const ctrl1y = cy + Math.sin(startAng + 0.4) * (startR + len * 0.4);
            const ctrl2x = cx + Math.cos(startAng - 0.3) * (startR + len * 0.7);
            const ctrl2y = cy + Math.sin(startAng - 0.3) * (startR + len * 0.7);

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, ex, ey);
            ctx.lineWidth = 20 + (i % 3) * 6;
            ctx.strokeStyle = i % 4 === 0 ? `rgba(220, 38, 38, 0.85)` : `rgba(10, 10, 10, 0.92)`;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Tip blob
            ctx.beginPath();
            ctx.fillStyle = i % 4 === 0 ? `rgba(220, 38, 38, 0.9)` : `rgba(10, 10, 10, 0.95)`;
            ctx.arc(ex, ey, 14 + (i % 3) * 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'pageRip': {
          // Diagonal page rip — two halves slide apart, crimson edge along the tear
          const eased = easeOutCubic(progress);
          const sep = eased * 250;

          // Top-left half
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(width, 0);
          ctx.lineTo(width * 0.7 - sep, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fillStyle = 'rgba(10, 10, 10, 0.96)';
          ctx.fill();

          // Crimson edge of top-left
          ctx.beginPath();
          ctx.moveTo(width, 0);
          for (let t = 0; t <= 1; t += 0.05) {
            const x = width + (width * 0.7 - sep - width) * t + Math.sin(t * 18) * 8;
            const y = height * t;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.95)';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();

          // Bottom-right half
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(width, 0);
          ctx.lineTo(width + sep, 0);
          ctx.lineTo(width, height);
          ctx.lineTo(width * 0.7 + sep, height);
          ctx.closePath();
          ctx.fillStyle = 'rgba(10, 10, 10, 0.96)';
          ctx.fill();

          // Ink droplets along the rip
          for (let i = 0; i < 12; i++) {
            const t = i / 12;
            const x = width + (width * 0.7 - sep - width) * t + Math.sin(t * 18) * 12;
            const y = height * t;
            ctx.beginPath();
            ctx.fillStyle = i % 3 === 0 ? `rgba(220, 38, 38, ${0.9 * eased})` : `rgba(15, 15, 15, ${0.95 * eased})`;
            ctx.arc(x, y, 5 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }

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
    if (phase === 'idle') return 'opacity-100 scale-100 blur-0';
    if (phase === 'exit') return 'opacity-40 scale-[0.985] blur-[2px]';
    return 'opacity-100 scale-100 blur-0 ink-enter-anim';
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-300 ease-out will-change-transform",
          getTransitionClass()
        )}
      >
        {displayedChildren}
      </div>
      
      {/* Ink animation canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[9999] pointer-events-none mix-blend-normal"
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
