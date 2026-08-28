import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AutoAdvanceBar } from './AutoAdvanceBar';
import { Trophy, Medal, Star, TrendingUp, Zap, Flame, Timer, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { DoodleBorder, DoodleStage } from '@/components/doodle/Doodle';
import { GRAFFITI_TEXT_SHADOW, GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';

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
  variant?: 'default' | 'inkBeta';
}

const ACCENT = '#fbbf24';

/* Ink-styled bordered block */
const inkBlock = (accent: string, strong = false) => ({
  background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 60%, #0f0820 100%)',
  border: '1px solid var(--ink-line)',
  boxShadow: strong ? `0 0 0 rgba(0,0,0,0), inset 0 0 0 ${accent}33` : '0 0 0 rgba(0,0,0,0)',
});

const RANK_COLORS = ['#fbbf24', '#cbd5e1', '#d97706'];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export const QuizLeaderboard = ({
  scores,
  currentPlayerId,
  roundNumber,
  totalRounds,
  roundAnswers,
  roundInsight,
  isHost,
  onNextRound,
  variant = 'default',
}: QuizLeaderboardProps) => {
  const isInkBeta = variant === 'inkBeta';
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

  const isLastRound = roundNumber >= totalRounds;
  const unansweredCount = Math.max(0, sortedScores.length - roundAnswers.length);

  const body = (
      <div className={isInkBeta ? 'ik-gpanel is-featured' : 'relative z-10 min-h-screen flex flex-col items-center justify-center p-5 pb-[120px] gap-5'}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-1 relative">
            <DoodleBorder color={ACCENT} filled />
            <Crown className="relative w-3.5 h-3.5" style={{ color: ACCENT }} fill="currentColor" />
            <span
              className="relative text-xs uppercase tracking-[0.25em] font-bold"
              style={{ color: ACCENT, fontFamily: "'Outfit', sans-serif" }}
            >
              Classement
            </span>
          </div>
          <h1
            className="text-3xl md:text-5xl font-black leading-none text-white"
            style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW }}
          >
            Classement
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-white/55 text-xs">
            <Zap className="h-3 w-3" style={{ color: ACCENT }} />
            <span>
              Après la question{' '}
              <span className="font-bold text-white">
                {roundNumber}/{totalRounds}
              </span>
            </span>
          </div>
        </motion.div>

        {/* Scores list */}
        <div className="relative max-w-xl w-full px-5 py-5">
          <DoodleBorder color={ACCENT} rotation={1} thick />
          <div className="relative space-y-2.5">
            {sortedScores.map((score, index) => {
              const pointsThisRound = roundPoints[score.player_id] || 0;
              const isCurrentPlayer = score.player_id === currentPlayerId;
              const isTop = index < 3;
              const rankColor = isTop ? RANK_COLORS[index] : 'var(--ink-accent)';
              const displayedScore = animatedScores[score.player_id] ?? score.total_points;

              return (
                <motion.div
                  key={score.player_id}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 240, damping: 18 }}
                  className={cn('relative flex items-center justify-between rounded-2xl px-4 py-3')}
                  style={{
                    background: isTop
                      ? `linear-gradient(180deg, ${rankColor}2e, ${rankColor}10)`
                      : 'linear-gradient(180deg, #1a0d2e, #0f0820)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: isCurrentPlayer
                      ? `0 0 0 rgba(0,0,0,0), 0 0 0 3px ${rankColor}88`
                      : '0 0 0 rgba(0,0,0,0)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{
                        background: `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)`,
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      {isTop ? (
                        RANK_MEDALS[index]
                      ) : (
                        <span
                          className="font-black text-white text-base"
                          style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-lg font-black text-white leading-none truncate"
                        style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                      >
                        {score.player_name}
                        {isCurrentPlayer && (
                          <span className="ml-2 text-sm" style={{ color: rankColor }}>
                            (vous)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-white/50 font-bold">
                        <Flame className="h-3 w-3 text-orange-400" />
                        {score.correct_answers} bonnes réponses
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-2xl font-black text-white leading-none"
                      style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                    >
                      {displayedScore}
                    </p>
                    {pointsThisRound > 0 && (
                      <div
                        className="flex items-center justify-end gap-1 text-sm font-black animate-floatUp"
                        style={{ color: '#34d399' }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        +{pointsThisRound}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Insights + points system */}
        <div
          className="grid max-w-xl w-full gap-4 animate-fadeInUp md:grid-cols-2"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="rounded-2xl p-4" style={inkBlock(ACCENT)}>
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: ACCENT }} />
              <span
                className="text-xs font-black uppercase tracking-wider text-white/60"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Insight du round
              </span>
            </div>
            <div className="space-y-3">
              <div
                className="rounded-xl px-3 py-3"
                style={{ background: 'var(--ink-accent)1a', border: '1px solid var(--ink-line)' }}
              >
                <div className="text-xs uppercase tracking-wider text-white/50">MVP vitesse</div>
                <div
                  className="mt-1 font-black text-white"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {roundInsight.fastestCorrectAnswer
                    ? `${roundInsight.fastestCorrectAnswer.player_name} en ${(roundInsight.fastestCorrectAnswer.response_time_ms / 1000).toFixed(1)}s`
                    : 'Aucune bonne réponse'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Précision', value: `${roundInsight.accuracyPercent}%` },
                  { label: 'Solves', value: roundInsight.correctCount },
                  { label: 'Sans rép', value: unansweredCount },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl px-2 py-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ink-line)' }}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-white/50">
                      {stat.label}
                    </div>
                    <div
                      className="mt-1 font-black text-white"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-white/50">
                Temps moyen des bonnes réponses :{' '}
                {roundInsight.averageCorrectTimeMs > 0
                  ? `${(roundInsight.averageCorrectTimeMs / 1000).toFixed(1)}s`
                  : 'n/a'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={inkBlock(ACCENT)}>
            <div className="mb-2 flex items-center gap-2">
              <Timer className="h-4 w-4" style={{ color: ACCENT }} />
              <span
                className="text-xs font-black uppercase tracking-wider text-white/60"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Système de points
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { time: '<3s', points: '10pts', color: '#34d399' },
                { time: '<6s', points: '8pts', color: 'var(--ink-text-dim)' },
                { time: '<10s', points: '6pts', color: '#fbbf24' },
                { time: '<15s', points: '4pts', color: '#f87171' },
              ].map((tier) => (
                <div
                  key={tier.time}
                  className="rounded-xl px-2 py-1.5 text-xs font-black"
                  style={{
                    background: `${tier.color}22`,
                    border: '1px solid var(--ink-line)',
                    color: tier.color,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  <div className="text-sm">{tier.time}</div>
                  <div className="opacity-80">{tier.points}</div>
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
  );

  return isInkBeta ? body : <DoodleStage accent={ACCENT}>{body}</DoodleStage>;
};
