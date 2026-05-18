import { useEffect, useRef, useState, memo } from 'react';
import { useInkMode } from '@/hooks/useInkMode';

interface Trail {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: number;
  life: number;
}

const COLORS = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#c084fc', '#f472b6'];

/**
 * Cartoon doodle cursor — a big custom pointer with a colorful sparkle trail.
 * - Replaces the system cursor with a hand-drawn arrow + glow
 * - Spawns colorful doodle sparkles (stars, dots, squiggles) behind the cursor
 * - Big cartoon ring on click
 */
const InkCursorParticlesComponent = () => {
  const { isInkMode } = useInkMode();
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [pressed, setPressed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [trails, setTrails] = useState<Trail[]>([]);
  const trailIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isInkMode) return;

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      setPos({ x, y });

      // Compute velocity to spawn trails
      const dx = x - lastPosRef.current.x;
      const dy = y - lastPosRef.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      lastPosRef.current = { x, y };

      const now = performance.now();
      const spawnInterval = Math.max(40, 120 - velocity * 4);

      if (now - lastSpawnRef.current >= spawnInterval && velocity > 1.5) {
        lastSpawnRef.current = now;
        const id = trailIdRef.current++;
        const newTrail: Trail = {
          id,
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * 360,
          scale: 0.7 + Math.random() * 0.7,
          shape: Math.floor(Math.random() * 4),
          life: 0,
        };
        setTrails((prev) => {
          // Cap to avoid lag
          const next = [...prev, newTrail];
          if (next.length > 22) next.shift();
          return next;
        });
      }

      // Hover detection: are we over an interactive element?
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive =
          target.closest(
            'button, a, [role="button"], input, textarea, select, label, [data-cursor-hover]',
          ) !== null;
        setHovering(isInteractive);
      }
    };

    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);
    const handleLeave = () => setPos({ x: -100, y: -100 });

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, [isInkMode]);

  // Decay trails
  useEffect(() => {
    if (!isInkMode) return;
    const interval = setInterval(() => {
      setTrails((prev) => {
        const next: Trail[] = [];
        for (const t of prev) {
          if (t.life < 1) {
            next.push({ ...t, life: t.life + 0.04 });
          }
        }
        return next;
      });
    }, 32);
    return () => clearInterval(interval);
  }, [isInkMode]);

  // Hide native cursor while custom is active
  useEffect(() => {
    if (!isInkMode) {
      document.documentElement.style.cursor = '';
      return;
    }
    document.documentElement.style.cursor = 'none';
    return () => {
      document.documentElement.style.cursor = '';
    };
  }, [isInkMode]);

  if (!isInkMode) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
      {/* Sparkle trails */}
      {trails.map((t) => {
        const opacity = 1 - t.life;
        const size = 14 * t.scale * (1 - t.life * 0.5);
        return (
          <div
            key={t.id}
            className="absolute"
            style={{
              left: t.x - size / 2,
              top: t.y - size / 2,
              width: size,
              height: size,
              opacity,
              transform: `rotate(${t.rotation + t.life * 180}deg) scale(${1 - t.life * 0.4})`,
              transition: 'transform 32ms linear',
            }}
          >
            <svg viewBox="0 0 20 20" className="w-full h-full">
              {t.shape === 0 && (
                // Star
                <path
                  d="M10,2 L13,8 L19,9 L14,13 L15,19 L10,16 L5,19 L6,13 L1,9 L7,8 Z"
                  fill={t.color}
                />
              )}
              {t.shape === 1 && (
                // Circle
                <circle cx="10" cy="10" r="6" fill={t.color} />
              )}
              {t.shape === 2 && (
                // Squiggle
                <path
                  d="M2,10 Q6,3 10,10 Q14,17 18,10"
                  stroke={t.color}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              )}
              {t.shape === 3 && (
                // Sparkle
                <g stroke={t.color} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="10" y1="2" x2="10" y2="18" />
                  <line x1="2" y1="10" x2="18" y2="10" />
                </g>
              )}
            </svg>
          </div>
        );
      })}

      {/* Click ring */}
      {pressed && (
        <div
          className="absolute"
          style={{
            left: pos.x - 30,
            top: pos.y - 30,
            width: 60,
            height: 60,
          }}
        >
          <svg viewBox="0 0 60 60" className="w-full h-full">
            <circle
              cx="30"
              cy="30"
              r="22"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="6 4"
              style={{
                animation: 'doodle-cursor-burst 0.5s ease-out forwards',
              }}
            />
          </svg>
        </div>
      )}

      {/* Main cursor */}
      <div
        className="absolute"
        style={{
          left: pos.x - 4,
          top: pos.y - 4,
          width: 36,
          height: 36,
          transform: `scale(${pressed ? 0.85 : hovering ? 1.2 : 1})`,
          transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, left, top',
        }}
      >
        <svg viewBox="0 0 36 36" className="w-full h-full" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          {/* Hand-drawn arrow body */}
          <path
            d="M4,3 Q3,2 4,2 L18,16 Q19,17 18,18 L13,18 Q12.5,18 12.5,18.5 L14,28 Q14,29 13,29 L10,29 Q9,29 8.5,28 L7,18.5 Q7,18 6.5,18 L4,18 Q3,18 3,17 L4,4 Q4,3 4,3 Z"
            fill={hovering ? '#fbbf24' : '#ffffff'}
            stroke="#0a0810"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Tiny sparkle on cursor tip when hovering */}
          {hovering && (
            <g
              transform="translate(22, 4)"
              style={{ animation: 'doodle-cursor-sparkle 0.6s ease-in-out infinite' }}
            >
              <path
                d="M4,0 L5,3 L8,4 L5,5 L4,8 L3,5 L0,4 L3,3 Z"
                fill="#f87171"
                stroke="#0a0810"
                strokeWidth="0.5"
              />
            </g>
          )}
        </svg>
      </div>

      <style>{`
        @keyframes doodle-cursor-burst {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes doodle-cursor-sparkle {
          0%, 100% { transform: translate(22px, 4px) scale(1) rotate(0deg); }
          50% { transform: translate(22px, 4px) scale(1.3) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

export const InkCursorParticles = memo(InkCursorParticlesComponent);
