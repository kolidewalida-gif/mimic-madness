import { useState, useEffect, useRef } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Clock, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizLiveScoreboard } from './QuizLiveScoreboard';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}

interface QuizQuestionProps {
  question: string;
  options: string[];
  category: string;
  difficulty: string;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  hasAnswered: boolean;
  answeredPlayers: string[];
  players: Player[];
  scores: QuizScore[];
  currentPlayerId: string;
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
  geographie: '🌍 Géographie',
  general: '🧠 Culture G',
  anime: '🎌 Anime',
  jeux_video: '🎮 Jeux Vidéo',
  art: '🎨 Art'
};

const difficultyColors: Record<string, string> = {
  easy: 'text-success',
  facile: 'text-success',
  medium: 'text-warning',
  moyen: 'text-warning',
  hard: 'text-destructive',
  difficile: 'text-destructive'
};

const optionColors = [
  'from-red-500/20 to-red-600/20 border-red-500/40 hover:border-red-400 hover:bg-red-500/30',
  'from-blue-500/20 to-blue-600/20 border-blue-500/40 hover:border-blue-400 hover:bg-blue-500/30',
  'from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-500/30',
  'from-green-500/20 to-green-600/20 border-green-500/40 hover:border-green-400 hover:bg-green-500/30'
];

export const QuizQuestion = ({
  question,
  options,
  category,
  difficulty,
  roundNumber,
  totalRounds,
  timeRemaining,
  hasAnswered,
  answeredPlayers,
  players,
  scores,
  currentPlayerId,
  onSubmitAnswer
}: QuizQuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const progress = (timeRemaining / TOTAL_TIME) * 100;
  const isUrgent = timeRemaining <= 5000;

  const handleSelectOption = (option: string) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    onSubmitAnswer(option);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds;
  };

  return (
    <div className="min-h-screen flex p-4 gap-4">
      {/* Left Sidebar - Live Scoreboard */}
      <div className="hidden lg:block w-72 flex-shrink-0 pt-20">
        <div className="sticky top-20">
          <QuizLiveScoreboard
            scores={scores}
            currentPlayerId={currentPlayerId}
            answeredPlayers={answeredPlayers}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
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
        <div className="w-full">
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
          "w-full text-center transition-all",
          isUrgent && "border-destructive animate-pulse"
        )}>
          <h2 className="text-xl md:text-2xl font-display font-bold leading-relaxed animate-fadeIn">
            {question}
          </h2>
        </GameCard>

        {/* QCM Options - 2x2 Grid */}
        <div className="w-full grid grid-cols-2 gap-3">
          {options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleSelectOption(option)}
              disabled={hasAnswered}
              soundEffect={hasAnswered ? 'none' : 'click'}
              className={cn(
                "h-auto min-h-[80px] p-4 text-base md:text-lg font-medium",
                "bg-gradient-to-br border-2 rounded-xl",
                "transition-all duration-300 transform",
                "flex items-center justify-center text-center whitespace-normal",
                optionColors[index % 4],
                !hasAnswered && "hover:scale-[1.02] hover:shadow-lg",
                hasAnswered && selectedOption === option && "ring-2 ring-primary scale-[1.02]",
                hasAnswered && selectedOption !== option && "opacity-50"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <span className="line-clamp-3">{option}</span>
            </Button>
          ))}
        </div>

        {/* Answer Status */}
        {hasAnswered && (
          <div className="flex items-center justify-center gap-3 py-2 text-success animate-fadeIn">
            <Check className="h-6 w-6" />
            <span className="text-lg font-semibold">Réponse envoyée !</span>
          </div>
        )}

        {/* Players who answered - Mobile */}
        <div className="flex items-center gap-2 flex-wrap justify-center lg:hidden">
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
      
      {/* Mobile Scoreboard - Collapsible at bottom */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4">
        <details className="bg-card/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <summary className="px-4 py-2 cursor-pointer font-medium text-sm flex items-center gap-2">
            <span>📊</span> Voir le classement
          </summary>
          <div className="p-3 border-t border-white/10">
            <QuizLiveScoreboard
              scores={scores}
              currentPlayerId={currentPlayerId}
              answeredPlayers={answeredPlayers}
            />
          </div>
        </details>
      </div>
    </div>
  );
};
