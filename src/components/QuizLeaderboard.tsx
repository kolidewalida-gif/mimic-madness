import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Trophy, Medal, ArrowRight, Star, TrendingUp, Zap, Flame, Timer, Crown } from 'lucide-react';
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

<<<<<<< HEAD
interface RoundInsight {
  correctCount: number;
  accuracyPercent: number;
  averageCorrectTimeMs: number;
  fastestCorrectAnswer: QuizAnswer | null;
}

=======
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
interface QuizLeaderboardProps {
  scores: QuizScore[];
  currentPlayerId: string;
  roundNumber: number;
  totalRounds: number;
  roundAnswers: QuizAnswer[];
<<<<<<< HEAD
  roundInsight: RoundInsight;
=======
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
  isHost: boolean;
  onNextRound: () => void;
}

export const QuizLeaderboard = ({
  scores,
  currentPlayerId,
  roundNumber,
  totalRounds,
  roundAnswers,
<<<<<<< HEAD
  roundInsight,
  isHost,
  onNextRound,
=======
  isHost,
  onNextRound
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
}: QuizLeaderboardProps) => {
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    playSoundEffect('scoreUp', 0.5);
<<<<<<< HEAD

    const initial: Record<string, number> = {};
    scores.forEach((score) => {
      initial[score.player_id] = 0;
    });
    setAnimatedScores(initial);

    const duration = 1000;
    const steps = 20;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;

      setAnimatedScores((previous) => {
        const next = { ...previous };
        scores.forEach((score) => {
          next[score.player_id] = Math.round(score.total_points * progress);
        });
        return next;
      });

=======
    
    // Initialize animated scores to 0
    const initial: Record<string, number> = {};
    scores.forEach(s => initial[s.player_id] = 0);
    setAnimatedScores(initial);
    
    // Animate scores counting up
    const duration = 1000;
    const steps = 20;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setAnimatedScores(prev => {
        const next = { ...prev };
        scores.forEach(s => {
          next[s.player_id] = Math.round(s.total_points * progress);
        });
        return next;
      });
      
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);
<<<<<<< HEAD

=======
    
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    return () => clearInterval(timer);
  }, [scores]);

  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
