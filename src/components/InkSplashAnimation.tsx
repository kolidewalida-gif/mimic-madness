import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import inkSplashImage from '@/assets/ink-splash.png';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - v5
 * Uses the uploaded splash image with fade-in reveal effect
 * Dramatic red brush strokes on black background
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
  const [phase, setPhase] = useState<'reveal' | 'hold' | 'fadeOut'>('reveal');

  // Play brush stroke sounds during reveal
  useEffect(() => {
    // Initial brush stroke sound
    playInkSound('brushStroke', 0.5);
    
    const sounds = [
      setTimeout(() => playInkSound('brushStroke', 0.4), 200),
      setTimeout(() => playInkSound('calligraphyStroke', 0.5), 400),
      setTimeout(() => playInkSound('brushStroke', 0.3), 600),
      setTimeout(() => playInkSound('inkFlow', 0.4), 900),
    ];

    // Move to hold phase after reveal animation
    const holdTimer = setTimeout(() => setPhase('hold'), 1200);
    
    return () => {
      sounds.forEach(clearTimeout);
      clearTimeout(holdTimer);
    };
  }, []);

  // Hold phase then fade out
  useEffect(() => {
    if (phase === 'hold') {
      const timer = setTimeout(() => setPhase('fadeOut'), 1500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Complete animation
  useEffect(() => {
    if (phase === 'fadeOut') {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'fadeOut' ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: '#0a0a0a' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Background particles/dust effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/40"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0, 1.5, 0],
                  y: Math.random() * window.innerHeight,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main splash image with reveal animation */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            transition={{ 
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {/* Glow effect behind image */}
            <motion.div
              className="absolute inset-0 -m-20 bg-primary/20 rounded-full blur-3xl"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.6, scale: 1.2 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            />
            
            {/* The splash image */}
            <motion.img
              src={inkSplashImage}
              alt="MIMIC MASTER"
              className="max-w-[90vw] max-h-[70vh] w-auto h-auto object-contain drop-shadow-2xl"
              initial={{ 
                filter: 'brightness(0) blur(10px)',
                opacity: 0,
              }}
              animate={{ 
                filter: 'brightness(1) blur(0px)',
                opacity: 1,
              }}
              transition={{ 
                duration: 1,
                ease: 'easeOut',
              }}
              style={{
                filter: 'drop-shadow(0 0 40px hsl(0 85% 55% / 0.5))',
              }}
            />

            {/* Animated brush stroke overlay lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <motion.line
                x1="0"
                y1="30"
                x2="100"
                y2="35"
                stroke="hsl(0, 85%, 55%)"
                strokeWidth="0.3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <motion.line
                x1="0"
                y1="70"
                x2="100"
                y2="65"
                stroke="hsl(0, 85%, 55%)"
                strokeWidth="0.3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </svg>
          </motion.div>

          {/* Vignette effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
