import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { videoStorage } from "@/lib/videoStorageSupabase";

interface VideoWithAudioOverlayProps {
  videoClipId: string;
  audioClipId: string;
  className?: string;
}

export const VideoWithAudioOverlay = ({
  videoClipId,
  audioClipId,
  className = ""
}: VideoWithAudioOverlayProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoClipData, setVideoClipData] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load URLs
  useEffect(() => {
    const loadUrls = async () => {
      setIsLoading(true);
      try {
        const [vUrl, aUrl, clipData] = await Promise.all([
          videoStorage.getVideoUrl(videoClipId),
          videoStorage.getVideoUrl(audioClipId),
          videoStorage.getVideoClip(videoClipId)
        ]);
        setVideoUrl(vUrl);
        setAudioUrl(aUrl);
        setVideoClipData(clipData);
      } catch (error) {
        console.error("Error loading media:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUrls();
  }, [videoClipId, audioClipId]);

  // Sync video and audio
  const handlePlay = () => {
    if (videoRef.current && audioRef.current) {
      const startTime = videoClipData?.startTime ?? 0;
      videoRef.current.currentTime = startTime;
      audioRef.current.currentTime = 0;
      
      videoRef.current.play();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    if (videoRef.current && audioRef.current) {
      const startTime = videoClipData?.startTime ?? 0;
      videoRef.current.currentTime = startTime;
      audioRef.current.currentTime = 0;
      
      videoRef.current.play();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle video end
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  if (isLoading) {
    return (
      <div className={`aspect-video bg-background-secondary/50 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-foreground-secondary">Chargement...</p>
      </div>
    );
  }

  if (!videoUrl || !audioUrl) {
    return (
      <div className={`aspect-video bg-background-secondary/50 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-foreground-secondary">Erreur de chargement</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video object-cover"
          muted
          playsInline
          onEnded={handleVideoEnded}
        />
        
        {/* Overlay play button when paused */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
            onClick={handlePlay}
          >
            <div className="w-16 h-16 bg-secondary/90 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-secondary-foreground ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} />

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handlePlay}>
            <Play className="h-4 w-4 mr-2" />
            Lire
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleRestart}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Rejouer
        </Button>
      </div>
    </div>
  );
};