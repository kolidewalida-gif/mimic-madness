import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

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
  geographie: '🌍 Géographie'
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      {/* Round info */}
      <div className="text-center animate-fadeIn">
        <p className="text-foreground-muted text-lg mb-2">Question</p>
        <p className="font-display text-4xl font-bold">
          {roundNumber} <span className="text-foreground-muted">/ {totalRounds}</span>
        </p>
      </div>

      {/* Category */}
      <div className="animate-bounce-in">
        <div className="px-6 py-3 rounded-full bg-accent/20 border border-accent/30">
          <p className="text-xl font-semibold text-accent">
            {categoryLabels[category] || category}
          </p>
        </div>
      </div>

      {/* Countdown */}
      <div className="relative">
        {/* Pulsing rings */}
        <div className={cn(
          "absolute inset-0 rounded-full bg-primary/20",
          "animate-ping"
        )} style={{ animationDuration: '1s' }} />
        <div className={cn(
          "absolute inset-4 rounded-full bg-primary/30",
          "animate-ping"
        )} style={{ animationDuration: '1s', animationDelay: '0.2s' }} />
        
        {/* Main countdown number */}
        <div className={cn(
          "relative w-40 h-40 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary to-accent",
          "shadow-lg shadow-primary/50"
        )}>
          <span 
            key={count}
            className={cn(
              "font-display text-8xl font-bold text-white",
              "animate-bounce-in"
            )}
          >
            {count || "GO!"}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <p className="text-foreground-muted animate-pulse">
        Préparez-vous à répondre...
      </p>
    </div>
  );
};
