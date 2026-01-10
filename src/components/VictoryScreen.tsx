import { motion } from 'framer-motion';
import { ParticleSystem } from './ParticleSystem';
import { AnimatedText } from './AnimatedText';
import { Trophy, Crown, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { useEffect } from 'react';

interface VictoryScreenProps {
  winnerName: string;
  winnerScore?: number;
  isTeam?: boolean;
  teamPlayers?: string[];
  onContinue?: () => void;
  showConfetti?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export const VictoryScreen = ({
  winnerName,
  winnerScore,
  isTeam = false,
  teamPlayers,
  onContinue,
  showConfetti = true,
  variant = 'full',
  className = ''
}: VictoryScreenProps) => {
  useEffect(() => {
    playSoundEffect('celebration', 0.6);
    setTimeout(() => playSoundEffect('achievementEarned', 0.5), 800);
  }, []);

  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40", className)}
      >
        <Trophy className="h-6 w-6 text-yellow-400" />
        <div>
          <p className="font-semibold">{winnerName} remporte la manche!</p>
          {winnerScore !== undefined && (
            <p className="text-sm text-muted-foreground">{winnerScore} points</p>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("relative overflow-hidden p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50", className)}
      >
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            <ParticleSystem type="confetti" count={30} loop={false} duration={5000} />
          </div>
        )}
        
        <div className="relative text-center space-y-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Trophy className="h-12 w-12 mx-auto text-yellow-400" />
          </motion.div>
          
          <div>
            <h3 className="text-xl font-display font-bold text-yellow-400">Victoire!</h3>
            <p className="font-semibold mt-1">{winnerName}</p>
            {winnerScore !== undefined && (
              <p className="text-sm text-muted-foreground">{winnerScore} points</p>
            )}
          </div>

          {onContinue && (
            <button
              onClick={onContinue}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
            >
              Continuer
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl", className)}
    >
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <ParticleSystem type="confetti" count={80} loop={false} duration={8000} />
        </div>
      )}

      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-yellow-500/20 blur-3xl"
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{ top: '20%', left: '30%' }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full bg-orange-500/15 blur-3xl"
          animate={{ 
            x: [0, -40, 0], 
            y: [0, 40, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 7, repeat: Infinity }}
          style={{ bottom: '20%', right: '30%' }}
        />
      </div>

      <div className="relative text-center space-y-8 px-4">
        {/* Crown & Trophy */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative inline-block"
        >
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
          </motion.div>
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full scale-150" />
            <div className="relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/40">
              <Trophy className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          {/* Floating stars */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: Math.cos((i / 6) * Math.PI * 2) * 80,
                y: Math.sin((i / 6) * Math.PI * 2) * 80
              }}
              transition={{ 
                duration: 2,
                delay: 0.8 + i * 0.15,
                repeat: Infinity,
                repeatDelay: 1
              }}
              style={{ top: '50%', left: '50%' }}
            >
              <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Victory text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <h1 className="text-5xl sm:text-6xl font-display font-bold">
            <AnimatedText text="VICTOIRE!" effect="wave" charDelay={50} />
          </h1>

          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            {isTeam && teamPlayers ? (
              <p className="text-2xl font-semibold text-yellow-400">
                {teamPlayers.join(' & ')}
              </p>
            ) : (
              <p className="text-2xl font-semibold text-yellow-400">
                {winnerName}
              </p>
            )}
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </div>

          {winnerScore !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50"
            >
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-display font-bold">{winnerScore}</span>
              <span className="text-muted-foreground">points</span>
            </motion.div>
          )}

          <p className="text-lg text-muted-foreground">
            remporte la partie
          </p>
        </motion.div>

        {/* Continue button */}
        {onContinue && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            onClick={() => {
              playSoundEffect('click', 0.4);
              onContinue();
            }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold text-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-1"
          >
            Continuer
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
