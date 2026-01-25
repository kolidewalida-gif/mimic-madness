 import { useState, useEffect, useRef } from 'react';
 import { motion } from 'framer-motion';
 import introVideo from '@/assets/ink-intro-video.mp4';

interface InkSplashAnimationProps {
  onComplete: () => void;
}

/**
 * Ink Splash Animation - Video Version
 * Uses uploaded HD video with custom sound effects
 * No video audio, only synthesized ink sounds
 */
export const InkSplashAnimation = ({ onComplete }: InkSplashAnimationProps) => {
   const videoRef = useRef<HTMLVideoElement>(null);
   const audioContextRef = useRef<AudioContext | null>(null);
   const [showVideo, setShowVideo] = useState(true);

   // Initialize audio context and play synchronized sound effects
  useEffect(() => {
     const video = videoRef.current;
     if (!video) return;

     // Mute video audio
     video.muted = true;
     video.volume = 0;

     const ctx = new AudioContext();
     audioContextRef.current = ctx;

     // Play video
     video.play().catch(console.error);

     // Synthesize custom sound effects synchronized with video
     const playSoundEffect = (type: 'whoosh' | 'impact' | 'crackle' | 'rumble', delay: number) => {
       setTimeout(() => {
         const now = ctx.currentTime;
         const masterGain = ctx.createGain();
         masterGain.connect(ctx.destination);

         if (type === 'whoosh') {
           // Swoosh sound for ink splash
           const bufferSize = ctx.sampleRate * 0.8;
           const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
           const data = buffer.getChannelData(0);
           for (let i = 0; i < bufferSize; i++) {
             const progress = i / bufferSize;
             const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.5);
             data[i] = (Math.random() * 2 - 1) * envelope * 0.6;
           }
           const source = ctx.createBufferSource();
           source.buffer = buffer;
           const filter = ctx.createBiquadFilter();
           filter.type = 'lowpass';
           filter.frequency.setValueAtTime(300, now);
           filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
           filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
           source.connect(filter);
           filter.connect(masterGain);
           masterGain.gain.setValueAtTime(0.5, now);
           masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
           source.start(now);
           source.stop(now + 0.8);
         } else if (type === 'impact') {
           // Heavy impact for text appearance
           const osc = ctx.createOscillator();
           osc.type = 'sawtooth';
           osc.frequency.setValueAtTime(80, now);
           osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
           const gain = ctx.createGain();
           gain.gain.setValueAtTime(0.4, now);
           gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
           osc.connect(gain);
           gain.connect(masterGain);
           osc.start(now);
           osc.stop(now + 0.3);
         } else if (type === 'crackle') {
           // Ink crackle/drip sounds
           for (let i = 0; i < 5; i++) {
             const osc = ctx.createOscillator();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(800 + Math.random() * 400, now + i * 0.05);
             const gain = ctx.createGain();
             gain.gain.setValueAtTime(0.15, now + i * 0.05);
             gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);
             osc.connect(gain);
             gain.connect(masterGain);
             osc.start(now + i * 0.05);
             osc.stop(now + i * 0.05 + 0.08);
           }
         } else if (type === 'rumble') {
           // Deep rumble
           const osc = ctx.createOscillator();
           osc.type = 'triangle';
           osc.frequency.setValueAtTime(40, now);
           const gain = ctx.createGain();
           gain.gain.setValueAtTime(0.3, now);
           gain.gain.linearRampToValueAtTime(0, now + 1);
           osc.connect(gain);
           gain.connect(masterGain);
           osc.start(now);
           osc.stop(now + 1);
         }
       }, delay);
    };

     // Synchronized sound effects with video
     playSoundEffect('whoosh', 100);
     playSoundEffect('crackle', 400);
     playSoundEffect('impact', 800);
     playSoundEffect('whoosh', 1200);
     playSoundEffect('crackle', 1600);
     playSoundEffect('impact', 2000);
     playSoundEffect('rumble', 2400);

     // Handle video end
     const handleEnded = () => {
       setShowVideo(false);
       setTimeout(onComplete, 500);
     };

     video.addEventListener('ended', handleEnded);

     return () => {
       video.removeEventListener('ended', handleEnded);
       ctx.close();
     };
   }, [onComplete]);

   if (!showVideo) {
     return (
       <motion.div
         className="fixed inset-0 z-[9999] bg-[#0a0a0a]"
         initial={{ opacity: 1 }}
         animate={{ opacity: 0 }}
         transition={{ duration: 0.5 }}
       />
     );
   }

   return (
     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
       <video
         ref={videoRef}
         className="w-full h-full object-contain"
         playsInline
         preload="auto"
       >
         <source src={introVideo} type="video/mp4" />
       </video>
     </div>
   );
 };
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
