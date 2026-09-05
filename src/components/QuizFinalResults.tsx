import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Home, Flame, Zap, PartyPopper, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { juice } from '@/lib/juice';
import { ParticleSystem } from './ParticleSystem';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';
import { usePlayerLevel, XP_REWARDS } from '@/hooks/usePlayerLevel';
import { DoodleConfetti, DoodleStage } from '@/components/doodle/Doodle';
import { InkButton, GRAFFITI_TEXT_SHADOW, GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';
import { PodiumAd } from '@/components/PodiumAd';

interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}

interface QuizFinalResultsProps {
  scores: QuizScore[];
  currentPlayerId: string;
  instanceKey: string;
  onEndGame: () => void;
  variant?: 'default' | 'inkBeta';
}

const ACCENT = '#fbbf24';
const PODIUM = [
  { color: '#fbbf24', medal: '🥇' },
  { color: '#cbd5e1', medal: '🥈' },
  { color: '#d97706', medal: '🥉' },
];

export const QuizFinalResults = ({
  scores,
  currentPlayerId,
  instanceKey,
  onEndGame,
  variant = 'default',
}: QuizFinalResultsProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const { addXp } = usePlayerLevel();
  const xpAwardedRef = useRef(false);

  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => b.total_points - a.total_points),
    [scores],
  );
  const winner = sortedScores[0];
  const isWinner = winner?.player_id === currentPlayerId;

  useEffect(() => {
    playSoundEffect('celebration', 0.6);
    juice.confetti({ count: 160 });
    juice.flash('primary', 360);
    juice.shake(280, 0.9);
    const wave = setTimeout(() => juice.confetti({ count: 90 }), 800);
    const wave2 = setTimeout(() => juice.confetti({ count: 70 }), 1600);

    const awardXp = async () => {
      if (xpAwardedRef.current) return;
      xpAwardedRef.current = true;

      const playerRank = sortedScores.findIndex((s) => s.player_id === currentPlayerId);

      if (playerRank === 0) {
        const result = await addXp('quizWin');
        emitXpGain(XP_REWARDS.quizWin, 'quizWin');
        if (result?.leveledUp) {
          emitLevelUpNotification(result.newLevel);
        }
      } else {
        const result = await addXp('gameParticipation');
        emitXpGain(XP_REWARDS.gameParticipation, 'gameParticipation');
        if (result?.leveledUp) {
          emitLevelUpNotification(result.newLevel);
        }
      }
    };

    awardXp();

    const timer1 = setTimeout(() => setShowWinner(true), 300);
    const timer2 = setTimeout(() => setShowPodium(true), 800);
    const timer3 = setTimeout(() => setShowConfetti(true), 1000);
    const timer4 = setTimeout(() => setShowConfetti(false), 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(wave);
      clearTimeout(wave2);
    };
  }, [addXp, currentPlayerId, sortedScores]);

  // podium display order: 2nd, 1st, 3rd
  const podiumOrder = [1, 0, 2];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];

  const body = (
      <div className={isInkBeta ? 'ik-gpanel is-featured ik-quiz-final-panel' : 'relative z-10 min-h-screen flex flex-col items-center justify-center p-5 pb-[120px] gap-5'}>
        {/* Confettis et particules seulement hors beta : l'écran de scores doit
            rester lisible tout de suite. */}
        {!isInkBeta && <DoodleConfetti show={showConfetti} count={48} />}

        {!isInkBeta && showConfetti && (
          <ParticleSystem
            type="confetti"
            count={150}
            colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F8B500', '#FF69B4']}
            speed={1.2}
            gravity={0.15}
          />
        )}

        {/* Winner announcement */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={showWinner ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="text-center space-y-3"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-yellow-500/40 rounded-full blur-[60px] animate-pulse" />
            <motion.div
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Crown
                className="relative h-16 w-16 md:h-20 md:w-20 mx-auto"
                style={{ color: ACCENT, filter: 'none' }}
                fill={ACCENT}
              />
            </motion.div>
          </div>

          <h1
            className="text-4xl md:text-6xl font-black uppercase leading-none text-white"
            style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW }}
          >
            {isWinner ? 'Victoire !' : `${winner?.player_name} gagne !`}
          </h1>
          <div className="flex items-center justify-center gap-2 text-2xl text-white/80">
            <Flame className="h-5 w-5 text-orange-400 animate-bounce" />
            <span
              className="font-black"
              style={{ fontFamily: "'Outfit', sans-serif", color: ACCENT, textShadow: GRAFFITI_TEXT_SHADOW_SM }}
            >
              {winner?.total_points} points
            </span>
            <Flame className="h-5 w-5 text-orange-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </motion.div>

        {/* Podium */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={showPodium ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          className="flex items-end justify-center gap-3 max-w-2xl w-full my-2"
        >
          {podiumOrder.map((rank, i) => {
            const score = sortedScores[rank];
            if (!score) return null;
            const cfg = PODIUM[rank];
            const isMe = score.player_id === currentPlayerId;
            const width = rank === 0 ? 'w-28 md:w-40' : 'w-24 md:w-32';

            return (
              <motion.div
                key={score.player_id}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 220, damping: 16 }}
                className="flex flex-col items-center"
              >
                <div
                  className={cn('p-4 rounded-t-2xl text-center', width)}
                  style={{
                    background: `linear-gradient(180deg, ${cfg.color}3a, ${cfg.color}18)`,
                    border: '1px solid var(--ink-line)',
                    borderBottom: 'none',
                    boxShadow: isMe ? `0 0 0 3px ${cfg.color}` : undefined,
                  }}
                >
                  <div className="text-3xl mb-1">{cfg.medal}</div>
                  <p
                    className="font-black text-white text-sm truncate leading-none"
                    style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                  >
                    {score.player_name}
                  </p>
                  <p
                    className="font-black text-xl leading-none mt-1"
                    style={{ fontFamily: "'Outfit', sans-serif", color: cfg.color, textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                  >
                    {score.total_points}
                  </p>
                  <p className="text-xs text-white/50">{score.correct_answers} ✓</p>
                </div>
                <div
                  className={cn('flex items-center justify-center rounded-b-lg', width, podiumHeights[rank])}
                  style={{
                    background: `linear-gradient(180deg, ${cfg.color}55, ${cfg.color}33)`,
                    border: '1px solid var(--ink-line)',
                    borderTop: 'none',
                  }}
                >
                  <span
                    className="text-4xl font-black"
                    style={{ fontFamily: "'Outfit', sans-serif", color: cfg.color, textShadow: GRAFFITI_TEXT_SHADOW }}
                  >
                    {rank + 1}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Full results */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={showPodium ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ delay: 0.5 }}
          className="max-w-xl w-full rounded-3xl p-5"
          style={{
            background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 60%, #0f0820 100%)',
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
          }}
        >
          <h3 className="text-2xl font-black mb-4 text-center flex items-center justify-center gap-2 text-white"
            style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
          >
            <Award className="h-5 w-5" style={{ color: ACCENT }} />
            Classement complet
            <Award className="h-5 w-5" style={{ color: ACCENT }} />
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedScores.map((score, index) => {
              const isMe = score.player_id === currentPlayerId;
              const isTop = index < 3;
              const color = isTop ? PODIUM[index].color : 'var(--ink-accent)';
              return (
                <div
                  key={score.player_id}
                  className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                  style={{
                    background: isTop
                      ? `linear-gradient(180deg, ${color}26, ${color}0d)`
                      : 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: isMe ? `0 0 0 2.5px ${color}88` : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                        border: '1px solid var(--ink-line)',
                      }}
                    >
                      {isTop ? (
                        PODIUM[index].medal
                      ) : (
                        <span
                          className="font-black text-white text-sm"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <span
                      className="font-black text-white truncate"
                      style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                    >
                      {score.player_name}
                      {isMe && <span className="ml-2 text-xs" style={{ color }}>(vous)</span>}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="font-black text-lg text-white"
                      style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                    >
                      {score.total_points} pts
                    </span>
                    <div className="flex items-center justify-end gap-1 text-xs text-white/50">
                      <Zap className="h-3 w-3" style={{ color: ACCENT }} />
                      {score.correct_answers} bonnes
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <PodiumAd gameMode="quiz" instanceKey={instanceKey} className="max-w-xl" />

        {/* End game button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <InkButton onClick={onEndGame} color={ACCENT} size="lg">
            <Home className="h-5 w-5" />
            Retour à l'accueil
            <PartyPopper className="h-4 w-4" />
          </InkButton>
        </motion.div>
      </div>
  );

  return isInkBeta ? body : <DoodleStage accent={ACCENT}>{body}</DoodleStage>;
};
