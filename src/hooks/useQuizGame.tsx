import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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
type QuizRoundRow = Database['public']['Tables']['quiz_rounds']['Row'];
type QuizAnswerRow = Database['public']['Tables']['quiz_answers']['Row'];

interface RoundInsight {
  correctCount: number;
  accuracyPercent: number;
  averageCorrectTimeMs: number;
  fastestCorrectAnswer: QuizAnswer | null;
}

const COUNTDOWN_MS = 3500;
const COUNTDOWN_MAX_MS = 6000;
const REVEAL_AUTO_ADVANCE_MS = 3500;
const SCORES_AUTO_ADVANCE_MS = 4500;
const REVEAL_WATCHDOG_MS = 6000;
const SCORES_WATCHDOG_MS = 7000;
const ALL_ANSWERED_GRACE_MS = 900;

const PHASE_ORDER: Record<Exclude<QuizPhase, 'waiting'>, number> = {
  countdown: 0,
  answering: 1,
  reveal: 2,
  scores: 3,
  final: 4,
};

const normalizePhase = (phase: string): Exclude<QuizPhase, 'waiting'> => (
  phase === 'answering'
  || phase === 'reveal'
  || phase === 'scores'
  || phase === 'final'
    ? phase
    : 'countdown'
);

const compareRoundIdentity = (left: QuizRoundRow, right: QuizRoundRow) => {
  if (left.round_number !== right.round_number) {
    return left.round_number - right.round_number;
  }
  const createdAtOrder = left.created_at.localeCompare(right.created_at);
  if (createdAtOrder !== 0) return createdAtOrder;
  return left.id.localeCompare(right.id);
};

const questionFromRound = (round: QuizRoundRow): QuizQuestion => ({
  question: round.question_text,
  answer: round.correct_answer,
  options: round.options ?? [],
  category: round.category,
  difficulty: round.difficulty,
  questionType: round.question_type === 'text' ? 'text' : 'qcm',
});

const answerFromRow = (row: QuizAnswerRow): QuizAnswer => ({
  player_id: row.player_id,
  player_name: row.player_name,
  answer: row.answer,
  response_time_ms: row.response_time_ms,
  is_correct: row.is_correct,
  points_earned: row.points_earned,
});

const createQuizSessionId = () => {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Calculate points proportionally to total duration (max 10 base points).
export const calculatePoints = (responseTimeMs: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, 1 - responseTimeMs / durationMs));
  return Math.max(0, Math.round(ratio * 10));
};

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
 * QCM answers require an exact normalized match. Free text may contain the
 * complete expected answer, but a partial guess never matches.
 */
export const isAnswerCorrect = (
  guess: string,
  correctAnswer: string,
  isQcm = false,
): boolean => {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(correctAnswer);
  if (normalizedGuess.length === 0 || normalizedAnswer.length === 0) return false;
  if (isQcm) return normalizedGuess === normalizedAnswer;
  return normalizedGuess === normalizedAnswer || normalizedGuess.includes(normalizedAnswer);
};

