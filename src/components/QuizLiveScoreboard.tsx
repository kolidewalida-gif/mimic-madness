import { cn } from '@/lib/utils';
import { Trophy, Check, Flame, TrendingUp, Zap } from 'lucide-react';

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
  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  
  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-3">
        <div className="p-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
          <Trophy className="h-5 w-5 text-yellow-400" />
        </div>
        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-foreground-muted">
          Classement Live
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
                "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500",
                "backdrop-blur-md border-2 gpu-accelerated",
                isCurrentPlayer 
                  ? "bg-primary/20 border-primary/50 shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "glass-ultra border-border/30",
                hasAnswered && "ring-2 ring-success/40"
              )}
            >
              {/* Position badge */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm",
                position === 1 && "bg-yellow-500/30 text-yellow-400",
                position === 2 && "bg-slate-400/30 text-slate-300",
                position === 3 && "bg-amber-600/30 text-amber-500",
                position > 3 && "bg-muted/50 text-muted-foreground"
              )}>
                {position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position}
              </div>
              
              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-bold truncate",
                    isCurrentPlayer ? "text-primary" : "text-foreground"
                  )}>
                    {score.player_name}
                  </span>
                  {hasAnswered && (
                    <div className="p-1 rounded-lg bg-success/20">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                  )}
                </div>
                {score.correct_answers > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Flame className="h-3 w-3 text-orange-400" />
                    <span>{score.correct_answers} correct{score.correct_answers > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              
              {/* Points */}
              <div className="text-right">
                <div className={cn(
                  "font-display font-black text-lg",
                  isCurrentPlayer ? "text-primary" : "text-foreground"
                )}>
                  {score.total_points}
                </div>
                {pointsThisRound > 0 && (
                  <div className="flex items-center justify-end gap-1 text-xs text-success font-bold animate-bounce">
                    <TrendingUp className="h-3 w-3" />
                    +{pointsThisRound}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Live indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground-muted">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span>Mise à jour en direct</span>
        <Zap className="h-3 w-3 text-accent" />
      </div>
    </div>
  );
};
