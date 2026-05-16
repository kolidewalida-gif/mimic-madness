import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';
import { usePlayerLevel, XP_REWARDS } from '@/hooks/usePlayerLevel';
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from '@/components/QuizSettingsPanel';

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

// Calculate points proportionally to total duration (max 10 base points)
const calculatePoints = (responseTimeMs: number, durationMs: number): number => {
  const ratio = Math.max(0, 1 - responseTimeMs / durationMs);
  return Math.max(0, Math.round(ratio * 10));
};

// Normalize answer for comparison (lowercase, trim, remove accents)
const normalizeAnswer = (answer: string): string => {
  return answer
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
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
  phaseRef.current = phase;
  
  // XP system
  const { addXp } = usePlayerLevel();

  // Initialize scores for all players
  useEffect(() => {
    const initialScores: QuizScore[] = players.map(p => ({
      player_id: p.id,
      player_name: p.name,
      total_points: 0,
      correct_answers: 0,
      average_time_ms: 0
    }));
    setScores(initialScores);
  }, [players]);

  // Fetch scores from database to ensure sync
  const fetchScoresFromDB = useCallback(async () => {
    const { data: answersData } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('lobby_id', lobbyId);
    
    if (answersData) {
      const scoreMap: Record<string, { points: number; correct: number; times: number[] }> = {};
      
      players.forEach(p => {
        scoreMap[p.id] = { points: 0, correct: 0, times: [] };
      });
      
      answersData.forEach(a => {
        if (scoreMap[a.player_id]) {
          scoreMap[a.player_id].points += a.points_earned;
          scoreMap[a.player_id].correct += a.is_correct ? 1 : 0;
          scoreMap[a.player_id].times.push(a.response_time_ms);
        }
      });
      
      const newScores: QuizScore[] = players.map(p => ({
        player_id: p.id,
        player_name: p.name,
        total_points: scoreMap[p.id]?.points || 0,
        correct_answers: scoreMap[p.id]?.correct || 0,
        average_time_ms: scoreMap[p.id]?.times.length 
          ? Math.round(scoreMap[p.id].times.reduce((a, b) => a + b, 0) / scoreMap[p.id].times.length)
          : 0
      }));
      
      setScores(newScores);
    }
  }, [lobbyId, players]);

  // Advance to reveal phase (host only) - declared early for timer usage
  const advanceToReveal = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    console.log('[Quiz] Advancing to reveal');
    await supabase.from('quiz_rounds')
      .update({ phase: 'reveal' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', currentRound);
  }, [currentPlayer.isHost, lobbyId, currentRound]);
  advanceToRevealRef.current = advanceToReveal;

  // Subscribe to quiz round updates - SYNCHRONIZED
  useEffect(() => {
    const channel = supabase
      .channel(`quiz-sync-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        async (payload: any) => {
          if (payload.new) {
            const newRound = payload.new;
            console.log('[Quiz] Round update:', newRound.phase, 'round:', newRound.round_number);
            
            setCurrentRound(newRound.round_number);
            if (newRound.total_rounds) setTotalRounds(newRound.total_rounds);
            if (newRound.answer_duration_ms) setAnswerDurationMs(newRound.answer_duration_ms);
            
            const options: string[] = newRound.options || [];
            const questionType = newRound.question_type || 'qcm';
            
            setCurrentQuestion({
              question: newRound.question_text,
              answer: newRound.correct_answer,
              options: options,
              category: newRound.category,
              difficulty: newRound.difficulty,
              questionType: questionType as 'qcm' | 'text'
            });
            
            if (newRound.phase === 'countdown') {
              setPhase('countdown');
              setHasAnswered(false);
              setAnsweredPlayers([]);
              setRoundAnswers([]);
              setFreezeBonusMs(0);
              playSoundEffect('quizReveal', 0.5);
            } else if (newRound.phase === 'answering') {
              setPhase('answering');
              setServerStartTime(newRound.started_at);
              setHasAnswered(false);
              
              // Calculate time remaining based on server time
              if (newRound.started_at) {
                const startTime = new Date(newRound.started_at).getTime();
                const now = Date.now();
                const elapsed = now - startTime;
                const remaining = Math.max(0, (newRound.answer_duration_ms || answerDurationMs) - elapsed);
                setTimeRemaining(remaining);
              } else {
                setTimeRemaining(newRound.answer_duration_ms || answerDurationMs);
              }
            } else if (newRound.phase === 'reveal') {
              setPhase('reveal');
              await fetchScoresFromDB();
              playSoundEffect('reveal', 0.5);
            } else if (newRound.phase === 'scores') {
              setPhase('scores');
              await fetchScoresFromDB();
              playSoundEffect('transition', 0.4);
            } else if (newRound.phase === 'final') {
              setPhase('final');
              await fetchScoresFromDB();
              playSoundEffect('celebration', 0.6);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_answers',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (payload.new) {
            console.log('[Quiz] New answer from:', payload.new.player_name);
            
            // Update answered players list
            setAnsweredPlayers(prev => {
              if (prev.includes(payload.new.player_id)) {
                return prev;
              }

              const next = [...prev, payload.new.player_id];
              const allPlayersAnswered = players.length > 0 && players.every(player => next.includes(player.id));

              if (
                allPlayersAnswered &&
                currentPlayer.isHost &&
                phaseRef.current === 'answering'
              ) {
                window.setTimeout(() => {
                  if (phaseRef.current === 'answering') {
                    void advanceToRevealRef.current?.();
                  }
                }, 900);
              }

              return next;
            });
            
            // Update round answers
            setRoundAnswers(prev => {
              const exists = prev.some(a => a.player_id === payload.new.player_id);
              if (!exists) {
                return [...prev, {
                  player_id: payload.new.player_id,
                  player_name: payload.new.player_name,
                  answer: payload.new.answer,
                  response_time_ms: payload.new.response_time_ms,
                  is_correct: payload.new.is_correct,
                  points_earned: payload.new.points_earned
                }];
              }
              return prev;
            });

            // Update local scores immediately for responsive UI
            setScores(prev => prev.map(s => 
              s.player_id === payload.new.player_id
                ? {
                    ...s,
                    total_points: s.total_points + payload.new.points_earned,
                    correct_answers: s.correct_answers + (payload.new.is_correct ? 1 : 0)
                  }
                : s
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, fetchScoresFromDB, players, currentPlayer.isHost, answerDurationMs]);

  // Synchronized Timer - based on server time
  useEffect(() => {
    if (phase === 'answering' && serverStartTime) {
      let hasCalledTimeUp = false;
      
      const updateTimer = () => {
        const startTime = new Date(serverStartTime).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, (answerDurationMs + freezeBonusMs) - elapsed);
        
        setTimeRemaining(remaining);
        
        // Play tick sounds
        const seconds = Math.ceil(remaining / 1000);
        if (remaining % 1000 < 100 && remaining > 0) {
          if (seconds <= 5) {
            playSoundEffect('quizRush', 0.3);
          } else if (seconds <= 30) {
            playSoundEffect('quizTick', 0.1);
          }
        }
        
        // Time's up - only call once
        if (remaining <= 0 && !hasCalledTimeUp) {
          hasCalledTimeUp = true;
          playSoundEffect('quizTimeUp', 0.5);
          if (currentPlayer.isHost) {
            advanceToReveal();
          }
          // Clear the interval when time is up
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };
      
      updateTimer(); // Initial call
      timerRef.current = setInterval(updateTimer, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, serverStartTime, currentPlayer.isHost, advanceToReveal, answerDurationMs, freezeBonusMs]);

  // Auto-advance: reveal -> scores -> nextRound (host only, fully synced for everyone)
  useEffect(() => {
    if (!currentPlayer.isHost) return;
    if (phase === 'reveal') {
      const t = setTimeout(() => {
        if (phaseRef.current === 'reveal') {
          void advanceToScores();
        }
      }, 3500);
      return () => clearTimeout(t);
    }
    if (phase === 'scores') {
      const t = setTimeout(() => {
        if (phaseRef.current === 'scores') {
          void nextRoundRef.current?.();
        }
      }, 4500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentPlayer.isHost]);

  // Generate a new question using the edge function
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
          previousQuestions 
        }
      });

      if (error) throw error;
      
      setPreviousQuestions(prev => [...prev, data.question]);
      
      // Question type based on host settings
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
        questionType
      } as QuizQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      return {
        question: "Quelle est la capitale de la France ?",
        answer: "Paris",
        options: ["Paris", "Lyon", "Marseille", "Bordeaux"],
        category: "geographie",
        difficulty: "facile",
        questionType: 'qcm'
      };
    } finally {
      setIsLoading(false);
    }
  }, [previousQuestions, hostSettings.difficulty, hostSettings.questionMode]);

  // Start a new round (host only)
  const startRound = useCallback(async (category: string = selectedCategory, roundNum: number = currentRound) => {
    if (!currentPlayer.isHost) return;
    
    console.log('[Quiz] Host starting round:', roundNum);
    setRoundAnswers([]);
    setAnsweredPlayers([]);
    
    const question = await generateQuestion(category);
    if (!question) return;

    // Delete any existing round data for this round
    await supabase.from('quiz_rounds')
      .delete()
      .eq('lobby_id', lobbyId)
      .eq('round_number', roundNum);

    // Insert new round with countdown phase
    await supabase.from('quiz_rounds').insert({
      lobby_id: lobbyId,
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

    // After countdown, transition to answering
    setTimeout(async () => {
      const now = new Date().toISOString();
      await supabase.from('quiz_rounds')
        .update({ 
          phase: 'answering',
          started_at: now
        })
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNum);
    }, 3500);
  }, [currentPlayer.isHost, lobbyId, currentRound, generateQuestion, selectedCategory, hostSettings]);

  // Submit an answer
  const submitAnswer = useCallback(async (answer: string) => {
    if (hasAnswered || !serverStartTime || !currentQuestion) return;
    
    const startTime = new Date(serverStartTime).getTime();
    const responseTime = Math.max(0, Date.now() - startTime - freezeBonusMs);
    const normalizedUserAnswer = normalizeAnswer(answer);
    const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.answer);
    
    // Check if answer is correct
    const isCorrect = normalizedCorrectAnswer.includes(normalizedUserAnswer) || 
                      normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
                      normalizedUserAnswer === normalizedCorrectAnswer;
    
    let points = isCorrect ? calculatePoints(responseTime, answerDurationMs) : 0;

    // Streak bonus
    if (isCorrect && hostSettings.enableStreak) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setBestStreak(b => Math.max(b, newStreak));
      if (newStreak >= 3) points += Math.min(5, newStreak - 2); // +1, +2, +3, capped at +5
    } else if (!isCorrect) {
      setCurrentStreak(0);
    }
    
    setHasAnswered(true);
    
    if (isCorrect) {
      playSoundEffect('quizCorrect', 0.5);
      // Award XP for correct answer
      const result = await addXp('quizCorrectAnswer');
      emitXpGain(XP_REWARDS.quizCorrectAnswer, 'quizCorrectAnswer');
      if (result?.leveledUp) {
        emitLevelUpNotification(result.newLevel);
      }
    } else {
      playSoundEffect('quizWrong', 0.4);
    }

    // Save answer to database
    await supabase.from('quiz_answers').insert({
      lobby_id: lobbyId,
      round_number: currentRound,
      player_id: currentPlayer.id,
      player_name: currentPlayer.name,
      answer: answer,
      response_time_ms: responseTime,
      is_correct: isCorrect,
      points_earned: points
    });
  }, [hasAnswered, serverStartTime, currentQuestion, lobbyId, currentRound, currentPlayer, addXp, freezeBonusMs, answerDurationMs, currentStreak, hostSettings.enableStreak]);

  // Joker: freeze adds 5s of personal grace (extends timer for me)
  const useFreezeJoker = useCallback(() => {
    setFreezeBonusMs(b => b + 5000);
  }, []);

  // advanceToReveal is declared earlier in the file for timer usage

  // Advance to scores phase (host only)
  const advanceToScores = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    console.log('[Quiz] Advancing to scores');
    await supabase.from('quiz_rounds')
      .update({ phase: 'scores' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', currentRound);
  }, [currentPlayer.isHost, lobbyId, currentRound]);

  // Move to next round or final results (host only)
  const nextRound = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    if (currentRound >= totalRounds) {
      console.log('[Quiz] Moving to final results');
      await supabase.from('quiz_rounds')
        .update({ phase: 'final' })
        .eq('lobby_id', lobbyId)
        .eq('round_number', currentRound);
    } else {
      const nextRoundNum = currentRound + 1;
      console.log('[Quiz] Moving to round:', nextRoundNum);
      setCurrentRound(nextRoundNum);
      setHasAnswered(false);
      startRound(selectedCategory, nextRoundNum);
    }
  }, [currentPlayer.isHost, currentRound, lobbyId, startRound, selectedCategory, totalRounds]);

  const correctAnswers = roundAnswers.filter(answer => answer.is_correct);
  const fastestCorrectAnswer = correctAnswers.reduce<QuizAnswer | null>((best, answer) => {
    if (!best || answer.response_time_ms < best.response_time_ms) {
      return answer;
    }
    return best;
  }, null);
  const averageCorrectTimeMs = correctAnswers.length > 0
    ? Math.round(correctAnswers.reduce((sum, answer) => sum + answer.response_time_ms, 0) / correctAnswers.length)
    : 0;
  const roundInsight: RoundInsight = {
    correctCount: correctAnswers.length,
    accuracyPercent: players.length > 0 ? Math.round((correctAnswers.length / players.length) * 100) : 0,
    averageCorrectTimeMs,
    fastestCorrectAnswer,
  };

  // Start the quiz game (host only)
  const startQuiz = useCallback(async (category: string = 'mixed') => {
    if (!currentPlayer.isHost) return;
    
    console.log('[Quiz] Starting quiz with category:', category);
    
    // Clean up any existing quiz data
    await supabase.from('quiz_rounds').delete().eq('lobby_id', lobbyId);
    await supabase.from('quiz_answers').delete().eq('lobby_id', lobbyId);
    await supabase.from('quiz_scores').delete().eq('lobby_id', lobbyId);
    
    setCurrentRound(1);
    setPreviousQuestions([]);
    setCurrentStreak(0);
    setBestStreak(0);
    setScores(players.map(p => ({
      player_id: p.id,
      player_name: p.name,
      total_points: 0,
      correct_answers: 0,
      average_time_ms: 0
    })));
    
    startRound(category, 1);
  }, [currentPlayer.isHost, lobbyId, players, startRound]);

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
    useFreezeJoker,
    startQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound
  };
};
