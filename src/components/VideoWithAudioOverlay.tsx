import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, AlertCircle, RefreshCcw } from "lucide-react";
import { videoStorage, type VideoClip } from "@/lib/videoStorageSupabase";

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
  /** Volume of the separate imitation track, from 0 to 1. */
  overlayAudioVolume?: number;
  /** Mutes the separate imitation track without pausing the video. */
  overlayAudioMuted?: boolean;
  /** Resume from the paused position instead of seeking to the external offset. */
  preservePositionOnResume?: boolean;
  /** Restart synchronized media when its imitation track ends. */
  loopPlayback?: boolean;
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
  originalAudioVolume = 50,
  overlayAudioVolume = 1,
  overlayAudioMuted = false,
  preservePositionOnResume = false,
  loopPlayback = false,
}, ref) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [videoClipData, setVideoClipData] = useState<VideoClip | null>(null);
  const [mediaReady, setMediaReady] = useState({ video: false, audio: false });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [sourceGeneration, setSourceGeneration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasPlaybackStartedRef = useRef(false);
  const mediaIdentityRef = useRef("");
  const forceRefreshRef = useRef(false);
  const playbackRefreshAttemptedRef = useRef(false);
  const lastExternalPositionRef = useRef<number | null>(null);
  const refreshResumeRef = useRef<{ seconds: number; requestedAt: number } | null>(null);

  /** Apply the original challenge volume whenever its element or settings change. */
  const applyOriginalVolume = () => {
    const video = videoRef.current;
    if (!video) return;
    const safe = Math.max(0, Math.min(100, Number.isFinite(originalAudioVolume) ? originalAudioVolume : 50));
    video.muted = !includeOriginalAudio;
    video.volume = includeOriginalAudio ? safe / 100 : 0;
  };

  const applyOverlayVolume = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const safe = Number.isFinite(overlayAudioVolume)
      ? Math.max(0, Math.min(1, overlayAudioVolume))
      : 1;
    audio.muted = overlayAudioMuted;
    audio.volume = safe;
  };

  useEffect(() => {
    applyOriginalVolume();
  }, [originalAudioVolume, includeOriginalAudio, videoUrl]);

  useEffect(() => {
    applyOverlayVolume();
  }, [audioUrl, overlayAudioMuted, overlayAudioVolume]);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    const identity = `${videoClipId}:${audioClipId}`;
    const identityChanged = mediaIdentityRef.current !== identity;
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    mediaIdentityRef.current = identity;
    hasPlaybackStartedRef.current = false;

    if (identityChanged) {
      // A new vote genuinely changes media. Clear the old sources while keeping
      // the same layout shell so surrounding controls never jump.
      setVideoUrl(null);
      setAudioUrl(null);
      setPosterUrl(null);
      setVideoClipData(null);
      setIsPlaying(false);
      playbackRefreshAttemptedRef.current = false;
      lastExternalPositionRef.current = null;
      refreshResumeRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    setAudioUnavailable(false);
    setMediaReady({ video: false, audio: false });

    const loadUrls = async (retryCount = 0) => {
      if (!isMounted) return;
      try {
        const [nextVideoUrl, nextAudioUrl, clipData] = await Promise.all([
          videoStorage.getVideoUrl(videoClipId, forceRefresh),
          videoStorage.getVideoUrl(audioClipId, forceRefresh),
          videoStorage.getVideoClip(videoClipId),
        ]);

        if (!isMounted) return;

        if (!nextVideoUrl || !nextAudioUrl) {
          if (retryCount < 3) {
            retryTimeout = setTimeout(
              () => void loadUrls(retryCount + 1),
              (retryCount + 1) * 1000,
            );
            return;
          }
          setError("Impossible de charger les médias");
          setIsLoading(false);
          return;
        }

        setVideoUrl(nextVideoUrl);
        setAudioUrl(nextAudioUrl);
        setVideoClipData(clipData);
        setPosterUrl(clipData ? videoStorage.getPosterUrl(clipData.storagePath) : null);
        // The generation changes even when Supabase returns the exact same
        // public URL. A post-commit effect then calls load() on the existing
        // elements so canplay/loadeddata are emitted again.
        setSourceGeneration((generation) => generation + 1);
      } catch (loadError) {
        console.error("Error loading media:", loadError);
        if (retryCount < 3 && isMounted) {
          retryTimeout = setTimeout(
            () => void loadUrls(retryCount + 1),
            (retryCount + 1) * 1000,
          );
          return;
        }
        if (isMounted) {
          setError("Erreur de chargement des médias");
          setIsLoading(false);
        }
      }
    };

    void loadUrls();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [audioClipId, refreshVersion, videoClipId]);

  // Force the existing nodes to consume a refreshed source even when its URL
  // string is unchanged (for example the public-storage fallback).
  useEffect(() => {
    if (sourceGeneration === 0) return;
    videoRef.current?.load();
    audioRef.current?.load();
  }, [sourceGeneration]);

  // URL resolution is not media readiness. Keep the stable loading overlay
  // until both tracks can actually participate in synchronized playback (or
  // until the audio element reports a genuine decode/network error).
  useEffect(() => {
    if (
      !error &&
      videoUrl &&
      mediaReady.video &&
      (!audioUrl || mediaReady.audio || audioUnavailable)
    ) {
      setIsLoading(false);
    }
  }, [audioUnavailable, audioUrl, error, mediaReady.audio, mediaReady.video, videoUrl]);

  const requestMediaRefresh = (allowAutomaticRetry: boolean) => {
    const video = videoRef.current;
    if (
      externalControl &&
      isPlayingExternal &&
      video &&
      Number.isFinite(video.currentTime)
    ) {
      const startTime = videoClipData?.startTime ?? 0;
      refreshResumeRef.current = {
        seconds: Math.max(0, video.currentTime - startTime),
        requestedAt: Date.now(),
      };
    }
    if (allowAutomaticRetry) playbackRefreshAttemptedRef.current = false;
    forceRefreshRef.current = true;
    setRefreshVersion((version) => version + 1);
  };

  const handleVideoCanPlay = () => {
    applyOriginalVolume();
    setMediaReady((previous) => previous.video
      ? previous
      : { ...previous, video: true });
  };

  const handleAudioCanPlay = () => {
    applyOverlayVolume();
    setAudioUnavailable(false);
    setMediaReady((previous) => previous.audio
      ? previous
      : { ...previous, audio: true });
  };

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", event.currentTarget.error);
    setMediaReady((previous) => previous.video
      ? { ...previous, video: false }
      : previous);

    if (!playbackRefreshAttemptedRef.current) {
      // A cached signed URL may have expired. Refresh it once without replacing
      // the video node or collapsing the media surface.
      playbackRefreshAttemptedRef.current = true;
      setIsLoading(true);
      setError(null);
      requestMediaRefresh(false);
      return;
    }

    setIsLoading(false);
    setError("Erreur de lecture de la vidéo");
  };

  const handleAudioError = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    console.error("Audio error:", event.currentTarget.error);
    // The challenge video remains controllable even when the separate
    // imitation track cannot decode. In particular, external playback must not
    // stay blocked forever waiting for an impossible `canplay` event.
    setAudioUnavailable(true);
  };

  const handlePlay = async (fromSeconds = 0, preserveCurrentPosition = false) => {
    const video = videoRef.current;
    if (!video || !mediaReady.video) return;

    try {
      const startTime = videoClipData?.startTime ?? 0;
      const shouldResume = preserveCurrentPosition && hasPlaybackStartedRef.current;
      if (shouldResume) {
        if (audioRef.current && !audioUnavailable) {
          audioRef.current.currentTime = Math.max(0, video.currentTime - startTime);
        }
      } else {
        const offset = Number.isFinite(fromSeconds) ? Math.max(0, fromSeconds) : 0;
        video.currentTime = startTime + offset;
        if (audioRef.current && !audioUnavailable) audioRef.current.currentTime = offset;
      }

      await video.play();

      if (audioRef.current && mediaReady.audio && !audioUnavailable) {
        try {
          await audioRef.current.play();
        } catch (audioError) {
          // Autoplay/Abort rejections are transient browser policy, not a
          // broken media source. Keep the track eligible for the next command.
          console.warn("Could not play audio:", audioError);
        }
      }

      hasPlaybackStartedRef.current = true;
      setIsPlaying(true);
      onPlayStateChange?.(true);
    } catch (playError) {
      console.error("Play error:", playError);
      setError("Erreur de lecture");
    }
  };

  const handlePause = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    setIsPlaying(false);
    onPlayStateChange?.(false);
  };

  const handleRestart = async () => {
    const video = videoRef.current;
    if (!video || !mediaReady.video) return;

    try {
      const startTime = videoClipData?.startTime ?? 0;
      video.currentTime = startTime;
      if (audioRef.current && !audioUnavailable) audioRef.current.currentTime = 0;

      await video.play();
      if (audioRef.current && mediaReady.audio && !audioUnavailable) {
        try {
          await audioRef.current.play();
        } catch (audioError) {
          // Autoplay/Abort rejections are transient browser policy, not a
          // broken media source. Keep the track eligible for the next command.
          console.warn("Could not play audio:", audioError);
        }
      }

      hasPlaybackStartedRef.current = true;
      setIsPlaying(true);
      onPlayStateChange?.(true);
    } catch (restartError) {
      console.error("Restart error:", restartError);
      setError("Impossible de relancer la lecture");
    }
  };

  useImperativeHandle(ref, () => ({
    play: () => handlePlay(0),
    pause: handlePause,
    restart: handleRestart,
  }));

  useEffect(() => {
    if (!externalControl) return;

    const positionChanged = lastExternalPositionRef.current === null ||
      Math.abs(lastExternalPositionRef.current - playbackPositionSeconds) > 0.05;
    lastExternalPositionRef.current = playbackPositionSeconds;

    if (isPlayingExternal) {
      const audioReady = !audioUrl || mediaReady.audio || audioUnavailable;
      if (!mediaReady.video || !audioReady) return;

      const video = videoRef.current;
      const alreadyPlaying = Boolean(
        hasPlaybackStartedRef.current && video && !video.paused,
      );

      if (alreadyPlaying && !positionChanged) {
        // Readiness/error changes must not seek the video back to the old
        // parent offset. If audio became usable later, join it to the current
        // challenge frame without restarting the reference.
        const audio = audioRef.current;
        if (audio && mediaReady.audio && !audioUnavailable && audio.paused && video) {
          const startTime = videoClipData?.startTime ?? 0;
          audio.currentTime = Math.max(0, video.currentTime - startTime);
          void audio.play().catch((audioError) => {
            console.warn("Could not resume audio:", audioError);
          });
        }
        return;
      }

      const refreshResume = refreshResumeRef.current;
      const requestedPosition = refreshResume
        ? refreshResume.seconds + Math.max(0, Date.now() - refreshResume.requestedAt) / 1000
        : playbackPositionSeconds;
      refreshResumeRef.current = null;
      void handlePlay(requestedPosition, preservePositionOnResume && !refreshResume);
    } else {
      refreshResumeRef.current = null;
      handlePause();
    }
  }, [
    audioUnavailable,
    audioUrl,
    externalControl,
    isPlayingExternal,
    mediaReady.audio,
    mediaReady.video,
    playbackPositionSeconds,
    preservePositionOnResume,
    videoClipData,
  ]);

  const handleVideoEnded = () => {
    if (loopPlayback && externalControl && isPlayingExternal && (!audioUrl || audioUnavailable)) {
      void handleRestart();
      return;
    }
    setIsPlaying(false);
    onPlayStateChange?.(false);
    audioRef.current?.pause();
  };

  return (
    <div className={`video-audio-overlay relative min-w-0 ${className}`}>
      <div className="video-audio-overlay-frame relative h-full min-h-0 w-full aspect-video overflow-hidden rounded-lg bg-black/60">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl ?? undefined}
            className="h-full w-full object-cover"
            muted={!includeOriginalAudio}
            playsInline
            preload="auto"
            onCanPlay={handleVideoCanPlay}
            onLoadedData={handleVideoCanPlay}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />
        ) : posterUrl ? (
          <img src={posterUrl} alt="" className="h-full w-full object-cover" aria-hidden="true" />
        ) : (
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        )}

        {!isPlaying && mediaReady.video && !externalControl && !error && (
          <button
            type="button"
            className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/30"
            onClick={() => void handlePlay(0)}
            aria-label="Lire l’imitation"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/90">
              <Play className="ml-1 h-8 w-8 text-secondary-foreground" aria-hidden="true" />
            </span>
          </button>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55" role="status">
            <div className="text-center text-white">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm font-bold">Préparation de la vidéo…</p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
            <div className="max-w-sm text-center text-white">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-300" aria-hidden="true" />
              <p className="mb-3 text-sm font-bold">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => requestMediaRefresh(true)}
              >
                <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && !videoUrl && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4 text-center">
            <p className="text-sm font-bold text-white/70">Vidéo non disponible</p>
          </div>
        )}

        {audioUnavailable && videoUrl && !error && (
          <div className="absolute left-2 top-2 z-20 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-black text-black">
            Audio indisponible
          </div>
        )}

        {!externalControl && videoUrl && !isLoading && !error && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
            {isPlaying ? (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePlay(0)}
                disabled={!mediaReady.video}
              >
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                Lire
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRestart()}
              disabled={!mediaReady.video}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Rejouer
            </Button>
          </div>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          className="hidden"
          onCanPlay={handleAudioCanPlay}
          onLoadedData={handleAudioCanPlay}
          onError={handleAudioError}
          onEnded={() => {
            if (loopPlayback && externalControl && isPlayingExternal) {
              void handleRestart();
              return;
            }
            videoRef.current?.pause();
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }}
        />
      )}
    </div>
  );
});
