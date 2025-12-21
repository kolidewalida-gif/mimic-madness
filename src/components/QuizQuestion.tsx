import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Clock, Check, User, Send, Zap, Brain, Timer } from 'lucide-react';
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
  questionType: 'qcm' | 'text';
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

const difficultyConfig: Record<string, { color: string; bg: string; border: string }> = {
  easy: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  facile: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  moyen: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  hard: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' },
  difficile: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' }
};

const optionStyles = [
  { gradient: 'from-rose-500/30 to-rose-600/20', border: 'border-rose-500/50', hover: 'hover:border-rose-400 hover:bg-rose-500/40', shadow: 'shadow-rose-500/20' },
  { gradient: 'from-sky-500/30 to-sky-600/20', border: 'border-sky-500/50', hover: 'hover:border-sky-400 hover:bg-sky-500/40', shadow: 'shadow-sky-500/20' },
  { gradient: 'from-amber-500/30 to-amber-600/20', border: 'border-amber-500/50', hover: 'hover:border-amber-400 hover:bg-amber-500/40', shadow: 'shadow-amber-500/20' },
  { gradient: 'from-emerald-500/30 to-emerald-600/20', border: 'border-emerald-500/50', hover: 'hover:border-emerald-400 hover:bg-emerald-500/40', shadow: 'shadow-emerald-500/20' }
];

