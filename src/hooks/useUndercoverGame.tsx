import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRandomWordPair } from '@/lib/undercoverWords';
import { undercoverClueSchema, safeParse } from '@/lib/validation';
import {
  canSubmitClue,
  canVote,
  clampUndercover,
  computeMatchWinner,
  computeRoundWinner,
  distributeRoles,
  resolveVotes,
} from '@/lib/undercoverLogic';

const BOT_GENERIC_CLUES = [
  'rond', 'grand', 'petit', 'rouge', 'bleu', 'chaud', 'froid', 'doux',
  'dur', 'rapide', 'lent', 'lourd', 'léger', 'brillant', 'sombre',
  'sucré', 'salé', 'amer', 'fort', 'faible', 'vieux', 'neuf', 'long',
  'court', 'large', 'étroit', 'haut', 'bas', 'plein', 'vide',
  'naturel', 'artificiel', 'commun', 'rare', 'simple', 'complexe',
  'populaire', 'classique', 'moderne', 'ancien', 'vivant', 'mort',
  'humide', 'sec', 'propre', 'sale', 'bruyant', 'silencieux',
  'visible', 'invisible', 'utile', 'inutile', 'agréable', 'désagréable',
  'familier', 'étranger', 'proche', 'lointain', 'intérieur', 'extérieur',
];

const generateBotClue = (_word: string | null, _role: string): string =>
  BOT_GENERIC_CLUES[Math.floor(Math.random() * BOT_GENERIC_CLUES.length)];

const shuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const isBotId = (id: string): boolean => id.startsWith('bot-');

interface UndercoverPlayer {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  role: 'civilian' | 'undercover' | 'mr_white';
  word: string | null;
  is_alive: boolean;
  vote_target: string | null;
  current_clue: string | null;
  clue_history: string[];
}

interface UndercoverGame {
  id: string;
  lobby_id: string;
  civilian_word: string;
  undercover_word: string;
  current_round: number;
  total_rounds: number;
  num_undercover: number;
  enable_mr_white: boolean;
  settings_locked: boolean;
  phase: string;
  current_player_index: number;
  player_order: string[];
  eliminated_player_id: string | null;
  eliminated_role: string | null;
  is_finished: boolean;
  winner_role: string | null;
  civilian_wins: number;
  undercover_wins: number;
  clue_pass: number;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
}

const nowIso = (): string => new Date().toISOString();