export const useQuizGame = (
  lobbyId: string,
  currentPlayer: Player,
  players: Player[],
  selectedCategory = 'mixed',
  hostSettings: QuizSettings = DEFAULT_QUIZ_SETTINGS,
) => {
  const [phase, setPhase] = useState<QuizPhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [answerDurationMs, setAnswerDurationMs] = useState(hostSettings.answerDurationMs);
  const [totalRounds, setTotalRounds] = useState(hostSettings.totalRounds);
  const [enableJokers, setEnableJokers] = useState(hostSettings.enableJokers);
  const [enableStreak, setEnableStreak] = useState(hostSettings.enableStreak);
  const [timeRemaining, setTimeRemaining] = useState(hostSettings.answerDurationMs);
  const [serverStartTime, setServerStartTime] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [roundAnswers, setRoundAnswers] = useState<QuizAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [freezeBonusMs, setFreezeBonusMs] = useState(0);

  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allAnsweredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<QuizPhase>('waiting');
  const playersRef = useRef(players);
  const currentRoundRef = useRef(1);
  const currentRoundRowRef = useRef<QuizRoundRow | null>(null);
  const roundHighWaterRef = useRef<QuizRoundRow | null>(null);
  const roundGenerationRef = useRef(0);
  const fetchSequenceRef = useRef(0);
  const answeredPlayerIdsRef = useRef<Set<string>>(new Set());
  const roundAnswersRef = useRef<QuizAnswer[]>([]);
  const quizSessionIdRef = useRef<string | null>(null);
  const sessionSettingsRef = useRef<QuizSettings>(hostSettings);
  const categoryFilterRef = useRef(selectedCategory);
  const submittingRef = useRef(false);
  const startQuizLockRef = useRef(false);
  const startRoundLockRef = useRef(false);
  const nextQuestionRef = useRef<QuizQuestion | null>(null);
  const previousQuestionsRef = useRef<string[]>([]);
  const quizSessionGenerationRef = useRef(0);
  const advanceToRevealRef = useRef<(() => Promise<void>) | null>(null);
  const advanceToScoresRef = useRef<(() => Promise<void>) | null>(null);
  const nextRoundRef = useRef<(() => Promise<void>) | null>(null);
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );

  const { addXp } = usePlayerLevel();

  phaseRef.current = phase;
  playersRef.current = players;

  useEffect(() => {
    mountedRef.current = true;
    phaseRef.current = 'waiting';
    currentRoundRef.current = 1;
    currentRoundRowRef.current = null;
    roundHighWaterRef.current = null;
    quizSessionIdRef.current = null;
    sessionSettingsRef.current = hostSettings;
    categoryFilterRef.current = selectedCategory;
    roundAnswersRef.current = [];
    roundGenerationRef.current += 1;
    fetchSequenceRef.current += 1;
    answeredPlayerIdsRef.current = new Set();
    setPhase('waiting');
    setCurrentRound(1);
    setCurrentRoundId(null);
    setQuizSessionId(null);
    setCurrentQuestion(null);
    setRoundAnswers([]);
    setAnsweredPlayers([]);
    setHasAnswered(false);
    setIsLoading(true);

    return () => {
      mountedRef.current = false;
      fetchSequenceRef.current += 1;
      roundGenerationRef.current += 1;
      currentRoundRowRef.current = null;
      if (allAnsweredTimeoutRef.current) {
        clearTimeout(allAnsweredTimeoutRef.current);
        allAnsweredTimeoutRef.current = null;
      }
    };
  }, [lobbyId]);

  const playersKey = useMemo(
    () => players.map((player) => player.id).sort().join(','),
    [players],
  );

  useEffect(() => {
    setScores((previous) => {
      const previousById = new Map(previous.map((score) => [score.player_id, score]));
      return players.map((player) => previousById.get(player.id) ?? {
        player_id: player.id,
        player_name: player.name,
        total_points: 0,
        correct_answers: 0,
        average_time_ms: 0,
      });
    });
  }, [playersKey, players]);

  const fetchScoresFromDB = useCallback(async () => {
    const sessionId = quizSessionIdRef.current;
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Quiz] Score snapshot failed:', error);
      return;
    }
    if (!mountedRef.current || quizSessionIdRef.current !== sessionId) return;

    const livePlayers = playersRef.current;
    const totals = new Map<string, { points: number; correct: number; times: number[] }>();
    livePlayers.forEach((player) => {
      totals.set(player.id, { points: 0, correct: 0, times: [] });
    });

    (data ?? []).forEach((answer) => {
      const total = totals.get(answer.player_id);
      if (!total) return;
      total.points += answer.points_earned;
      total.correct += answer.is_correct ? 1 : 0;
      total.times.push(answer.response_time_ms);
    });

    let restoredStreak = 0;
    let restoredBestStreak = 0;
    (data ?? [])
      .filter((answer) => answer.player_id === currentPlayer.id)
      .forEach((answer) => {
        restoredStreak = answer.is_correct ? restoredStreak + 1 : 0;
        restoredBestStreak = Math.max(restoredBestStreak, restoredStreak);
      });
    setCurrentStreak(restoredStreak);
    setBestStreak(restoredBestStreak);

    setScores(livePlayers.map((player) => {
      const total = totals.get(player.id);
      return {
        player_id: player.id,
        player_name: player.name,
        total_points: total?.points ?? 0,
        correct_answers: total?.correct ?? 0,
        average_time_ms: total?.times.length
          ? Math.round(total.times.reduce((sum, value) => sum + value, 0) / total.times.length)
          : 0,
      };
    }));
  }, [currentPlayer.id, lobbyId]);

  const hydrateRoundAnswers = useCallback(async (roundNumber: number, generation: number) => {
    const sessionId = quizSessionIdRef.current;
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Quiz] Answer snapshot failed:', error);
      return;
    }
    if (
      !mountedRef.current
      || roundGenerationRef.current !== generation
      || currentRoundRef.current !== roundNumber
      || quizSessionIdRef.current !== sessionId
    ) {
      return;
    }

    const byPlayer = new Map<string, QuizAnswer>();
    (data ?? []).forEach((row) => {
      if (!byPlayer.has(row.player_id)) byPlayer.set(row.player_id, answerFromRow(row));
    });
    // Realtime may have delivered a newer INSERT while this SELECT was in
    // flight. Streamed rows win and can never be erased by an older snapshot.
    roundAnswersRef.current.forEach((answer) => byPlayer.set(answer.player_id, answer));
    const answers = [...byPlayer.values()];
    const answered = new Set(answers.map((answer) => answer.player_id));
    roundAnswersRef.current = answers;
    answeredPlayerIdsRef.current = answered;
    setRoundAnswers(answers);
    setAnsweredPlayers([...answered]);
    setHasAnswered(answered.has(currentPlayer.id));
  }, [currentPlayer.id, lobbyId]);

  const clearRoundState = useCallback(() => {
    roundGenerationRef.current += 1;
    currentRoundRowRef.current = null;
    roundHighWaterRef.current = null;
    currentRoundRef.current = 1;
    quizSessionIdRef.current = null;
    phaseRef.current = 'waiting';
    answeredPlayerIdsRef.current = new Set();
    roundAnswersRef.current = [];
    submittingRef.current = false;
    if (!mountedRef.current) return;
    setPhase('waiting');
    setCurrentRound(1);
    setCurrentRoundId(null);
    setQuizSessionId(null);
    setCurrentQuestion(null);
    setServerStartTime(null);
    setRoundAnswers([]);
    setAnsweredPlayers([]);
    setHasAnswered(false);
    setFreezeBonusMs(0);
  }, []);

  /**
   * Client-side high-water mark. A previous round or a regressive phase update
   * can no longer resurrect an obsolete question after a realtime race.
   */
  const adoptRound = useCallback((row: QuizRoundRow) => {
    if (!mountedRef.current || !row.is_active) return null;

    const current = currentRoundRowRef.current;
    const nextPhase = normalizePhase(row.phase);
    let next = row;
    let changedRound = false;

    if (current?.id === row.id) {
      const currentPhase = normalizePhase(current.phase);
      if (PHASE_ORDER[nextPhase] < PHASE_ORDER[currentPhase]) return null;
      if (current.started_at && !row.started_at) {
        next = { ...row, started_at: current.started_at };
      }
    } else {
      const sameSession = current?.session_id === row.session_id;
      const highWater = roundHighWaterRef.current;
      if (
        sameSession
        && highWater?.session_id === row.session_id
        && compareRoundIdentity(row, highWater) <= 0
      ) {
        return null;
      }
      changedRound = true;
      roundGenerationRef.current += 1;
    }

    const previousPhase = current ? normalizePhase(current.phase) : 'waiting';
    const phaseChanged = previousPhase !== nextPhase || changedRound;
    const difficulty = (
      next.difficulty_filter === 'facile'
      || next.difficulty_filter === 'moyen'
      || next.difficulty_filter === 'difficile'
    ) ? next.difficulty_filter : 'mixed';
    const questionMode = next.question_mode === 'qcm' || next.question_mode === 'text'
      ? next.question_mode
      : 'mixed';
    const canonicalSettings: QuizSettings = {
      totalRounds: next.total_rounds || DEFAULT_QUIZ_SETTINGS.totalRounds,
      answerDurationMs: next.answer_duration_ms || DEFAULT_QUIZ_SETTINGS.answerDurationMs,
      difficulty,
      questionMode,
      enableJokers: next.enable_jokers,
      enableStreak: next.enable_streak,
    };

    currentRoundRowRef.current = next;
    roundHighWaterRef.current = next;
    currentRoundRef.current = next.round_number;
    quizSessionIdRef.current = next.session_id;
    sessionSettingsRef.current = canonicalSettings;
    categoryFilterRef.current = next.category_filter || 'mixed';
    phaseRef.current = nextPhase;

    if (changedRound) {
      answeredPlayerIdsRef.current = new Set();
      roundAnswersRef.current = [];
      submittingRef.current = false;
      if (allAnsweredTimeoutRef.current) {
        clearTimeout(allAnsweredTimeoutRef.current);
        allAnsweredTimeoutRef.current = null;
      }
      setRoundAnswers([]);
      setAnsweredPlayers([]);
      setHasAnswered(false);
      setFreezeBonusMs(0);
    }

    const duration = canonicalSettings.answerDurationMs;
    setCurrentRound(next.round_number);
    setCurrentRoundId(next.id);
    setQuizSessionId(next.session_id);
    setCurrentQuestion(questionFromRound(next));
    setTotalRounds(canonicalSettings.totalRounds);
    setAnswerDurationMs(duration);
    setEnableJokers(canonicalSettings.enableJokers);
    setEnableStreak(canonicalSettings.enableStreak);
    setPhase(nextPhase);

    if (nextPhase === 'answering') {
      setServerStartTime(next.started_at);
      if (next.started_at) {
        const elapsed = Date.now() - new Date(next.started_at).getTime();
        setTimeRemaining(Math.max(0, duration - elapsed));
      } else {
        setTimeRemaining(duration);
      }
    } else if (nextPhase === 'countdown') {
      setServerStartTime(null);
      setTimeRemaining(duration);
    }

    return {
      round: next,
      phase: nextPhase,
      phaseChanged,
      changedRound,
      generation: roundGenerationRef.current,
    };
  }, []);

  const handleRoundRow = useCallback((row: QuizRoundRow, withSound: boolean) => {
    const adoption = adoptRound(row);
    if (!adoption) return;

    if (adoption.changedRound) {
      void hydrateRoundAnswers(adoption.round.round_number, adoption.generation);
    }

    if (adoption.phase === 'reveal' || adoption.phase === 'scores' || adoption.phase === 'final') {
      void fetchScoresFromDB();
    }

    if (!withSound || !adoption.phaseChanged) return;
    if (adoption.phase === 'countdown') playSoundEffect('quizReveal', 0.5);
    if (adoption.phase === 'reveal') playSoundEffect('reveal', 0.5);
    if (adoption.phase === 'scores') playSoundEffect('transition', 0.4);
    if (adoption.phase === 'final') playSoundEffect('celebration', 0.6);
  }, [adoptRound, fetchScoresFromDB, hydrateRoundAnswers]);

  const fetchLatestRound = useCallback(async () => {
    const sequence = fetchSequenceRef.current + 1;
    fetchSequenceRef.current = sequence;

    try {
      const { data, error } = await supabase
        .from('quiz_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('is_active', true)
        .order('round_number', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!mountedRef.current || fetchSequenceRef.current !== sequence) return;

      if (!data) {
        if (!currentRoundRowRef.current) clearRoundState();
        return;
      }

      const adoption = adoptRound(data);
      const generation = adoption?.generation ?? roundGenerationRef.current;
      if (currentRoundRef.current === data.round_number) {
        await hydrateRoundAnswers(data.round_number, generation);
      }
      await fetchScoresFromDB();
    } catch (error) {
      console.error('[Quiz] Initial snapshot failed:', error);
    } finally {
      if (mountedRef.current && fetchSequenceRef.current === sequence) {
        setIsLoading(false);
      }
    }
  }, [adoptRound, clearRoundState, fetchScoresFromDB, hydrateRoundAnswers, lobbyId]);

  const advanceToReveal = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const row = currentRoundRowRef.current;
    if (!row) return;
    const { error } = await supabase
      .from('quiz_rounds')
      .update({ phase: 'reveal' })
      .eq('id', row.id)
      .eq('phase', 'answering');
    if (error) console.warn('[Quiz] advanceToReveal failed:', error);
  }, [currentPlayer.isHost]);
  advanceToRevealRef.current = advanceToReveal;

  useEffect(() => {
    let subscriptionReady = false;
    const channel = supabase
      .channel(`quiz-sync-${lobbyId}-${sessionIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_rounds', filter: `lobby_id=eq.${lobbyId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<QuizRoundRow>).id;
            if (deletedId && currentRoundRowRef.current?.id === deletedId) clearRoundState();
            return;
          }
          if (!payload.new || !('id' in payload.new)) return;
          const row = payload.new as QuizRoundRow;
          if (!row.is_active) {
            if (currentRoundRowRef.current?.session_id === row.session_id) clearRoundState();
            return;
          }
          handleRoundRow(row, true);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_answers', filter: `lobby_id=eq.${lobbyId}` },
        (payload) => {
          if (!payload.new || !('id' in payload.new)) return;
          const row = payload.new as QuizAnswerRow;
          const activeRound = currentRoundRowRef.current;
          if (
            !activeRound
            || row.session_id !== activeRound.session_id
            || row.round_number !== activeRound.round_number
          ) {
            return;
          }
          if (answeredPlayerIdsRef.current.has(row.player_id)) return;

          answeredPlayerIdsRef.current.add(row.player_id);
          const answer = answerFromRow(row);
          roundAnswersRef.current = [...roundAnswersRef.current, answer];
          setAnsweredPlayers([...answeredPlayerIdsRef.current]);
          setRoundAnswers(roundAnswersRef.current);
          if (row.player_id === currentPlayer.id) setHasAnswered(true);

          setScores((previous) => previous.map((score) => (
            score.player_id === row.player_id
              ? {
                  ...score,
                  total_points: score.total_points + row.points_earned,
                  correct_answers: score.correct_answers + (row.is_correct ? 1 : 0),
                }
              : score
          )));

          const livePlayers = playersRef.current;
          const allAnswered = livePlayers.length > 0
            && livePlayers.every((player) => answeredPlayerIdsRef.current.has(player.id));
          if (allAnswered && currentPlayer.isHost && phaseRef.current === 'answering') {
            if (allAnsweredTimeoutRef.current) clearTimeout(allAnsweredTimeoutRef.current);
            allAnsweredTimeoutRef.current = setTimeout(() => {
              allAnsweredTimeoutRef.current = null;
              if (phaseRef.current === 'answering') void advanceToRevealRef.current?.();
            }, ALL_ANSWERED_GRACE_MS);
          }
        },
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        subscriptionReady = true;
        // Snapshot after the replication listener is ready. Repeating this on
        // reconnect closes the SQL/Realtime gap; monotone adoption absorbs it.
        void fetchLatestRound();
      });

    const bootstrapFallback = setTimeout(() => {
      if (!subscriptionReady) void fetchLatestRound();
    }, 2500);

    return () => {
      clearTimeout(bootstrapFallback);
      if (allAnsweredTimeoutRef.current) {
        clearTimeout(allAnsweredTimeoutRef.current);
        allAnsweredTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [clearRoundState, currentPlayer.id, currentPlayer.isHost, fetchLatestRound, handleRoundRow, lobbyId]);

  // The host starts a countdown from the row's server timestamp. Direct local
  // adoption means this no longer depends on receiving our own realtime INSERT.
  useEffect(() => {
    if (phase !== 'countdown' || !currentPlayer.isHost || !currentRoundId) return;
    const row = currentRoundRowRef.current;
    if (!row || row.id !== currentRoundId) return;

    const createdAt = new Date(row.created_at).getTime();
    const elapsed = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0;
    const delay = Math.max(0, COUNTDOWN_MS - elapsed);
    const timeout = setTimeout(() => {
      const active = currentRoundRowRef.current;
      if (phaseRef.current !== 'countdown' || active?.id !== row.id) return;
      const startedAt = new Date().toISOString();
      void supabase
        .from('quiz_rounds')
        .update({ phase: 'answering', started_at: startedAt })
        .eq('id', row.id)
        .eq('phase', 'countdown')
        .then(({ error }) => {
          if (error) console.warn('[Quiz] Countdown transition failed:', error);
        });
    }, delay);

    return () => clearTimeout(timeout);
  }, [currentPlayer.isHost, currentRoundId, phase]);

  // A second, later attempt keeps a temporary network failure from freezing the game.
  useEffect(() => {
    if (phase !== 'countdown' || !currentPlayer.isHost || !currentRoundId) return;
    const timeout = setTimeout(() => {
      const row = currentRoundRowRef.current;
      if (phaseRef.current !== 'countdown' || row?.id !== currentRoundId) return;
      void supabase
        .from('quiz_rounds')
        .update({ phase: 'answering', started_at: new Date().toISOString() })
        .eq('id', currentRoundId)
        .eq('phase', 'countdown');
    }, COUNTDOWN_MAX_MS);
    return () => clearTimeout(timeout);
  }, [currentPlayer.isHost, currentRoundId, phase]);

  // Repair a malformed answering row rather than leaving every timer inert.
  useEffect(() => {
    if (phase !== 'answering' || serverStartTime || !currentPlayer.isHost || !currentRoundId) return;
    void supabase
      .from('quiz_rounds')
      .update({ started_at: new Date().toISOString() })
      .eq('id', currentRoundId)
      .is('started_at', null);
  }, [currentPlayer.isHost, currentRoundId, phase, serverStartTime]);

  useEffect(() => {
    if (phase !== 'answering' || !serverStartTime) return;
    let hasCalledTimeUp = false;

    const updateTimer = () => {
      const elapsed = Date.now() - new Date(serverStartTime).getTime();
      const remaining = Math.max(0, answerDurationMs + freezeBonusMs - elapsed);
      setTimeRemaining(remaining);

      const seconds = Math.ceil(remaining / 1000);
      if (remaining % 1000 < 100 && remaining > 0) {
        if (seconds <= 5) playSoundEffect('quizRush', 0.3);
        else if (seconds <= 30) playSoundEffect('quizTick', 0.1);
      }

      if (remaining <= 0 && !hasCalledTimeUp) {
        hasCalledTimeUp = true;
        playSoundEffect('quizTimeUp', 0.5);
        if (currentPlayer.isHost) void advanceToReveal();
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
  }, [advanceToReveal, answerDurationMs, currentPlayer.isHost, freezeBonusMs, phase, serverStartTime]);

  useEffect(() => {
    if (!currentPlayer.isHost) return undefined;
    if (phase === 'reveal') {
      const timeout = setTimeout(() => {
        if (phaseRef.current === 'reveal') void advanceToScoresRef.current?.();
      }, REVEAL_AUTO_ADVANCE_MS);
      return () => clearTimeout(timeout);
    }
    if (phase === 'scores') {
      const timeout = setTimeout(() => {
        if (phaseRef.current === 'scores') void nextRoundRef.current?.();
      }, SCORES_AUTO_ADVANCE_MS);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [currentPlayer.isHost, phase]);

  useEffect(() => {
    if (!currentPlayer.isHost || (phase !== 'reveal' && phase !== 'scores')) return undefined;
    const timeout = setTimeout(() => {
      if (phaseRef.current === 'reveal') void advanceToScoresRef.current?.();
      if (phaseRef.current === 'scores') void nextRoundRef.current?.();
    }, phase === 'reveal' ? REVEAL_WATCHDOG_MS : SCORES_WATCHDOG_MS);
    return () => clearTimeout(timeout);
  }, [currentPlayer.isHost, phase]);

  const generateQuestion = useCallback(async (
    category = 'mixed',
    sessionGeneration = quizSessionGenerationRef.current,
    settings = sessionSettingsRef.current,
  ): Promise<QuizQuestion | null> => {
    setIsLoading(true);
    try {
      const categories = [
        'general', 'anime', 'histoire', 'sport', 'musique',
        'cinema', 'science', 'geographie', 'jeux_video', 'art',
      ];
      const categoryToUse = category === 'mixed'
        ? categories[Math.floor(Math.random() * categories.length)]
        : category;

      const { data, error } = await supabase.functions.invoke('generate-quiz-question', {
        body: {
          category: categoryToUse,
          difficulty: settings.difficulty !== 'mixed' ? settings.difficulty : undefined,
          previousQuestions: previousQuestionsRef.current,
        },
      });
      if (error) throw error;
      if (quizSessionGenerationRef.current !== sessionGeneration) return null;

      previousQuestionsRef.current = [...previousQuestionsRef.current, data.question];
      let questionType: 'qcm' | 'text';
      if (settings.questionMode === 'qcm') questionType = 'qcm';
      else if (settings.questionMode === 'text') questionType = 'text';
      else questionType = Math.random() < 0.7 ? 'qcm' : 'text';

      return {
        question: data.question,
        answer: data.answer,
        options: data.options ?? [],
        category: data.category,
        difficulty: data.difficulty,
        questionType,
      };
    } catch (error) {
      console.error('[Quiz] Question generation failed:', error);
      if (quizSessionGenerationRef.current !== sessionGeneration) return null;
      return {
        question: 'Quelle est la capitale de la France ?',
        answer: 'Paris',
        options: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'],
        category: 'geographie',
        difficulty: 'facile',
        questionType: 'qcm',
      };
    } finally {
      if (mountedRef.current && quizSessionGenerationRef.current === sessionGeneration) {
        setIsLoading(false);
      }
    }
  }, []);

  const startRound = useCallback(async (
    category = categoryFilterRef.current,
    roundNumber = currentRoundRef.current,
  ): Promise<boolean> => {
    if (!currentPlayer.isHost || startRoundLockRef.current) return false;
    const sessionId = quizSessionIdRef.current;
    if (!sessionId) return false;
    startRoundLockRef.current = true;

    try {
      const settings = sessionSettingsRef.current;
      const { data: existing, error: existingError } = await supabase
        .from('quiz_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('session_id', sessionId)
        .eq('round_number', roundNumber)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        handleRoundRow(existing, false);
        return true;
      }

      const sessionGeneration = quizSessionGenerationRef.current;
      const question = nextQuestionRef.current
        ?? await generateQuestion(category, sessionGeneration, settings);
      nextQuestionRef.current = null;
      if (!question || quizSessionGenerationRef.current !== sessionGeneration) return false;

      const { data, error } = await supabase
        .from('quiz_rounds')
        .insert({
          lobby_id: lobbyId,
          session_id: sessionId,
          is_active: true,
          category_filter: category,
          round_number: roundNumber,
          question_text: question.question,
          correct_answer: question.answer,
          options: question.options,
          question_type: question.questionType,
          category: question.category,
          difficulty: question.difficulty,
          phase: 'countdown',
          started_at: null,
          total_rounds: settings.totalRounds,
          answer_duration_ms: settings.answerDurationMs,
          difficulty_filter: settings.difficulty,
          question_mode: settings.questionMode,
          enable_jokers: settings.enableJokers,
          enable_streak: settings.enableStreak,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: racedRound } = await supabase
            .from('quiz_rounds')
            .select('*')
            .eq('lobby_id', lobbyId)
            .eq('session_id', sessionId)
            .eq('round_number', roundNumber)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (racedRound) {
            handleRoundRow(racedRound, false);
            return true;
          }
        }
        throw error;
      }

      handleRoundRow(data, false);

      if (roundNumber < settings.totalRounds) {
        void generateQuestion(category, sessionGeneration, settings).then((nextQuestion) => {
          if (
            nextQuestion
            && quizSessionGenerationRef.current === sessionGeneration
            && currentRoundRef.current === roundNumber
          ) {
            nextQuestionRef.current = nextQuestion;
          }
        });
      }
      return true;
    } catch (error) {
      console.error('[Quiz] Round start failed:', error);
      return false;
    } finally {
      startRoundLockRef.current = false;
    }
  }, [currentPlayer.isHost, generateQuestion, handleRoundRow, lobbyId]);

  const awardCorrectAnswerXp = useCallback(() => {
    void (async () => {
      try {
        const result = await addXp('quizCorrectAnswer');
        emitXpGain(XP_REWARDS.quizCorrectAnswer, 'quizCorrectAnswer');
        if (result?.leveledUp) emitLevelUpNotification(result.newLevel);
      } catch (error) {
        console.warn('[Quiz] Correct-answer XP not awarded:', error);
      }
    })();
  }, [addXp]);

  const submitAnswer = useCallback(async (answer: string) => {
    const activeRound = currentRoundRowRef.current;
    if (
      hasAnswered
      || submittingRef.current
      || phaseRef.current !== 'answering'
      || !serverStartTime
      || !currentQuestion
      || !activeRound
    ) {
      return;
    }

    const cleanAnswer = safeParse(quizAnswerSchema, answer);
    if (!cleanAnswer) return;

    submittingRef.current = true;
    setHasAnswered(true);

    try {
      const responseTime = Math.max(
        0,
        Date.now() - new Date(serverStartTime).getTime() - freezeBonusMs,
      );
      const isCorrect = isAnswerCorrect(
        cleanAnswer,
        currentQuestion.answer,
        currentQuestion.questionType === 'qcm',
      );
      const nextStreak = isCorrect && enableStreak ? currentStreak + 1 : 0;
      let points = isCorrect ? calculatePoints(responseTime, answerDurationMs) : 0;
      if (isCorrect && enableStreak && nextStreak >= 3) {
        points += Math.min(5, nextStreak - 2);
      }

      const { error } = await supabase.from('quiz_answers').insert({
        lobby_id: lobbyId,
        session_id: activeRound.session_id,
        round_number: activeRound.round_number,
        player_id: currentPlayer.id,
        player_name: currentPlayer.name,
        answer: cleanAnswer,
        response_time_ms: responseTime,
        is_correct: isCorrect,
        points_earned: points,
      });

      if (error && error.code !== '23505') throw error;
      if (!mountedRef.current || currentRoundRowRef.current?.id !== activeRound.id) return;

      if (enableStreak) {
        setCurrentStreak(nextStreak);
        if (isCorrect) setBestStreak((previous) => Math.max(previous, nextStreak));
      }

      playSoundEffect(isCorrect ? 'quizCorrect' : 'quizWrong', isCorrect ? 0.5 : 0.4);
      if (isCorrect && !error) awardCorrectAnswerXp();
    } catch (error) {
      console.error('[Quiz] Answer insert failed:', error);
      if (mountedRef.current && currentRoundRowRef.current?.id === activeRound.id) {
        setHasAnswered(false);
      }
    } finally {
      submittingRef.current = false;
    }
  }, [
    answerDurationMs,
    awardCorrectAnswerXp,
    currentPlayer.id,
    currentPlayer.name,
    currentQuestion,
    currentStreak,
    enableStreak,
    freezeBonusMs,
    hasAnswered,
    lobbyId,
    serverStartTime,
  ]);

  const triggerFreezeJoker = useCallback(() => {
    if (phaseRef.current === 'answering') setFreezeBonusMs((bonus) => bonus + 5000);
  }, []);

  const advanceToScores = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const row = currentRoundRowRef.current;
    if (!row) return;
    const { error } = await supabase
      .from('quiz_rounds')
      .update({ phase: 'scores' })
      .eq('id', row.id)
      .eq('phase', 'reveal');
    if (error) console.warn('[Quiz] advanceToScores failed:', error);
  }, [currentPlayer.isHost]);
  advanceToScoresRef.current = advanceToScores;

  const nextRound = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    const row = currentRoundRowRef.current;
    if (!row) return;

    if (row.round_number >= totalRounds) {
      const { error } = await supabase
        .from('quiz_rounds')
        .update({ phase: 'final' })
        .eq('id', row.id)
        .eq('phase', 'scores');
      if (error) console.warn('[Quiz] Final transition failed:', error);
      return;
    }

    setHasAnswered(false);
    await startRound(categoryFilterRef.current, row.round_number + 1);
  }, [currentPlayer.isHost, startRound, totalRounds]);
  nextRoundRef.current = nextRound;

  const startQuiz = useCallback(async (category = 'mixed') => {
    if (!currentPlayer.isHost || startQuizLockRef.current) return;
    startQuizLockRef.current = true;
    setIsLoading(true);

    try {
      const deleteAnswers = await supabase.from('quiz_answers').delete().eq('lobby_id', lobbyId);
      if (deleteAnswers.error) throw deleteAnswers.error;
      const deleteScores = await supabase.from('quiz_scores').delete().eq('lobby_id', lobbyId);
      if (deleteScores.error) throw deleteScores.error;
      const deleteRounds = await supabase.from('quiz_rounds').delete().eq('lobby_id', lobbyId);
      if (deleteRounds.error) throw deleteRounds.error;

      quizSessionGenerationRef.current += 1;
      previousQuestionsRef.current = [];
      nextQuestionRef.current = null;
      clearRoundState();
      const sessionId = createQuizSessionId();
      quizSessionIdRef.current = sessionId;
      sessionSettingsRef.current = hostSettings;
      categoryFilterRef.current = category;
      setQuizSessionId(sessionId);
      setEnableJokers(hostSettings.enableJokers);
      setEnableStreak(hostSettings.enableStreak);
      setTotalRounds(hostSettings.totalRounds);
      setAnswerDurationMs(hostSettings.answerDurationMs);
      setCurrentStreak(0);
      setBestStreak(0);
      setScores(playersRef.current.map((player) => ({
        player_id: player.id,
        player_name: player.name,
        total_points: 0,
        correct_answers: 0,
        average_time_ms: 0,
      })));

      await startRound(category, 1);
    } catch (error) {
      console.error('[Quiz] Quiz start failed:', error);
      if (mountedRef.current) setIsLoading(false);
    } finally {
      startQuizLockRef.current = false;
    }
  }, [clearRoundState, currentPlayer.isHost, hostSettings, lobbyId, startRound]);

  const leaveQuiz = useCallback(async (): Promise<boolean> => {
    if (!currentPlayer.isHost) return true;
    const sessionId = quizSessionIdRef.current;
    if (!sessionId) return true;

    const { error } = await supabase
      .from('quiz_rounds')
      .update({ is_active: false })
      .eq('lobby_id', lobbyId)
      .eq('session_id', sessionId)
      .eq('is_active', true);
    if (error) {
      console.error('[Quiz] Session close failed:', error);
      return false;
    }
    clearRoundState();
    return true;
  }, [clearRoundState, currentPlayer.isHost, lobbyId]);

  const correctAnswers = roundAnswers.filter((answer) => answer.is_correct);
  const fastestCorrectAnswer = correctAnswers.reduce<QuizAnswer | null>((best, answer) => (
    !best || answer.response_time_ms < best.response_time_ms ? answer : best
  ), null);
  const averageCorrectTimeMs = correctAnswers.length > 0
    ? Math.round(
        correctAnswers.reduce((sum, answer) => sum + answer.response_time_ms, 0)
        / correctAnswers.length,
      )
    : 0;
  const roundInsight: RoundInsight = {
    correctCount: correctAnswers.length,
    accuracyPercent: players.length > 0
      ? Math.round((correctAnswers.length / players.length) * 100)
      : 0,
    averageCorrectTimeMs,
    fastestCorrectAnswer,
  };

  return {
    phase,
    currentRound,
    quizSessionId,
    totalRounds,
    currentQuestion,
    timeRemaining,
    answerDurationMs,
    enableJokers,
    enableStreak,
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
    leaveQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound,
  };
};
