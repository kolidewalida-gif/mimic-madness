import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Check, X, Clock, ArrowRight, Sparkles, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { juice } from '@/lib/juice';

interface QuizAnswer {
  player_id: string;
  player_name: string;
  answer: string;
  response_time_ms: number;
  is_correct: boolean;
  points_earned: number;
}

interface QuizRevealProps {
  question: string;
  correctAnswer: string;
  roundAnswers: QuizAnswer[];
  isHost: boolean;
  onContinue: () => void;
}

export const QuizReveal = ({
  question,
  correctAnswer,
  roundAnswers,
  isHost,
  onContinue
}: QuizRevealProps) => {
  const [showAnswers, setShowAnswers] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<number>(0);

  useEffect(() => {
    playSoundEffect('reveal', 0.5);
    juice.flash('info', 220);
    juice.shake(180, 0.6);
    
    // Stagger the reveal of the correct answer and player answers
    const timer1 = setTimeout(() => setShowAnswers(true), 800);
    // Confetti burst when the correct answer pops in
    const timer2 = setTimeout(() => juice.confetti({ count: 70 }), 800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Stagger reveal player answers
  useEffect(() => {
    if (showAnswers && revealedAnswers < roundAnswers.length) {
      const timer = setTimeout(() => {
        setRevealedAnswers(prev => prev + 1);
        // Play sound for each reveal
        const answer = sortedAnswers[revealedAnswers];
        if (answer) {
          playSoundEffect(answer.is_correct ? 'scoreUp' : 'click', 0.3);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showAnswers, revealedAnswers, roundAnswers.length]);

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  const sortedAnswers = [...roundAnswers].sort((a, b) => {
    if (b.points_earned !== a.points_earned) {
      return b.points_earned - a.points_earned;
    }
    return a.response_time_ms - b.response_time_ms;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(142 76% 45% / 0.4), transparent)', top: '20%', left: '30%' }} />
        <div className="orb orb-accent" style={{ animationDelay: '1s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Question reminder */}
      <div className="relative z-10 max-w-2xl w-full glass-ultra rounded-2xl p-5 text-center animate-fadeInDown">
        <p className="text-foreground-muted text-xs uppercase tracking-wider mb-1">Question</p>
        <p className="text-base font-medium">{question}</p>
      </div>

      {/* Correct Answer - Main focus with dramatic reveal */}
      <div className="relative z-10 max-w-2xl w-full">
        <div className={cn(
          "relative card-premium p-8 text-center border-2 border-success/60 overflow-hidden",
          "animate-revealGlow"
        )}>
          {/* Animated glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-success/20 via-emerald-500/10 to-success/20" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-success/30 rounded-full blur-[100px] animate-pulse" />
          
          {/* Sparkle decorations */}
          <Sparkles className="absolute top-3 left-3 h-5 w-5 text-success animate-float" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-success animate-float" style={{ animationDelay: '0.3s' }} />
          <Star className="absolute bottom-3 left-1/4 h-4 w-4 text-yellow-400 animate-pulse" />
          <Star className="absolute bottom-3 right-1/4 h-4 w-4 text-yellow-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Trophy floating */}
          <Trophy className="absolute top-1/2 -translate-y-1/2 left-4 h-8 w-8 text-success/40 animate-float" style={{ animationDelay: '0.2s' }} />
          <Trophy className="absolute top-1/2 -translate-y-1/2 right-4 h-8 w-8 text-success/40 animate-float" style={{ animationDelay: '0.7s' }} />
          
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-success/30">
                <Check className="h-5 w-5 text-success" />
              </div>
              <p className="text-success text-sm font-bold uppercase tracking-widest">
                La Bonne Réponse
              </p>
              <div className="p-1.5 rounded-lg bg-success/30">
                <Check className="h-5 w-5 text-success" />
              </div>
            </div>
            <h2 className={cn(
              "text-3xl md:text-4xl font-display font-black text-success",
              "animate-zoomInBounce"
            )}>
              {correctAnswer}
            </h2>
          </div>
        </div>
      </div>

      {/* Player Answers with staggered reveal */}
      <div className={cn(
        "relative z-10 max-w-2xl w-full card-premium p-5 transition-all duration-500",
        showAnswers ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>
        <h3 className="text-lg font-display font-bold mb-5 text-center flex items-center justify-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Réponses des joueurs
          <Zap className="h-5 w-5 text-accent" />
        </h3>
        <div className="space-y-2.5">
          {sortedAnswers.length > 0 ? (
            sortedAnswers.map((answer, index) => {
              const isRevealed = index < revealedAnswers;
              
              return (
                <div 
                  key={answer.player_id}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl transition-all duration-500",
                    "backdrop-blur-sm border-2",
                    isRevealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10",
                    answer.is_correct 
                      ? "bg-success/10 border-success/40 shadow-lg shadow-success/10" 
                      : "bg-destructive/10 border-destructive/40 shadow-lg shadow-destructive/10"
                  )}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank badge for correct answers */}
                    {answer.is_correct && index < 3 && (
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        index === 0 && "bg-yellow-500/30 text-yellow-400",
                        index === 1 && "bg-slate-400/30 text-slate-300",
                        index === 2 && "bg-amber-600/30 text-amber-500"
                      )}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                    )}
                    
                    <div className={cn(
                      "p-2 rounded-lg",
                      answer.is_correct ? "bg-success/20" : "bg-destructive/20"
                    )}>
                      {answer.is_correct ? (
                        <Check className="h-5 w-5 text-success" />
                      ) : (
                        <X className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{answer.player_name}</p>
                      <p className={cn(
                        "text-sm font-medium truncate max-w-[150px]",
                        answer.is_correct ? "text-success" : "text-destructive"
                      )}>
                        {answer.answer || "(pas de réponse)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-display font-black text-2xl animate-scorePopIn",
                      answer.is_correct ? "text-success" : "text-foreground-muted"
                    )} style={{ animationDelay: `${index * 100 + 300}ms` }}>
                      +{answer.points_earned}
                    </p>
                    <div className="flex items-center gap-1 text-foreground-muted text-xs">
                      <Clock className="h-3 w-3" />
                      {formatTime(answer.response_time_ms)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-foreground-muted py-6">
              Aucune réponse reçue
            </p>
          )}
        </div>
      </div>

      {/* Continue Button (Host only) */}
      {isHost ? (
        <Button 
          onClick={onContinue} 
          variant="hero"
          size="lg"
          className="relative z-10 gap-2 h-14 px-8 rounded-xl animate-fadeInUp"
        >
          <span className="font-bold">Voir le classement</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      ) : (
        <p className="relative z-10 text-foreground-muted animate-pulse flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          En attente de l'hôte...
        </p>
      )}
    </div>
  );
};