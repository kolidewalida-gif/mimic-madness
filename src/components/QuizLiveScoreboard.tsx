import { cn } from '@/lib/utils';
import { Trophy, Check, Clock, Flame } from 'lucide-react';

interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}

interface QuizLiveScoreboardProps {
  scores: QuizScore[];
  currentPlayerId: string;
  answeredPlayers: string[];
  roundPoints?: Record<string, number>;
}

export const QuizLiveScoreboard = ({
  scores,
  currentPlayerId,
  answeredPlayers,
  roundPoints = {}
}: QuizLiveScoreboardProps) => {
  // Sort scores by total points descending
  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  
  return (
    <div className="w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-2">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-foreground-muted">
          Classement
        </h3>
      </div>
      
      {/* Scoreboard */}
      <div className="space-y-2">
        {sortedScores.map((score, index) => {
          const hasAnswered = answeredPlayers.includes(score.player_id);
          const isCurrentPlayer = score.player_id === currentPlayerId;
          const pointsThisRound = roundPoints[score.player_id] || 0;
          const position = index + 1;
          
          return (
            <div
              key={score.player_id}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300",
                "backdrop-blur-md border",
                isCurrentPlayer 
                  ? "bg-primary/20 border-primary/40 shadow-lg shadow-primary/10" 
                  : "bg-card/40 border-white/10",
                hasAnswered && "ring-1 ring-success/30"
              )}
            >
              {/* Position badge */}
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg font-bold text-sm",
                position === 1 && "bg-yellow-500/20 text-yellow-400",
                position === 2 && "bg-gray-400/20 text-gray-300",
                position === 3 && "bg-amber-600/20 text-amber-500",
                position > 3 && "bg-muted text-muted-foreground"
              )}>
                {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position}
              </div>
              
              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium truncate text-sm",
                    isCurrentPlayer ? "text-primary" : "text-foreground"
                  )}>
                    {score.player_name}
                  </span>
                  {hasAnswered && (
                    <Check className="h-3 w-3 text-success flex-shrink-0" />
                  )}
                </div>
                {score.correct_answers > 0 && (
                  <div className="flex items-center gap-1 text-xs text-foreground-muted">
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span>{score.correct_answers} correct{score.correct_answers > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              
              {/* Points */}
              <div className="text-right">
                <div className={cn(
                  "font-display font-bold",
                  isCurrentPlayer ? "text-primary" : "text-foreground"
                )}>
                  {score.total_points}
                </div>
                {pointsThisRound > 0 && (
                  <div className="text-xs text-success font-semibold animate-bounce">
                    +{pointsThisRound}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