export const QuizQuestion = ({
  question,
  options,
  questionType,
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
  const [textAnswer, setTextAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const progress = (timeRemaining / TOTAL_TIME) * 100;
  const isUrgent = timeRemaining <= 5000;
  const seconds = Math.ceil(timeRemaining / 1000);

  useEffect(() => {
    if (questionType === 'text' && inputRef.current && !hasAnswered) {
      inputRef.current.focus();
    }
  }, [questionType, hasAnswered]);

  const handleSelectOption = (option: string) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    onSubmitAnswer(option);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || !textAnswer.trim()) return;
    onSubmitAnswer(textAnswer.trim());
  };

  const diffConfig = difficultyConfig[difficulty] || difficultyConfig.medium;

  return (
    <div className="min-h-screen flex p-4 gap-6 bg-mesh relative overflow-hidden">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" style={{ animationDelay: '2s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Left Sidebar - Live Scoreboard */}
      <div className="hidden lg:block w-80 flex-shrink-0 pt-8 relative z-10">
        <div className="sticky top-8">
          <QuizLiveScoreboard
            scores={scores}
            currentPlayerId={currentPlayerId}
            answeredPlayers={answeredPlayers}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-3xl mx-auto relative z-10">
        {/* Header with meta info */}
        <div className="w-full flex items-center justify-between glass-ultra rounded-2xl px-6 py-4 animate-fadeInDown">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground-muted text-xs uppercase tracking-wider">Question</span>
              <p className="font-display font-bold text-xl text-gradient">
                {roundNumber}<span className="text-foreground-muted text-lg">/{totalRounds}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm border",
              "bg-card/50 border-border/50"
            )}>
              {categoryLabels[category] || category}
            </span>
            <span className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold capitalize",
              diffConfig.bg, diffConfig.border, diffConfig.color, "border"
            )}>
              {difficulty}
            </span>
            {questionType === 'text' && (
              <span className="px-4 py-2 rounded-xl text-sm bg-accent/20 text-accent border border-accent/40 font-medium">
                ✏️ Texte
              </span>
            )}
          </div>
        </div>

        {/* Timer - Large and prominent */}
        <div className="w-full space-y-3 animate-fadeIn">
          <div className={cn(
            "flex items-center justify-center gap-3 transition-all duration-300",
            isUrgent && "animate-pulse"
          )}>
            <div className={cn(
              "relative p-4 rounded-2xl transition-all duration-300",
              isUrgent 
                ? "bg-destructive/20 border-2 border-destructive/50 shadow-lg shadow-destructive/30" 
                : "bg-primary/20 border-2 border-primary/30"
            )}>
              <Timer className={cn("h-8 w-8", isUrgent ? "text-destructive" : "text-primary")} />
              {isUrgent && (
                <div className="absolute inset-0 bg-destructive/20 rounded-2xl animate-ping" />
              )}
            </div>
            <span className={cn(
              "font-display text-6xl font-black tracking-tight transition-colors duration-300",
              isUrgent ? "text-destructive" : "text-foreground"
            )}>
              {seconds}
            </span>
          </div>
          <div className="relative h-4 rounded-full overflow-hidden bg-muted/50 backdrop-blur-sm">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-200",
                isUrgent 
                  ? "bg-gradient-to-r from-destructive to-rose-400" 
                  : "bg-gradient-to-r from-primary to-accent"
              )}
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        </div>

        {/* Question Card */}
        <div className={cn(
          "w-full card-premium p-8 text-center transition-all duration-500 animate-fadeInUp",
          isUrgent && "border-destructive/50 shadow-lg shadow-destructive/20"
        )}>
          <h2 className="text-2xl md:text-3xl font-display font-bold leading-relaxed">
            {question}
          </h2>
        </div>

        {/* QCM Options - 2x2 Grid */}
        {questionType === 'qcm' && options && options.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            {options.map((option, index) => {
              const style = optionStyles[index % 4];
              return (
                <Button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={hasAnswered}
                  soundEffect={hasAnswered ? 'none' : 'click'}
                  className={cn(
                    "h-auto min-h-[100px] p-6 text-lg md:text-xl font-semibold",
                    "bg-gradient-to-br border-2 rounded-2xl backdrop-blur-sm",
                    "transition-all duration-300 transform gpu-accelerated",
                    "flex items-center justify-center text-center whitespace-normal",
                    style.gradient, style.border,
                    !hasAnswered && cn(style.hover, "hover:scale-[1.02] hover:shadow-xl", style.shadow),
                    hasAnswered && selectedOption === option && "ring-4 ring-primary scale-[1.02] shadow-xl shadow-primary/30",
                    hasAnswered && selectedOption !== option && "opacity-40 scale-95"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="line-clamp-3">{option}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          /* Text Input Mode */
          <form onSubmit={handleTextSubmit} className="w-full animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Tapez votre réponse..."
                  disabled={hasAnswered}
                  className={cn(
                    "h-16 text-xl px-6",
                    "glass-ultra border-2 border-primary/30",
                    "focus:border-primary focus:ring-4 focus:ring-primary/20",
                    "rounded-2xl transition-all duration-300",
                    hasAnswered && "opacity-50"
                  )}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                disabled={hasAnswered || !textAnswer.trim()}
                variant="hero"
                className="h-16 px-8 rounded-2xl"
              >
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </form>
        )}

        {/* Answer Status */}
        {hasAnswered && (
          <div className="flex items-center justify-center gap-4 py-4 px-8 rounded-2xl bg-success/20 border-2 border-success/40 animate-zoomInBounce">
            <div className="p-2 rounded-xl bg-success/30">
              <Check className="h-6 w-6 text-success" />
            </div>
            <span className="text-xl font-bold text-success">Réponse envoyée !</span>
            <Zap className="h-5 w-5 text-success animate-bounce" />
          </div>
        )}

        {/* Players who answered - Mobile */}
        <div className="flex items-center gap-3 flex-wrap justify-center lg:hidden glass-ultra rounded-2xl px-4 py-3">
          <span className="text-foreground-muted text-sm font-medium">Réponses:</span>
          {players.map(p => (
            <div 
              key={p.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300",
                answeredPlayers.includes(p.id) 
                  ? "bg-success/20 text-success border border-success/40" 
                  : "bg-muted/50 text-muted-foreground border border-muted"
              )}
            >
              {answeredPlayers.includes(p.id) ? (
                <Check className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {p.name}
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile Scoreboard - Collapsible at bottom */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-20">
        <details className="glass-ultra rounded-2xl border border-primary/30 overflow-hidden">
          <summary className="px-5 py-3 cursor-pointer font-semibold text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors">
            <span>📊</span> Voir le classement
          </summary>
          <div className="p-4 border-t border-primary/20">
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
