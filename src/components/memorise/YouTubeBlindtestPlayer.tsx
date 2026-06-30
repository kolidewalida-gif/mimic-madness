import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYouTubeApi } from '@/lib/youtube';

export interface YTBlindtestHandle {
  /** Load + start a video (optionally at a start offset, seconds). */
  load: (videoId: string, start?: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setMuted: (m: boolean) => void;
}

interface Props {
  /** Fired with true when the YouTube player actually reaches the PLAYING state. */
  onPlayingChange?: (playing: boolean) => void;
}

/**
 * Hidden YouTube player used as the Blindtest audio source.
 * The iframe is rendered (sized) but visually hidden so it can play audio;
 * the game UI shows the mystery disc on top and the answer card on reveal.
 */
export const YouTubeBlindtestPlayer = forwardRef<YTBlindtestHandle, Props>(
  ({ onPlayingChange }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<{ id: string; start: number } | null>(null);

    useEffect(() => {
      let cancelled = false;
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled || !hostRef.current) return;
          playerRef.current = new YT.Player(hostRef.current, {
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              fs: 0,
              iv_load_policy: 3,
            },
            events: {
              onReady: () => {
                readyRef.current = true;
                if (pendingRef.current) {
                  const { id, start } = pendingRef.current;
                  pendingRef.current = null;
                  try {
                    playerRef.current.loadVideoById({ videoId: id, startSeconds: start });
                    playerRef.current.playVideo?.();
                  } catch {
                    /* noop */
                  }
                }
              },
              onStateChange: (e: any) => {
                // YT.PlayerState.PLAYING === 1
                onPlayingChange?.(e?.data === 1);
              },
            },
          });
        })
        .catch(() => {
          /* API failed to load — Blindtest still runs, just без YouTube sound */
        });

      return () => {
        cancelled = true;
        try {
          playerRef.current?.destroy?.();
        } catch {
          /* noop */
        }
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
          } catch {
            /* noop */
          }
        },
        play: () => {
          try {
            playerRef.current?.playVideo?.();
          } catch {
            /* noop */
          }
        },
        pause: () => {
          try {
            playerRef.current?.pauseVideo?.();
          } catch {
            /* noop */
          }
        },
        stop: () => {
          try {
            playerRef.current?.stopVideo?.();
          } catch {
            /* noop */
          }
        },
        setMuted: (m: boolean) => {
          try {
            if (m) playerRef.current?.mute?.();
            else playerRef.current?.unMute?.();
          } catch {
            /* noop */
          }
        },
      }),
      [],
    );

    // Rendered but hidden: a sized iframe is required for playback.
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: 320,
          height: 180,
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
