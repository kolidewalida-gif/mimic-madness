import { useEffect, useRef, useState } from 'react';

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
  const [ready, setReady] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
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