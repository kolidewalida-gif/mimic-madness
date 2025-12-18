import { useState, useEffect, useRef } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Send, Clock, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizQuestionProps {
  question: string;
  category: string;
  difficulty: string;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  hasAnswered: boolean;
  answeredPlayers: string[];
  players: Player[];
  onSubmitAnswer: (answer: string) => void;
}

const TOTAL_TIME = 30000;

const categoryLabels: Record<string, string> = {
  culture: '🎭 Culture',
  histoire: '📜 Histoire',
  youtube_fr: '📺 YouTube FR',
  musique: '🎵 Musique',
  sport: '⚽ Sport',
  cinema: '🎬 Cinéma',
  science: '🔬 Science',
  geographie: '🌍 Géographie'
};

const difficultyColors: Record<string, string> = {
  easy: 'text-success',
  medium: 'text-warning',
  hard: 'text-destructive'
};

export const QuizQuestion = ({
  question,
  category,
  difficulty,
  roundNumber,
  totalRounds,
  timeRemaining,
  hasAnswered,
  answeredPlayers,
  players,
  onSubmitAnswer
}: QuizQuestionProps) => {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const progress = (timeRemaining / TOTAL_TIME) * 100;
  const isUrgent = timeRemaining <= 5000;

  useEffect(() => {
    if (!hasAnswered && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasAnswered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasAnswered) {
      onSubmitAnswer(answer.trim());
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground-muted text-sm">Question</span>
          <span className="font-display font-bold text-lg">
            {roundNumber}/{totalRounds}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-sm",
            "bg-muted"
          )}>
            {categoryLabels[category] || category}
          </span>
          <span className={cn(
            "px-3 py-1 rounded-full text-sm font-semibold capitalize",
            difficultyColors[difficulty]
          )}>
            {difficulty}
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="w-full max-w-2xl">
        <div className={cn(
          "flex items-center justify-center gap-2 mb-2",
          isUrgent && "animate-pulse text-destructive"
        )}>
          <Clock className="h-5 w-5" />
          <span className="font-display text-3xl font-bold">
            {formatTime(timeRemaining)}
          </span>
        </div>
        <Progress 
          value={progress} 
          className={cn(
            "h-3 transition-all",
            isUrgent && "animate-pulse"
          )}
        />
      </div>

      {/* Question Card */}
      <GameCard className={cn(
        "max-w-2xl w-full text-center transition-all",
        isUrgent && "border-destructive animate-pulse"
      )}>
        <h2 className="text-2xl md:text-3xl font-display font-bold leading-relaxed animate-fadeIn">
          {question}
        </h2>
      </GameCard>

      {/* Answer Input */}
      <GameCard className="max-w-2xl w-full">
        {hasAnswered ? (
          <div className="flex items-center justify-center gap-3 py-4 text-success">
            <Check className="h-8 w-8" />
            <span className="text-xl font-semibold">Réponse envoyée !</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Tapez votre réponse..."
              className="flex-1 text-lg h-14"
              autoComplete="off"
              autoFocus
            />
            <Button 
              type="submit" 
              size="lg" 
              className="h-14 px-6"
              disabled={!answer.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        )}
      </GameCard>

      {/* Players who answered */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-foreground-muted text-sm">Ont répondu:</span>
        {players.map(p => (
          <div 
            key={p.id}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
              answeredPlayers.includes(p.id) 
                ? "bg-success/20 text-success" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {answeredPlayers.includes(p.id) ? (
              <Check className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
};
