import { useEffect } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { Trophy, Medal, ArrowRight, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}

interface QuizAnswer {
  player_id: string;
  player_name: string;
  answer: string;
  response_time_ms: number;
  is_correct: boolean;
  points_earned: number;
}

interface QuizLeaderboardProps {
  scores: QuizScore[];
  currentPlayerId: string;
  roundNumber: number;
  totalRounds: number;
  roundAnswers: QuizAnswer[];
  isHost: boolean;
  onNextRound: () => void;
}

export const QuizLeaderboard = ({
  scores,
  currentPlayerId,
  roundNumber,
  totalRounds,
  roundAnswers,
  isHost,
  onNextRound
}: QuizLeaderboardProps) => {
  useEffect(() => {
    playSoundEffect('scoreUp', 0.5);
  }, []);

  // Sort by total points
  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  
  // Get points earned this round for each player
  const roundPoints: Record<string, number> = {};
  roundAnswers.forEach(a => {
    roundPoints[a.player_id] = a.points_earned;
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="w-6 text-center font-bold">{index + 1}</span>;
  };

  const isLastRound = roundNumber >= totalRounds;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold uppercase tracking-wider mb-2">
          Classement
        </h1>
        <p className="text-foreground-muted">
          Après la question {roundNumber}/{totalRounds}
        </p>
      </div>

      {/* Leaderboard */}
      <GameCard className="max-w-xl w-full">
        <div className="space-y-3">
          {sortedScores.map((score, index) => {
            const pointsThisRound = roundPoints[score.player_id] || 0;
            const isCurrentPlayer = score.player_id === currentPlayerId;
            
            return (
              <div 
                key={score.player_id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl transition-all",
                  "animate-fadeIn",
                  index === 0 && "bg-yellow-500/10 border border-yellow-500/30",
                  index === 1 && "bg-gray-400/10 border border-gray-400/30",
                  index === 2 && "bg-amber-600/10 border border-amber-600/30",
                  index > 2 && "bg-muted/50",
                  isCurrentPlayer && "ring-2 ring-primary"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  {getRankIcon(index)}
                  <div>
                    <p className={cn(
                      "font-semibold",
                      isCurrentPlayer && "text-primary"
                    )}>
                      {score.player_name}
                      {isCurrentPlayer && " (vous)"}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {score.correct_answers} bonnes réponses
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-display font-bold text-2xl">
                    {score.total_points}
                  </p>
                  {pointsThisRound > 0 && (
                    <div className="flex items-center gap-1 text-success text-xs">
                      <TrendingUp className="h-3 w-3" />
                      +{pointsThisRound}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GameCard>

      {/* Point system reminder */}
      <GameCard className="max-w-xl w-full bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold">Système de points</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-foreground-muted">
          <div>&lt;3s = 10pts</div>
          <div>&lt;6s = 8pts</div>
          <div>&lt;10s = 6pts</div>
          <div>&lt;15s = 4pts</div>
        </div>
      </GameCard>

      {/* Next Round Button (Host only) */}
      {isHost && (
        <Button onClick={onNextRound} size="lg" className="gap-2">
          {isLastRound ? "Voir les résultats finaux" : "Question suivante"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      )}
      
      {!isHost && (
        <p className="text-foreground-muted animate-pulse">
          En attente de l'hôte...
        </p>
      )}
    </div>
  );
};
