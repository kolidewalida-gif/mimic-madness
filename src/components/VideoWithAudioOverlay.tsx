import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [videoClipData, setVideoClipData] = useState<any>(null);
  const [mediaReady, setMediaReady] = useState({ video: false, audio: false });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load URLs
  useEffect(() => {
    const loadUrls = async () => {
      setIsLoading(true);
      setError(null);
      setMediaReady({ video: false, audio: false });
      
      try {
        console.log("Loading media for video:", videoClipId, "audio:", audioClipId);
        
        const [vUrl, aUrl, clipData] = await Promise.all([
          videoStorage.getVideoUrl(videoClipId),
          videoStorage.getVideoUrl(audioClipId),
          videoStorage.getVideoClip(videoClipId)
        ]);
        
        console.log("Loaded URLs - video:", vUrl, "audio:", aUrl);
        
        if (!vUrl || !aUrl) {
          setError("Impossible de charger les médias");
          return;
        }
        
        setVideoUrl(vUrl);
        setAudioUrl(aUrl);
        setVideoClipData(clipData);
      } catch (err) {
        console.error("Error loading media:", err);
        setError("Erreur de chargement des médias");
      } finally {
        setIsLoading(false);
      }
    };
    loadUrls();
  }, [videoClipId, audioClipId]);

  const handleVideoCanPlay = () => {
    console.log("Video can play");
    setMediaReady(prev => ({ ...prev, video: true }));
  };

  const handleAudioCanPlay = () => {
    console.log("Audio can play");
    setMediaReady(prev => ({ ...prev, audio: true }));
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e);
    setError("Erreur de lecture de la vidéo");
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    console.error("Audio error:", e);
    // Don't show error for audio - just play video without audio
  };

  // Sync video and audio
  const handlePlay = async () => {
    if (!videoRef.current) return;
    
    try {
      const startTime = videoClipData?.startTime ?? 0;
      videoRef.current.currentTime = startTime;
      
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      
      await videoRef.current.play();
      
      if (audioRef.current && mediaReady.audio) {
        try {
          await audioRef.current.play();
        } catch (audioErr) {
          console.warn("Could not play audio:", audioErr);
        }
      }
      
      setIsPlaying(true);
    } catch (err) {
      console.error("Play error:", err);
      setError("Erreur de lecture");
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleRestart = async () => {
    if (!videoRef.current) return;
    
    try {
      const startTime = videoClipData?.startTime ?? 0;
      videoRef.current.currentTime = startTime;
      
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      
      await videoRef.current.play();
      
      if (audioRef.current && mediaReady.audio) {
        try {
          await audioRef.current.play();
        } catch (audioErr) {
          console.warn("Could not play audio:", audioErr);
        }
      }
      
      setIsPlaying(true);
    } catch (err) {
      console.error("Restart error:", err);
    }
  };

  // Handle video end
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  if (isLoading) {
    return (
      <div className={`aspect-video bg-background-secondary/50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-foreground-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`aspect-video bg-background-secondary/50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`aspect-video bg-background-secondary/50 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-foreground-secondary">Vidéo non disponible</p>
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
          preload="auto"
          onCanPlay={handleVideoCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
        
        {/* Overlay play button when paused */}
        {!isPlaying && mediaReady.video && (
          <div 
            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
            onClick={handlePlay}
          >
            <div className="w-16 h-16 bg-secondary/90 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-secondary-foreground ml-1" />
            </div>
          </div>
        )}
        
        {/* Loading overlay */}
        {!mediaReady.video && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="auto"
          onCanPlay={handleAudioCanPlay}
          onError={handleAudioError}
        />
      )}

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePlay}
            disabled={!mediaReady.video}
          >
            <Play className="h-4 w-4 mr-2" />
            Lire
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRestart}
          disabled={!mediaReady.video}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rejouer
        </Button>
      </div>
    </div>
  );
};
