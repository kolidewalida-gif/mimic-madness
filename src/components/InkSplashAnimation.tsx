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