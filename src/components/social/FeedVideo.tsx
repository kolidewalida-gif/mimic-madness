import { useEffect, useRef, useState } from 'react';
import { videoStorage } from '@/lib/videoStorageSupabase';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedVideoProps {
  clipId: string;
  /** When true the video plays with sound at `volume`, otherwise muted */
  soundActive?: boolean;
  /** 0..1 */
  volume?: number;
  className?: string;
}

/**
 * Autoplaying, looping feed video (TikTok-style). Plays muted while in view
 * (browser autoplay policy), and unmutes at `volume` when `soundActive`.
 * Pauses automatically when scrolled out of view.
 */
export const FeedVideo = ({ clipId, soundActive = false, volume = 0.7, className }: FeedVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [clip, setClip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load signed URL + clip metadata
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const c = await videoStorage.getVideoClip(clipId);
        if (!mounted) return;
        setClip(c);
        const u = await videoStorage.getVideoUrl(clipId);
        if (!mounted) return;
        setUrl(u);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [clipId]);

  // Apply mute / volume
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !soundActive;
    el.volume = Math.max(0, Math.min(1, volume));
    if (soundActive) el.play().catch(() => {});
  }, [soundActive, volume, url]);

  // Autoplay when visible, pause when out of view
  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url]);

  const start = clip?.startTime ?? 0;
  const rawEnd = clip?.endTime ?? 0;
  const noTrim = rawEnd <= 0 || rawEnd <= start;

  const onLoaded = () => {
    const el = ref.current;
    if (el && start > 0) el.currentTime = start;
  };
  const onTime = () => {
    const el = ref.current;
    if (!el) return;
    if (!noTrim && el.currentTime >= rawEnd) {
      el.currentTime = start;
      el.play().catch(() => {});
    }
  };
  const onEnded = () => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = start;
    el.play().catch(() => {});
  };

  if (loading || !url) {
    return (
      <div className={cn('flex items-center justify-center bg-[#0a0510]', className)}>
        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <video
      ref={ref}
      src={url}
      className={cn('object-cover', className)}
      playsInline
      autoPlay
      muted
      loop={noTrim}
      preload="metadata"
      onLoadedData={onLoaded}
      onLoadedMetadata={onLoaded}
      onTimeUpdate={onTime}
      onEnded={onEnded}
    />
  );
};
