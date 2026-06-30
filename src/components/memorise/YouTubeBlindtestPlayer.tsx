import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYouTubeApi } from '@/lib/youtube';

export interface YTBlindtestHandle {
  /** Load + start a video (optionally at a start offset, seconds). */
  load: (videoId: string, start?: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setMuted: (m: boolean) => void;
  /** 0–100 */
  setVolume: (v: number) => void;
}

interface Props {
  /** Fired with true when the player actually reaches the PLAYING state. */
  onPlayingChange?: (playing: boolean) => void;
  /** Fired with the YouTube error code when a video can't be played
   * (100 removed/private, 101/150 embedding disabled, 2 bad id, 5 html5). */
  onError?: (code: number) => void;
  /** Default volume 0–100. */
  defaultVolume?: number;
}

/**
 * Hidden YouTube player used as the Blindtest audio source.
 * The iframe is rendered at a valid size (≥200px, 16:9) but visually hidden so
 * it can play audio; the game UI shows the mystery disc / answer card on top.
 */
export const YouTubeBlindtestPlayer = forwardRef<YTBlindtestHandle, Props>(
  ({ onPlayingChange, onError, defaultVolume = 75 }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{ id: string; start: number } | null>(null);
    const volRef = useRef(defaultVolume);

    useEffect(() => {
      let cancelled = false;
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled || !hostRef.current) return;
          playerRef.current = new YT.Player(hostRef.current, {
            width: '480',
            height: '270',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              fs: 0,
              iv_load_policy: 3,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                readyRef.current = true;
                try { playerRef.current.setVolume(volRef.current); } catch { /* noop */ }
                if (pendingRef.current) {
                  const { id, start } = pendingRef.current;
                  pendingRef.current = null;
                  try {
                    playerRef.current.loadVideoById({ videoId: id, startSeconds: start });
                    playerRef.current.playVideo?.();
                  } catch { /* noop */ }
                }
              },
              onStateChange: (e: any) => {
                onPlayingChange?.(e?.data === 1); // 1 = PLAYING
              },
              onError: (e: any) => {
                onError?.(Number(e?.data ?? -1));
              },
            },
          });
        })
        .catch(() => { /* API failed — game still runs, just без YouTube sound */ });

      return () => {
        cancelled = true;
        try { playerRef.current?.destroy?.(); } catch { /* noop */ }
        playerRef.current = null;
        readyRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        load: (videoId: string, start = 0) => {
          if (!readyRef.current || !playerRef.current) {
            pendingRef.current = { id: videoId, start };
            return;
          }
          try {
            playerRef.current.loadVideoById({ videoId, startSeconds: start });
            playerRef.current.playVideo?.();
          } catch { /* noop */ }
        },
        play: () => { try { playerRef.current?.playVideo?.(); } catch { /* noop */ } },
        pause: () => { try { playerRef.current?.pauseVideo?.(); } catch { /* noop */ } },
        stop: () => { try { playerRef.current?.stopVideo?.(); } catch { /* noop */ } },
        setMuted: (m: boolean) => {
          try { if (m) playerRef.current?.mute?.(); else playerRef.current?.unMute?.(); } catch { /* noop */ }
        },
        setVolume: (v: number) => {
          volRef.current = v;
          try { playerRef.current?.setVolume?.(v); if (v > 0) playerRef.current?.unMute?.(); } catch { /* noop */ }
        },
      }),
      [],
    );

    // Rendered but hidden (a sized iframe is required for playback).
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: 480,
          height: 270,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div ref={hostRef} className="w-full h-full" />
      </div>
    );
  },
);

YouTubeBlindtestPlayer.displayName = 'YouTubeBlindtestPlayer';
