import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';

type TransitionType = 
  | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down'
  | 'zoom' | 'flip-x' | 'flip-y' | 'rotate'
  | 'glitch' | 'blur' | 'wipe' | 'portal' | 'morph'
  | 'cube-x' | 'cube-y' | 'fold' | 'reveal';

interface PageTransitionV2Props {
  children: ReactNode;
  transitionKey: string;
  type?: TransitionType;
  duration?: number;
  className?: string;
  playSound?: boolean;
}

const transitionVariants: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  'slide-left': {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  'slide-right': {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 }
  },
  'slide-up': {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 }
  },
  'slide-down': {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 }
  },
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 }
  },
  'flip-x': {
    initial: { rotateX: 90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 }
  },
  'flip-y': {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 }
  },
  rotate: {
    initial: { rotate: -180, scale: 0, opacity: 0 },
    animate: { rotate: 0, scale: 1, opacity: 1 },
    exit: { rotate: 180, scale: 0, opacity: 0 }
  },
  glitch: {
    initial: { 
      opacity: 0, 
      x: 0,
      filter: 'blur(10px)',
      clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)'
    },
    animate: { 
      opacity: 1, 
      x: 0,
      filter: 'blur(0px)',
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
    },
    exit: { 
      opacity: 0, 
      x: [-5, 5, -5, 0],
      filter: 'blur(10px)',
      clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)'
    }
  },
  blur: {
    initial: { filter: 'blur(20px)', opacity: 0, scale: 1.1 },
    animate: { filter: 'blur(0px)', opacity: 1, scale: 1 },
    exit: { filter: 'blur(20px)', opacity: 0, scale: 0.9 }
  },
  wipe: {
    initial: { clipPath: 'circle(0% at 50% 50%)' },
    animate: { clipPath: 'circle(150% at 50% 50%)' },
    exit: { clipPath: 'circle(0% at 50% 50%)' }
  },
  portal: {
    initial: { 
      scale: 0,
      rotate: 180,
      opacity: 0,
      filter: 'blur(20px) hue-rotate(180deg)'
    },
    animate: { 
      scale: 1,
      rotate: 0,
      opacity: 1,
      filter: 'blur(0px) hue-rotate(0deg)'
    },
    exit: { 
      scale: 2,
      opacity: 0,
      filter: 'blur(20px) hue-rotate(-180deg)'
    }
  },
  morph: {
    initial: { 
      borderRadius: '50%',
      scale: 0,
      opacity: 0
    },
    animate: { 
      borderRadius: '0%',
      scale: 1,
      opacity: 1
    },
    exit: { 
      borderRadius: '50%',
      scale: 0,
      opacity: 0
    }
  },
  'cube-x': {
    initial: { rotateX: 90, transformOrigin: 'top center', opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, transformOrigin: 'bottom center', opacity: 0 }
  },
  'cube-y': {
    initial: { rotateY: 90, transformOrigin: 'left center', opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, transformOrigin: 'right center', opacity: 0 }
  },
  fold: {
    initial: { 
      scaleY: 0,
      transformOrigin: 'top center',
      opacity: 0
    },
    animate: { 
      scaleY: 1,
      opacity: 1
    },
    exit: { 
      scaleY: 0,
      transformOrigin: 'bottom center',
      opacity: 0
    }
  },
  reveal: {
    initial: { 
      clipPath: 'inset(0 100% 0 0)',
      opacity: 0
    },
    animate: { 
      clipPath: 'inset(0 0% 0 0)',
      opacity: 1
    },
    exit: { 
      clipPath: 'inset(0 0 0 100%)',
      opacity: 0
    }
  }
};

const soundMap: Record<TransitionType, string> = {
  fade: 'transitionWoosh',
  'slide-left': 'whoosh',
  'slide-right': 'whoosh',
  'slide-up': 'transitionWoosh',
  'slide-down': 'transitionWoosh',
  zoom: 'transitionZap',
  'flip-x': 'pageFlip',
  'flip-y': 'pageFlip',
  rotate: 'transitionMagic',
  glitch: 'transitionGlitch',
  blur: 'transitionWoosh',
  wipe: 'transitionSwoosh',
  portal: 'transitionPortal',
  morph: 'morph',
  'cube-x': 'transitionMechanical',
  'cube-y': 'transitionMechanical',
  fold: 'transitionOrganic',
  reveal: 'transitionDigital'
};

export const PageTransitionV2 = ({
  children,
  transitionKey,
  type = 'fade',
  duration = 0.4,
  className = '',
  playSound = true
}: PageTransitionV2Props) => {
  useEffect(() => {
    if (playSound) {
      const soundType = soundMap[type] as Parameters<typeof playSoundEffect>[0];
      playSoundEffect(soundType, 0.3);
    }
  }, [transitionKey, type, playSound]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        variants={transitionVariants[type]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ 
          duration,
          ease: [0.4, 0, 0.2, 1]
        }}
        className={cn("w-full h-full", className)}
        style={{ perspective: 1000 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Staggered children animation
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer = ({
  children,
  staggerDelay = 0.1,
  className = ''
}: StaggerContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Hook for transition type rotation
export const useTransitionCycle = (types: TransitionType[]) => {
  const [index, setIndex] = useState(0);
  
  const next = useCallback(() => {
    setIndex(prev => (prev + 1) % types.length);
  }, [types.length]);

  const current = types[index];
  
  return { current, next, index };
};
