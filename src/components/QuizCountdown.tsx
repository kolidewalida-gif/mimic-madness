import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { Brain, Zap, Sparkles, Star } from 'lucide-react';

interface QuizCountdownProps {
  roundNumber: number;
  totalRounds: number;
  category: string;
}

const categoryLabels: Record<string, string> = {
  culture: '🎭 Culture Générale',
  histoire: '📜 Histoire',
  youtube_fr: '📺 YouTube France',
  musique: '🎵 Musique',
  sport: '⚽ Sport',
  cinema: '🎬 Cinéma & Séries',
  science: '🔬 Science',
  geographie: '🌍 Géographie',
  general: '🧠 Culture Générale',
  anime: '🎌 Anime & Manga',
  jeux_video: '🎮 Jeux Vidéo',
  art: '🎨 Art',
  mixed: '🎲 Mélangé'
};

export const QuizCountdown = ({ roundNumber, totalRounds, category }: QuizCountdownProps) => {
  const [count, setCount] = useState(3);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (count > 0) {
      playSoundEffect('countdown', 0.5);
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsExiting(false);
          setCount(count - 1);
        }, 150);
      }, 850);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      playSoundEffect('countdown', 0.6);
    }
  }, [count]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb" style={{ 
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.6), transparent)', 
          top: '30%', 
          left: '40%',
          width: '400px',
          height: '400px'
        }} />
        <div className="orb orb-accent" style={{ animationDelay: '1s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Round info */}
      <div className="relative z-10 text-center space-y-2 animate-fadeInDown">
        <div className="flex items-center justify-center gap-2 text-foreground-muted text-base">
          <Brain className="h-5 w-5 text-primary" />
          <span className="uppercase tracking-widest font-semibold">Question</span>
        </div>
        <p className="font-display text-5xl md:text-6xl font-black text-gradient">
          {roundNumber} <span className="text-foreground-muted text-3xl md:text-4xl">/ {totalRounds}</span>
        </p>
      </div>

      {/* Category Badge */}
      <div className="relative z-10 animate-zoomInBounce" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-accent/40 rounded-full blur-2xl animate-pulse" />
          <div className="relative px-6 py-3 rounded-full glass-ultra border-2 border-accent/60 shadow-lg shadow-accent/20">
            <p className="text-xl font-bold text-accent">
              {categoryLabels[category] || category || '🎲 Mélangé'}
            </p>
          </div>
          {/* Sparkles */}
          <Sparkles className="absolute -top-2 -left-2 h-5 w-5 text-accent animate-float" />
          <Star className="absolute -bottom-1 -right-2 h-4 w-4 text-yellow-400 animate-float" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      {/* Countdown */}
      <div className="relative z-10">
        {/* Expanding rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-52 h-52 rounded-full border-4 border-primary/30 animate-ringExpand" />
          <div className="absolute w-52 h-52 rounded-full border-4 border-primary/20 animate-ringExpand" style={{ animationDelay: '0.5s' }} />
          <div className="absolute w-52 h-52 rounded-full border-4 border-primary/10 animate-ringExpand" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Main countdown circle */}
        <div className={cn(
          "relative w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary via-purple-600 to-accent",
          "shadow-2xl shadow-primary/50"
        )}>
          {/* Inner glow */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
          
          {/* Countdown number */}
          <span 
            key={count}
            className={cn(
              "relative font-display font-black text-white drop-shadow-lg transition-all duration-150",
              count === 0 ? "text-4xl md:text-5xl" : "text-7xl md:text-8xl",
              isExiting ? "scale-50 opacity-0" : "animate-zoomInBounce"
            )}
          >
            {count === 0 ? (
              <span className="flex items-center gap-2">
                GO<Zap className="h-8 w-8 md:h-10 md:w-10" />
              </span>
            ) : count}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="relative z-10 flex items-center gap-2 text-foreground-muted text-lg animate-pulse">
        <Zap className="h-5 w-5 text-primary" />
        <span>Préparez-vous à répondre...</span>
        <Zap className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
};