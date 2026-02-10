import { useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useInkMode } from '@/hooks/useInkMode';

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
 * Players in Ink mode can draw on the background.
 * Strokes are broadcast via Supabase Realtime and fade after 4 seconds.
 */
const InkLobbyCanvasComponent = ({ lobbyId, playerId }: InkLobbyCanvasProps) => {
  const { isInkMode } = useInkMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawPoint[]>([]);
  const rafRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSendRef = useRef(0);

  const FADE_DURATION = 4000; // 4 seconds

  // Send stroke via realtime
  const broadcastStroke = useCallback((points: DrawPoint[]) => {
    if (!channelRef.current || points.length < 2) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'ink-draw',
      payload: { points, playerId, timestamp: Date.now() },
    });
  }, [playerId]);

  // Setup realtime channel
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

  // Canvas setup & animation loop
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

    // Mouse/touch handlers
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
      const point: DrawPoint = {
        x: pos.x / window.innerWidth,
        y: pos.y / window.innerHeight,
        size: 3 + Math.random() * 4,
        color: currentStrokeRef.current[0]?.color || '#dc2626',
      };
      currentStrokeRef.current.push(point);

      // Send periodically
      const now = Date.now();
      if (now - lastSendRef.current > 50 && currentStrokeRef.current.length > 2) {
        broadcastStroke([...currentStrokeRef.current]);
        lastSendRef.current = now;
      }
    };

    const onUp = () => {
      if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
        const stroke: DrawStroke = {
          points: [...currentStrokeRef.current],
          timestamp: Date.now(),
          playerId,
        };
        strokesRef.current.push(stroke);
        broadcastStroke(stroke.points);
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

    // Render loop
    const animate = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      const now = Date.now();

      // Remove expired strokes
      strokesRef.current = strokesRef.current.filter(s => now - s.timestamp < FADE_DURATION);

      // Draw strokes
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

      // Draw current stroke (being drawn right now)
      if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
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
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isInkMode, playerId, broadcastStroke]);

  if (!isInkMode) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] cursor-crosshair"
      style={{ width: '100vw', height: '100vh', touchAction: 'none' }}
    />
  );
};

export const InkLobbyCanvas = memo(InkLobbyCanvasComponent);
