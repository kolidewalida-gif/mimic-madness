import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Star, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface XpGain {
  id: string;
  amount: number;
  action: string;
}

interface XpGainPopupProps {
  className?: string;
}

// Global event emitter for XP gains
const xpGainListeners: Set<(gain: XpGain) => void> = new Set();

export const emitXpGain = (amount: number, action: string) => {
  const gain: XpGain = {
    id: `${Date.now()}-${Math.random()}`,
    amount,
    action,
  };
  xpGainListeners.forEach(listener => listener(gain));
};

export const XpGainPopup = ({ className }: XpGainPopupProps) => {
  const [gains, setGains] = useState<XpGain[]>([]);

  const handleGain = useCallback((gain: XpGain) => {
    setGains(prev => [...prev, gain]);
    playSoundEffect('xpGain', 0.4);
    
    // Remove after animation
    setTimeout(() => {
      setGains(prev => prev.filter(g => g.id !== gain.id));
    }, 2000);
  }, []);

  useEffect(() => {
    xpGainListeners.add(handleGain);
    return () => {
      xpGainListeners.delete(handleGain);
    };
  }, [handleGain]);

  return (
    <div className={cn("fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none", className)}>
      <AnimatePresence>
        {gains.map((gain, index) => (
          <motion.div
            key={gain.id}
            className="relative flex items-center gap-2 mb-2"
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              y: -index * 10, 
              scale: 1,
            }}
            exit={{ 
              opacity: 0, 
              y: -100, 
              scale: 0.5,
              transition: { duration: 0.3 }
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 20 
            }}
          >
            {/* Glow background */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: 2,
              }}
            />
            
            {/* Content */}
            <motion.div
              className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/90 to-accent/90 shadow-2xl shadow-primary/50 border border-white/20 backdrop-blur-sm"
              animate={{
                boxShadow: [
                  '0 0 20px hsl(var(--primary) / 0.5)',
                  '0 0 40px hsl(var(--primary) / 0.8)',
                  '0 0 20px hsl(var(--primary) / 0.5)',
                ],
              }}
              transition={{
                duration: 0.5,
                repeat: 3,
              }}
            >
              {/* Star icon with animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              </motion.div>
              
              {/* XP amount */}
              <motion.span
                className="text-lg font-black text-white drop-shadow-lg"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                +{gain.amount} XP
              </motion.span>

              {/* Sparkle decorations */}
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ 
                  scale: [0, 1.5, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{ duration: 0.8 }}
              >
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </motion.div>
              
              <motion.div
                className="absolute -bottom-1 -left-1"
                animate={{ 
                  scale: [0, 1.2, 0],
                  rotate: [360, 180, 0],
                }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <Zap className="h-3 w-3 text-yellow-300" />
              </motion.div>
            </motion.div>
            
            {/* Flying particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-yellow-300 to-primary"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 1,
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 150, 
                  y: (Math.random() - 0.5) * 100 - 50, 
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};