export const useUndercoverGame = (
  lobbyId: string,
  currentPlayer: Player,
  players: Player[],
) => {
  const [game, setGame] = useState<UndercoverGame | null>(null);
  const [gamePlayers, setGamePlayers] = useState<UndercoverPlayer[]>([]);
  const [myPlayer, setMyPlayer] = useState<UndercoverPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSeenWord, setHasSeenWord] = useState(false);

  const initRef = useRef(false);
  const fetchVersionRef = useRef(0);
  const launchLockRef = useRef(false);
  const turnAdvanceLockRef = useRef<string | null>(null);
  const voteResolutionInFlightRef = useRef(false);
  const roundAdvanceInFlightRef = useRef(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botGenerationRef = useRef(0);

  const activePlayers = useMemo(() => {
    const unique = new Map<string, Player>();
    players.forEach((player) => {
      if (!player.isDisconnected) unique.set(player.id, player);
    });
    return [...unique.values()];
  }, [players]);

  const fetchGame = useCallback(async () => {
    const requestVersion = ++fetchVersionRef.current;
    const { data: gameData, error: gameError } = await supabase
      .from('undercover_games')
      .select('*')
      .eq('lobby_id', lobbyId)
      .maybeSingle();

    if (requestVersion !== fetchVersionRef.current) return;

    if (gameError) {
      setError("Impossible de synchroniser la partie Undercover.");
      setLoading(false);
      return;
    }

    if (!gameData) {
      setGame(null);
      setGamePlayers([]);
      setMyPlayer(null);
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from('undercover_players')
      .select('*')
      .eq('game_id', gameData.id);

    if (requestVersion !== fetchVersionRef.current) return;

    if (playersError) {
      setError("Impossible de synchroniser les joueurs Undercover.");
      setLoading(false);
      return;
    }

    const typedGame = gameData as unknown as UndercoverGame;
    const typedPlayers = (playersData ?? []) as unknown as UndercoverPlayer[];
    setGame(typedGame);
    setGamePlayers(typedPlayers);
    setMyPlayer(typedPlayers.find((player) => player.player_id === currentPlayer.id) ?? null);
    setError(null);
    setLoading(false);
  }, [currentPlayer.id, lobbyId]);

  const replaceSessionPlayers = useCallback(async (
    gameId: string,
    roster: Player[],
    assignments?: {
      roles: Record<string, 'civilian' | 'undercover' | 'mr_white'>;
      words: Record<string, string | null>;
    },
  ) => {
    const { error: deleteError } = await supabase
      .from('undercover_players')
      .delete()
      .eq('game_id', gameId);
    if (deleteError) throw deleteError;

    const rows = roster.map((player) => ({
      game_id: gameId,
      player_id: player.id,
      player_name: player.name,
      role: assignments?.roles[player.id] ?? 'civilian',
      word: assignments?.words[player.id] ?? null,
      is_alive: true,
      vote_target: null,
      current_clue: null,
      clue_history: [],
    }));

    const { error: insertError } = await supabase
      .from('undercover_players')
      .insert(rows);
    if (insertError) throw insertError;
  }, []);

  const prepareSettingsSession = useCallback(async (existing: UndercoverGame) => {
    const wordPair = getRandomWordPair();
    const playerOrder = shuffle(activePlayers.map((player) => player.id));
    const enableMrWhite = Boolean(existing.enable_mr_white && activePlayers.length >= 4);
    const defaultUndercover = activePlayers.length >= 7 ? 2 : 1;
    const numUndercover = clampUndercover(
      existing.num_undercover || defaultUndercover,
      activePlayers.length,
      enableMrWhite,
    );

    await replaceSessionPlayers(existing.id, activePlayers);

    const { error: updateError } = await supabase
      .from('undercover_games')
      .update({
        civilian_word: wordPair.civilian,
        undercover_word: wordPair.undercover,
        current_round: 1,
        current_player_index: 0,
        player_order: playerOrder,
        eliminated_player_id: null,
        eliminated_role: null,
        is_finished: false,
        winner_role: null,
        civilian_wins: 0,
        undercover_wins: 0,
        clue_pass: 0,
        num_undercover: numUndercover,
        enable_mr_white: enableMrWhite,
        settings_locked: false,
        phase: 'settings',
        updated_at: nowIso(),
      })
      .eq('id', existing.id)
      .eq('phase', 'settings');
    if (updateError) throw updateError;
  }, [activePlayers, replaceSessionPlayers]);

  const initializeGame = useCallback(async () => {
    if (initRef.current || !currentPlayer.isHost || activePlayers.length < 3) return;
    initRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data: existing, error: existingError } = await supabase
        .from('undercover_games')
        .select('*')
        .eq('lobby_id', lobbyId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        const typedExisting = existing as unknown as UndercoverGame;
        if (typedExisting.phase === 'settings' && !typedExisting.settings_locked) {
          await prepareSettingsSession(typedExisting);
        }
        await fetchGame();
        return;
      }

      const wordPair = getRandomWordPair();
      const playerOrder = shuffle(activePlayers.map((player) => player.id));
      const { data: newGame, error: createError } = await supabase
        .from('undercover_games')
        .insert({
          lobby_id: lobbyId,
          civilian_word: wordPair.civilian,
          undercover_word: wordPair.undercover,
          player_order: playerOrder,
          phase: 'settings',
          current_round: 1,
          current_player_index: 0,
          total_rounds: 1,
          num_undercover: activePlayers.length >= 7 ? 2 : 1,
          enable_mr_white: false,
          settings_locked: false,
          is_finished: false,
          civilian_wins: 0,
          undercover_wins: 0,
          clue_pass: 0,
          updated_at: nowIso(),
        })
        .select('*')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          await fetchGame();
          return;
        }
        throw createError;
      }

      await replaceSessionPlayers(newGame.id, activePlayers);
      await fetchGame();
    } catch (cause) {
      console.error('[Undercover] Initialisation impossible', cause);
      initRef.current = false;
      setError("La partie n'a pas pu être initialisée. Réessaie dans un instant.");
      setLoading(false);
    }
  }, [activePlayers, currentPlayer.isHost, fetchGame, lobbyId, prepareSettingsSession, replaceSessionPlayers]);

  const retryInitialization = useCallback(() => {
    initRef.current = false;
    setError(null);
    if (currentPlayer.isHost) void initializeGame();
    else void fetchGame();
  }, [currentPlayer.isHost, fetchGame, initializeGame]);

  const lockSettings = useCallback(async (settings: {
    numUndercover: number;
    totalRounds: number;
    enableMrWhite: boolean;
  }): Promise<boolean> => {
    if (!game || !currentPlayer.isHost || launchLockRef.current || activePlayers.length < 3) {
      return false;
    }

    launchLockRef.current = true;
    setError(null);
    try {
      const { data: latest, error: latestError } = await supabase
        .from('undercover_games')
        .select('*')
        .eq('id', game.id)
        .maybeSingle();
      if (latestError) throw latestError;
      if (!latest || latest.phase !== 'settings' || latest.settings_locked) return false;

      const enableMrWhite = settings.enableMrWhite && activePlayers.length >= 4;
      const numUndercover = clampUndercover(
        settings.numUndercover,
        activePlayers.length,
        enableMrWhite,
      );
      const totalRounds = Math.max(1, Math.min(99, settings.totalRounds));
      const playerOrder = shuffle(activePlayers.map((player) => player.id));
      const roleOrder = shuffle(playerOrder);
      const assignments = distributeRoles(
        roleOrder,
        numUndercover,
        enableMrWhite,
        latest.civilian_word,
        latest.undercover_word,
      );

      await replaceSessionPlayers(game.id, activePlayers, assignments);

      const { data: lockedGame, error: lockError } = await supabase
        .from('undercover_games')
        .update({
          phase: 'word_reveal',
          current_round: 1,
          current_player_index: 0,
          player_order: playerOrder,
          num_undercover: numUndercover,
          total_rounds: totalRounds,
          enable_mr_white: enableMrWhite,
          settings_locked: true,
          is_finished: false,
          winner_role: null,
          civilian_wins: 0,
          undercover_wins: 0,
          clue_pass: 0,
          updated_at: nowIso(),
        })
        .eq('id', game.id)
        .eq('phase', 'settings')
        .eq('settings_locked', false)
        .select('id')
        .maybeSingle();
      if (lockError) throw lockError;
      if (!lockedGame) return false;

      setHasSeenWord(false);
      await fetchGame();
      return true;
    } catch (cause) {
      console.error('[Undercover] Verrouillage des paramètres impossible', cause);
      setError("Les paramètres n'ont pas pu être enregistrés. Tu peux réessayer.");
      return false;
    } finally {
      launchLockRef.current = false;
    }
  }, [activePlayers, currentPlayer.isHost, fetchGame, game, replaceSessionPlayers]);

  const submitClue = useCallback(async (clue: string): Promise<boolean> => {
    if (!game || !myPlayer) return false;
    const cleanClue = safeParse(undercoverClueSchema, clue);
    if (!cleanClue) return false;

    const { data: latestGame, error: gameError } = await supabase
      .from('undercover_games')
      .select('phase, current_player_index, player_order')
      .eq('id', game.id)
      .maybeSingle();
    if (gameError || !latestGame) return false;

    const { data: latestRows, error: playersError } = await supabase
      .from('undercover_players')
      .select('id, player_id, is_alive, current_clue')
      .eq('game_id', game.id);
    if (playersError || !latestRows) return false;

    const latestMe = latestRows.find((player) => player.player_id === currentPlayer.id);
    const aliveIds = new Set(latestRows.filter((player) => player.is_alive).map((player) => player.player_id));
    const aliveOrder = latestGame.player_order.filter((playerId) => aliveIds.has(playerId));
    const currentTurnId = aliveOrder[latestGame.current_player_index] ?? null;

    if (!latestMe || !canSubmitClue({
      playerId: currentPlayer.id,
      playerIsAlive: latestMe.is_alive,
      currentTurnPlayerId: currentTurnId,
      phase: latestGame.phase,
      hasExistingClue: Boolean(latestMe.current_clue),
    })) return false;

    const { data: updated, error: updateError } = await supabase
      .from('undercover_players')
      .update({ current_clue: cleanClue })
      .eq('id', latestMe.id)
      .is('current_clue', null)
      .select('id')
      .maybeSingle();
    if (updateError) {
      console.error('[Undercover] Envoi de l’indice impossible', updateError);
      return false;
    }
    return Boolean(updated);
  }, [currentPlayer.id, game, myPlayer]);

  const startCluePhase = useCallback(async (): Promise<boolean> => {
    if (!game || !currentPlayer.isHost) return false;
    const { data, error: updateError } = await supabase
      .from('undercover_games')
      .update({
        phase: 'clue_giving',
        current_player_index: 0,
        clue_pass: 0,
        updated_at: nowIso(),
      })
      .eq('id', game.id)
      .eq('phase', 'word_reveal')
      .select('id')
      .maybeSingle();
    if (updateError) console.error('[Undercover] Démarrage des indices impossible', updateError);
    return Boolean(data);
  }, [currentPlayer.isHost, game]);

  const startVoting = useCallback(async (): Promise<boolean> => {
    if (!game || !currentPlayer.isHost) return false;

    const { data: claimed, error: claimError } = await supabase
      .from('undercover_games')
      .update({ phase: 'vote_setup', updated_at: nowIso() })
      .eq('id', game.id)
      .eq('phase', 'discussion')
      .select('id')
      .maybeSingle();
    if (claimError || !claimed) {
      if (claimError) console.error('[Undercover] Ouverture du vote impossible', claimError);
      return false;
    }

    const { error: resetError } = await supabase
      .from('undercover_players')
      .update({ vote_target: null })
      .eq('game_id', game.id);
    if (resetError) {
      await supabase.from('undercover_games').update({ phase: 'discussion' }).eq('id', game.id).eq('phase', 'vote_setup');
      return false;
    }

    const { data: opened, error: openError } = await supabase
      .from('undercover_games')
      .update({ phase: 'voting', updated_at: nowIso() })
      .eq('id', game.id)
      .eq('phase', 'vote_setup')
      .select('id')
      .maybeSingle();
    if (openError) console.error('[Undercover] Ouverture du vote impossible', openError);
    return Boolean(opened);
  }, [currentPlayer.isHost, game]);

  const submitVote = useCallback(async (targetPlayerId: string): Promise<boolean> => {
    if (!game || !myPlayer) return false;

    const { data: latestGame, error: gameError } = await supabase
      .from('undercover_games')
      .select('phase')
      .eq('id', game.id)
      .maybeSingle();
    if (gameError || latestGame?.phase !== 'voting') return false;

    const { data: rows, error: rowsError } = await supabase
      .from('undercover_players')
      .select('id, player_id, is_alive, vote_target')
      .eq('game_id', game.id);
    if (rowsError || !rows) return false;

    const voter = rows.find((player) => player.player_id === currentPlayer.id);
    const target = rows.find((player) => player.player_id === targetPlayerId);
    if (!voter || voter.vote_target || !canVote({
      voterId: currentPlayer.id,
      voterIsAlive: voter.is_alive,
      targetId: targetPlayerId,
      targetIsAlive: Boolean(target?.is_alive),
      phase: latestGame.phase,
    })) return false;

    const { data: updated, error: updateError } = await supabase
      .from('undercover_players')
      .update({ vote_target: targetPlayerId })
      .eq('id', voter.id)
      .is('vote_target', null)
      .select('id')
      .maybeSingle();
    if (updateError) console.error('[Undercover] Vote impossible', updateError);
    return Boolean(updated);
  }, [currentPlayer.id, game, myPlayer]);

  const resolveVotingRound = useCallback(async (force = false): Promise<void> => {
    if (!game || !currentPlayer.isHost || voteResolutionInFlightRef.current) return;
    voteResolutionInFlightRef.current = true;

    try {
      const { data: latestGame, error: gameError } = await supabase
        .from('undercover_games')
        .select('id, phase')
        .eq('id', game.id)
        .maybeSingle();
      if (gameError) throw gameError;
      if (latestGame?.phase !== 'voting') return;

      const { data: beforeClaim, error: beforeClaimError } = await supabase
        .from('undercover_players')
        .select('player_id, is_alive, vote_target')
        .eq('game_id', game.id);
      if (beforeClaimError) throw beforeClaimError;
      const aliveBeforeClaim = (beforeClaim ?? []).filter((player) => player.is_alive);
      if (aliveBeforeClaim.length === 0 || (!force && aliveBeforeClaim.some((player) => !player.vote_target))) return;

      const { data: claimed, error: claimError } = await supabase
        .from('undercover_games')
        .update({ phase: 'vote_resolution', updated_at: nowIso() })
        .eq('id', game.id)
        .eq('phase', 'voting')
        .select('id')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return;

      const { data: latestPlayers, error: playersError } = await supabase
        .from('undercover_players')
        .select('*')
        .eq('game_id', game.id);
      if (playersError) throw playersError;
      const alivePlayers = ((latestPlayers ?? []) as unknown as UndercoverPlayer[])
        .filter((player) => player.is_alive);
      const { eliminatedId, isTie } = resolveVotes(alivePlayers.map((player) => ({
        player_id: player.player_id,
        vote_target: player.vote_target,
      })));

      const eliminatedPlayer = eliminatedId
        ? alivePlayers.find((player) => player.player_id === eliminatedId)
        : null;

      if (!isTie && eliminatedPlayer) {
        const { error: eliminationError } = await supabase
          .from('undercover_players')
          .update({ is_alive: false })
          .eq('id', eliminatedPlayer.id)
          .eq('is_alive', true);
        if (eliminationError) throw eliminationError;
      }

      const { error: resultError } = await supabase
        .from('undercover_games')
        .update({
          phase: 'vote_result',
          eliminated_player_id: !isTie ? eliminatedPlayer?.player_id ?? null : null,
          eliminated_role: !isTie ? eliminatedPlayer?.role ?? null : null,
          updated_at: nowIso(),
        })
        .eq('id', game.id)
        .eq('phase', 'vote_resolution');
      if (resultError) throw resultError;
    } catch (cause) {
      console.error('[Undercover] Résolution du vote impossible', cause);
      setError("Le vote n'a pas pu être résolu. Une nouvelle tentative va être possible.");
      await supabase
        .from('undercover_games')
        .update({ phase: 'voting', updated_at: nowIso() })
        .eq('id', game.id)
        .eq('phase', 'vote_resolution');
    } finally {
      voteResolutionInFlightRef.current = false;
    }
  }, [currentPlayer.isHost, game]);

  const startNextRoundFresh = useCallback(async (
    activeGame: UndercoverGame,
    winnerRole: 'civilian' | 'undercover',
  ): Promise<void> => {
    const { data: rows, error: rowsError } = await supabase
      .from('undercover_players')
      .select('*')
      .eq('game_id', activeGame.id);
    if (rowsError) throw rowsError;

    const roster = (rows ?? []) as unknown as UndercoverPlayer[];
    const newPair = getRandomWordPair();
    const newOrder = shuffle(roster.map((player) => player.player_id));
    const roleOrder = shuffle(newOrder);
    const assignments = distributeRoles(
      roleOrder,
      clampUndercover(activeGame.num_undercover, roster.length, activeGame.enable_mr_white),
      activeGame.enable_mr_white && roster.length >= 4,
      newPair.civilian,
      newPair.undercover,
    );

    const updates = await Promise.all(roster.map((player) => supabase
      .from('undercover_players')
      .update({
        role: assignments.roles[player.player_id],
        word: assignments.words[player.player_id],
        is_alive: true,
        vote_target: null,
        current_clue: null,
        clue_history: [],
      })
      .eq('id', player.id)));
    const playerError = updates.find((result) => result.error)?.error;
    if (playerError) throw playerError;

    const { error: updateError } = await supabase
      .from('undercover_games')
      .update({
        phase: 'word_reveal',
        current_round: activeGame.current_round + 1,
        current_player_index: 0,
        clue_pass: 0,
        player_order: newOrder,
        civilian_word: newPair.civilian,
        undercover_word: newPair.undercover,
        eliminated_player_id: null,
        eliminated_role: null,
        civilian_wins: activeGame.civilian_wins + (winnerRole === 'civilian' ? 1 : 0),
        undercover_wins: activeGame.undercover_wins + (winnerRole === 'undercover' ? 1 : 0),
        updated_at: nowIso(),
      })
      .eq('id', activeGame.id)
      .eq('phase', 'round_transition');
    if (updateError) throw updateError;
  }, []);

  const concludeMatch = useCallback(async (
    activeGame: UndercoverGame,
    lastRoundWinner: 'civilian' | 'undercover',
  ): Promise<void> => {
    const civilianWins = activeGame.civilian_wins + (lastRoundWinner === 'civilian' ? 1 : 0);
    const undercoverWins = activeGame.undercover_wins + (lastRoundWinner === 'undercover' ? 1 : 0);
    const winner = computeMatchWinner(civilianWins, undercoverWins, lastRoundWinner);

    const { error: updateError } = await supabase
      .from('undercover_games')
      .update({
        phase: 'game_over',
        is_finished: true,
        winner_role: winner,
        civilian_wins: civilianWins,
        undercover_wins: undercoverWins,
        updated_at: nowIso(),
      })
      .eq('id', activeGame.id)
      .eq('phase', 'round_transition');
    if (updateError) throw updateError;
  }, []);

  const nextRound = useCallback(async (): Promise<void> => {
    if (!game || !currentPlayer.isHost || roundAdvanceInFlightRef.current) return;
    roundAdvanceInFlightRef.current = true;

    try {
      const { data: claimed, error: claimError } = await supabase
        .from('undercover_games')
        .update({ phase: 'round_transition', updated_at: nowIso() })
        .eq('id', game.id)
        .eq('phase', 'vote_result')
        .select('*')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return;

      const activeGame = claimed as unknown as UndercoverGame;
      const { data: latestPlayers, error: playersError } = await supabase
        .from('undercover_players')
        .select('*')
        .eq('game_id', activeGame.id);
      if (playersError) throw playersError;
      const alivePlayers = ((latestPlayers ?? []) as unknown as UndercoverPlayer[])
        .filter((player) => player.is_alive);
      const roundWinner = computeRoundWinner(alivePlayers);

      if (roundWinner) {
        if (activeGame.current_round >= activeGame.total_rounds) {
          await concludeMatch(activeGame, roundWinner);
        } else {
          await startNextRoundFresh(activeGame, roundWinner);
        }
      } else {
        const { error: clearError } = await supabase
          .from('undercover_players')
          .update({ current_clue: null, vote_target: null, clue_history: [] })
          .eq('game_id', activeGame.id);
        if (clearError) throw clearError;

        const { error: continueError } = await supabase
          .from('undercover_games')
          .update({
            phase: 'clue_giving',
            current_player_index: 0,
            clue_pass: 0,
            eliminated_player_id: null,
            eliminated_role: null,
            updated_at: nowIso(),
          })
          .eq('id', activeGame.id)
          .eq('phase', 'round_transition');
        if (continueError) throw continueError;
      }
    } catch (cause) {
      console.error('[Undercover] Passage à la suite impossible', cause);
      setError("La manche n'a pas pu avancer. Tu peux réessayer.");
      await supabase
        .from('undercover_games')
        .update({ phase: 'vote_result', updated_at: nowIso() })
        .eq('id', game.id)
        .eq('phase', 'round_transition');
    } finally {
      roundAdvanceInFlightRef.current = false;
    }
  }, [concludeMatch, currentPlayer.isHost, game, startNextRoundFresh]);

  const confirmWordSeen = useCallback(() => {
    setHasSeenWord(true);
  }, []);

  useEffect(() => {
    setHasSeenWord(false);
  }, [game?.id, game?.current_round]);

  useEffect(() => {
    if (currentPlayer.isHost) void initializeGame();
    else void fetchGame();
  }, [currentPlayer.isHost, fetchGame, initializeGame]);

  useEffect(() => {
    const channel = supabase
      .channel(`undercover-lobby-${lobbyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'undercover_games',
        filter: `lobby_id=eq.${lobbyId}`,
      }, () => { void fetchGame(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void fetchGame();
      });

    return () => { void supabase.removeChannel(channel); };
  }, [fetchGame, lobbyId]);

  useEffect(() => {
    if (!game?.id) return;
    const channel = supabase
      .channel(`undercover-players-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'undercover_players',
        filter: `game_id=eq.${game.id}`,
      }, () => { void fetchGame(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void fetchGame();
      });

    return () => { void supabase.removeChannel(channel); };
  }, [fetchGame, game?.id]);

  useEffect(() => {
    if (!game || !currentPlayer.isHost || game.phase !== 'clue_giving') {
      turnAdvanceLockRef.current = null;
      return;
    }

    const alivePlayers = gamePlayers.filter((player) => player.is_alive);
    const aliveOrder = game.player_order.filter((playerId) =>
      alivePlayers.some((player) => player.player_id === playerId));
    const currentTurnId = aliveOrder[game.current_player_index];
    const currentTurnPlayer = alivePlayers.find((player) => player.player_id === currentTurnId);
    const cluePass = game.clue_pass ?? 0;
    const historyLength = currentTurnPlayer?.clue_history?.length ?? 0;
    const spokenThisPass = Boolean(currentTurnPlayer?.current_clue) && historyLength >= cluePass;

    if (!currentTurnPlayer || !spokenThisPass) {
      turnAdvanceLockRef.current = null;
      return;
    }

    const lockKey = [
      game.id,
      game.current_round,
      cluePass,
      game.current_player_index,
      currentTurnPlayer.player_id,
      currentTurnPlayer.current_clue,
    ].join(':');
    if (turnAdvanceLockRef.current === lockKey) return;
    turnAdvanceLockRef.current = lockKey;

    void (async () => {
      try {
        if (game.current_player_index + 1 < aliveOrder.length) {
          const { error: advanceError } = await supabase
            .from('undercover_games')
            .update({ current_player_index: game.current_player_index + 1, updated_at: nowIso() })
            .eq('id', game.id)
            .eq('phase', 'clue_giving')
            .eq('clue_pass', cluePass)
            .eq('current_player_index', game.current_player_index);
          if (advanceError) throw advanceError;
          return;
        }

        if (cluePass === 0) {
          const { data: claimed, error: claimError } = await supabase
            .from('undercover_games')
            .update({ phase: 'clue_transition', updated_at: nowIso() })
            .eq('id', game.id)
            .eq('phase', 'clue_giving')
            .eq('clue_pass', 0)
            .eq('current_player_index', game.current_player_index)
            .select('id')
            .maybeSingle();
          if (claimError) throw claimError;
          if (!claimed) return;

          const { error: archiveError } = await supabase.rpc('archive_undercover_clues', {
            p_game_id: game.id,
          });
          if (archiveError) {
            await supabase.from('undercover_games').update({ phase: 'clue_giving' }).eq('id', game.id).eq('phase', 'clue_transition');
            throw archiveError;
          }

          const { error: passError } = await supabase
            .from('undercover_games')
            .update({
              phase: 'clue_giving',
              current_player_index: 0,
              clue_pass: 1,
              updated_at: nowIso(),
            })
            .eq('id', game.id)
            .eq('phase', 'clue_transition');
          if (passError) throw passError;
          return;
        }

        const { error: discussionError } = await supabase
          .from('undercover_games')
          .update({ phase: 'discussion', current_player_index: 0, updated_at: nowIso() })
          .eq('id', game.id)
          .eq('phase', 'clue_giving')
          .eq('clue_pass', cluePass)
          .eq('current_player_index', game.current_player_index);
        if (discussionError) throw discussionError;
      } catch (cause) {
        console.error('[Undercover] Avancement du tour impossible', cause);
        turnAdvanceLockRef.current = null;
        setError("Le tour n'a pas pu avancer automatiquement.");
      }
    })();
  }, [currentPlayer.isHost, game, gamePlayers]);

  useEffect(() => {
    if (!game || !currentPlayer.isHost || game.phase !== 'voting') return;
    const alivePlayers = gamePlayers.filter((player) => player.is_alive);
    if (alivePlayers.length > 0 && alivePlayers.every((player) => Boolean(player.vote_target))) {
      void resolveVotingRound(false);
    }
  }, [currentPlayer.isHost, game, gamePlayers, resolveVotingRound]);

  const botActionKey = useMemo(() => {
    if (!game || !currentPlayer.isHost) return null;
    const alive = gamePlayers.filter((player) => player.is_alive);
    const humans = alive.filter((player) => !isBotId(player.player_id));

    if (game.phase === 'word_reveal' && humans.length <= 1) {
      return `word:${game.id}:${game.current_round}`;
    }
    if (game.phase === 'discussion' && humans.length <= 1) {
      return `discussion:${game.id}:${game.current_round}`;
    }
    if (game.phase === 'clue_giving') {
      const order = game.player_order.filter((id) => alive.some((player) => player.player_id === id));
      const currentId = order[game.current_player_index];
      const bot = alive.find((player) => player.player_id === currentId);
      if (bot && isBotId(bot.player_id) && !bot.current_clue) {
        return `clue:${game.id}:${game.current_round}:${game.clue_pass}:${game.current_player_index}:${bot.id}`;
      }
    }
    if (game.phase === 'voting') {
      const pendingBots = alive.filter((player) => isBotId(player.player_id) && !player.vote_target);
      if (pendingBots.length > 0) {
        return `vote:${game.id}:${game.current_round}:${pendingBots.map((player) => player.id).sort().join(',')}`;
      }
    }
    return null;
  }, [currentPlayer.isHost, game, gamePlayers]);

  useEffect(() => {
    botGenerationRef.current += 1;
    const generation = botGenerationRef.current;
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = null;
    if (!botActionKey || !game) return;

    const delay = botActionKey.startsWith('clue:')
      ? 1200 + Math.random() * 1500
      : botActionKey.startsWith('vote:')
        ? 1200 + Math.random() * 900
        : botActionKey.startsWith('discussion:')
          ? 3000
          : 2500;

    botTimerRef.current = setTimeout(() => {
      void (async () => {
        if (generation !== botGenerationRef.current) return;

        if (botActionKey.startsWith('word:')) {
          await startCluePhase();
          return;
        }
        if (botActionKey.startsWith('discussion:')) {
          await startVoting();
          return;
        }
        if (botActionKey.startsWith('clue:')) {
          const alive = gamePlayers.filter((player) => player.is_alive);
          const order = game.player_order.filter((id) => alive.some((player) => player.player_id === id));
          const currentId = order[game.current_player_index];
          const bot = alive.find((player) => player.player_id === currentId);
          if (!bot || !isBotId(bot.player_id)) return;

          const { data: latestGame } = await supabase
            .from('undercover_games')
            .select('phase, current_player_index, clue_pass')
            .eq('id', game.id)
            .maybeSingle();
          if (
            generation !== botGenerationRef.current
            || latestGame?.phase !== 'clue_giving'
            || latestGame.current_player_index !== game.current_player_index
            || latestGame.clue_pass !== game.clue_pass
          ) return;

          await supabase
            .from('undercover_players')
            .update({ current_clue: generateBotClue(bot.word, bot.role) })
            .eq('id', bot.id)
            .is('current_clue', null);
          return;
        }

        const alive = gamePlayers.filter((player) => player.is_alive);
        const bot = alive.find((player) => isBotId(player.player_id) && !player.vote_target);
        if (!bot) return;
        const candidates = alive.filter((player) => player.player_id !== bot.player_id);
        if (candidates.length === 0) return;
        const target = candidates[Math.floor(Math.random() * candidates.length)];

        const { data: latestGame } = await supabase
          .from('undercover_games')
          .select('phase')
          .eq('id', game.id)
          .maybeSingle();
        if (generation !== botGenerationRef.current || latestGame?.phase !== 'voting') return;

        await supabase
          .from('undercover_players')
          .update({ vote_target: target.player_id })
          .eq('id', bot.id)
          .is('vote_target', null);
      })();
    }, delay);

    return () => {
      botGenerationRef.current += 1;
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    };
  }, [botActionKey, game, gamePlayers, startCluePhase, startVoting]);

  const phaseTimerKey = useMemo(() => {
    if (!game || !currentPlayer.isHost) return null;
    if (game.phase === 'discussion' || game.phase === 'voting' || game.phase === 'vote_result') {
      return `${game.phase}:${game.id}:${game.current_round}`;
    }
    if (game.phase !== 'clue_giving') return null;

    const alive = gamePlayers.filter((player) => player.is_alive);
    const order = game.player_order.filter((id) => alive.some((player) => player.player_id === id));
    const currentId = order[game.current_player_index];
    const current = alive.find((player) => player.player_id === currentId);
    if (!current || isBotId(current.player_id) || current.current_clue) return null;
    return `clue:${game.id}:${game.current_round}:${game.clue_pass}:${game.current_player_index}:${current.id}`;
  }, [currentPlayer.isHost, game, gamePlayers]);

  useEffect(() => {
    if (!phaseTimerKey || !game) return;
    const delay = phaseTimerKey.startsWith('clue:')
      ? 22000
      : phaseTimerKey.startsWith('discussion:')
        ? 28000
        : phaseTimerKey.startsWith('voting:')
          ? 25000
          : 6000;

    const timer = setTimeout(() => {
      void (async () => {
        if (phaseTimerKey.startsWith('discussion:')) {
          await startVoting();
          return;
        }
        if (phaseTimerKey.startsWith('voting:')) {
          await resolveVotingRound(true);
          return;
        }
        if (phaseTimerKey.startsWith('vote_result:')) {
          await nextRound();
          return;
        }

        const alive = gamePlayers.filter((player) => player.is_alive);
        const order = game.player_order.filter((id) => alive.some((player) => player.player_id === id));
        const currentId = order[game.current_player_index];
        const current = alive.find((player) => player.player_id === currentId);
        if (!current) return;

        const { data: latestGame } = await supabase
          .from('undercover_games')
          .select('phase, current_player_index, clue_pass')
          .eq('id', game.id)
          .maybeSingle();
        if (
          latestGame?.phase !== 'clue_giving'
          || latestGame.current_player_index !== game.current_player_index
          || latestGame.clue_pass !== game.clue_pass
        ) return;

        await supabase
          .from('undercover_players')
          .update({ current_clue: '🤐' })
          .eq('id', current.id)
          .is('current_clue', null);
      })();
    }, delay);

    return () => clearTimeout(timer);
  }, [game, gamePlayers, nextRound, phaseTimerKey, resolveVotingRound, startVoting]);

  const alivePlayers = gamePlayers.filter((player) => player.is_alive);
  const aliveOrder = game
    ? game.player_order.filter((id) => alivePlayers.some((player) => player.player_id === id))
    : [];
  const currentTurnPlayerId = game ? aliveOrder[game.current_player_index] ?? null : null;
  const isMyTurn = currentTurnPlayerId === currentPlayer.id;

  return {
    game,
    gamePlayers,
    myPlayer,
    loading,
    error,
    participantCount: activePlayers.length,
    alivePlayers,
    currentTurnPlayerId,
    isMyTurn,
    hasSeenWord,
    submitClue,
    submitVote,
    startVoting,
    nextRound,
    confirmWordSeen,
    startCluePhase,
    lockSettings,
    retryInitialization,
  };
};
