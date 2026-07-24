import { useEffect, useState, useRef, useImperativeHandle, forwardRef, Ref } from "react";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  clipId: string;
  startTime?: number;
  endTime?: number;
  className?: string;
  muted?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  /** Start playing automatically as soon as the clip is ready (TikTok-style). */
  autoPlay?: boolean;
  /** Loop the clip continuously (respects trim range). */
  loop?: boolean;
}

export const VideoPreview = ({ 
  clipId, 
  startTime, 
  endTime, 
  className = "",
  muted = false,
  videoRef: externalVideoRef,
  autoPlay = false,
  loop = false,
}: VideoPreviewProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clipData, setClipData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  
  // Use external ref if provided, otherwise use internal ref
  const videoRef = (externalVideoRef as any) || internalVideoRef;

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const loadVideo = async (retryCount = 0) => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Loading video (attempt ${retryCount + 1}):`, clipId);
        
        const clip = await videoStorage.getVideoClip(clipId);
        if (!mounted) return;
        
        if (!clip) {
          // Retry if clip not found
          if (retryCount < 3) {
            console.log(`Clip not found, retrying in ${(retryCount + 1) * 1000}ms...`);
            retryTimeout = setTimeout(() => loadVideo(retryCount + 1), (retryCount + 1) * 1000);
            return;
          }
          setError("Vidéo introuvable");
          return;
        }

        setClipData(clip);
        const url = await videoStorage.getVideoUrl(clipId);
        
        if (!mounted) return;
        
        if (!url) {
          if (retryCount < 3) {
            console.log(`URL not found, retrying in ${(retryCount + 1) * 1000}ms...`);
            retryTimeout = setTimeout(() => loadVideo(retryCount + 1), (retryCount + 1) * 1000);
            return;
          }
          setError("Vidéo introuvable");
          return;
        }
        
        setVideoUrl(url);
      } catch (err) {
        console.error("Error loading video:", err);
        if (retryCount < 3 && mounted) {
          console.log(`Error loading, retrying in ${(retryCount + 1) * 1000}ms...`);
          retryTimeout = setTimeout(() => loadVideo(retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        if (mounted) {
          setError("Erreur de chargement");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadVideo();
    
    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [clipId]);


  // Attempt playback; if the browser blocks unmuted autoplay, retry muted so
  // the clip still plays without any manual click.
  const playWithFallback = async () => {
    const el = (videoRef as any).current as HTMLVideoElement | null;
    if (!el) return;
    try {
      await el.play();
    } catch {
      try { el.muted = true; await el.play(); } catch { /* ignored */ }
    }
  };

  const handleLoadedData = () => {
    const el = (videoRef as any).current as HTMLVideoElement | null;
    if (el) {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const rawStart = startTime ?? clipData?.startTime ?? 0;
      const effectiveStartTime = Math.min(Math.max(0, rawStart), Math.max(0, duration - 0.1));
      if (effectiveStartTime > 0) {
        el.currentTime = effectiveStartTime;
      }
      if (autoPlay) void playWithFallback();
    }
  };

  const handleTimeUpdate = () => {
    const el = (videoRef as any).current as HTMLVideoElement | null;
    if (el) {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const rawStart = startTime ?? clipData?.startTime ?? 0;
      const rawEnd = endTime ?? clipData?.endTime ?? 0;
      const effectiveStartTime = Math.min(Math.max(0, rawStart), Math.max(0, duration - 0.1));
      // If endTime is 0 or <= startTime, treat as "no trim" — let video play
      // to its natural end. Clips imported via folder linking have endTime=0.
      const noTrim = rawEnd <= 0 || rawEnd <= rawStart;
      const effectiveEndTime = noTrim
        ? (duration || Number.MAX_SAFE_INTEGER)
        : Math.min(Math.max(effectiveStartTime, rawEnd), duration || Number.MAX_SAFE_INTEGER);
      if (el.currentTime >= effectiveEndTime) {
        if (loop) {
          el.currentTime = effectiveStartTime;
          void el.play().catch(() => { /* ignored */ });
        } else {
          el.pause();
          el.currentTime = effectiveStartTime;
        }
      }
    }
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const shouldBeMuted = muted || clipData?.isMuted || false;
  const rawStartForLoop = startTime ?? clipData?.startTime ?? 0;
  const rawEndForLoop = endTime ?? clipData?.endTime ?? 0;
  const noTrim = rawEndForLoop <= 0 || rawEndForLoop <= rawStartForLoop;

  return (
    <div className={`relative ${className}`}>
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedData={handleLoadedData}
          onLoadedMetadata={handleLoadedData}
          onTimeUpdate={handleTimeUpdate}
          onError={(e) => {
            console.error("Video error:", e);
            setError("Erreur de lecture de la vidéo");
          }}
          className="w-full h-full object-cover rounded-lg"
          controls={!autoPlay}
          autoPlay={autoPlay}
          loop={loop && noTrim}
          playsInline
          preload="auto"
          muted={shouldBeMuted}
        />
      )}
    </div>
  );
};
