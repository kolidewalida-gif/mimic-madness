import { useEffect } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { Check, X, Clock, ArrowRight } from 'lucide-react';
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

  // Sort by points (highest first), then by time (fastest first)
  const sortedAnswers = [...roundAnswers].sort((a, b) => {
    if (b.points_earned !== a.points_earned) {
      return b.points_earned - a.points_earned;
    }
    return a.response_time_ms - b.response_time_ms;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {/* Question reminder */}
      <GameCard className="max-w-2xl w-full text-center bg-muted/50">
        <p className="text-foreground-muted text-sm mb-2">Question</p>
        <p className="text-lg">{question}</p>
      </GameCard>

      {/* Correct Answer */}
      <div className="animate-bounce-in">
        <GameCard className="max-w-2xl w-full text-center border-success bg-success/10">
          <p className="text-success text-sm mb-2 uppercase tracking-wider">La bonne réponse</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-success animate-pulse">
            {correctAnswer}
          </h2>
        </GameCard>
      </div>

      {/* Player Answers */}
      <GameCard className="max-w-2xl w-full">
        <h3 className="text-lg font-semibold mb-4 text-center">Réponses des joueurs</h3>
        <div className="space-y-3">
          {sortedAnswers.length > 0 ? (
            sortedAnswers.map((answer, index) => (
              <div 
                key={answer.player_id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all",
                  "animate-fadeIn",
                  answer.is_correct 
                    ? "bg-success/10 border border-success/30" 
                    : "bg-destructive/10 border border-destructive/30"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  {answer.is_correct ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-semibold">{answer.player_name}</p>
                    <p className={cn(
                      "text-sm",
                      answer.is_correct ? "text-success" : "text-destructive"
                    )}>
                      {answer.answer || "(pas de réponse)"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-display font-bold text-xl",
                    answer.is_correct ? "text-success" : "text-foreground-muted"
                  )}>
                    +{answer.points_earned}
                  </p>
                  <div className="flex items-center gap-1 text-foreground-muted text-xs">
                    <Clock className="h-3 w-3" />
                    {formatTime(answer.response_time_ms)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-foreground-muted py-4">
              Aucune réponse reçue
            </p>
          )}
        </div>
      </GameCard>

      {/* Continue Button (Host only) */}
      {isHost && (
        <Button onClick={onContinue} size="lg" className="gap-2">
          Voir le classement
          <ArrowRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
