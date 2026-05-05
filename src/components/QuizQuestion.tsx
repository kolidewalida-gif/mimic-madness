import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Check, Send, Zap, Brain, Timer, AlertTriangle, Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizLiveScoreboard } from './QuizLiveScoreboard';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { QuizJokers, type JokersState } from './QuizJokers';

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
  totalTime?: number;
  hasAnswered: boolean;
  answeredPlayers: string[];
  players: Player[];
  scores: QuizScore[];
  currentPlayerId: string;
  onSubmitAnswer: (answer: string) => void;
  jokers?: JokersState | null;
  onFiftyFifty?: () => void;
  onFreeze?: () => void;
  onSkip?: () => void;
  hiddenOptions?: string[];
  currentStreak?: number;
  bestStreak?: number;
}


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
  art: '🎨 Art',
  mixed: '🎲 Mélangé'
};

const difficultyConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  easy: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', label: 'Facile' },
  facile: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', label: 'Facile' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', label: 'Moyen' },
  moyen: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', label: 'Moyen' },
  hard: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', label: 'Difficile' },
  difficile: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', label: 'Difficile' }
};

const optionStyles = [
  { bg: 'bg-gradient-to-br from-rose-600/40 to-rose-700/30', border: 'border-rose-500/60', hover: 'hover:from-rose-500/50 hover:to-rose-600/40 hover:border-rose-400', glow: 'shadow-rose-500/30', letter: 'A' },
  { bg: 'bg-gradient-to-br from-sky-600/40 to-sky-700/30', border: 'border-sky-500/60', hover: 'hover:from-sky-500/50 hover:to-sky-600/40 hover:border-sky-400', glow: 'shadow-sky-500/30', letter: 'B' },
  { bg: 'bg-gradient-to-br from-amber-600/40 to-amber-700/30', border: 'border-amber-500/60', hover: 'hover:from-amber-500/50 hover:to-amber-600/40 hover:border-amber-400', glow: 'shadow-amber-500/30', letter: 'C' },
  { bg: 'bg-gradient-to-br from-emerald-600/40 to-emerald-700/30', border: 'border-emerald-500/60', hover: 'hover:from-emerald-500/50 hover:to-emerald-600/40 hover:border-emerald-400', glow: 'shadow-emerald-500/30', letter: 'D' }
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
  totalTime = 30000,
  hasAnswered,
  answeredPlayers,
  players,
  scores,
  currentPlayerId,
  onSubmitAnswer,
  jokers,
  onFiftyFifty,
  onFreeze,
  onSkip,
  hiddenOptions = [],
  currentStreak = 0,
  bestStreak = 0,
}: QuizQuestionProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const progress = (timeRemaining / totalTime) * 100;
  const isUrgent = timeRemaining <= 5000;
  const isCritical = timeRemaining <= 3000;
  const seconds = Math.ceil(timeRemaining / 1000);

  useEffect(() => {
    if (questionType === 'text' && inputRef.current && !hasAnswered) {
      inputRef.current.focus();
    }
  }, [questionType, hasAnswered]);

  // Play tick sound when urgent
  useEffect(() => {
    if (isUrgent && !hasAnswered && seconds > 0) {
      playSoundEffect('countdown', 0.3);
    }
  }, [seconds, isUrgent, hasAnswered]);

  const handleSelectOption = (option: string) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    playSoundEffect('click', 0.4);
    onSubmitAnswer(option);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || !textAnswer.trim()) return;
    playSoundEffect('click', 0.4);
    onSubmitAnswer(textAnswer.trim());
  };

  const diffConfig = difficultyConfig[difficulty] || difficultyConfig.medium;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-4 gap-6 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className={cn(
          "orb transition-all duration-1000",
          isUrgent ? "orb-destructive" : "orb-primary"
        )} />
        <div className="orb orb-accent" style={{ animationDelay: '2s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Left Sidebar - Live Scoreboard */}
      <div className="hidden lg:block w-72 flex-shrink-0 pt-4 relative z-10">
        <div className="sticky top-4 animate-slideInLeft">
          <QuizLiveScoreboard
            scores={scores}
            currentPlayerId={currentPlayerId}
            answeredPlayers={answeredPlayers}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-3xl mx-auto relative z-10">
        {/* Header with meta info */}
        <div className="w-full flex items-center justify-between glass-ultra rounded-2xl px-5 py-3 animate-fadeInDown">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground-muted text-xs uppercase tracking-wider">Question</span>
              <p className="font-display font-bold text-lg text-gradient">
                {roundNumber}<span className="text-foreground-muted text-base">/{totalRounds}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-sm border bg-card/50 border-border/50">
              {categoryLabels[category] || category}
            </span>
            <span className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold",
              diffConfig.bg, diffConfig.border, diffConfig.color, "border"
            )}>
              {diffConfig.label}
            </span>
          </div>
        </div>

        {/* Timer - Circular design */}
        <div className="relative animate-fadeIn">
          {/* Expanding rings when urgent */}
          {isUrgent && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-destructive/40 animate-ringExpand" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
                <div className="w-32 h-32 rounded-full border-2 border-destructive/30 animate-ringExpand" style={{ animationDelay: '0.5s' }} />
              </div>
            </>
          )}
          
          {/* Timer circle */}
          <div className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
            "border-4",
            isCritical 
              ? "border-destructive bg-destructive/20 animate-timerUrgent" 
              : isUrgent 
                ? "border-warning bg-warning/10" 
                : "border-primary/50 bg-primary/10"
          )}>
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className={cn(
                  "transition-all duration-200",
                  isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-primary"
                )}
                strokeDasharray={`${progress * 2.89} 289`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer icon and number */}
            <div className="relative flex flex-col items-center">
              <Timer className={cn(
                "h-5 w-5 mb-1 transition-colors",
                isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-primary"
              )} />
              <span className={cn(
                "font-display text-3xl font-black transition-colors",
                isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-foreground"
              )}>
                {seconds}
              </span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className={cn(
          "w-full card-premium p-6 text-center transition-all duration-500 animate-zoomInBounce",
          isCritical && "border-destructive/50 shadow-glow-destructive"
        )}>
          <h2 className="text-xl md:text-2xl font-display font-bold leading-relaxed">
            {question}
          </h2>
        </div>

        {/* Streak indicator */}
        {currentStreak >= 2 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/40 animate-pulse">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-300">Série x{currentStreak}</span>
            {bestStreak > currentStreak && (
              <span className="text-xs text-orange-300/70 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> {bestStreak}
              </span>
            )}
          </div>
        )}

        {/* Jokers */}
        {jokers && !hasAnswered && (
          <QuizJokers
            jokers={jokers}
            onUseFiftyFifty={() => onFiftyFifty?.()}
            onUseFreeze={() => onFreeze?.()}
            onUseSkip={() => onSkip?.()}
            disabled={hasAnswered}
          />
        )}

        {/* QCM Options - 2x2 Grid */}
        {questionType === 'qcm' && options && options.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((option, index) => {
              const style = optionStyles[index % 4];
              const isSelected = selectedOption === option;
              const isHidden = hiddenOptions.includes(option);
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  disabled={hasAnswered || isHidden}
                  className={cn(
                    "relative h-auto min-h-[90px] p-5 text-left",
                    "border-2 rounded-2xl backdrop-blur-sm",
                    "transition-all duration-300 transform",
                    "flex items-center gap-4",
                    "animate-optionAppear",
                    style.bg, style.border,
                    !hasAnswered && !isHidden && cn(style.hover, "hover:scale-[1.02] hover:shadow-lg", style.glow, "active:scale-[0.98]"),
                    isSelected && "ring-4 ring-primary/60 scale-[1.02] shadow-xl shadow-primary/30",
                    hasAnswered && !isSelected && "opacity-40 scale-95",
                    isHidden && "opacity-20 grayscale line-through"
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Letter badge */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                    "font-display font-black text-lg",
                    "bg-white/10 border border-white/20"
                  )}>
                    {style.letter}
                  </div>
                  
                  {/* Option text */}
                  <span className="text-base md:text-lg font-semibold line-clamp-3 flex-1">
                    {option}
                  </span>
                  
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scaleIn">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Text Input Mode */
          <form onSubmit={handleTextSubmit} className="w-full animate-fadeInUp">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Tapez votre réponse..."
                  disabled={hasAnswered}
                  className={cn(
                    "h-14 text-lg px-5",
                    "glass-ultra border-2 border-primary/30",
                    "focus:border-primary focus:ring-4 focus:ring-primary/20",
                    "rounded-xl transition-all duration-300",
                    hasAnswered && "opacity-50"
                  )}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                disabled={hasAnswered || !textAnswer.trim()}
                variant="hero"
                className="h-14 px-6 rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        )}

        {/* Answer Status */}
        {hasAnswered && (
          <div className="flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-success/20 border-2 border-success/40 animate-zoomInBounce shadow-glow-success">
            <div className="p-1.5 rounded-lg bg-success/30">
              <Check className="h-5 w-5 text-success" />
            </div>
            <span className="text-lg font-bold text-success">Réponse envoyée !</span>
            <Zap className="h-4 w-4 text-success animate-bounce" />
          </div>
        )}

        {/* Urgent warning */}
        {isUrgent && !hasAnswered && (
          <div className="flex items-center gap-2 text-destructive animate-pulse">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-bold">Dépêchez-vous !</span>
          </div>
        )}

        {/* Players who answered - Mobile */}
        <div className="flex flex-wrap items-center justify-center gap-2 lg:hidden">
          {players.map(p => (
            <div 
              key={p.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
                answeredPlayers.includes(p.id) 
                  ? "bg-success/20 text-success border border-success/40" 
                  : "bg-muted/50 text-muted-foreground border border-muted"
              )}
            >
              {answeredPlayers.includes(p.id) && <Check className="h-3 w-3" />}
              {p.name}
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile Scoreboard Toggle */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-20">
        <details className="glass-ultra rounded-2xl border border-primary/30 overflow-hidden">
          <summary className="px-4 py-2.5 cursor-pointer font-semibold text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors">
            <span>📊</span> Classement ({answeredPlayers.length}/{players.length} ont répondu)
          </summary>
          <div className="p-3 border-t border-primary/20 max-h-60 overflow-y-auto">
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