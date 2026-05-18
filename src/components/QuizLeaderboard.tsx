import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { AutoAdvanceBar } from './AutoAdvanceBar';
import { Trophy, Medal, ArrowRight, Star, TrendingUp, Zap, Flame, Timer, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { DoodleBorder, DoodleStage } from '@/components/doodle/Doodle';

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

interface RoundInsight {
  correctCount: number;
  accuracyPercent: number;
  averageCorrectTimeMs: number;
  fastestCorrectAnswer: QuizAnswer | null;
}

interface QuizLeaderboardProps {
  scores: QuizScore[];
  currentPlayerId: string;
  roundNumber: number;
  totalRounds: number;
  roundAnswers: QuizAnswer[];
  roundInsight: RoundInsight;
  isHost: boolean;
  onNextRound: () => void;
}

export const QuizLeaderboard = ({
  scores,
  currentPlayerId,
  roundNumber,
  totalRounds,
  roundAnswers,
  roundInsight,
  isHost,
  onNextRound,
}: QuizLeaderboardProps) => {
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    playSoundEffect('scoreUp', 0.5);

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

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [scores]);

  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
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
    };
  };

  const isLastRound = roundNumber >= totalRounds;
  const unansweredCount = Math.max(0, sortedScores.length - roundAnswers.length);

  return (
    <DoodleStage accent="#fbbf24">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-5 pb-[120px] gap-5">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-1 relative">
            <DoodleBorder color="#fbbf24" filled />
            <Crown className="relative w-3.5 h-3.5" style={{ color: '#fbbf24' }} fill="currentColor" />
            <span
              className="relative text-xs uppercase tracking-[0.25em] font-bold"
              style={{ color: '#fbbf24', fontFamily: "'Caveat', cursive" }}
            >
              Classement
            </span>
          </div>
          <h1
            className="text-3xl md:text-5xl font-black leading-none text-white"
            style={{
              fontFamily: "'Caveat', cursive",
              textShadow: '0 0 18px rgba(251,191,36,0.4), 0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            Classement
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-white/55 text-xs">
            <Zap className="h-3 w-3" style={{ color: '#fbbf24' }} />
            <span>
              Après la question{' '}
              <span className="font-bold text-white">
                {roundNumber}/{totalRounds}
              </span>
            </span>
          </div>
        </motion.div>

        <div className="relative max-w-xl w-full px-5 py-5">
          <DoodleBorder color="#fbbf24" rotation={1} thick />
          <div className="relative space-y-2">
          {sortedScores.map((score, index) => {
            const pointsThisRound = roundPoints[score.player_id] || 0;
            const isCurrentPlayer = score.player_id === currentPlayerId;
            const rank = getRankDisplay(index);
            const displayedScore = animatedScores[score.player_id] ?? score.total_points;

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
                      {score.player_name}
                      {isCurrentPlayer && <span className="ml-2 text-accent text-sm">(vous)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                      <Flame className="h-3 w-3 text-orange-400" />
                      {score.correct_answers} bonnes reponses
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-display text-2xl font-black">
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

      <AutoAdvanceBar
        durationMs={4500}
        label={isLastRound ? 'Résultats finaux' : 'Question suivante'}
        canSkip={isHost}
        onSkip={onNextRound}
      />
    </div>
    </DoodleStage>
  );
};
