import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { Brain, Zap, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    if (count > 0) {
      playSoundEffect('countdown', 0.4);
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-10 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb orb-primary" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent)' }} />
        <div className="orb orb-accent" style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.4), transparent)', animationDelay: '1s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Round info */}
      <div className="relative z-10 text-center space-y-2 animate-fadeInDown">
        <div className="flex items-center justify-center gap-2 text-foreground-muted text-lg">
          <Brain className="h-5 w-5 text-primary" />
          <span className="uppercase tracking-widest font-semibold">Question</span>
        </div>
        <p className="font-display text-6xl font-black text-gradient">
          {roundNumber} <span className="text-foreground-muted text-4xl">/ {totalRounds}</span>
        </p>
      </div>

      {/* Category Badge */}
      <div className="relative z-10 animate-zoomInBounce" style={{ animationDelay: '0.2s' }}>
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-accent/30 rounded-full blur-xl animate-pulse" />
          <div className="relative px-8 py-4 rounded-full glass-ultra border-2 border-accent/50 shadow-lg shadow-accent/20">
            <p className="text-2xl font-bold text-accent">
              {categoryLabels[category] || category || '🎲 Mélangé'}
            </p>
          </div>
          {/* Sparkles */}
          <Sparkles className="absolute -top-2 -left-2 h-6 w-6 text-accent animate-float" />
          <Sparkles className="absolute -bottom-2 -right-2 h-6 w-6 text-accent animate-float" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      {/* Countdown */}
      <div className="relative z-10">
        {/* Multiple pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-56 h-56 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '1s' }} />
          <div className="absolute w-48 h-48 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.15s' }} />
          <div className="absolute w-40 h-40 rounded-full border-4 border-primary/50 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.3s' }} />
        </div>
        
        {/* Main countdown circle */}
        <div className={cn(
          "relative w-48 h-48 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary via-primary-hover to-accent",
          "shadow-2xl shadow-primary/50"
        )}>
          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Countdown number */}
          <span 
            key={count}
            className={cn(
              "relative font-display font-black text-white drop-shadow-lg",
              count === 0 ? "text-5xl" : "text-9xl",
              "animate-zoomInBounce"
            )}
          >
            {count === 0 ? (
              <span className="flex items-center gap-2">
                GO<Zap className="h-10 w-10" />
              </span>
            ) : count}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="relative z-10 flex items-center gap-3 text-foreground-muted text-xl animate-pulse">
        <Zap className="h-6 w-6 text-primary" />
        <span>Préparez-vous à répondre...</span>
        <Zap className="h-6 w-6 text-primary" />
      </div>
    </div>
  );
};