<<<<<<< HEAD
  const roundPoints: Record<string, number> = {};
  roundAnswers.forEach((answer) => {
    roundPoints[answer.player_id] = answer.points_earned;
  });

  const getRankDisplay = (index: number) => {
    if (index === 0) {
      return {
        icon: <Trophy className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />,
        bg: 'bg-gradient-to-br from-yellow-500/30 to-amber-600/20',
        border: 'border-yellow-500/60',
        glow: 'shadow-lg shadow-yellow-500/20',
      };
    }
    if (index === 1) {
      return {
        icon: <Medal className="h-6 w-6 text-slate-300 drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]" />,
        bg: 'bg-gradient-to-br from-slate-400/30 to-slate-500/20',
        border: 'border-slate-400/50',
        glow: 'shadow-lg shadow-slate-400/10',
      };
    }
    if (index === 2) {
      return {
        icon: <Medal className="h-6 w-6 text-amber-500 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" />,
        bg: 'bg-gradient-to-br from-amber-600/30 to-amber-700/20',
        border: 'border-amber-600/50',
        glow: 'shadow-lg shadow-amber-600/10',
      };
    }
    return {
      icon: <span className="flex h-6 w-6 items-center justify-center text-base font-black text-foreground-muted">{index + 1}</span>,
      bg: 'bg-muted/30',
      border: 'border-muted',
      glow: '',
=======
  
  const roundPoints: Record<string, number> = {};
  roundAnswers.forEach(a => {
    roundPoints[a.player_id] = a.points_earned;
  });

  const getRankDisplay = (index: number) => {
    if (index === 0) return { 
      icon: <Trophy className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />, 
      bg: 'bg-gradient-to-br from-yellow-500/30 to-amber-600/20', 
      border: 'border-yellow-500/60',
      glow: 'shadow-lg shadow-yellow-500/20'
    };
    if (index === 1) return { 
      icon: <Medal className="h-6 w-6 text-slate-300 drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]" />, 
      bg: 'bg-gradient-to-br from-slate-400/30 to-slate-500/20', 
      border: 'border-slate-400/50',
      glow: 'shadow-lg shadow-slate-400/10'
    };
    if (index === 2) return { 
      icon: <Medal className="h-6 w-6 text-amber-500 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" />, 
      bg: 'bg-gradient-to-br from-amber-600/30 to-amber-700/20', 
      border: 'border-amber-600/50',
      glow: 'shadow-lg shadow-amber-600/10'
    };
    return { 
      icon: <span className="w-6 h-6 flex items-center justify-center font-black text-base text-foreground-muted">{index + 1}</span>, 
      bg: 'bg-muted/30', 
      border: 'border-muted',
      glow: ''
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    };
  };

  const isLastRound = roundNumber >= totalRounds;
<<<<<<< HEAD
  const unansweredCount = Math.max(0, sortedScores.length - roundAnswers.length);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden bg-mesh">
=======

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden bg-mesh">
      {/* Background effects */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      <div className="orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" style={{ animationDelay: '2s' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

<<<<<<< HEAD
=======
      {/* Header */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      <div className="relative z-10 text-center space-y-2 animate-fadeInDown">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="h-6 w-6 text-accent animate-spin-slow" />
          <Crown className="h-8 w-8 text-yellow-400 animate-crownBounce" />
          <Star className="h-6 w-6 text-accent animate-spin-slow" style={{ animationDelay: '0.5s' }} />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-black uppercase tracking-wide text-gradient">
          Classement
        </h1>
        <div className="flex items-center justify-center gap-2 text-foreground-secondary text-base">
          <Zap className="h-4 w-4 text-primary" />
<<<<<<< HEAD
          <span>Apres la question {roundNumber}/{totalRounds}</span>
        </div>
      </div>

=======
          <span>Après la question {roundNumber}/{totalRounds}</span>
        </div>
      </div>

      {/* Leaderboard Card */}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      <div className="relative z-10 max-w-xl w-full card-premium p-5 animate-fadeInUp">
        <div className="space-y-3">
          {sortedScores.map((score, index) => {
            const pointsThisRound = roundPoints[score.player_id] || 0;
            const isCurrentPlayer = score.player_id === currentPlayerId;
            const rank = getRankDisplay(index);
            const displayedScore = animatedScores[score.player_id] ?? score.total_points;
<<<<<<< HEAD

            return (
              <div
                key={score.player_id}
                className={cn(
                  'relative flex items-center justify-between rounded-xl border-2 p-4 backdrop-blur-sm transition-all duration-500',
                  rank.bg,
                  rank.border,
                  rank.glow,
                  isCurrentPlayer && 'ring-2 ring-primary/50 scale-[1.02]',
                  'animate-slideInLeft'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {index < 3 && (
                  <div
                    className="absolute -left-0.5 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        index === 0
                          ? 'linear-gradient(to bottom, transparent, #facc15, transparent)'
                          : index === 1
                            ? 'linear-gradient(to bottom, transparent, #94a3b8, transparent)'
                            : 'linear-gradient(to bottom, transparent, #d97706, transparent)',
                    }}
                  />
                )}

                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-background/30 p-2">
                    {rank.icon}
                  </div>
                  <div>
                    <p className={cn('text-base font-bold', isCurrentPlayer && 'text-primary')}>
=======
            
            return (
              <div 
                key={score.player_id}
                className={cn(
                  "relative flex items-center justify-between p-4 rounded-xl transition-all duration-500",
                  "backdrop-blur-sm border-2",
                  rank.bg, rank.border, rank.glow,
                  isCurrentPlayer && "ring-2 ring-primary/50 scale-[1.02]",
                  "animate-slideInLeft"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Position indicator glow for top 3 */}
                {index < 3 && (
                  <div 
                    className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-full" 
                    style={{ 
                      background: index === 0 ? 'linear-gradient(to bottom, transparent, #facc15, transparent)' : 
                                  index === 1 ? 'linear-gradient(to bottom, transparent, #94a3b8, transparent)' : 
                                  'linear-gradient(to bottom, transparent, #d97706, transparent)'
                    }} 
                  />
                )}
                
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-background/30">
                    {rank.icon}
                  </div>
                  <div>
                    <p className={cn(
                      "font-bold text-base",
                      isCurrentPlayer && "text-primary"
                    )}>
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
                      {score.player_name}
                      {isCurrentPlayer && <span className="ml-2 text-accent text-sm">(vous)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                      <Flame className="h-3 w-3 text-orange-400" />
<<<<<<< HEAD
                      {score.correct_answers} bonnes reponses
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-display text-2xl font-black">
=======
                      {score.correct_answers} bonnes réponses
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-display font-black text-2xl">
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
                    {displayedScore}
                  </p>
                  {pointsThisRound > 0 && (
                    <div className="flex items-center justify-end gap-1 text-success text-sm font-bold animate-floatUp">
                      <TrendingUp className="h-3 w-3" />
                      +{pointsThisRound}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

<<<<<<< HEAD
      <div className="relative z-10 grid max-w-xl w-full gap-4 animate-fadeInUp md:grid-cols-2" style={{ animationDelay: '0.3s' }}>
        <div className="glass-ultra rounded-xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">Insight du round</span>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-3">
              <div className="text-xs uppercase tracking-wider text-foreground-muted">MVP vitesse</div>
              <div className="mt-1 font-bold text-primary">
                {roundInsight.fastestCorrectAnswer
                  ? `${roundInsight.fastestCorrectAnswer.player_name} en ${(roundInsight.fastestCorrectAnswer.response_time_ms / 1000).toFixed(1)}s`
                  : 'Aucune bonne reponse'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[11px] uppercase tracking-wider text-foreground-muted">Precision</div>
                <div className="mt-1 font-bold">{roundInsight.accuracyPercent}%</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[11px] uppercase tracking-wider text-foreground-muted">Solves</div>
                <div className="mt-1 font-bold">{roundInsight.correctCount}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[11px] uppercase tracking-wider text-foreground-muted">Sans rep</div>
                <div className="mt-1 font-bold">{unansweredCount}</div>
              </div>
            </div>
            <div className="text-xs text-foreground-muted">
              Temps moyen des bonnes reponses : {roundInsight.averageCorrectTimeMs > 0 ? `${(roundInsight.averageCorrectTimeMs / 1000).toFixed(1)}s` : 'n/a'}
            </div>
          </div>
        </div>

        <div className="glass-ultra rounded-xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">Systeme de points</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { time: '<3s', points: '10pts', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
              { time: '<6s', points: '8pts', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
              { time: '<10s', points: '6pts', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
              { time: '<15s', points: '4pts', color: 'text-rose-400 bg-rose-500/20 border-rose-500/40' },
            ].map((tier) => (
              <div key={tier.time} className={cn('rounded-lg border px-2 py-1.5 text-xs font-bold', tier.color)}>
                <div>{tier.time}</div>
                <div className="opacity-75">{tier.points}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isHost ? (
        <Button
          onClick={onNextRound}
=======
      {/* Point System Card */}
      <div className="relative z-10 max-w-xl w-full glass-ultra rounded-xl p-4 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-2">
          <Timer className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">Système de points</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { time: '<3s', points: '10pts', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
            { time: '<6s', points: '8pts', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
            { time: '<10s', points: '6pts', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
            { time: '<15s', points: '4pts', color: 'text-rose-400 bg-rose-500/20 border-rose-500/40' },
          ].map((tier) => (
            <div key={tier.time} className={cn("px-2 py-1.5 rounded-lg text-xs font-bold border", tier.color)}>
              <div>{tier.time}</div>
              <div className="opacity-75">{tier.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Round Button */}
      {isHost ? (
        <Button 
          onClick={onNextRound} 
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
          variant="hero"
          size="lg"
          className="relative z-10 gap-2 h-14 px-8 rounded-xl animate-fadeInUp"
          style={{ animationDelay: '0.4s' }}
        >
          <span className="font-bold">
<<<<<<< HEAD
            {isLastRound ? 'Voir les resultats finaux' : 'Question suivante'}
=======
            {isLastRound ? "Voir les résultats finaux" : "Question suivante"}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
          </span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      ) : (
<<<<<<< HEAD
        <p className="relative z-10 flex items-center gap-2 text-foreground-muted animate-pulse">
          <Zap className="h-4 w-4 text-primary" />
          En attente de l'hote...
=======
        <p className="relative z-10 text-foreground-muted animate-pulse flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          En attente de l'hôte...
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        </p>
      )}
    </div>
  );
<<<<<<< HEAD
};
=======
};
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
