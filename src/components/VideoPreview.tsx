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
}

export const VideoPreview = ({ 
  clipId, 
  startTime, 
  endTime, 
  className = "",
  muted = false,
  videoRef: externalVideoRef
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
    
    const loadVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const clip = await videoStorage.getVideoClip(clipId);
        if (!mounted) return;
        
        if (!clip) {
          setError("Vidéo introuvable");
          return;
        }

        setClipData(clip);
        const url = await videoStorage.getVideoUrl(clipId);
        
        if (!url) {
          setError("Vidéo introuvable");
          return;
        }
        
        setVideoUrl(url);
      } catch (err) {
        console.error("Error loading video:", err);
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
    };
  }, [clipId]);


  const handleLoadedData = () => {
    const el = (videoRef as any).current as HTMLVideoElement | null;
    if (el) {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const rawStart = startTime ?? clipData?.startTime ?? 0;
      const effectiveStartTime = Math.min(Math.max(0, rawStart), Math.max(0, duration - 0.1));
      if (effectiveStartTime > 0) {
        el.currentTime = effectiveStartTime;
      }
    }
  };

  const handleTimeUpdate = () => {
    const el = (videoRef as any).current as HTMLVideoElement | null;
    if (el) {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const rawStart = startTime ?? clipData?.startTime ?? 0;
      const rawEnd = endTime ?? clipData?.endTime ?? duration;
      const effectiveStartTime = Math.min(Math.max(0, rawStart), Math.max(0, duration - 0.1));
      const effectiveEndTime = Math.min(Math.max(effectiveStartTime, rawEnd), duration || Number.MAX_SAFE_INTEGER);
      if (el.currentTime >= effectiveEndTime) {
        el.pause();
        el.currentTime = effectiveStartTime;
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

  return (
    <div className={`relative ${className}`}>
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedData={handleLoadedData}
          onLoadedMetadata={handleLoadedData}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setError("Erreur de lecture de la vidéo")}
          className="w-full h-full object-cover rounded-lg"
          controls
          playsInline
          preload="metadata"
          muted={shouldBeMuted}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
};
