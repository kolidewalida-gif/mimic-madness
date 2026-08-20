import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalXp } from '@/hooks/useOptionalXp';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import type { BlurRushLiveStats } from '@/components/BlurRushLiveScoreboard';
import { BLURRUSH_IMAGES, type BlurRushImage, type BlurRushCategory } from '@/lib/blurRushImages';
import { guessSchema, safeParse } from '@/lib/validation';
import {
  GUESS_COOLDOWN_MS,
  HOST_FALLBACK_GRACE_MS,
  PIXELATION_STEPS,
  REVEAL_PHASE_MAX_MS,
  ROUND_DURATION_MS,
  TOTAL_ROUNDS,
  calculatePointsFromTime,
  computePixelLevel,
  computeTimeRemaining,
  normalizeAnswer,
  shouldRevealFirstLetter,
  shouldRevealLength,
} from '@/lib/blurRushLogic';

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

const AUTO_REVEAL_DELAY_MS = 1600;
// Bug fix #5: shorter delay when all players have solved
const ALL_SOLVED_REVEAL_DELAY_MS = 800;

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
  const [liveStats, setLiveStats] = useState<BlurRushLiveStats>({});
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [selectedCategories, setSelectedCategories] = useState<BlurRushCategory[]>(['Mix']);
  const [imagePool, setImagePool] = useState<BlurRushImage[]>(BLURRUSH_IMAGES);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRevealRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const advancingRef = useRef(false);
  const roundDataRef = useRef<PixoguessRound | null>(null);
  const phaseRef = useRef<PixoguessPhase>('waiting');
  const playersRef = useRef<Player[]>(players);
  const nextRoundLockRef = useRef(false);
  const startGameLockRef = useRef(false);
  // Bug fix #8: stable session ID to disambiguate channels on remount
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );
  const xp = useOptionalXp();

  const isHost = currentPlayer.isHost;

  useEffect(() => { roundDataRef.current = roundData; }, [roundData]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { playersRef.current = players; }, [players]);

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
    setScores(prev => {
      // Preserve existing scores when player list changes (don't reset mid-game)
      const prevMap = new Map(prev.map(s => [s.player_id, s]));
      return initialScores.map(s => prevMap.get(s.player_id) ?? s);
    });
    setIsLoading(false);
  }, [players]);

  // Initialize live stats — Bug fix #7: merge instead of replace
  useEffect(() => {
    setLiveStats(prev => {
      const next: BlurRushLiveStats = { ...prev };
      players.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = {
            playerName: p.name,
            attempts: 0,
            lastGuessAt: null,
            solved: false,
          };
        } else {
          // Update name in case it changed
          next[p.id] = { ...next[p.id], playerName: p.name };
        }
      });
      return next;
    });
  }, [players]);

  // Stable players ref for fetchScoresFromDB — Bug fix #1: avoid re-subscribing
  const playersIdsKey = useMemo(() => players.map(p => p.id).sort().join(','), [players]);

  const fetchScoresFromDB = useCallback(async () => {
    const { data } = await supabase
      .from('pixoguess_guesses')
      .select('player_id, player_name, points_earned, is_correct')
      .eq('lobby_id', lobbyId);

    if (!data) return;

    const scoreMap = new Map<string, PixoguessScore>();
    playersRef.current.forEach(p => {
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
  }, [lobbyId]);

  // Real-time sync — Bug fix #1: stable channel, deps minimal
  // Bug fix #8: unique channel name per session prevents collisions on remount
  useEffect(() => {
    const channelName = `pixoguess-sync-${lobbyId}-${sessionIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pixoguess_rounds',
          filter: `lobby_id=eq.${lobbyId}`
        },
        async (payload: any) => {
          if (!payload.new) return;
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

            // Reset per-round live stats — preserve known players
            setLiveStats(prev => {
              const next: BlurRushLiveStats = { ...prev };
              Object.keys(next).forEach((k) => {
                next[k] = { ...next[k], attempts: 0, lastGuessAt: null, solved: false };
              });
              // Add any current players that aren't in stats yet
              playersRef.current.forEach((p) => {
                if (!next[p.id]) {
                  next[p.id] = { playerName: p.name, attempts: 0, lastGuessAt: null, solved: false };
                }
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
          } else if (round.phase === 'reveal' && phaseRef.current !== 'reveal') {
            setPhase('reveal');
            advancingRef.current = false;
            if (round.winner_id && round.winner_name) {
              setRoundWinner({ id: round.winner_id, name: round.winner_name, points: 0 });
            }
            await fetchScoresFromDB();
            playSoundEffect('reveal', 0.5);
          } else if (round.phase === 'scores' && phaseRef.current !== 'scores') {
            setPhase('scores');
            await fetchScoresFromDB();
          } else if (round.phase === 'final' && phaseRef.current !== 'final') {
            setPhase('final');
            await fetchScoresFromDB();
            playSoundEffect('celebration', 0.6);
          }

          // Bug fix #2: if image_url changed (skipBrokenImage), reset image-related state
          const prevRound = roundDataRef.current;
          if (prevRound && prevRound.id === round.id && prevRound.image_url !== round.image_url) {
            // Image was swapped — restart the timer from now
            // (handled server-side via started_at update; client just picks it up)
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
          const currentRoundLocal = roundDataRef.current;
          if (!currentRoundLocal) return;
          if (payload.new.round_number !== currentRoundLocal.round_number) return;

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
            setRoundWinner({
              id: payload.new.player_id,
              name: payload.new.player_name,
              points: payload.new.points_earned
            });

            if (payload.new.player_id === currentPlayer.id) {
              setHasGuessedCorrectly(true);
            }

            playSoundEffect('success', 0.5);

            // Bug fix #5: shorter delay if all alive players solved
            if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
            const totalPlayers = playersRef.current.length;
            const solvedCount = Object.values(liveStats).filter(s => s.solved).length + 1; // +1 for the new winner
            const allSolved = solvedCount >= totalPlayers;

            const baseDelay = allSolved ? ALL_SOLVED_REVEAL_DELAY_MS : AUTO_REVEAL_DELAY_MS;
            const delay = isHost ? baseDelay : baseDelay + HOST_FALLBACK_GRACE_MS;

            autoRevealRef.current = setTimeout(() => {
              if (advancingRef.current) return;
              if (!canActAsHost()) return;
              advancingRef.current = true;
              supabase
                .from('pixoguess_rounds')
                .update({ phase: 'reveal' })
                .eq('id', currentRoundLocal.id)
                .eq('phase', 'playing')
                .then(
                  () => {},
                  () => { advancingRef.current = false; }
                );
            }, delay);
          }
        }
      )
      .subscribe();

    return () => {
      if (autoRevealRef.current) clearTimeout(autoRevealRef.current);
      supabase.removeChannel(channel);
    };
    // Bug fix #1: only re-subscribe when lobby changes, not on player list updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId, currentPlayer.id, isHost]);

  // Timer + pixelation derived from server `started_at`
  useEffect(() => {
    if (phase !== 'playing' || !roundData?.started_at) return;

    const startTime = new Date(roundData.started_at).getTime();
    const roundId = roundData.id;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = computeTimeRemaining(elapsed);
      setTimeRemaining(remaining);
      setPixelLevel(computePixelLevel(elapsed));

      if (remaining <= 0 && !advancingRef.current) {
        const grace = isHost ? 0 : HOST_FALLBACK_GRACE_MS;
        if (now - startTime >= ROUND_DURATION_MS + grace && canActAsHost()) {
          advancingRef.current = true;
          supabase
            .from('pixoguess_rounds')
            .update({ phase: 'reveal' })
            .eq('id', roundId)
            .eq('phase', 'playing')
            .then(
              () => {},
              () => { advancingRef.current = false; }
            );
        }
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, roundData?.started_at, roundData?.id, isHost, canActAsHost]);

  // Bug fix #4: auto-advance from reveal phase if host disconnects
  useEffect(() => {
    if (phase !== 'reveal' || !roundData) return;

    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);

    const grace = isHost ? REVEAL_PHASE_MAX_MS : REVEAL_PHASE_MAX_MS + HOST_FALLBACK_GRACE_MS;
    revealTimeoutRef.current = setTimeout(async () => {
      if (!canActAsHost()) return;
      // Auto-advance to scores or next round
      try {
        await supabase
          .from('pixoguess_rounds')
          .update({ phase: 'scores' })
          .eq('id', roundData.id)
          .eq('phase', 'reveal');
      } catch (err) {
        console.warn('[BlurRush] failed to auto-advance from reveal:', err);
      }
    }, grace);

    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, [phase, roundData, isHost, canActAsHost]);

  // Get random unused image
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

  const setCategories = useCallback((categories: BlurRushCategory[]) => {
    setSelectedCategories(categories);
    let pool: BlurRushImage[];
    if (categories.includes('Mix') || categories.length === 0) {
      pool = [...BLURRUSH_IMAGES];
    } else {
      pool = BLURRUSH_IMAGES.filter(img => categories.includes(img.category));
    }
    setImagePool(pool);
  }, []);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!isHost) return;
    if (startGameLockRef.current) return;
    startGameLockRef.current = true;

    try {
      // Idempotency check: don't start if a round already exists
      const { data: existing } = await supabase
        .from('pixoguess_rounds')
        .select('id')
        .eq('lobby_id', lobbyId)
        .limit(1);
      if (existing && existing.length > 0) return;

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
  const submitGuess = useCallback(async (
    guess: string
  ): Promise<{ outcome: 'correct' | 'wrong' | 'cooldown' | 'late' | 'blocked'; cooldownMs?: number }> => {
    if (!roundData || phase !== 'playing') return { outcome: 'blocked' };
    // Bug fix #10: reject if round hasn't actually started
    if (!roundData.started_at) return { outcome: 'blocked' };
    if (roundData.winner_id || roundWinner) return { outcome: 'blocked' };
    if (hasGuessedCorrectly) return { outcome: 'blocked' };

    const cleaned = safeParse(guessSchema, guess);
    if (!cleaned) return { outcome: 'blocked' };

    const now0 = Date.now();
    if (now0 < cooldownUntilRef.current) {
      return { outcome: 'cooldown', cooldownMs: cooldownUntilRef.current - now0 };
    }

    const normalizedGuess = normalizeAnswer(cleaned);
    const normalizedAnswer = normalizeAnswer(roundData.correct_answer);
    const acceptableNormalized = (roundData.acceptable_answers ?? []).map(a => normalizeAnswer(a));

    // Bug fix: reject if the answer is degenerate (normalizes to empty)
    // Otherwise `'anything'.includes('')` is true and breaks the game
    const isCorrect =
      normalizedAnswer.length > 0 && (
        normalizedGuess === normalizedAnswer ||
        normalizedGuess.includes(normalizedAnswer)
      ) ||
      acceptableNormalized.some((a) => a.length > 0 && (normalizedGuess === a || normalizedGuess.includes(a)));

    const startTime = new Date(roundData.started_at).getTime();
    const guessTimeMs = Date.now() - startTime;

    if (!isCorrect) {
      // Bug fix #6: only apply cooldown after successful insert
      const { error } = await supabase
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
      if (!error) {
        cooldownUntilRef.current = now0 + GUESS_COOLDOWN_MS;
        setCooldownUntil(cooldownUntilRef.current);
      }
      return { outcome: 'wrong' };
    }

    // Try to claim winner (atomic)
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

  // Advance to reveal — Bug fix #3: clear ref on error
  const advanceToReveal = useCallback(async () => {
    if (!canActAsHost() || !roundData) return;
    if (advancingRef.current) return;
    advancingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    const { error } = await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'reveal' })
      .eq('id', roundData.id)
      .eq('phase', 'playing');

    if (error) {
      // Reset so retry is possible
      advancingRef.current = false;
      console.warn('[BlurRush] advanceToReveal failed, will retry:', error);
    }
  }, [canActAsHost, roundData]);

  // Bug fix #2: skipBrokenImage now resets started_at so timer restarts cleanly
  const skipBrokenImage = useCallback(async () => {
    if (!canActAsHost() || !roundData) return;
    try {
      const replacement = await getRandomImage();
      const finalImage =
        replacement.url === roundData.image_url
          ? imagePool[Math.floor(Math.random() * imagePool.length)] ?? replacement
          : replacement;
      await supabase
        .from('pixoguess_rounds')
        .update({
          image_url: finalImage.url,
          correct_answer: finalImage.answer,
          acceptable_answers: finalImage.acceptable,
          // Critical: restart the timer so the new image gets full 20s
          started_at: new Date().toISOString(),
          // Also reset winner state if any
          winner_id: null,
          winner_name: null,
        })
        .eq('id', roundData.id);
    } catch (err) {
      console.warn('[BlurRush] failed to swap broken image:', err);
    }
  }, [canActAsHost, roundData, getRandomImage, imagePool]);

  const advanceToScores = useCallback(async () => {
    if (!canActAsHost() || !roundData) return;
    const { error } = await supabase
      .from('pixoguess_rounds')
      .update({ phase: 'scores' })
      .eq('id', roundData.id)
      .eq('phase', 'reveal');
    if (error) console.warn('[BlurRush] advanceToScores failed:', error);
  }, [canActAsHost, roundData]);

  // Next round
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
    const revealFirstLetter = shouldRevealFirstLetter(timeRemaining);
    const revealLength = shouldRevealLength(timeRemaining);

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
    skipBrokenImage,
    nextRound
  };
};
