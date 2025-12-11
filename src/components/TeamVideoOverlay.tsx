import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { videoStorage } from '@/lib/videoStorageSupabase';

interface TeamVideoOverlayProps {
  videoClipId: string;
  audioClipId1: string;
  audioClipId2: string | null;
  includeOriginalAudio?: boolean;
  originalAudioVolume?: number;
  className?: string;
  externalControl?: boolean;
  isPlayingExternal?: boolean;
}

export interface TeamVideoOverlayRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
}

export const TeamVideoOverlay = forwardRef<TeamVideoOverlayRef, TeamVideoOverlayProps>(({
  videoClipId,
  audioClipId1,
  audioClipId2,
  includeOriginalAudio = false,
  originalAudioVolume = 50,
  className = '',
  externalControl = false,
  isPlayingExternal = false,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [videoClip, setVideoClip] = useState<any>(null);
  const [audioClip1, setAudioClip1] = useState<any>(null);
  const [audioClip2, setAudioClip2] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl1, setAudioUrl1] = useState<string | null>(null);
  const [audioUrl2, setAudioUrl2] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clips data
  useEffect(() => {
    const loadClips = async () => {
      try {
        const [vClip, aClip1, aClip2] = await Promise.all([
          videoStorage.getVideoClip(videoClipId),
          videoStorage.getVideoClip(audioClipId1),
          audioClipId2 ? videoStorage.getVideoClip(audioClipId2) : null,
        ]);

        if (vClip) {
          setVideoClip(vClip);
          const url = await videoStorage.getVideoUrl(videoClipId);
          setVideoUrl(url);
        }

        if (aClip1) {
          setAudioClip1(aClip1);
          const url = await videoStorage.getVideoUrl(audioClipId1);
          setAudioUrl1(url);
        }

        if (aClip2) {
          setAudioClip2(aClip2);
          const url = await videoStorage.getVideoUrl(audioClipId2!);
          setAudioUrl2(url);
        }
      } catch (err) {
        console.error('Error loading clips:', err);
        setError('Erreur de chargement');
      }
    };

    loadClips();
  }, [videoClipId, audioClipId1, audioClipId2]);

  // Expose control methods
  useImperativeHandle(ref, () => ({
    play: () => {
      const startTime = videoClip?.startTime ?? 0;
      if (videoRef.current) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
      }
      if (audio1Ref.current) {
        audio1Ref.current.currentTime = 0;
        audio1Ref.current.play();
      }
      if (audio2Ref.current) {
        audio2Ref.current.currentTime = 0;
        audio2Ref.current.play();
      }
      setIsPlaying(true);
    },
    pause: () => {
      videoRef.current?.pause();
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
      setIsPlaying(false);
    },
    seek: (time: number) => {
      const startTime = videoClip?.startTime ?? 0;
      if (videoRef.current) videoRef.current.currentTime = startTime + time;
      if (audio1Ref.current) audio1Ref.current.currentTime = time;
      if (audio2Ref.current) audio2Ref.current.currentTime = time;
    },
  }));

  // Handle external play/pause control
  useEffect(() => {
    if (!externalControl) return;

    const startTime = videoClip?.startTime ?? 0;

    if (isPlayingExternal) {
      if (videoRef.current) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play().catch(console.error);
      }
      if (audio1Ref.current) {
        audio1Ref.current.currentTime = 0;
        audio1Ref.current.play().catch(console.error);
      }
      if (audio2Ref.current) {
        audio2Ref.current.currentTime = 0;
        audio2Ref.current.play().catch(console.error);
      }
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
      setIsPlaying(false);
    }
  }, [isPlayingExternal, externalControl, videoClip?.startTime]);

  // Set video volume based on includeOriginalAudio
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = includeOriginalAudio ? (originalAudioVolume / 100) : 0;
      videoRef.current.muted = !includeOriginalAudio;
    }
  }, [includeOriginalAudio, originalAudioVolume]);

  // Sync audio with video
  useEffect(() => {
    const video = videoRef.current;
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!video || !audio1) return;

    const startTime = videoClip?.startTime ?? 0;
    const endTime = videoClip?.endTime ?? video.duration;

    const handleTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.pause();
        audio1.pause();
        audio2?.pause();
        video.currentTime = startTime;
        audio1.currentTime = 0;
        if (audio2) audio2.currentTime = 0;
        setIsPlaying(false);
      }
    };

    const handlePlay = () => {
      const videoTime = video.currentTime - startTime;
      audio1.currentTime = Math.max(0, videoTime);
      audio1.play().catch(console.error);
      if (audio2) {
        audio2.currentTime = Math.max(0, videoTime);
        audio2.play().catch(console.error);
      }
    };

    const handlePause = () => {
      audio1.pause();
      audio2?.pause();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoClip]);

  const handleTogglePlay = () => {
    if (externalControl) return;

    const startTime = videoClip?.startTime ?? 0;

    if (isPlaying) {
      videoRef.current?.pause();
      audio1Ref.current?.pause();
      audio2Ref.current?.pause();
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
      }
      if (audio1Ref.current) {
        audio1Ref.current.currentTime = 0;
        audio1Ref.current.play();
      }
      if (audio2Ref.current) {
        audio2Ref.current.currentTime = 0;
        audio2Ref.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  if (error) {
    return (
      <div className={`aspect-video bg-background-secondary/30 rounded-xl flex items-center justify-center ${className}`}>
        <p className="text-foreground-muted">{error}</p>
      </div>
    );
  }

  if (!videoUrl || !audioUrl1) {
    return (
      <div className={`aspect-video bg-background-secondary/30 rounded-xl flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video object-cover rounded-xl cursor-pointer"
        onClick={handleTogglePlay}
        playsInline
      />

      {/* Hidden audio elements for both teammates */}
      <audio ref={audio1Ref} src={audioUrl1} className="hidden" />
      {audioUrl2 && <audio ref={audio2Ref} src={audioUrl2} className="hidden" />}

      {/* Team overlay indicator */}
      {audioClip2 && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-secondary/80 text-xs font-display text-white">
          ÉQUIPE
        </div>
      )}

      {!externalControl && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});

TeamVideoOverlay.displayName = 'TeamVideoOverlay';
