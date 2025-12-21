import { useEffect } from 'react';
import { Button } from './ui/button';
import { Trophy, Medal, ArrowRight, Star, TrendingUp, Zap, Flame, Timer } from 'lucide-react';
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

  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  
  const roundPoints: Record<string, number> = {};
  roundAnswers.forEach(a => {
    roundPoints[a.player_id] = a.points_earned;
  });

  const getRankDisplay = (index: number) => {
    if (index === 0) return { icon: <Trophy className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />, bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    if (index === 1) return { icon: <Medal className="h-7 w-7 text-slate-300 drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]" />, bg: 'bg-slate-400/20', border: 'border-slate-400/50' };
    if (index === 2) return { icon: <Medal className="h-7 w-7 text-amber-500 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" />, bg: 'bg-amber-600/20', border: 'border-amber-600/50' };
    return { icon: <span className="w-7 h-7 flex items-center justify-center font-black text-lg">{index + 1}</span>, bg: 'bg-muted/50', border: 'border-muted' };
  };

  const isLastRound = roundNumber >= totalRounds;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" style={{ animationDelay: '2s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-3 animate-fadeInDown">
        <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-wide text-gradient flex items-center justify-center gap-3">
          <Star className="h-8 w-8 text-accent animate-spin-slow" />
          Classement
          <Star className="h-8 w-8 text-accent animate-spin-slow" />
        </h1>
        <div className="flex items-center justify-center gap-2 text-foreground-secondary text-lg">
          <Zap className="h-5 w-5 text-primary" />
          <span>Après la question {roundNumber}/{totalRounds}</span>
        </div>
      </div>

      {/* Leaderboard Card */}
      <div className="relative z-10 max-w-xl w-full card-premium p-6 animate-fadeInUp">
        <div className="space-y-4">
          {sortedScores.map((score, index) => {
            const pointsThisRound = roundPoints[score.player_id] || 0;
            const isCurrentPlayer = score.player_id === currentPlayerId;
            const rank = getRankDisplay(index);
            
            return (
              <div 
                key={score.player_id}
                className={cn(
                  "relative flex items-center justify-between p-5 rounded-2xl transition-all duration-500",
                  "backdrop-blur-sm border-2 animate-fadeIn gpu-accelerated",
                  rank.bg, rank.border,
                  isCurrentPlayer && "ring-4 ring-primary/50 shadow-xl shadow-primary/20 scale-[1.02]"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Position indicator glow for top 3 */}
                {index < 3 && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-full bg-gradient-to-b from-transparent via-current to-transparent opacity-50" 
                       style={{ color: index === 0 ? '#facc15' : index === 1 ? '#94a3b8' : '#d97706' }} />
                )}
                
                <div className="flex items-center gap-5">
                  <div className="p-2 rounded-xl bg-background/30">
                    {rank.icon}
                  </div>
                  <div>
                    <p className={cn(
                      "font-bold text-lg",
                      isCurrentPlayer && "text-primary"
                    )}>
                      {score.player_name}
                      {isCurrentPlayer && <span className="ml-2 text-accent">(vous)</span>}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-foreground-muted">
                      <Flame className="h-4 w-4 text-orange-400" />
                      {score.correct_answers} bonnes réponses
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-display font-black text-3xl">
                    {score.total_points}
                  </p>
                  {pointsThisRound > 0 && (
                    <div className="flex items-center justify-end gap-1 text-success text-sm font-bold animate-bounce">
                      <TrendingUp className="h-4 w-4" />
                      +{pointsThisRound}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Point System Card */}
      <div className="relative z-10 max-w-xl w-full glass-ultra rounded-2xl p-5 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-accent" />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground-muted">Système de points</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { time: '<3s', points: '10pts', color: 'text-emerald-400 bg-emerald-500/20' },
            { time: '<6s', points: '8pts', color: 'text-cyan-400 bg-cyan-500/20' },
            { time: '<10s', points: '6pts', color: 'text-amber-400 bg-amber-500/20' },
            { time: '<15s', points: '4pts', color: 'text-rose-400 bg-rose-500/20' },
          ].map((tier) => (
            <div key={tier.time} className={cn("px-3 py-2 rounded-xl text-sm font-bold", tier.color)}>
              <div>{tier.time}</div>
              <div className="text-xs opacity-75">{tier.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Round Button */}
      {isHost ? (
        <Button 
          onClick={onNextRound} 
          variant="hero"
          size="xl"
          className="relative z-10 gap-3 h-16 px-10 rounded-2xl animate-fadeInUp"
          style={{ animationDelay: '0.5s' }}
        >
          <span className="font-bold text-lg">
            {isLastRound ? "Voir les résultats finaux" : "Question suivante"}
          </span>
          <ArrowRight className="h-6 w-6" />
        </Button>
      ) : (
        <p className="relative z-10 text-foreground-muted animate-pulse text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          En attente de l'hôte...
        </p>
      )}
    </div>
  );
};
