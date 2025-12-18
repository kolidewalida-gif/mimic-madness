import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizQuestion {
  question: string;
  answer: string;
  category: string;
  difficulty: string;
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

const TOTAL_ROUNDS = 10;
const ANSWER_TIME_MS = 30000; // 30 seconds

// Calculate points based on response time (30 seconds max)
const calculatePoints = (responseTimeMs: number): number => {
  if (responseTimeMs < 3000) return 10;
  if (responseTimeMs < 6000) return 8;
  if (responseTimeMs < 10000) return 6;
  if (responseTimeMs < 15000) return 4;
  if (responseTimeMs < 20000) return 3;
  if (responseTimeMs < 25000) return 2;
  if (responseTimeMs < 30000) return 1;
  return 0;
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
  selectedCategory: string = 'mixed'
) => {
  const [phase, setPhase] = useState<QuizPhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(ANSWER_TIME_MS);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [roundAnswers, setRoundAnswers] = useState<QuizAnswer[]>([]);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

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

  // Subscribe to quiz round updates
  useEffect(() => {
    const channel = supabase
      .channel(`quiz-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (payload.new) {
            const newRound = payload.new;
            setCurrentRound(newRound.round_number);
            setCurrentQuestion({
              question: newRound.question_text,
              answer: newRound.correct_answer,
              category: newRound.category,
              difficulty: newRound.difficulty
            });
            
            if (newRound.phase === 'countdown') {
              setPhase('countdown');
              playSoundEffect('quizReveal', 0.5);
            } else if (newRound.phase === 'answering') {
              setPhase('answering');
              setQuestionStartTime(Date.now());
              setTimeRemaining(ANSWER_TIME_MS);
              setHasAnswered(false);
              setAnsweredPlayers([]);
            } else if (newRound.phase === 'reveal') {
              setPhase('reveal');
              playSoundEffect('reveal', 0.5);
            } else if (newRound.phase === 'scores') {
              setPhase('scores');
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
          if (payload.new && payload.new.round_number === currentRound) {
            setAnsweredPlayers(prev => [...prev, payload.new.player_id]);
            setRoundAnswers(prev => [...prev, {
              player_id: payload.new.player_id,
              player_name: payload.new.player_name,
              answer: payload.new.answer,
              response_time_ms: payload.new.response_time_ms,
              is_correct: payload.new.is_correct,
              points_earned: payload.new.points_earned
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, currentRound]);

  // Timer effect
  useEffect(() => {
    if (phase === 'answering' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 100;
          
          // Play tick sound every second
          if (newTime % 1000 === 0 && newTime > 0) {
            if (newTime <= 5000) {
              playSoundEffect('quizRush', 0.3);
            } else {
              playSoundEffect('quizTick', 0.15);
            }
          }
          
          // Time's up
          if (newTime <= 0) {
            playSoundEffect('quizBuzz', 0.5);
            if (currentPlayer.isHost) {
              advanceToReveal();
            }
            return 0;
          }
          
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, currentPlayer.isHost]);

  // Generate a new question using the edge function
  const generateQuestion = useCallback(async (category: string = 'mixed'): Promise<QuizQuestion | null> => {
    setIsLoading(true);
    try {
      // If mixed, pick random category
      const categories = ['general', 'anime', 'histoire', 'sport', 'musique', 'cinema', 'science', 'geographie', 'jeux_video', 'art'];
      const categoryToUse = category === 'mixed' 
        ? categories[Math.floor(Math.random() * categories.length)]
        : category;
      
      const { data, error } = await supabase.functions.invoke('generate-quiz-question', {
        body: { 
          category: categoryToUse,
          previousQuestions 
        }
      });

      if (error) throw error;
      
      setPreviousQuestions(prev => [...prev, data.question]);
      return data as QuizQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      // Fallback question if API fails
      return {
        question: "Quelle est la capitale de la France ?",
        answer: "Paris",
        category: "geographie",
        difficulty: "facile"
      };
    } finally {
      setIsLoading(false);
    }
  }, [previousQuestions]);

  // Start a new round (host only)
  const startRound = useCallback(async (category: string = selectedCategory) => {
    if (!currentPlayer.isHost) return;
    
    setRoundAnswers([]);
    setAnsweredPlayers([]);
    
    // Generate question
    const question = await generateQuestion(category);
    if (!question) return;

    // Save round to database
    await supabase.from('quiz_rounds').insert({
      lobby_id: lobbyId,
      round_number: currentRound,
      question_text: question.question,
      correct_answer: question.answer,
      category: question.category,
      difficulty: question.difficulty,
      phase: 'countdown',
      started_at: new Date().toISOString()
    });

    // Start countdown then transition to answering
    setTimeout(async () => {
      await supabase.from('quiz_rounds')
        .update({ phase: 'answering' })
        .eq('lobby_id', lobbyId)
        .eq('round_number', currentRound);
    }, 3000);
  }, [currentPlayer.isHost, lobbyId, currentRound, generateQuestion, selectedCategory]);

  // Submit an answer
  const submitAnswer = useCallback(async (answer: string) => {
    if (hasAnswered || !questionStartTime || !currentQuestion) return;
    
    const responseTime = Date.now() - questionStartTime;
    const normalizedUserAnswer = normalizeAnswer(answer);
    const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.answer);
    
    // Check if answer is correct (partial match)
    const isCorrect = normalizedCorrectAnswer.includes(normalizedUserAnswer) || 
                      normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
                      normalizedUserAnswer === normalizedCorrectAnswer;
    
    const points = isCorrect ? calculatePoints(responseTime) : 0;
    
    setHasAnswered(true);
    
    if (isCorrect) {
      playSoundEffect('quizCorrect', 0.5);
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

    // Update local scores
    setScores(prev => prev.map(s => 
      s.player_id === currentPlayer.id
        ? {
            ...s,
            total_points: s.total_points + points,
            correct_answers: s.correct_answers + (isCorrect ? 1 : 0)
          }
        : s
    ));
  }, [hasAnswered, questionStartTime, currentQuestion, lobbyId, currentRound, currentPlayer]);

  // Advance to reveal phase (host only)
  const advanceToReveal = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    await supabase.from('quiz_rounds')
      .update({ phase: 'reveal' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', currentRound);
  }, [currentPlayer.isHost, lobbyId, currentRound]);

  // Advance to scores phase (host only)
  const advanceToScores = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    // Fetch all answers for this round and update scores
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('round_number', currentRound);
    
    if (answers) {
      setRoundAnswers(answers.map(a => ({
        player_id: a.player_id,
        player_name: a.player_name,
        answer: a.answer,
        response_time_ms: a.response_time_ms,
        is_correct: a.is_correct,
        points_earned: a.points_earned
      })));
      
      // Update scores
      setScores(prev => {
        const newScores = [...prev];
        answers.forEach(a => {
          const scoreIndex = newScores.findIndex(s => s.player_id === a.player_id);
          if (scoreIndex !== -1) {
            newScores[scoreIndex] = {
              ...newScores[scoreIndex],
              total_points: newScores[scoreIndex].total_points + a.points_earned,
              correct_answers: newScores[scoreIndex].correct_answers + (a.is_correct ? 1 : 0)
            };
          }
        });
        return newScores;
      });
    }
    
    await supabase.from('quiz_rounds')
      .update({ phase: 'scores' })
      .eq('lobby_id', lobbyId)
      .eq('round_number', currentRound);
  }, [currentPlayer.isHost, lobbyId, currentRound]);

  // Move to next round or final results (host only)
  const nextRound = useCallback(async () => {
    if (!currentPlayer.isHost) return;
    
    if (currentRound >= TOTAL_ROUNDS) {
      setPhase('final');
      playSoundEffect('celebration', 0.6);
    } else {
      setCurrentRound(prev => prev + 1);
      startRound();
    }
  }, [currentPlayer.isHost, currentRound, startRound]);

  // Start the quiz game (host only)
  const startQuiz = useCallback(async (category: string = 'mixed') => {
    if (!currentPlayer.isHost) return;
    
    // Clean up any existing quiz data for this lobby
    await supabase.from('quiz_rounds').delete().eq('lobby_id', lobbyId);
    await supabase.from('quiz_answers').delete().eq('lobby_id', lobbyId);
    await supabase.from('quiz_scores').delete().eq('lobby_id', lobbyId);
    
    setCurrentRound(1);
    setPreviousQuestions([]);
    setScores(players.map(p => ({
      player_id: p.id,
      player_name: p.name,
      total_points: 0,
      correct_answers: 0,
      average_time_ms: 0
    })));
    
    startRound(category);
  }, [currentPlayer.isHost, lobbyId, players, startRound]);

  return {
    phase,
    currentRound,
    totalRounds: TOTAL_ROUNDS,
    currentQuestion,
    timeRemaining,
    hasAnswered,
    scores,
    roundAnswers,
    answeredPlayers,
    isLoading,
    startQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound
  };
};
