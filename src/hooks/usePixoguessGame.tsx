import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalXp } from '@/hooks/useOptionalXp';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import type { BlurRushLiveStats } from '@/components/BlurRushLiveScoreboard';
import { BLURRUSH_IMAGES, type BlurRushImage } from '@/lib/blurRushImages';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface PixoguessScore {
  player_id: string;
  player_name: string;
  score: number;
  correct_guesses: number;
}

interface PixoguessRound {
  id: string;
  round_number: number;
  phase: string;
  image_url: string;
  correct_answer: string;
  acceptable_answers: string[];
  category: string;
  started_at: string | null;
  winner_id: string | null;
  winner_name: string | null;
}

type PixoguessPhase = 'waiting' | 'playing' | 'reveal' | 'scores' | 'final';

const TOTAL_ROUNDS = 5;
const ROUND_DURATION_MS = 20000; // 20 seconds per round
const PIXELATION_STEPS = 20; // Number of depixelation steps
const GUESS_COOLDOWN_MS = 900;

// Points based on pixelation level (higher = more pixelated = more points)
const calculatePoints = (pixelLevel: number): number => {
  if (pixelLevel >= 18) return 100;
  if (pixelLevel >= 15) return 80;
  if (pixelLevel >= 12) return 60;
  if (pixelLevel >= 9) return 40;
  if (pixelLevel >= 6) return 25;
  if (pixelLevel >= 3) return 15;
  return 10;
};

