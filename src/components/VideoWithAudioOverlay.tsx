import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react";
import { videoStorage } from "@/lib/videoStorageSupabase";

interface VideoWithAudioOverlayProps {
  videoClipId: string;
  audioClipId: string;
  className?: string;
  externalControl?: boolean;
  isPlayingExternal?: boolean;
  /** Authoritative elapsed position when external playback starts or resyncs. */
  playbackPositionSeconds?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
  includeOriginalAudio?: boolean;
  originalAudioVolume?: number;
}

export interface VideoWithAudioOverlayRef {
  play: () => Promise<void>;
  pause: () => void;
  restart: () => Promise<void>;
}

export const VideoWithAudioOverlay = forwardRef<VideoWithAudioOverlayRef, VideoWithAudioOverlayProps>(({
  videoClipId,
  audioClipId,
  className = "",
  externalControl = false,
  isPlayingExternal = false,
  playbackPositionSeconds = 0,
  onPlayStateChange,
  includeOriginalAudio = false,
  originalAudioVolume = 50
}, ref) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoClipData, setVideoClipData] = useState<any>(null);
  const [mediaReady, setMediaReady] = useState({ video: false, audio: false });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Update video volume when originalAudioVolume changes
  useEffect(() => {
    if (videoRef.current && includeOriginalAudio) {
      videoRef.current.volume = originalAudioVolume / 100;
    }
  }, [originalAudioVolume, includeOriginalAudio]);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    
    const loadUrls = async (retryCount = 0) => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError(null);
      setMediaReady({ video: false, audio: false });
      
      try {
        console.log(`Loading media (attempt ${retryCount + 1}) for video:`, videoClipId, "audio:", audioClipId);
        
        const [vUrl, aUrl, clipData] = await Promise.all([
          videoStorage.getVideoUrl(videoClipId),
          videoStorage.getVideoUrl(audioClipId),
          videoStorage.getVideoClip(videoClipId)
        ]);
        
        if (!isMounted) return;
        
        console.log("Loaded URLs - video:", vUrl, "audio:", aUrl);
        
        if (!vUrl || !aUrl) {
          // Retry if URLs not found
          if (retryCount < 3) {
            console.log(`URLs not found, retrying in ${(retryCount + 1) * 1000}ms...`);
            retryTimeout = setTimeout(() => loadUrls(retryCount + 1), (retryCount + 1) * 1000);
            return;
          }
          setError("Impossible de charger les médias");
          return;
        }
        
        setVideoUrl(vUrl);
        setAudioUrl(aUrl);
        setVideoClipData(clipData);
      } catch (err) {
        console.error("Error loading media:", err);
        if (retryCount < 3 && isMounted) {
          console.log(`Error loading, retrying in ${(retryCount + 1) * 1000}ms...`);
          retryTimeout = setTimeout(() => loadUrls(retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        if (isMounted) {
          setError("Erreur de chargement des médias");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadUrls();
    
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
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
  };

  const handlePlay = async (fromSeconds = 0) => {
    if (!videoRef.current) return;
    
    try {
      const startTime = videoClipData?.startTime ?? 0;
      // Seek to the authoritative elapsed position so a late or reconnected
      // client joins where everyone else already is.
      const offset = Number.isFinite(fromSeconds) ? Math.max(0, fromSeconds) : 0;
      videoRef.current.currentTime = startTime + offset;
      
      if (audioRef.current) {
        audioRef.current.currentTime = offset;
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
      onPlayStateChange?.(true);
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
    onPlayStateChange?.(false);
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
      onPlayStateChange?.(true);
    } catch (err) {
      console.error("Restart error:", err);
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: () => handlePlay(0),
    pause: handlePause,
    restart: handleRestart
  }));

  // Sync with external control - properly handle play/pause from parent
  useEffect(() => {
    if (!externalControl) return;

    if (isPlayingExternal) {
      // Wait for BOTH video and audio to be ready before playing.
      // If there is no audio URL we only need video.
      const audioReady = !audioUrl || mediaReady.audio;
      if (mediaReady.video && audioReady) {
        void handlePlay(playbackPositionSeconds);
      }
    } else {
      handlePause();
    }
  }, [
    audioUrl,
    externalControl,
    isPlayingExternal,
    mediaReady.audio,
    mediaReady.video,
    playbackPositionSeconds,
  ]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
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
          muted={!includeOriginalAudio}
          playsInline
          preload="auto"
          onCanPlay={handleVideoCanPlay}
          onLoadedData={handleVideoCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
        
        {/* Overlay play button when paused - only show if not externally controlled */}
        {!isPlaying && mediaReady.video && !externalControl && (
          <div 
            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
            onClick={() => void handlePlay(0)}
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
          onLoadedData={handleAudioCanPlay}
          onError={handleAudioError}
          onEnded={() => {
            // When the imitation audio ends, stop the video too.
            // This prevents the original video from playing past the
            // imitation duration (e.g. 40s imitation on a 1min video).
            if (videoRef.current) videoRef.current.pause();
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }}
        />
      )}

      {/* Controls - only show if not externally controlled */}
      {!externalControl && (
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
              onClick={() => void handlePlay(0)}
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
      )}
    </div>
  );
});