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
   * Schedule of SFX synced to the Remotion-rendered intro (240 frames @ 30fps = 8.0s).
   * Timings derived from MainVideo.tsx scene/sequence frames (frame * 33.33ms).
   *
   * Scene 1 — 0–2333ms : slow-mo ink drop → impact @ f32 (~1067ms) → shockwave rings
   * Scene 2 — 2333–4333ms : 3 brush wipes (f0/5/10) → mask glyph (f20) → "MIMIC?" word (f28)
   * Scene 3 — 4333–8000ms : slam flash + splash → MIMIC letters (f0–8) → MASTER letters (f12–22)
   *                          → BOOM tag (f22) → plate (f26) → signature (f40–70)
   */
  const SFX_SCHEDULE: Array<{ t: number; sound: InkSoundType; volume: number }> = [
    // ── Scene 1 : ink drop fall + impact ──────────────────────────────────
    { t: 80,   sound: 'cartoonSwoosh', volume: 0.45 }, // drop begins its slow-mo fall
    { t: 1060, sound: 'inkSplash',     volume: 0.85 }, // SPLAT — impact @ frame 32
    { t: 1070, sound: 'cartoonBoing',  volume: 0.35 }, // sub thump under the splat
    { t: 1180, sound: 'cartoonPop',    volume: 0.45 }, // first shockwave ring
    { t: 1320, sound: 'cartoonPop',    volume: 0.35 }, // second ring (CREAM)
    { t: 1460, sound: 'cartoonPop',    volume: 0.28 }, // third ring (RED_DEEP)

    // ── Scene 2 : brush wipes + mask glyph + "MIMIC?" ─────────────────────
    { t: 2333, sound: 'brushSwipe',    volume: 0.55 }, // brush stroke 1 (top, RED_DEEP)
    { t: 2500, sound: 'brushSwipe',    volume: 0.5  }, // brush stroke 2 (mid, RED)
    { t: 2667, sound: 'brushSwipe',    volume: 0.45 }, // brush stroke 3 (bottom, CREAM)
    { t: 3000, sound: 'cartoonBoing',  volume: 0.55 }, // mask glyph reveal (spring)
    { t: 3267, sound: 'cartoonSwoosh', volume: 0.35 }, // "WHO IS THE" slides in
    { t: 3400, sound: 'cartoonZap',    volume: 0.45 }, // "MIMIC?" stamp accent

    // ── Scene 3 : title slam ──────────────────────────────────────────────
    { t: 4333, sound: 'inkSplash',     volume: 0.75 }, // slam impact / whitewash flash
    { t: 4340, sound: 'cartoonBoing',  volume: 0.55 }, // camera shake / paint splash
    { t: 4400, sound: 'cartoonPop',    volume: 0.35 }, // M
    { t: 4467, sound: 'cartoonPop',    volume: 0.32 }, // I
    { t: 4533, sound: 'cartoonPop',    volume: 0.3  }, // M
    { t: 4600, sound: 'cartoonPop',    volume: 0.28 }, // I
    { t: 4667, sound: 'cartoonPop',    volume: 0.26 }, // C
    { t: 4733, sound: 'inkSplash',     volume: 0.4  }, // MASTER starts dropping
    { t: 4800, sound: 'cartoonBoing',  volume: 0.35 }, // M
    { t: 4867, sound: 'cartoonBoing',  volume: 0.32 }, // A
    { t: 4933, sound: 'cartoonBoing',  volume: 0.3  }, // S
    { t: 5000, sound: 'cartoonBoing',  volume: 0.28 }, // T
    { t: 5067, sound: 'cartoonDing',   volume: 0.5  }, // BOOM! tag pops in
    { t: 5200, sound: 'cartoonPop',    volume: 0.5  }, // subtitle plate lands
    { t: 5400, sound: 'cartoonFanfare',volume: 0.55 }, // triumphant fanfare
    { t: 6200, sound: 'cartoonDing',   volume: 0.35 }, // "A MIMICPOLY ORIGINAL" sparkle
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