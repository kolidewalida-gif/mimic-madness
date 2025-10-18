import { useEffect, useState, useRef } from "react";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  clipId: string;
  startTime?: number;
  endTime?: number;
  className?: string;
  muted?: boolean;
}

export const VideoPreview = ({ 
  clipId, 
  startTime, 
  endTime, 
  className = "",
  muted = false 
}: VideoPreviewProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [clipData, setClipData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    if (videoRef.current) {
      const effectiveStartTime = startTime ?? clipData?.startTime ?? 0;
      if (effectiveStartTime > 0) {
        videoRef.current.currentTime = effectiveStartTime;
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const effectiveStartTime = startTime ?? clipData?.startTime ?? 0;
      const effectiveEndTime = endTime ?? clipData?.endTime ?? videoRef.current.duration;
      
      if (videoRef.current.currentTime >= effectiveEndTime) {
        videoRef.current.pause();
        videoRef.current.currentTime = effectiveStartTime;
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
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-cover rounded-lg"
          controls
          muted={shouldBeMuted}
        />
      )}
    </div>
  );
};
