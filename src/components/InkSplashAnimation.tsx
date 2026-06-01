import { useEffect, useRef, useState } from 'react';
import { playInkSound, InkSoundType } from '@/hooks/useInkSoundEffects';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink mode intro — cartoon comic video.
 *
 * Plays the pre-rendered Remotion intro (`/intro/ink-mode-intro.mp4`).
 * - Calls `onComplete()` when the video ends.
 * - Skippable via click, key press, or skip button.
 * - Safety timeout: completes after 8s even if `ended` never fires.
 * - Respects `prefers-reduced-motion` (skips straight to the app).
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const sfxTimeoutsRef = useRef<number[]>([]);
  const sfxScheduledRef = useRef(false);
  const [ready, setReady] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    sfxTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    sfxTimeoutsRef.current = [];
    onComplete();
  };

  /**
   * Schedule of SFX synced to the Remotion-rendered intro (195 frames @ 30fps ≈ 6.5s).
   * Scenes:
   *   0.0–1.5s  → ink drop + SPLAT
   *   1.5–2.8s  → masks slide in + face-swap pop
   *   2.8–4.2s  → slash + ZAP + POW
   *   4.2–6.5s  → page-slam title reveal + BAM + sparkles
   */
  const SFX_SCHEDULE: Array<{ t: number; sound: InkSoundType; volume: number }> = [
    { t: 200,  sound: 'cartoonSwoosh', volume: 0.35 }, // ink drop falling
    { t: 700,  sound: 'inkSplash',     volume: 0.6  }, // SPLAT!
    { t: 900,  sound: 'cartoonPop',    volume: 0.4  }, // splat accent
    { t: 1600, sound: 'cartoonSwoosh', volume: 0.4  }, // masks slide in
    { t: 2200, sound: 'cartoonBoing',  volume: 0.45 }, // mask face-swap bounce
    { t: 2500, sound: 'cartoonPop',    volume: 0.4  }, // mask snap
    { t: 3200, sound: 'brushSwipe',    volume: 0.45 }, // slash
    { t: 3500, sound: 'cartoonZap',    volume: 0.55 }, // ZAP!
    { t: 3800, sound: 'cartoonPop',    volume: 0.5  }, // POW stamp
    { t: 4400, sound: 'cartoonSwoosh', volume: 0.5  }, // page-slam incoming
    { t: 4700, sound: 'cartoonBoing',  volume: 0.55 }, // title slam
    { t: 4750, sound: 'inkSplash',     volume: 0.35 }, // BAM impact
    { t: 5100, sound: 'cartoonFanfare',volume: 0.5  }, // title fanfare
    { t: 5900, sound: 'cartoonDing',   volume: 0.4  }, // sparkle shimmer
  ];

  const scheduleSfx = () => {
    if (sfxScheduledRef.current || doneRef.current) return;
    sfxScheduledRef.current = true;
    SFX_SCHEDULE.forEach(({ t, sound, volume }) => {
      const id = window.setTimeout(() => {
        if (doneRef.current) return;
        playInkSound(sound, volume);
      }, t);
      sfxTimeoutsRef.current.push(id);
    });
  };

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const t = window.setTimeout(finish, 200);
      return () => window.clearTimeout(t);
    }

    // Safety net — never block on a stuck video element
    const safety = window.setTimeout(finish, 8000);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);

    // Try to play (browsers may block until user interaction — video is muted so it should work)
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {
        // Autoplay blocked — let user click to skip / continue
      });
    }

    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
      sfxTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      sfxTimeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none cursor-pointer"
      onClick={finish}
      role="button"
      aria-label="Passer l'intro"
    >
      <video
        ref={videoRef}
        src="/intro/ink-mode-intro.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        onCanPlay={() => setReady(true)}
        onPlay={scheduleSfx}
        onEnded={finish}
        className="w-full h-full object-cover"
      />

      {/* Skip hint */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white bg-black/40 hover:bg-black/60 border border-white/20 rounded-full backdrop-blur-sm transition-colors"
      >
        Passer ›
      </button>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};