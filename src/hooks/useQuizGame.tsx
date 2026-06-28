import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';
import { usePlayerLevel, XP_REWARDS } from '@/hooks/usePlayerLevel';
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from '@/components/QuizSettingsPanel';
import { quizAnswerSchema, safeParse } from '@/lib/validation';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizQuestion {
  question: string;
  answer: string;
  options: string[];
  category: string;
  difficulty: string;
  questionType: 'qcm' | 'text';
}

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

type QuizPhase = 'waiting' | 'countdown' | 'answering' | 'reveal' | 'scores' | 'final';

interface RoundInsight {
  correctCount: number;
  accuracyPercent: number;
  averageCorrectTimeMs: number;
  fastestCorrectAnswer: QuizAnswer | null;
}

const COUNTDOWN_MS = 3000;
// Bug fix #5: max time to spend in countdown before fallback
const COUNTDOWN_MAX_MS = 5500;
const REVEAL_AUTO_ADVANCE_MS = 2800;
const SCORES_AUTO_ADVANCE_MS = 3500;
const REVEAL_WATCHDOG_MS = 5500;
const SCORES_WATCHDOG_MS = 6000;
const HOST_FALLBACK_GRACE_MS = 1500;

// Calculate points proportionally to total duration (max 10 base points)
export const calculatePoints = (responseTimeMs: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, 1 - responseTimeMs / durationMs));
  return Math.max(0, Math.round(ratio * 10));
};

// Normalize answer for comparison
export const normalizeAnswer = (answer: string): string =>
  answer
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Check if a quiz answer is correct.
 * Bug fix #2 + #3: stricter matching to prevent false positives
 * - Both sides must be non-empty
 * - For QCM (short answers): require exact match after normalization
 * - For text: allow exact match or guess containing the full answer
 *   (e.g. "c'est paris" matches "Paris") but NOT answer containing partial guess
 *   (e.g. "p" should NOT match "paris")
 */
export const isAnswerCorrect = (
  guess: string,
  correctAnswer: string,
  isQcm = false
): boolean => {
  const ng = normalizeAnswer(guess);
  const na = normalizeAnswer(correctAnswer);
  if (ng.length === 0 || na.length === 0) return false;
  // For QCM, require exact match (options are pre-defined choices)
  if (isQcm) return ng === na;
  // For text answers, require either exact match or guess containing the full answer
  return ng === na || ng.includes(na);
};

