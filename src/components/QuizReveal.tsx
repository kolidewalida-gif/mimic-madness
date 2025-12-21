import { useEffect } from 'react';
import { Button } from './ui/button';
import { Check, X, Clock, ArrowRight, Sparkles, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

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
  useEffect(() => {
    playSoundEffect('reveal', 0.5);
  }, []);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb orb-primary" style={{ background: 'radial-gradient(circle, hsl(160 100% 45% / 0.3), transparent)' }} />
        <div className="orb orb-accent" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Question reminder */}
      <div className="relative z-10 max-w-2xl w-full glass-ultra rounded-2xl p-6 text-center animate-fadeInDown">
        <p className="text-foreground-muted text-sm uppercase tracking-wider mb-2">Question</p>
        <p className="text-lg font-medium">{question}</p>
      </div>

      {/* Correct Answer - Main focus */}
      <div className="relative z-10 max-w-2xl w-full animate-zoomInBounce">
        <div className="relative card-premium p-8 text-center border-2 border-success/50 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-success/10" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-success/30 rounded-full blur-[60px]" />
          
          {/* Floating sparkles */}
          <Sparkles className="absolute top-4 left-4 h-6 w-6 text-success animate-float" />
          <Sparkles className="absolute top-4 right-4 h-6 w-6 text-success animate-float" style={{ animationDelay: '0.5s' }} />
          <Trophy className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 text-success/50 animate-bounce" />
          
          <div className="relative">
            <p className="text-success text-sm font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              La Bonne Réponse
              <Check className="h-5 w-5" />
            </p>
            <h2 className="text-4xl md:text-5xl font-display font-black text-success animate-pulse">
              {correctAnswer}
            </h2>
          </div>
        </div>
      </div>

      {/* Player Answers */}
      <div className="relative z-10 max-w-2xl w-full card-premium p-6 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-xl font-display font-bold mb-6 text-center flex items-center justify-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Réponses des joueurs
          <Zap className="h-5 w-5 text-accent" />
        </h3>
        <div className="space-y-3">
          {sortedAnswers.length > 0 ? (
            sortedAnswers.map((answer, index) => (
              <div 
                key={answer.player_id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl transition-all duration-500",
                  "backdrop-blur-sm border-2 animate-fadeIn gpu-accelerated",
                  answer.is_correct 
                    ? "bg-success/10 border-success/40 shadow-lg shadow-success/10" 
                    : "bg-destructive/10 border-destructive/40 shadow-lg shadow-destructive/10"
                )}
                style={{ animationDelay: `${index * 100 + 400}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    answer.is_correct ? "bg-success/20" : "bg-destructive/20"
                  )}>
                    {answer.is_correct ? (
                      <Check className="h-6 w-6 text-success" />
                    ) : (
                      <X className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{answer.player_name}</p>
                    <p className={cn(
                      "text-sm font-medium",
                      answer.is_correct ? "text-success" : "text-destructive"
                    )}>
                      {answer.answer || "(pas de réponse)"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-display font-black text-3xl",
                    answer.is_correct ? "text-success" : "text-foreground-muted"
                  )}>
                    +{answer.points_earned}
                  </p>
                  <div className="flex items-center gap-1.5 text-foreground-muted text-sm">
                    <Clock className="h-4 w-4" />
                    {formatTime(answer.response_time_ms)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-foreground-muted py-8 text-lg">
              Aucune réponse reçue
            </p>
          )}
        </div>
      </div>

      {/* Continue Button (Host only) */}
      {isHost && (
        <Button 
          onClick={onContinue} 
          variant="hero"
          size="xl"
          className="relative z-10 gap-3 h-16 px-10 rounded-2xl animate-fadeInUp"
          style={{ animationDelay: '0.6s' }}
        >
          <span className="font-bold text-lg">Voir le classement</span>
          <ArrowRight className="h-6 w-6" />
        </Button>
      )}

      {!isHost && (
        <p className="relative z-10 text-foreground-muted animate-pulse text-lg">
          En attente de l'hôte...
        </p>
      )}
    </div>
  );
};
