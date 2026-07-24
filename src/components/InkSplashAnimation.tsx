import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';
const introVideo = { url: '/__l5e/assets-v1/14e83340-a764-4d6b-9e9e-ae1d1760adb3/ink-mode-intro.mp4' };

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink mode intro — title-card splash screen.
 *
 * Shows the hand-drawn intro artwork (`/intro/ink-intro.png`) with a pulsing
 * "Appuie sur une touche" prompt. The player presses any key (or clicks/taps)
 * to continue into the app.
 * - Respects `prefers-reduced-motion` (still waits for input, but no pulse).
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const doneRef = useRef(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    playInkSound('inkSplash', 0.6);
    onComplete();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore pure modifier presses
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net: if the intro video is missing (404), stalls, or never fires
  // its load/ended events, don't trap the player on a black spinner. After a
  // short wait we hide the spinner and reveal the "press any key" prompt so
  // the app is always reachable.
  useEffect(() => {
    const fallback = window.setTimeout(() => {
      setImgLoaded(true);
      setVideoEnded(true);
    }, 4000);
    return () => window.clearTimeout(fallback);
  }, []);

  const revealPrompt = () => {
    setImgLoaded(true);
    setVideoEnded(true);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black select-none cursor-pointer overflow-hidden"
      onClick={finish}
      onTouchStart={finish}
      role="button"
      tabIndex={0}
      aria-label="Appuie sur une touche pour continuer"
    >
      {/* Cinematic intro video */}
      <video
        ref={videoRef}
        src={introVideo.url}
        autoPlay
        muted
        playsInline
        onLoadedData={() => setImgLoaded(true)}
        onEnded={() => setVideoEnded(true)}
        onError={revealPrompt}
        onStalled={revealPrompt}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Final still — shown after video ends so the prompt has a clean backdrop */}
      {videoEnded && (
        <img
          src="/intro/ink-intro.png"
          alt="Mimic Master"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}

      {/* Subtle bottom gradient for text legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Pulsing "press any key" prompt */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: videoEnded ? 1 : 0, y: videoEnded ? 0 : 16 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-12 md:mb-16 text-center"
      >
        <motion.p
          animate={
            reducedMotion
              ? undefined
              : { opacity: [0.45, 1, 0.45], scale: [1, 1.06, 1] }
          }
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-3xl md:text-5xl font-black uppercase tracking-wide text-white"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow:
              '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810, 0 0 24px rgba(168,85,247,0.6)',
          }}
        >
          Appuie sur une touche
        </motion.p>
      </motion.div>

      {/* Loading spinner until artwork is ready */}
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}
    </div>
  );
};