export const useQuizGame = (
  lobbyId: string,
  currentPlayer: Player,
  players: Player[],
  selectedCategory: string = 'mixed',
  hostSettings: QuizSettings = DEFAULT_QUIZ_SETTINGS
) => {
  const [phase, setPhase] = useState<QuizPhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [answerDurationMs, setAnswerDurationMs] = useState(hostSettings.answerDurationMs);
  const [totalRounds, setTotalRounds] = useState(hostSettings.totalRounds);
  const [timeRemaining, setTimeRemaining] = useState(hostSettings.answerDurationMs);
  const [serverStartTime, setServerStartTime] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [roundAnswers, setRoundAnswers] = useState<QuizAnswer[]>([]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [freezeBonusMs, setFreezeBonusMs] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef(phase);
  const advanceToRevealRef = useRef<(() => Promise<void>) | null>(null);
  const advanceToScoresRef = useRef<(() => Promise<void>) | null>(null);
  const nextRoundRef = useRef<(() => Promise<void>) | null>(null);
  const playersRef = useRef(players);
  const currentRoundRef = useRef(currentRound);
  const submittingRef = useRef(false);
  const startQuizLockRef = useRef(false);
  const startRoundLockRef = useRef(false);
  // Prefetched next question so rounds 2+ start instantly (no AI wait).
  const nextQuestionRef = useRef<QuizQuestion | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Bug fix #8: stable session ID for unique channel naming
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  phaseRef.current = phase;
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);

  const { addXp } = usePlayerLevel();

  // Bug fix #1 + #11: stable players key for memoization
  const playersKey = useMemo(() => players.map((p) => p.id).sort().join(','), [players]);

  // Initialize scores — Bug fix: preserve existing scores when player list changes
  useEffect(() => {
    setScores(prev => {
      const prevMap = new Map(prev.map(s => [s.player_id, s]));
      return players.map(p => prevMap.get(p.id) ?? {
        player_id: p.id,
        player_name: p.name,
        total_points: 0,
        correct_answers: 0,
        average_time_ms: 0,
      });
    });
  }, [playersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch scores from DB — uses ref so it doesn't re-bind on player change
  const fetchScoresFromDB = useCallback(async () => {
    const { data: answersData } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('lobby_id', lobbyId);

    if (!answersData) return;

    const livePlayers = playersRef.current;
    const scoreMap: Record<string, { points: number; correct: number; times: number[] }> = {};

    livePlayers.forEach(p => {
      scoreMap[p.id] = { points: 0, correct: 0, times: [] };
    });

    answersData.forEach(a => {
      if (scoreMap[a.player_id]) {
        scoreMap[a.player_id].points += a.points_earned;
        scoreMap[a.player_id].correct += a.is_correct ? 1 : 0;
        scoreMap[a.player_id].times.push(a.response_time_ms);
      }
    });

    const newScores: QuizScore[] = livePlayers.map(p => ({
      player_id: p.id,
      player_name: p.name,
      total_points: scoreMap[p.id]?.points || 0,
      correct_answers: scoreMap[p.id]?.correct || 0,
      average_time_ms: scoreMap[p.id]?.times.length
        ? Math.round(scoreMap[p.id].times.reduce((a, b) => a + b, 0) / scoreMap[p.id].times.length)
        : 0,
    }));

    setScores(newScores);
  }, [lobbyId]);

  // Advance to reveal — declared early for timer usage
  const advanceToReveal = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const round = currentRoundRef.current;
    const { error } = await supabase.from('quiz_rounds')
      .update({ phase: 'reveal' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', round)
      .eq('phase', 'answering');
    if (error) console.warn('[Quiz] advanceToReveal failed:', error);
  }, [currentPlayer.isHost, lobbyId]);
  advanceToRevealRef.current = advanceToReveal;

  // Real-time sync — Bug fix #1: minimal deps, stable channel
  useEffect(() => {
    const channelName = `quiz-sync-${lobbyId}-${sessionIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_rounds', filter: `lobby_id=eq.${lobbyId}` },
        async (payload: any) => {
          if (!payload.new) return;
          const newRound = payload.new;

          setCurrentRound(newRound.round_number);
          if (newRound.total_rounds) setTotalRounds(newRound.total_rounds);
          if (newRound.answer_duration_ms) setAnswerDurationMs(newRound.answer_duration_ms);

          const options: string[] = newRound.options || [];
          const questionType = (newRound.question_type || 'qcm') as 'qcm' | 'text';

          setCurrentQuestion({
            question: newRound.question_text,
            answer: newRound.correct_answer,
            options,
            category: newRound.category,
            difficulty: newRound.difficulty,
            questionType,
          });

          if (newRound.phase === 'countdown' && phaseRef.current !== 'countdown') {
            setPhase('countdown');
            setHasAnswered(false);
            setAnsweredPlayers([]);
            setRoundAnswers([]);
            setFreezeBonusMs(0);
            playSoundEffect('quizReveal', 0.5);
          } else if (newRound.phase === 'answering' && phaseRef.current !== 'answering') {
            setPhase('answering');
            setServerStartTime(newRound.started_at);
            setHasAnswered(false);
            submittingRef.current = false;

            if (newRound.started_at) {
              const startTime = new Date(newRound.started_at).getTime();
              const elapsed = Date.now() - startTime;
              const dur = newRound.answer_duration_ms || answerDurationMs;
              setTimeRemaining(Math.max(0, dur - elapsed));
            } else {
              setTimeRemaining(newRound.answer_duration_ms || answerDurationMs);
            }
          } else if (newRound.phase === 'reveal' && phaseRef.current !== 'reveal') {
            setPhase('reveal');
            await fetchScoresFromDB();
            playSoundEffect('reveal', 0.5);
          } else if (newRound.phase === 'scores' && phaseRef.current !== 'scores') {
            setPhase('scores');
            await fetchScoresFromDB();
            playSoundEffect('transition', 0.4);
          } else if (newRound.phase === 'final' && phaseRef.current !== 'final') {
            setPhase('final');
            await fetchScoresFromDB();
            playSoundEffect('celebration', 0.6);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_answers', filter: `lobby_id=eq.${lobbyId}` },
        (payload: any) => {
          if (!payload.new) return;
          // Bug fix #4: ignore answers from other rounds (late-arriving inserts)
          if (payload.new.round_number !== currentRoundRef.current) return;

          setAnsweredPlayers(prev => {
            if (prev.includes(payload.new.player_id)) return prev;
            const next = [...prev, payload.new.player_id];

            // Auto-advance if all players answered
            const livePlayers = playersRef.current;
            const allAnswered = livePlayers.length > 0 && livePlayers.every(p => next.includes(p.id));

            if (allAnswered && currentPlayer.isHost && phaseRef.current === 'answering') {
              window.setTimeout(() => {
                if (phaseRef.current === 'answering') {
                  void advanceToRevealRef.current?.();
                }
              }, 900);
            }
            return next;
          });

          setRoundAnswers(prev => {
            if (prev.some(a => a.player_id === payload.new.player_id)) return prev;
            return [...prev, {
              player_id: payload.new.player_id,
              player_name: payload.new.player_name,
              answer: payload.new.answer,
              response_time_ms: payload.new.response_time_ms,
              is_correct: payload.new.is_correct,
              points_earned: payload.new.points_earned,
            }];
          });

          // Optimistic local score update
          setScores(prev => prev.map(s =>
            s.player_id === payload.new.player_id
              ? {
                  ...s,
                  total_points: s.total_points + payload.new.points_earned,
                  correct_answers: s.correct_answers + (payload.new.is_correct ? 1 : 0),
                }
              : s
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, currentPlayer.isHost]);

  // Synchronized timer — based on server time
  useEffect(() => {
    if (phase !== 'answering' || !serverStartTime) return;
    let hasCalledTimeUp = false;

    const updateTimer = () => {
      const startTime = new Date(serverStartTime).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (answerDurationMs + freezeBonusMs) - elapsed);
      setTimeRemaining(remaining);

      const seconds = Math.ceil(remaining / 1000);
      if (remaining % 1000 < 100 && remaining > 0) {
        if (seconds <= 5) playSoundEffect('quizRush', 0.3);
        else if (seconds <= 30) playSoundEffect('quizTick', 0.1);
      }

      if (remaining <= 0 && !hasCalledTimeUp) {
        hasCalledTimeUp = true;
        playSoundEffect('quizTimeUp', 0.5);
        if (currentPlayer.isHost) {
          advanceToReveal();
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, serverStartTime, currentPlayer.isHost, advanceToReveal, answerDurationMs, freezeBonusMs]);

  // Bug fix #5: countdown safety net — if stuck > COUNTDOWN_MAX_MS, force start
  useEffect(() => {
    if (phase !== 'countdown' || !currentPlayer.isHost) return;
    const t = setTimeout(async () => {
      if (phaseRef.current !== 'countdown') return;
      console.warn('[Quiz] Countdown stuck > MAX, forcing start');
      const now = new Date().toISOString();
      await supabase.from('quiz_rounds')
        .update({ phase: 'answering', started_at: now })
        .eq('lobby_id', lobbyId)
        .eq('round_number', currentRoundRef.current)
        .eq('phase', 'countdown');
    }, COUNTDOWN_MAX_MS);
    return () => clearTimeout(t);
  }, [phase, currentPlayer.isHost, lobbyId]);

  // Auto-advance: reveal -> scores -> nextRound
  useEffect(() => {
    if (!currentPlayer.isHost) return;
    if (phase === 'reveal') {
      const t = setTimeout(() => {
        if (phaseRef.current === 'reveal') {
          void advanceToScoresRef.current?.();
        }
      }, REVEAL_AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'scores') {
      const t = setTimeout(() => {
        if (phaseRef.current === 'scores') {
          void nextRoundRef.current?.();
        }
      }, SCORES_AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }
  }, [phase, currentPlayer.isHost]);

  // Watchdog
  useEffect(() => {
    if (!currentPlayer.isHost) return;
    if (phase !== 'reveal' && phase !== 'scores') return;

    const t = setTimeout(() => {
      if (phaseRef.current === 'reveal') {
        void advanceToScoresRef.current?.();
      } else if (phaseRef.current === 'scores') {
        void nextRoundRef.current?.();
      }
    }, phase === 'reveal' ? REVEAL_WATCHDOG_MS : SCORES_WATCHDOG_MS);

    return () => clearTimeout(t);
  }, [phase, currentPlayer.isHost]);

  // Generate question via edge function
  const generateQuestion = useCallback(async (category: string = 'mixed'): Promise<QuizQuestion | null> => {
    setIsLoading(true);
    try {
      const categories = ['general', 'anime', 'histoire', 'sport', 'musique', 'cinema', 'science', 'geographie', 'jeux_video', 'art'];
      const categoryToUse = category === 'mixed'
        ? categories[Math.floor(Math.random() * categories.length)]
        : category;

      const { data, error } = await supabase.functions.invoke('generate-quiz-question', {
        body: {
          category: categoryToUse,
          difficulty: hostSettings.difficulty !== 'mixed' ? hostSettings.difficulty : undefined,
          previousQuestions,
        },
      });

      if (error) throw error;

      // Bug fix #8: use functional update to avoid race
      setPreviousQuestions(prev => [...prev, data.question]);

      let questionType: 'qcm' | 'text';
      if (hostSettings.questionMode === 'qcm') questionType = 'qcm';
      else if (hostSettings.questionMode === 'text') questionType = 'text';
      else questionType = Math.random() < 0.7 ? 'qcm' : 'text';

      return {
        question: data.question,
        answer: data.answer,
        options: data.options || [],
        category: data.category,
        difficulty: data.difficulty,
        questionType,
      };
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        question: 'Quelle est la capitale de la France ?',
        answer: 'Paris',
        options: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'],
        category: 'geographie',
        difficulty: 'facile',
        questionType: 'qcm',
      };
    } finally {
      setIsLoading(false);
    }
  }, [previousQuestions, hostSettings.difficulty, hostSettings.questionMode]);

  // Start a new round — Bug fix #6: idempotent + lock
  const startRound = useCallback(async (category: string = selectedCategory, roundNum: number = currentRound) => {
    if (!currentPlayer.isHost) return;
    if (startRoundLockRef.current) return;
    startRoundLockRef.current = true;

    try {
      setRoundAnswers([]);
      setAnsweredPlayers([]);

      // Bug fix #6: only delete if we're truly starting fresh — check round doesn't exist
      const { data: existing } = await supabase.from('quiz_rounds')
        .select('id, phase')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNum)
        .maybeSingle();

      if (existing && existing.phase !== 'final') {
        // Round already in progress — abort
        console.warn('[Quiz] Round already exists, skipping startRound');
        return;
      }

      // Use the prefetched question if we have one (instant), else generate now.
      const question = nextQuestionRef.current ?? await generateQuestion(category);
      nextQuestionRef.current = null;
      if (!question) return;

      // Insert new round (countdown phase)
      const { error: insertError } = await supabase.from('quiz_rounds').insert({        lobby_id: lobbyId,
        round_number: roundNum,
        question_text: question.question,
        correct_answer: question.answer,
        options: question.options,
        question_type: question.questionType,
        category: question.category,
        difficulty: question.difficulty,
        phase: 'countdown',
        started_at: null,
        total_rounds: hostSettings.totalRounds,
        answer_duration_ms: hostSettings.answerDurationMs,
        difficulty_filter: hostSettings.difficulty,
        question_mode: hostSettings.questionMode,
      });

      if (insertError) {
        console.error('[Quiz] Failed to insert round:', insertError);
        return;
      }

      // Prefetch the next question in the background so the following round
      // starts instantly (no AI generation wait between rounds).
      if (roundNum < hostSettings.totalRounds) {
        void generateQuestion(category).then((q) => {
          if (q) nextQuestionRef.current = q;
        });
      }

      // Bug fix #7: store the timeout ref so we can cancel on unmount
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = setTimeout(async () => {
        if (phaseRef.current !== 'countdown') return; // Phase changed, skip
        const now = new Date().toISOString();
        await supabase.from('quiz_rounds')
          .update({ phase: 'answering', started_at: now })
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNum)
          .eq('phase', 'countdown');
      }, COUNTDOWN_MS);
    } finally {
      setTimeout(() => { startRoundLockRef.current = false; }, 1500);
    }
  }, [currentPlayer.isHost, lobbyId, currentRound, generateQuestion, selectedCategory, hostSettings]);

  // Submit answer — Bug fix #12: lock to prevent double-submit
  const submitAnswer = useCallback(async (answer: string) => {
    if (hasAnswered || !serverStartTime || !currentQuestion) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const cleanAnswer = safeParse(quizAnswerSchema, answer);
      if (!cleanAnswer) return;

      const startTime = new Date(serverStartTime).getTime();
      const responseTime = Math.max(0, Date.now() - startTime - freezeBonusMs);

      // Bug fix #2 + #3: stricter matching with empty-string protection
      const isCorrect = isAnswerCorrect(
        cleanAnswer,
        currentQuestion.answer,
        currentQuestion.questionType === 'qcm'
      );

      let points = isCorrect ? calculatePoints(responseTime, answerDurationMs) : 0;

      // Streak bonus
      if (isCorrect && hostSettings.enableStreak) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        setBestStreak(b => Math.max(b, newStreak));
        if (newStreak >= 3) points += Math.min(5, newStreak - 2);
      } else if (!isCorrect) {
        setCurrentStreak(0);
      }

      setHasAnswered(true);

      if (isCorrect) {
        playSoundEffect('quizCorrect', 0.5);
        const result = await addXp('quizCorrectAnswer');
        emitXpGain(XP_REWARDS.quizCorrectAnswer, 'quizCorrectAnswer');
        if (result?.leveledUp) emitLevelUpNotification(result.newLevel);
      } else {
        playSoundEffect('quizWrong', 0.4);
      }

      await supabase.from('quiz_answers').insert({
        lobby_id: lobbyId,
        round_number: currentRound,
        player_id: currentPlayer.id,
        player_name: currentPlayer.name,
        answer: cleanAnswer,
        response_time_ms: responseTime,
        is_correct: isCorrect,
        points_earned: points,
      });
    } finally {
      submittingRef.current = false;
    }
  }, [hasAnswered, serverStartTime, currentQuestion, lobbyId, currentRound, currentPlayer, addXp, freezeBonusMs, answerDurationMs, currentStreak, hostSettings.enableStreak]);

  const triggerFreezeJoker = useCallback(() => {
    setFreezeBonusMs(b => b + 5000);
  }, []);

  const advanceToScores = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const round = currentRoundRef.current;
    const { error } = await supabase.from('quiz_rounds')
      .update({ phase: 'scores' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', round)
      .eq('phase', 'reveal');
    if (error) console.warn('[Quiz] advanceToScores failed:', error);
  }, [currentPlayer.isHost, lobbyId]);
  advanceToScoresRef.current = advanceToScores;

  const nextRound = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const round = currentRoundRef.current;

    if (round >= totalRounds) {
      await supabase.from('quiz_rounds')
        .update({ phase: 'final' })
        .eq('lobby_id', lobbyId)
        .eq('round_number', round)
        .eq('phase', 'scores');
    } else {
      const nextRoundNum = round + 1;
      setCurrentRound(nextRoundNum);
      setHasAnswered(false);
      startRound(selectedCategory, nextRoundNum);
    }
  }, [currentPlayer.isHost, lobbyId, totalRounds, startRound, selectedCategory]);
  nextRoundRef.current = nextRound;

  const correctAnswers = roundAnswers.filter(answer => answer.is_correct);
  const fastestCorrectAnswer = correctAnswers.reduce<QuizAnswer | null>((best, answer) => {
    if (!best || answer.response_time_ms < best.response_time_ms) return answer;
    return best;
  }, null);
  const averageCorrectTimeMs = correctAnswers.length > 0
    ? Math.round(correctAnswers.reduce((sum, a) => sum + a.response_time_ms, 0) / correctAnswers.length)
    : 0;
  const roundInsight: RoundInsight = {
    correctCount: correctAnswers.length,
    accuracyPercent: players.length > 0 ? Math.round((correctAnswers.length / players.length) * 100) : 0,
    averageCorrectTimeMs,
    fastestCorrectAnswer,
  };

  // Start the quiz — Bug fix #9: idempotency lock
  const startQuiz = useCallback(async (category: string = 'mixed') => {
    if (!currentPlayer.isHost) return;
    if (startQuizLockRef.current) return;
    startQuizLockRef.current = true;

    try {
      // Cleanup any existing quiz data
      await supabase.from('quiz_rounds').delete().eq('lobby_id', lobbyId);
      await supabase.from('quiz_answers').delete().eq('lobby_id', lobbyId);
      await supabase.from('quiz_scores').delete().eq('lobby_id', lobbyId);

      setCurrentRound(1);
      setPreviousQuestions([]);
      nextQuestionRef.current = null;
      setCurrentStreak(0);
      setBestStreak(0);
      setScores(players.map(p => ({
        player_id: p.id,
        player_name: p.name,
        total_points: 0,
        correct_answers: 0,
        average_time_ms: 0,
      })));

      await startRound(category, 1);
    } finally {
      setTimeout(() => { startQuizLockRef.current = false; }, 2000);
    }
  }, [currentPlayer.isHost, lobbyId, players, startRound]);

  // Cleanup countdown timeout on unmount
  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    };
  }, []);

  return {
    phase,
    currentRound,
    totalRounds,
    currentQuestion,
    timeRemaining,
    answerDurationMs,
    hasAnswered,
    scores,
    roundAnswers,
    answeredPlayers,
    playersRemaining: Math.max(0, players.length - answeredPlayers.length),
    isLoading,
    currentStreak,
    bestStreak,
    roundInsight,
    triggerFreezeJoker,
    startQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound,
  };
};
