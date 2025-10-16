import { useEffect, useState, useRef } from "react";
import { videoStorage } from "@/lib/videoStorage";
import { Play, AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  clipId: string;
  startTime: number;
  endTime: number;
  className?: string;
}

export const VideoPreview = ({ clipId, startTime, endTime, className = "" }: VideoPreviewProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    
    const loadVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        await videoStorage.init();
        const url = await videoStorage.getVideoUrl(clipId);
        
        if (!mounted) return;
        
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
      // Cleanup blob URL when component unmounts
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [clipId]);


  const handleLoadedData = () => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= endTime) {
      videoRef.current.pause();
      videoRef.current.currentTime = startTime;
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
        />
      )}
    </div>
  );
};
