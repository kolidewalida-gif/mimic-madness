import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInkMode } from '@/hooks/useInkMode';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, X } from 'lucide-react';

interface DrawPoint {
  x: number;
  y: number;
  size: number;
  color: string;
}

interface DrawStroke {
  points: DrawPoint[];
  timestamp: number;
  playerId: string;
}

interface InkLobbyCanvasProps {
  lobbyId: string;
  playerId: string;
}

/**
 * Collaborative ink drawing canvas for the lobby.
 * Toggle draw mode with a button. Strokes fade after 4s.
 */
const InkLobbyCanvasComponent = ({ lobbyId, playerId }: InkLobbyCanvasProps) => {
  const { isInkMode } = useInkMode();
  const [drawMode, setDrawMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawPoint[]>([]);
  const rafRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSendRef = useRef(0);

  const FADE_DURATION = 4000;

  const broadcastStroke = useCallback((points: DrawPoint[]) => {
    if (!channelRef.current || points.length < 2) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'ink-draw',
      payload: { points, playerId, timestamp: Date.now() },
    });
  }, [playerId]);

  // Realtime channel
  useEffect(() => {
    if (!isInkMode) return;

    const channel = supabase.channel(`ink-canvas:${lobbyId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'ink-draw' }, (payload) => {
        const data = payload.payload as { points: DrawPoint[]; playerId: string; timestamp: number };
        strokesRef.current.push({
          points: data.points,
          timestamp: Date.now(),
          playerId: data.playerId,
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [lobbyId, isInkMode]);

  // Canvas rendering (always active to show others' drawings)
  useEffect(() => {
    if (!isInkMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      const now = Date.now();
      strokesRef.current = strokesRef.current.filter(s => now - s.timestamp < FADE_DURATION);

      for (const stroke of strokesRef.current) {
        const age = now - stroke.timestamp;
        const alpha = Math.max(0, 1 - age / FADE_DURATION);
        if (stroke.points.length < 2) continue;

        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < stroke.points.length; i++) {
          const prev = stroke.points[i - 1];
          const curr = stroke.points[i];
          ctx.beginPath();
          ctx.moveTo(prev.x * W, prev.y * H);
          ctx.lineTo(curr.x * W, curr.y * H);
          ctx.strokeStyle = curr.color;
          ctx.lineWidth = curr.size;
          ctx.stroke();
        }
      }

      // Current stroke
      if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        ctx.globalAlpha = 1;
        for (let i = 1; i < currentStrokeRef.current.length; i++) {
          const prev = currentStrokeRef.current[i - 1];
          const curr = currentStrokeRef.current[i];
          ctx.beginPath();
          ctx.moveTo(prev.x * W, prev.y * H);
          ctx.lineTo(curr.x * W, curr.y * H);
          ctx.strokeStyle = curr.color;
          ctx.lineWidth = curr.size;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isInkMode]);

  // Drawing input handlers - only when drawMode is on
  useEffect(() => {
    if (!isInkMode || !drawMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const pos = getPos(e);
      const isRed = Math.random() > 0.5;
      currentStrokeRef.current = [{
        x: pos.x / window.innerWidth,
        y: pos.y / window.innerHeight,
        size: 3 + Math.random() * 4,
        color: isRed ? '#dc2626' : '#1a1a1a',
      }];
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      currentStrokeRef.current.push({
        x: pos.x / window.innerWidth,
        y: pos.y / window.innerHeight,
        size: 3 + Math.random() * 4,
        color: currentStrokeRef.current[0]?.color || '#dc2626',
      });

      const now = Date.now();
      if (now - lastSendRef.current > 50 && currentStrokeRef.current.length > 2) {
        broadcastStroke([...currentStrokeRef.current]);
        lastSendRef.current = now;
      }
    };

    const onUp = () => {
      if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
        strokesRef.current.push({
          points: [...currentStrokeRef.current],
          timestamp: Date.now(),
          playerId,
        });
        broadcastStroke(currentStrokeRef.current);
      }
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [isInkMode, drawMode, playerId, broadcastStroke]);

  if (!isInkMode) return null;

  return (
    <>
      {/* Canvas - pointer-events only when drawing */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 z-[1] ${drawMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
        style={{ width: '100vw', height: '100vh', touchAction: 'none' }}
      />

      {/* Draw toggle button */}
      <motion.button
        onClick={() => setDrawMode(!drawMode)}
        className={`fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          drawMode
            ? 'bg-primary text-primary-foreground'
            : 'bg-card/80 text-primary border border-primary/30 hover:bg-primary/10'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={drawMode ? 'Arrêter de dessiner' : 'Dessiner sur le fond'}
      >
        {drawMode ? <X className="w-5 h-5" /> : <Pen className="w-5 h-5" />}
      </motion.button>

      {/* Draw mode indicator */}
      <AnimatePresence>
        {drawMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[88px] right-4 z-50 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg"
          >
            ✏️ Mode dessin actif
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const InkLobbyCanvas = memo(InkLobbyCanvasComponent);
