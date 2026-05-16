import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalXp } from '@/hooks/useOptionalXp';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import type { BlurRushLiveStats } from '@/components/BlurRushLiveScoreboard';
import { BLURRUSH_IMAGES, type BlurRushImage, type BlurRushCategory, getImagesByCategory } from '@/lib/blurRushImages';
import { guessSchema, safeParse } from '@/lib/validation';

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
// Anti-spam cooldown between wrong guesses
const GUESS_COOLDOWN_MS = 300;
// Extra grace before any client triggers fallback phase advance
const HOST_FALLBACK_GRACE_MS = 2000;
// Auto-reveal delay after a winner claims the round
const AUTO_REVEAL_DELAY_MS = 1600;

// Score from response time (faster = more points). Server-fair.
const calculatePointsFromTime = (timeMs: number): number => {
  const ratio = Math.max(0, Math.min(1, timeMs / ROUND_DURATION_MS));
  // 100 pts at t=0, 10 pts at t=ROUND_DURATION_MS
  return Math.round(100 - ratio * 90);
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
  const [selectedCategories, setSelectedCategories] = useState<BlurRushCategory[]>(['Mix']);
  const [imagePool, setImagePool] = useState<BlurRushImage[]>(BLURRUSH_IMAGES);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRevealRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const advancingRef = useRef(false);
  const roundDataRef = useRef<PixoguessRound | null>(null);
  const phaseRef = useRef<PixoguessPhase>('waiting');
  const playersRef = useRef<Player[]>(players);
  const nextRoundLockRef = useRef(false);
  const startGameLockRef = useRef(false);
  const xp = useOptionalXp();

  const isHost = currentPlayer.isHost;

  useEffect(() => { roundDataRef.current = roundData; }, [roundData]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Deterministic fallback "host election": lowest player id of currently
  // known players. Any client can be the fallback acter when the host is gone.
  const isFallbackActor = useCallback(() => {
    const sorted = [...playersRef.current].map((p) => p.id).sort();
    return sorted[0] === currentPlayer.id;
  }, [currentPlayer.id]);

  const canActAsHost = useCallback(() => isHost || isFallbackActor(), [isHost, isFallbackActor]);

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

            if (round.phase === 'playing' && phaseRef.current !== 'playing') {
              setPhase('playing');
              setHasGuessedCorrectly(false);
              setRoundWinner(null);
              setPixelLevel(PIXELATION_STEPS);
              cooldownUntilRef.current = 0;
              setCooldownUntil(0);
              advancingRef.current = false;

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
              advancingRef.current = false;
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
          const currentRound = roundDataRef.current;
          if (!currentRound) return;
          if (payload.new.round_number !== currentRound.round_number) return;

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

            // Auto-advance to reveal. Any client can trigger it after a delay,
            // but the atomic .eq('phase','playing') ensures only one update wins.
            if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
            const delay = isHost
              ? AUTO_REVEAL_DELAY_MS
              : AUTO_REVEAL_DELAY_MS + HOST_FALLBACK_GRACE_MS;
            autoRevealRef.current = setTimeout(() => {
              if (advancingRef.current) return;
              advancingRef.current = true;
              supabase
                .from('pixoguess_rounds')
                .update({ phase: 'reveal' })
                .eq('id', currentRound.id)
                .eq('phase', 'playing')
                .then(() => {}, () => { advancingRef.current = false; });
            }, delay);
          }
        }
      )
      .subscribe();

    return () => {
      if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
      supabase.removeChannel(channel);
    };
  }, [lobbyId, fetchScoresFromDB, currentPlayer.id, isHost]);

  // Timer + pixelation derived from server `started_at` (synced across clients)
  useEffect(() => {
    if (phase !== 'playing' || !roundData?.started_at) return;

    const startTime = new Date(roundData.started_at).getTime();
    const roundId = roundData.id;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      setTimeRemaining(remaining);

      // Derive pixel level from elapsed time -> perfectly synced across clients
      const progress = Math.min(1, elapsed / ROUND_DURATION_MS);
      const lvl = Math.max(1, Math.ceil(PIXELATION_STEPS * (1 - progress)));
      setPixelLevel(lvl);

      // Fallback auto-advance when timer expires. Any client may attempt it
      // (host first, others after grace) — atomic update guarantees uniqueness.
      if (remaining <= 0 && !advancingRef.current) {
        const grace = isHost ? 0 : HOST_FALLBACK_GRACE_MS;
        if (now - startTime >= ROUND_DURATION_MS + grace && canActAsHost()) {
          advancingRef.current = true;
          supabase
            .from('pixoguess_rounds')
            .update({ phase: 'reveal' })
            .eq('id', roundId)
            .eq('phase', 'playing')
            .then(() => {}, () => { advancingRef.current = false; });
        }
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, roundData?.started_at, roundData?.id, isHost, canActAsHost]);

  // Get random unused image from selected pool — used set comes from DB so
  // a host change mid-game still avoids repeats.
  const getRandomImage = useCallback(async (): Promise<BlurRushImage> => {
    const { data: previous } = await supabase
      .from('pixoguess_rounds')
      .select('image_url')
      .eq('lobby_id', lobbyId);
    const usedUrls = new Set((previous ?? []).map((r: any) => r.image_url));
    const available = imagePool.filter((img) => !usedUrls.has(img.url));
    const pool = available.length > 0 ? available : imagePool;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [imagePool, lobbyId]);

  // Set categories and update image pool
  const setCategories = useCallback((categories: BlurRushCategory[]) => {
    setSelectedCategories(categories);
    
    let pool: BlurRushImage[];
    if (categories.includes('Mix') || categories.length === 0) {
      pool = [...BLURRUSH_IMAGES];
    } else {
      pool = BLURRUSH_IMAGES.filter(img => categories.includes(img.category));
    }
    setImagePool(pool);
    setUsedImageIndices([]);
  }, []);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!isHost) return;
    if (startGameLockRef.current) return;
    startGameLockRef.current = true;

    try {
      const image = await getRandomImage();

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
    } finally {
      setTimeout(() => { startGameLockRef.current = false; }, 1500);
    }
  }, [isHost, lobbyId, getRandomImage]);

  // Submit guess
  const submitGuess = useCallback(async (guess: string): Promise<{ outcome: 'correct' | 'wrong' | 'cooldown' | 'late' | 'blocked'; cooldownMs?: number }> => {
    if (!roundData || phase !== 'playing') return { outcome: 'blocked' };
    if (roundData.winner_id || roundWinner) return { outcome: 'blocked' };
    if (hasGuessedCorrectly) return { outcome: 'blocked' };

    // Validate + sanitize input (max 80 chars, strip control chars, trim)
    const cleaned = safeParse(guessSchema, guess);
    if (!cleaned) return { outcome: 'blocked' };

    // Anti-spam cooldown
    const now0 = Date.now();
    if (now0 < cooldownUntilRef.current) {
      return { outcome: 'cooldown', cooldownMs: cooldownUntilRef.current - now0 };
    }
    cooldownUntilRef.current = now0 + GUESS_COOLDOWN_MS;
    setCooldownUntil(cooldownUntilRef.current);

    const normalizedGuess = normalizeAnswer(cleaned);
    const normalizedAnswer = normalizeAnswer(roundData.correct_answer);
    const acceptableNormalized = (roundData.acceptable_answers ?? []).map(a => normalizeAnswer(a));

    // Prevent false positives like "one" matching "one piece":
    // - allow exact match
    // - allow long phrases that *contain* the full answer ("c'est naruto")
    // - do NOT allow answer containing the guess (partial)
    const isCorrect =
      normalizedGuess === normalizedAnswer ||
      normalizedGuess.includes(normalizedAnswer) ||
      acceptableNormalized.some((a) => normalizedGuess === a || normalizedGuess.includes(a));

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
          guess: cleaned,
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
    // Score based on response time (server-fair, independent of client render lag)
    const points = didClaim ? calculatePointsFromTime(guessTimeMs) : 0;

    await supabase
      .from('pixoguess_guesses')
      .insert({
        lobby_id: lobbyId,
        round_number: currentRound,
        player_id: currentPlayer.id,
        player_name: currentPlayer.name,
        guess: cleaned,
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
  }, [roundData, phase, roundWinner, hasGuessedCorrectly, currentRound, currentPlayer, lobbyId, xp]);

  // Advance to reveal (host)
  const advanceToReveal = useCallback(async () => {
    if (!canActAsHost() || !roundData) return;
    if (advancingRef.current) return;
    advancingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'reveal' })
      .eq('id', roundData.id)
      .eq('phase', 'playing');
  }, [canActAsHost, roundData]);

  // Advance to scores (host)
  const advanceToScores = useCallback(async () => {
    if (!canActAsHost() || !roundData) return;

    await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'scores' })
      .eq('id', roundData.id)
      .eq('phase', 'reveal');
  }, [canActAsHost, roundData]);

  // Next round (host)
  const nextRound = useCallback(async () => {
    if (!canActAsHost()) return;
    if (nextRoundLockRef.current) return;
    nextRoundLockRef.current = true;

    try {
      const nextRoundNumber = currentRound + 1;

      if (nextRoundNumber > TOTAL_ROUNDS) {
        if (roundData) {
          await supabase
            .from('pixoguess_rounds')
            .update({ phase: 'final' })
            .eq('id', roundData.id);
        }
        const winner = scores[0];
        if (winner && winner.player_id === currentPlayer.id) {
          xp?.onQuizWin?.();
        } else {
          xp?.onGameParticipation?.();
        }
        return;
      }

      // Idempotency: don't double-insert if a row for this round already exists
      const { data: existing } = await supabase
        .from('pixoguess_rounds')
        .select('id')
        .eq('lobby_id', lobbyId)
        .eq('round_number', nextRoundNumber)
        .maybeSingle();
      if (existing) return;

      const image = await getRandomImage();
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
    } finally {
      setTimeout(() => { nextRoundLockRef.current = false; }, 1500);
    }
  }, [canActAsHost, currentRound, roundData, lobbyId, getRandomImage, scores, currentPlayer.id, xp]);

  const roundAttemptCount = Object.values(liveStats).reduce((sum, stat) => sum + (stat.attempts ?? 0), 0);
  const solvedPlayersCount = Object.values(liveStats).filter((stat) => stat.solved).length;
  let roundHint: string | null = null;

  if (phase === 'playing' && roundData?.correct_answer) {
    const trimmedAnswer = roundData.correct_answer.trim();
    const sanitized = trimmedAnswer.replace(/\s+/g, ' ').trim();
    const clueLength = sanitized.replace(/\s/g, '').length;
    const revealFirstLetter = timeRemaining <= ROUND_DURATION_MS * 0.3;
    const revealLength = timeRemaining <= ROUND_DURATION_MS * 0.6;

    if (revealFirstLetter) {
      roundHint = `Indice: ${sanitized[0]?.toUpperCase() || '?'}... (${clueLength} lettres)`;
    } else if (revealLength) {
      roundHint = `Indice: ${clueLength} lettres`;
    }
  }

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
    roundHint,
    roundAttemptCount,
    solvedPlayersCount,
    isLoading,
    isHost,
    selectedCategories,
    imagePoolSize: imagePool.length,
    setCategories,
    startGame,
    submitGuess,
    advanceToReveal,
    advanceToScores,
    nextRound
  };
};