// Normalize answer for comparison
const normalizeAnswer = (answer: string): string => {
  return answer
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export const usePixoguessGame = (
  lobbyId: string,
  currentPlayer: Player,
  players: Player[]
) => {
  const [phase, setPhase] = useState<PixoguessPhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [roundData, setRoundData] = useState<PixoguessRound | null>(null);
  const [pixelLevel, setPixelLevel] = useState(PIXELATION_STEPS);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION_MS);
  const [scores, setScores] = useState<PixoguessScore[]>([]);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [roundWinner, setRoundWinner] = useState<{ id: string; name: string; points: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usedImageIndices, setUsedImageIndices] = useState<number[]>([]);
  const [liveStats, setLiveStats] = useState<BlurRushLiveStats>({});
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pixelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRevealRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const xp = useOptionalXp();

  const isHost = currentPlayer.isHost;

  // Initialize scores
  useEffect(() => {
    const initialScores = players.map(p => ({
      player_id: p.id,
      player_name: p.name,
      score: 0,
      correct_guesses: 0
    }));
    setScores(initialScores);
    setIsLoading(false);
  }, [players]);

  // Initialize live stats
  useEffect(() => {
    const init: BlurRushLiveStats = {};
    players.forEach((p) => {
      init[p.id] = {
        playerName: p.name,
        attempts: 0,
        lastGuessAt: null,
        solved: false,
      };
    });
    setLiveStats(init);
  }, [players]);

  // Fetch scores from DB
  const fetchScoresFromDB = useCallback(async () => {
    const { data } = await supabase
      .from('pixoguess_guesses')
      .select('player_id, player_name, points_earned, is_correct')
      .eq('lobby_id', lobbyId);

    if (data) {
      const scoreMap = new Map<string, PixoguessScore>();
      
      players.forEach(p => {
        scoreMap.set(p.id, {
          player_id: p.id,
          player_name: p.name,
          score: 0,
          correct_guesses: 0
        });
      });

      data.forEach(guess => {
        const current = scoreMap.get(guess.player_id);
        if (current) {
          current.score += guess.points_earned;
          if (guess.is_correct) current.correct_guesses++;
        }
      });

      setScores(Array.from(scoreMap.values()).sort((a, b) => b.score - a.score));
    }
  }, [lobbyId, players]);

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel(`pixoguess-sync-${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pixoguess_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        async (payload: any) => {
          if (payload.new) {
            const round = payload.new as PixoguessRound;
            setRoundData(round);
            setCurrentRound(round.round_number);

            if (round.phase === 'playing' && phase !== 'playing') {
              setPhase('playing');
              setHasGuessedCorrectly(false);
              setRoundWinner(null);
              setPixelLevel(PIXELATION_STEPS);
              cooldownUntilRef.current = 0;
              setCooldownUntil(0);

              // Reset per-round live stats
              setLiveStats(prev => {
                const next: BlurRushLiveStats = { ...prev };
                Object.keys(next).forEach((k) => {
                  next[k] = { ...next[k], attempts: 0, lastGuessAt: null, solved: false };
                });
                return next;
              });
              
              if (round.started_at) {
                const startTime = new Date(round.started_at).getTime();
                const now = Date.now();
                const elapsed = now - startTime;
                setTimeRemaining(Math.max(0, ROUND_DURATION_MS - elapsed));
              }
              
              playSoundEffect('quizReveal', 0.5);
            } else if (round.phase === 'reveal') {
              setPhase('reveal');
              if (round.winner_id && round.winner_name) {
                setRoundWinner({ id: round.winner_id, name: round.winner_name, points: 0 });
              }
              await fetchScoresFromDB();
              playSoundEffect('reveal', 0.5);
            } else if (round.phase === 'scores') {
              setPhase('scores');
              await fetchScoresFromDB();
            } else if (round.phase === 'final') {
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
          table: 'pixoguess_guesses',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (!payload.new) return;
          if (!roundData) return;
          if (payload.new.round_number !== roundData.round_number) return;

          // Update live stats (no spoiler: only attempts + last time + solved)
          setLiveStats(prev => {
            const next = { ...prev };
            const existing = next[payload.new.player_id] ?? {
              playerName: payload.new.player_name,
              attempts: 0,
              lastGuessAt: null,
              solved: false,
            };

            next[payload.new.player_id] = {
              playerName: existing.playerName ?? payload.new.player_name,
              attempts: (existing.attempts ?? 0) + 1,
              lastGuessAt: payload.new.created_at ?? new Date().toISOString(),
              solved: Boolean(existing.solved || payload.new.is_correct),
            };
            return next;
          });

          if (payload.new.is_correct) {
            // Someone guessed correctly
            setRoundWinner({
              id: payload.new.player_id,
              name: payload.new.player_name,
              points: payload.new.points_earned
            });

            if (payload.new.player_id === currentPlayer.id) {
              setHasGuessedCorrectly(true);
            }

            playSoundEffect('success', 0.5);

            // Host: auto-advance to reveal shortly after a winner
            // (do it inline here to avoid referencing callbacks declared later)
            if (isHost) {
              if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
              autoRevealRef.current = setTimeout(() => {
                // Fire-and-forget; all clients will sync via realtime round update
                supabase
                  .from('pixoguess_rounds')
                  .update({ phase: 'reveal' })
                  .eq('id', roundData.id);
              }, 1600);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
      supabase.removeChannel(channel);
    };
  }, [lobbyId, phase, fetchScoresFromDB, roundData, currentPlayer.id, isHost]);

  // Timer and pixelation effect
  useEffect(() => {
    if (phase !== 'playing' || !roundData?.started_at) return;

    const startTime = new Date(roundData.started_at).getTime();

    // Timer countdown
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0 && isHost) {
        advanceToReveal();
      }
    }, 100);

    // Pixelation decrease
    pixelTimerRef.current = setInterval(() => {
      setPixelLevel(prev => Math.max(1, prev - 1));
    }, ROUND_DURATION_MS / PIXELATION_STEPS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pixelTimerRef.current) clearInterval(pixelTimerRef.current);
    };
  }, [phase, roundData?.started_at, isHost]);

  // Get random unused image from the massive bank
  const getRandomImage = useCallback((): BlurRushImage => {
    const availableIndices = BLURRUSH_IMAGES
      .map((_, i) => i)
      .filter(i => !usedImageIndices.includes(i));

    if (availableIndices.length === 0) {
      // Reset if all images used
      setUsedImageIndices([]);
      return BLURRUSH_IMAGES[Math.floor(Math.random() * BLURRUSH_IMAGES.length)];
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setUsedImageIndices(prev => [...prev, randomIndex]);
    return BLURRUSH_IMAGES[randomIndex];
  }, [usedImageIndices]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!isHost) return;

    const image = getRandomImage();

    const { error } = await supabase
      .from('pixoguess_rounds')
      .insert({
        lobby_id: lobbyId,
        round_number: 1,
        phase: 'playing',
        image_url: image.url,
        correct_answer: image.answer,
        acceptable_answers: image.acceptable,
        category: image.category,
        started_at: new Date().toISOString()
      });

    if (error) console.error('Error starting pixoguess:', error);
  }, [isHost, lobbyId, getRandomImage]);

  // Submit guess
  const submitGuess = useCallback(async (guess: string): Promise<{ outcome: 'correct' | 'wrong' | 'cooldown' | 'late' | 'blocked'; cooldownMs?: number }> => {
    if (!roundData || phase !== 'playing') return { outcome: 'blocked' };
    if (roundData.winner_id || roundWinner) return { outcome: 'blocked' };
    if (hasGuessedCorrectly) return { outcome: 'blocked' };

    const now = Date.now();
    if (now < cooldownUntilRef.current) {
      return { outcome: 'cooldown', cooldownMs: cooldownUntilRef.current - now };
    }
    cooldownUntilRef.current = now + GUESS_COOLDOWN_MS;
    setCooldownUntil(cooldownUntilRef.current);

    const normalizedGuess = normalizeAnswer(guess);
    const normalizedAnswer = normalizeAnswer(roundData.correct_answer);
    const acceptableNormalized = roundData.acceptable_answers.map(a => normalizeAnswer(a));

    const isCorrect = normalizedGuess === normalizedAnswer || 
                      acceptableNormalized.some(a => normalizedGuess.includes(a) || a.includes(normalizedGuess));

    const startTime = roundData.started_at ? new Date(roundData.started_at).getTime() : Date.now();
    const guessTimeMs = Date.now() - startTime;

    if (!isCorrect) {
      await supabase
        .from('pixoguess_guesses')
        .insert({
          lobby_id: lobbyId,
          round_number: currentRound,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          guess,
          guess_time_ms: guessTimeMs,
          is_correct: false,
          points_earned: 0
        });
      return { outcome: 'wrong' };
    }

    // Try to claim winner (first correct guess)
    const { data: claimed } = await supabase
      .from('pixoguess_rounds')
      .update({
        winner_id: currentPlayer.id,
        winner_name: currentPlayer.name
      })
      .eq('id', roundData.id)
      .is('winner_id', null)
      .select('id');

    const didClaim = Array.isArray(claimed) && claimed.length > 0;
    const points = didClaim ? calculatePoints(pixelLevel) : 0;

    await supabase
      .from('pixoguess_guesses')
      .insert({
        lobby_id: lobbyId,
        round_number: currentRound,
        player_id: currentPlayer.id,
        player_name: currentPlayer.name,
        guess,
        guess_time_ms: guessTimeMs,
        is_correct: true,
        points_earned: points
      });

    if (didClaim) {
      setHasGuessedCorrectly(true);
      xp?.onQuizCorrectAnswer?.();
      playSoundEffect('success', 0.6);
      return { outcome: 'correct' };
    }

    return { outcome: 'late' };
  }, [roundData, phase, roundWinner, hasGuessedCorrectly, pixelLevel, currentRound, currentPlayer, lobbyId, xp]);

  // Advance to reveal (host)
  const advanceToReveal = useCallback(async () => {
    if (!isHost || !roundData) return;

    if (timerRef.current) clearInterval(timerRef.current);
    if (pixelTimerRef.current) clearInterval(pixelTimerRef.current);

    await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'reveal' })
      .eq('id', roundData.id);
  }, [isHost, roundData]);

  // Advance to scores (host)
  const advanceToScores = useCallback(async () => {
    if (!isHost || !roundData) return;

    await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'scores' })
      .eq('id', roundData.id);
  }, [isHost, roundData]);

  // Next round (host)
  const nextRound = useCallback(async () => {
    if (!isHost) return;

    const nextRoundNumber = currentRound + 1;

    if (nextRoundNumber > TOTAL_ROUNDS) {
      // Final phase
      if (roundData) {
        await supabase
          .from('pixoguess_rounds')
          .update({ phase: 'final' })
          .eq('id', roundData.id);
      }
      
      // Award XP to winner
      const winner = scores[0];
      if (winner && winner.player_id === currentPlayer.id) {
        xp?.onQuizWin?.();
      } else {
        xp?.onGameParticipation?.();
      }
      return;
    }

    const image = getRandomImage();

    await supabase
      .from('pixoguess_rounds')
      .insert({
        lobby_id: lobbyId,
        round_number: nextRoundNumber,
        phase: 'playing',
        image_url: image.url,
        correct_answer: image.answer,
        acceptable_answers: image.acceptable,
        category: image.category,
        started_at: new Date().toISOString()
      });

    setPixelLevel(PIXELATION_STEPS);
    setHasGuessedCorrectly(false);
    setRoundWinner(null);
  }, [isHost, currentRound, roundData, lobbyId, getRandomImage, scores, currentPlayer.id, xp]);

  return {
    phase,
    currentRound,
    totalRounds: TOTAL_ROUNDS,
    roundData,
    pixelLevel,
    maxPixelLevel: PIXELATION_STEPS,
    timeRemaining,
    totalTime: ROUND_DURATION_MS,
    scores,
    hasGuessedCorrectly,
    roundWinner,
    liveStats,
    cooldownUntil,
    isLoading,
    isHost,
    startGame,
    submitGuess,
    advanceToReveal,
    advanceToScores,
    nextRound
  };
};
