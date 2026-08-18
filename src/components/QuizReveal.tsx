import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AutoAdvanceBar } from './AutoAdvanceBar';
import { Check, X, Clock, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { juice } from '@/lib/juice';
import {
  InkGameStage,
  InkCard,
  InkPhasePill,
  InkTitle,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';

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

const ACCENT = '#84cc16'; // lime — Quiz mode
const CORRECT = '#34d399';
const WRONG = '#f87171';
const MEDALS = ['🥇', '🥈', '🥉'];

export const QuizReveal = ({
  question,
  correctAnswer,
  roundAnswers,
  isHost,
  onContinue,
}: QuizRevealProps) => {
  const [showAnswers, setShowAnswers] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<number>(0);

  const sortedAnswers = [...roundAnswers].sort((a, b) => {
    if (b.points_earned !== a.points_earned) {
      return b.points_earned - a.points_earned;
    }
    return a.response_time_ms - b.response_time_ms;
  });

  useEffect(() => {
    playSoundEffect('reveal', 0.5);
    juice.flash('info', 220);
    juice.shake(180, 0.6);

    const timer1 = setTimeout(() => setShowAnswers(true), 700);
    const timer2 = setTimeout(() => juice.confetti({ count: 70 }), 700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (showAnswers && revealedAnswers < roundAnswers.length) {
      const timer = setTimeout(() => {
        setRevealedAnswers((prev) => prev + 1);
        const answer = sortedAnswers[revealedAnswers];
        if (answer) {
          playSoundEffect(answer.is_correct ? 'scoreUp' : 'click', 0.3);
        }
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [showAnswers, revealedAnswers, roundAnswers.length]);

  const formatTime = (ms: number) => (ms / 1000).toFixed(2) + 's';

  return (
    <InkGameStage accent={ACCENT}>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-[120px] gap-5">
        {/* Question reminder */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <InkCard accent="#a855f7" showSparkles={false} className="px-5 py-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4" style={{ color: '#a855f7' }} strokeWidth={2.5} />
              <span
                className="text-sm uppercase tracking-wider font-black text-white/60"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Question
              </span>
            </div>
            <p
              className="text-center text-xl md:text-2xl font-black text-white leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
            >
              {question}
            </p>
          </InkCard>
        </motion.div>

        {/* Correct answer — dramatic reveal */}
        <motion.div
          initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
          className="max-w-2xl w-full"
        >
          <InkCard accent={CORRECT} highlighted className="px-6 py-7 text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${CORRECT}, ${CORRECT}cc)`,
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </span>
              <span
                className="text-base uppercase tracking-widest font-black"
                style={{ fontFamily: "'Outfit', sans-serif", color: CORRECT, textShadow: GRAFFITI_TEXT_SHADOW_SM }}
              >
                La bonne réponse
              </span>
            </div>
            <InkTitle size="lg" className="break-words">
              {correctAnswer}
            </InkTitle>
          </InkCard>
        </motion.div>

        {/* Player answers */}
        <motion.div
          initial={false}
          animate={{ opacity: showAnswers ? 1 : 0, y: showAnswers ? 0 : 24 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl w-full"
        >
          <InkCard accent={ACCENT} showSparkles={false} className="px-5 py-5">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-5 h-5" style={{ color: ACCENT }} fill={ACCENT} />
              <h3
                className="text-2xl font-black text-white leading-none"
                style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
              >
                Réponses des joueurs
              </h3>
              <Zap className="w-5 h-5" style={{ color: ACCENT }} fill={ACCENT} />
            </div>

            <div className="space-y-2.5">
              {sortedAnswers.length > 0 ? (
                sortedAnswers.map((answer, index) => {
                  const isRevealed = index < revealedAnswers;
                  const color = answer.is_correct ? CORRECT : WRONG;

                  return (
                    <motion.div
                      key={answer.player_id}
                      initial={{ opacity: 0, x: -24 }}
                      animate={
                        isRevealed
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: -24 }
                      }
                      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      className="flex items-center justify-between rounded-2xl px-3.5 py-3"
                      style={{
                        background: `linear-gradient(180deg, ${color}26, ${color}10)`,
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {answer.is_correct && index < 3 && (
                          <span className="text-2xl flex-shrink-0">{MEDALS[index]}</span>
                        )}
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                            border: '1px solid var(--ink-line)',
                            boxShadow: 'none',
                          }}
                        >
                          {answer.is_correct ? (
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          ) : (
                            <X className="w-5 h-5 text-white" strokeWidth={3} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="font-black text-white text-lg leading-none truncate"
                            style={{ fontFamily: "'Outfit', sans-serif", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
                          >
                            {answer.player_name}
                          </p>
                          <p
                            className="text-sm font-bold truncate max-w-[160px]"
                            style={{ color, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {answer.answer || '(pas de réponse)'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-2xl font-black leading-none"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            color: answer.is_correct ? CORRECT : 'rgba(255,255,255,0.45)',
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          +{answer.points_earned}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-white/50 text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          {formatTime(answer.response_time_ms)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p
                  className="text-center text-white/55 py-6 text-lg font-bold"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Aucune réponse reçue
                </p>
              )}
            </div>
          </InkCard>
        </motion.div>

        <AutoAdvanceBar
          durationMs={3500}
          label="Classement"
          canSkip={isHost}
          onSkip={onContinue}
        />
      </div>
    </InkGameStage>
  );
};
