import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Check, Send, Zap, Brain, Timer, AlertTriangle, Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuizLiveScoreboard } from './QuizLiveScoreboard';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { QuizJokers, type JokersState } from './QuizJokers';
import { DoodleStage } from '@/components/doodle/Doodle';

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
  playersRemaining: number;
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
  { grad: 'linear-gradient(180deg, #f43f5e, #e11d48)', letter: 'A' },
  { grad: 'linear-gradient(180deg, #0ea5e9, #0284c7)', letter: 'B' },
  { grad: 'linear-gradient(180deg, #f59e0b, #d97706)', letter: 'C' },
  { grad: 'linear-gradient(180deg, #10b981, #059669)', letter: 'D' },
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
  playersRemaining,
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

  useEffect(() => {
    if (questionType !== 'qcm' || hasAnswered || options.length === 0) {
      return;
    }

    const keyToIndex: Record<string, number> = {
      '1': 0,
      '2': 1,
      '3': 2,
      '4': 3,
      a: 0,
      b: 1,
      c: 2,
      d: 3,
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }

      const index = keyToIndex[event.key.toLowerCase()];
      if (index === undefined) {
        return;
      }

      const selected = options[index];
      if (!selected || hiddenOptions.includes(selected)) {
        return;
      }

      event.preventDefault();
      handleSelectOption(selected);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [questionType, hasAnswered, options, hiddenOptions]);

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
    <DoodleStage accent={isUrgent ? '#f87171' : '#38bdf8'}>
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row p-4 gap-6 pb-[120px]">

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
        <div
          className="w-full flex items-center justify-between rounded-2xl px-5 py-3 animate-fadeInDown"
          style={{
            background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #84cc16, #65a30d)', border: '1px solid var(--ink-line)' }}
            >
              <Brain className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-white/50 text-xs uppercase tracking-wider">Question</span>
              <p
                className="font-black text-2xl leading-none text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {roundNumber}<span className="text-white/40 text-lg">/{totalRounds}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border bg-[var(--ink-surface-3)]/10 border-[var(--ink-line)]/20 text-[var(--ink-text-dim)]">
              {answeredPlayers.length}/{players.length} reponses
            </span>
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
        <div
          className="w-full p-6 text-center transition-all duration-500 animate-zoomInBounce rounded-3xl"
          style={{
            background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 60%, #0f0820 100%)',
            border: `4px solid ${isCritical ? '#ef4444' : 'var(--ink-line)'}`,
            boxShadow: isCritical ? '0 0 0 rgba(0,0,0,0), 0 0 24px #ef444466' : '0 0 0 rgba(0,0,0,0)',
          }}
        >
          <h2
            className="text-2xl md:text-3xl font-black leading-tight text-white"
            style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}
          >
            {question}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-foreground-secondary">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Check className="h-4 w-4 text-success" />
              {answeredPlayers.length} ont valide
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Timer className="h-4 w-4 text-primary" />
              {playersRemaining} restant{playersRemaining > 1 ? 's' : ''}
            </span>
            {questionType === 'qcm' && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Zap className="h-4 w-4 text-accent" />
                Raccourcis A-D ou 1-4
              </span>
            )}
            {questionType === 'text' && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Send className="h-4 w-4 text-accent" />
                Entrer pour valider
              </span>
            )}
          </div>
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
                    "relative h-auto min-h-[90px] p-5 text-left rounded-2xl",
                    "transition-all duration-300 transform",
                    "flex items-center gap-4",
                    "animate-optionAppear",
                    !hasAnswered && !isHidden && "hover:scale-[1.03] active:scale-[0.97]",
                    isSelected && "scale-[1.03]",
                    hasAnswered && !isSelected && "opacity-40 scale-95",
                    isHidden && "opacity-20 grayscale line-through"
                  )}
                  style={{
                    background: style.grad,
                    border: `4px solid var(--ink-line)`,
                    boxShadow: isSelected
                      ? '0 0 0 rgba(0,0,0,0), 0 0 0 4px rgba(255,255,255,0.5)'
                      : '0 0 0 rgba(0,0,0,0)',
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  {/* Letter badge */}
                  <div
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl text-white"
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--ink-line)',
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: 'none',
                    }}
                  >
                    {style.letter}
                  </div>
                  
                  {/* Option text */}
                  <span
                    className="text-lg md:text-xl font-black line-clamp-3 flex-1 text-white"
                    style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}
                  >
                    {option}
                  </span>
                  
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center animate-scaleIn"
                      style={{ background: '#84cc16', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                    >
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
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
    </DoodleStage>
  );
};
