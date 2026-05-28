import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRandomWordPair } from '@/lib/undercoverWords';
import { undercoverClueSchema, safeParse } from '@/lib/validation';
import {
  clampUndercover,
  distributeRoles,
  computeRoundWinner,
  resolveVotes,
  canVote,
  canSubmitClue,
  computeMatchWinner,
} from '@/lib/undercoverLogic';

/**
 * Generate a plausible clue for a bot based on its word and role.
 * - Civilians: pick a generic adjective/association related to the word
 * - Undercover: similar but slightly off (they have a different word)
 * - Mr White: completely random generic word (they have no word)
 */
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

function generateBotClue(word: string | null, role: string): string {
  if (!word || role === 'mr_white') {
    // Mr White or no word: pick a completely random generic clue
    return BOT_GENERIC_CLUES[Math.floor(Math.random() * BOT_GENERIC_CLUES.length)];
  }

  // For civilians and undercover: pick a random clue
  // (In a real game they'd think about their word, but bots just pick randomly)
  // This is intentionally vague to not give away too much info
  const pool = BOT_GENERIC_CLUES;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  clue_history?: string[];
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
  civilian_wins?: number;
  undercover_wins?: number;
  /** 0 = first clue pass, 1 = second clue pass. After pass 1 → discussion. */
  clue_pass?: number;
}

type GamePhase =
  | 'settings'
  | 'word_reveal'
  | 'clue_giving'
  | 'discussion'
  | 'voting'
  | 'vote_result'
  | 'game_over';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

/**
 * Safely update undercover_games with clue_pass. If the column doesn't exist
 * yet (migration not applied), retry without it so the game still works
 * (falls back to single-pass clues).
 */
const safeUpdateGame = async (
  gameId: string,
  patch: Record<string, unknown>,
) => {
  const { error } = await supabase
    .from('undercover_games')
    .update(patch as any)
    .eq('id', gameId);

  if (error && 'clue_pass' in patch) {
    // Column likely doesn't exist — retry without it
    const { clue_pass, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      await supabase
        .from('undercover_games')
        .update(rest as any)
        .eq('id', gameId);
    }
  }
};

export const useUndercoverGame = (
  lobbyId: string,
  currentPlayer: Player,
  players: Player[]
) => {
  const [game, setGame] = useState<UndercoverGame | null>(null);
  const [gamePlayers, setGamePlayers] = useState<UndercoverPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPlayer, setMyPlayer] = useState<UndercoverPlayer | null>(null);
  const [hasSeenWord, setHasSeenWord] = useState(false);
  const initRef = useRef(false);
  const turnAdvanceLockRef = useRef<string | null>(null);
  const voteResolutionLockRef = useRef<string | null>(null);

  // Fetch game state
  const fetchGame = useCallback(async () => {
    const { data: gameData } = await supabase
      .from('undercover_games')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameData) {
      setGame(gameData as unknown as UndercoverGame);

      const { data: playersData } = await supabase
        .from('undercover_players')
        .select('*')
        .eq('game_id', gameData.id);

      if (playersData) {
        const typed = playersData as unknown as UndercoverPlayer[];
        setGamePlayers(typed);
        const me = typed.find(p => p.player_id === currentPlayer.id);
        if (me) setMyPlayer(me);
      }
    }
    setLoading(false);
  }, [lobbyId, currentPlayer.id]);

  // Initialize game (host only) — creates a 'settings' phase row.
  // Roles & words are assigned later when the host locks settings.
  const initializeGame = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    const { data: existing } = await supabase
      .from('undercover_games')
      .select('id')
      .eq('lobby_id', lobbyId)
      .maybeSingle();

    if (existing) {
      await fetchGame();
      return;
    }

    const wordPair = getRandomWordPair();
    // Fisher-Yates shuffle for unbiased random order
    const playerOrder = players.map(p => p.id);
    for (let i = playerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerOrder[i], playerOrder[j]] = [playerOrder[j], playerOrder[i]];
    }

    // Re-check just before insert to mitigate 2-host race
    const { data: existing2 } = await supabase
      .from('undercover_games')
      .select('id')
      .eq('lobby_id', lobbyId)
      .maybeSingle();
    if (existing2) {
      await fetchGame();
      return;
    }

    const { data: newGame, error: gameError } = await supabase
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
        num_undercover: players.length >= 7 ? 2 : 1,
        enable_mr_white: false,
        settings_locked: false,
      })
      .select()
      .single();

    if (gameError || !newGame) {
      console.error('Error creating game:', gameError);
      initRef.current = false;
      return;
    }

    // Pre-create player rows with no role/word — assigned on lockSettings.
    const playerInserts = players.map(p => ({
      game_id: newGame.id,
      player_id: p.id,
      player_name: p.name,
      role: 'civilian' as const,
      word: null,
      is_alive: true,
    }));

    await supabase.from('undercover_players').insert(playerInserts);
    await fetchGame();
  }, [lobbyId, players, fetchGame]);

  // Lock settings (host only) — assigns roles/words and moves to word_reveal.
  const lockSettings = useCallback(
    async (settings: {
      numUndercover: number;
      totalRounds: number;
      enableMrWhite: boolean;
    }) => {
      if (!game || !currentPlayer.isHost) return;
      if (game.settings_locked) return;

      const { numUndercover, totalRounds, enableMrWhite } = settings;
      // Bug fix: use clamp from pure logic
      const safeUndercover = clampUndercover(numUndercover, players.length, enableMrWhite);
      const safeRounds = Math.max(1, Math.min(99, totalRounds));

      // Build role/word maps via pure logic — Fisher-Yates shuffle
      const shuffled = [...game.player_order];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const { roles, words } = distributeRoles(
        shuffled,
        safeUndercover,
        enableMrWhite && players.length >= 4,
        game.civilian_word,
        game.undercover_word
      );

      // Update each player's role/word
      await Promise.all(
        Object.keys(roles).map((pid) =>
          supabase
            .from('undercover_players')
            .update({ role: roles[pid], word: words[pid] })
            .eq('game_id', game.id)
            .eq('player_id', pid),
        ),
      );

      // Lock settings on the game and move to word_reveal
      await supabase
        .from('undercover_games')
        .update({
          phase: 'word_reveal',
          num_undercover: safeUndercover,
          total_rounds: safeRounds,
          enable_mr_white: enableMrWhite && players.length >= 4,
          settings_locked: true,
        })
        .eq('id', game.id);

      await fetchGame();
    },
    [game, currentPlayer.isHost, players.length, fetchGame],
  );

  /**
   * Start a fresh round inside the SAME game (host only).
   *
   * Multi-round semantics: when one side wins by elimination/parity but
   * `current_round < total_rounds`, we don't end the game. Instead:
   *
   *   1) Increment the matching side's score (`civilian_wins` /
   *      `undercover_wins` if those columns are deployed).
   *   2) Pick a new word pair.
   *   3) Re-shuffle role/word assignments using the locked
   *      `num_undercover` / `enable_mr_white` settings.
   *   4) Bring everyone back alive, clear clues/votes, reset the player
   *      order and turn cursor.
   *   5) Move the game back to `word_reveal` with `current_round + 1`.
   *
   * Returns the updated game row or null on failure.
   */
  const startNextRoundFresh = useCallback(
    async (
      winnerRole: 'civilian' | 'undercover' | null,
    ): Promise<void> => {
      if (!game || !currentPlayer.isHost) return;

      const newPair = getRandomWordPair();
      const newOrder = [...game.player_order];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      const safeUndercover = Math.max(1, game.num_undercover || 1);
      const enableMrWhite = Boolean(game.enable_mr_white);

      // Re-distribute roles via pure logic
      const { roles, words } = distributeRoles(
        newOrder,
        safeUndercover,
        enableMrWhite && newOrder.length >= 4,
        newPair.civilian,
        newPair.undercover
      );

      // Reset every player row in one batch update per player.
      await Promise.all(
        Object.keys(roles).map((pid) =>
          supabase
            .from('undercover_players')
            .update({
              role: roles[pid],
              word: words[pid],
              is_alive: true,
              vote_target: null,
              current_clue: null,
              clue_history: [],
            })
            .eq('game_id', game.id)
            .eq('player_id', pid),
        ),
      );

      // Increment the score columns optimistically; if they don't exist
      // yet (migration not applied), the update silently no-ops on those
      // fields and the rest of the patch still applies.
      const patch: Record<string, unknown> = {
        phase: 'word_reveal',
        current_round: game.current_round + 1,
        current_player_index: 0,
        clue_pass: 0,
        player_order: newOrder,
        civilian_word: newPair.civilian,
        undercover_word: newPair.undercover,
        eliminated_player_id: null,
        eliminated_role: null,
      };
      if (winnerRole === 'civilian') {
        patch.civilian_wins = (game.civilian_wins ?? 0) + 1;
      } else if (winnerRole === 'undercover') {
        patch.undercover_wins = (game.undercover_wins ?? 0) + 1;
      }

      const { error } = await supabase
        .from('undercover_games')
        .update(patch as any)
        .eq('id', game.id);

      if (error) {
        // Score/clue_pass columns may not exist yet — retry without them.
        delete patch.civilian_wins;
        delete patch.undercover_wins;
        delete patch.clue_pass;
        await supabase
          .from('undercover_games')
          .update(patch as any)
          .eq('id', game.id);
      }

      await fetchGame();
    },
    [game, currentPlayer.isHost, fetchGame],
  );

  /**
   * Conclude the entire match (host only). Picks the side with the most
   * round wins as the global winner and flips the game to `game_over`.
   */
  const concludeMatch = useCallback(
    async (lastRoundWinner: 'civilian' | 'undercover' | null): Promise<void> => {
      if (!game || !currentPlayer.isHost) return;

      const civilianWins =
        (game.civilian_wins ?? 0) +
        (lastRoundWinner === 'civilian' ? 1 : 0);
      const undercoverWins =
        (game.undercover_wins ?? 0) +
        (lastRoundWinner === 'undercover' ? 1 : 0);

      const winner = computeMatchWinner(civilianWins, undercoverWins, lastRoundWinner);

      const patch: Record<string, unknown> = {
        phase: 'game_over',
        is_finished: true,
        winner_role: winner,
      };
      if (lastRoundWinner === 'civilian') {
        patch.civilian_wins = civilianWins;
      } else if (lastRoundWinner === 'undercover') {
        patch.undercover_wins = undercoverWins;
      }

      const { error } = await supabase
        .from('undercover_games')
        .update(patch as any)
        .eq('id', game.id);

      if (error) {
        delete patch.civilian_wins;
        delete patch.undercover_wins;
        await supabase
          .from('undercover_games')
          .update(patch as any)
          .eq('id', game.id);
      }
    },
    [game, currentPlayer.isHost],
  );

  // Submit a clue — Bug fix #3: validate turn + phase + alive
  const submitClue = useCallback(async (clue: string) => {
    if (!game || !myPlayer) return;

    // Compute current turn ID
    const alivePlayers = gamePlayers.filter((p) => p.is_alive);
    const aliveOrder = game.player_order.filter((id) =>
      alivePlayers.some((p) => p.player_id === id)
    );
    const currentTurnId = aliveOrder[game.current_player_index] ?? null;

    if (!canSubmitClue({
      playerId: currentPlayer.id,
      playerIsAlive: myPlayer.is_alive,
      currentTurnPlayerId: currentTurnId,
      phase: game.phase,
      hasExistingClue: Boolean(myPlayer.current_clue),
    })) {
      return;
    }

    const cleanClue = safeParse(undercoverClueSchema, clue);
    if (!cleanClue) return;

    await supabase
      .from('undercover_players')
      .update({ current_clue: cleanClue })
      .eq('id', myPlayer.id);
  }, [game, myPlayer, gamePlayers, currentPlayer.id]);

  // Start voting (host)
  const startVoting = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;
    
    // Reset votes
    await supabase
      .from('undercover_players')
      .update({ vote_target: null })
      .eq('game_id', game.id);

    await supabase
      .from('undercover_games')
      .update({ phase: 'voting' })
      .eq('id', game.id);
  }, [game, currentPlayer.isHost]);

  // Submit vote — Bug fix #2: validate voter + target are alive
  const submitVote = useCallback(async (targetPlayerId: string) => {
    if (!game || !myPlayer) return;

    const target = gamePlayers.find((p) => p.player_id === targetPlayerId);
    if (!canVote({
      voterId: currentPlayer.id,
      voterIsAlive: myPlayer.is_alive,
      targetId: targetPlayerId,
      targetIsAlive: Boolean(target?.is_alive),
      phase: game.phase,
    })) {
      return;
    }

    await supabase
      .from('undercover_players')
      .update({ vote_target: targetPlayerId })
      .eq('id', myPlayer.id);
  }, [game, myPlayer, gamePlayers, currentPlayer.id]);

  const resolveVotingRound = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;

    const { data: latestPlayers } = await supabase
      .from('undercover_players')
      .select('*')
      .eq('game_id', game.id);

    if (!latestPlayers) return;

    const alivePlayers = (latestPlayers as unknown as UndercoverPlayer[]).filter((player) => player.is_alive);
    if (alivePlayers.length === 0 || alivePlayers.some((player) => !player.vote_target)) {
      return;
    }

    // Bug fix #7: use proper tie detection (3+ way ties were broken)
    const { eliminatedId, isTie } = resolveVotes(
      alivePlayers.map((p) => ({
        player_id: p.player_id,
        vote_target: p.vote_target,
      }))
    );

    if (isTie || !eliminatedId) {
      await supabase
        .from('undercover_games')
        .update({
          phase: 'vote_result',
          eliminated_player_id: null,
          eliminated_role: null,
        })
        .eq('id', game.id);
      return;
    }

    const eliminatedPlayer = alivePlayers.find((player) => player.player_id === eliminatedId);

    await supabase
      .from('undercover_players')
      .update({ is_alive: false })
      .eq('game_id', game.id)
      .eq('player_id', eliminatedId);

    // Always show the vote_result first so players see who got eliminated;
    // the host advances to the next round (or the match conclusion) via
    // `nextRound`.
    await supabase
      .from('undercover_games')
      .update({
        phase: 'vote_result',
        eliminated_player_id: eliminatedId,
        eliminated_role: eliminatedPlayer?.role || null,
      })
      .eq('id', game.id);
  }, [game, currentPlayer.isHost]);

  /**
   * Host advance — called from the `vote_result` phase.
   *
   * Behaviour:
   *   - If a side won the just-ended round (all bad guys out, or
   *     undercover≥civilians) AND we still have rounds to play → start a
   *     fresh round inside the same game (new word pair, redistributed
   *     roles, all alive, back to `word_reveal`). Score gets bumped on
   *     the winning side.
   *   - If a side won AND we hit the round cap → conclude the match.
   *   - Otherwise (tie / nobody won yet) → keep playing. Just clear
   *     clues/votes and return to `clue_giving` for another round of
   *     elimination.
   */
  const nextRound = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;

    // Re-check the alive set so we don't re-derive from a stale snapshot.
    const { data: latest } = await supabase
      .from('undercover_players')
      .select('*')
      .eq('game_id', game.id);
    const alive = ((latest as unknown as UndercoverPlayer[]) || []).filter(
      (p) => p.is_alive,
    );

    // Use pure logic to determine round winner
    const roundWinner = computeRoundWinner(alive);

    // Case A — a side won the round
    if (roundWinner !== null) {
      // Match over (round cap reached) → conclude
      if (game.current_round >= game.total_rounds) {
        await concludeMatch(roundWinner);
        return;
      }
      // Still rounds to play → fresh round inside the same game
      await startNextRoundFresh(roundWinner);
      return;
    }

    // Case B — nobody won this round (tie / partial elimination).
    // Clear clues/votes/history, keep alive set, and start another clue cycle.
    await supabase
      .from('undercover_players')
      .update({ current_clue: null, vote_target: null, clue_history: [] })
      .eq('game_id', game.id);

        await safeUpdateGame(game.id, {
          phase: 'clue_giving',
          current_player_index: 0,
          clue_pass: 0,
          eliminated_player_id: null,
          eliminated_role: null,
        });
  }, [game, currentPlayer.isHost, startNextRoundFresh, concludeMatch]);

  // Confirm word seen
  const confirmWordSeen = useCallback(async () => {
    setHasSeenWord(true);
    
    // Check if all players have seen - host moves to clue_giving
    if (currentPlayer.isHost) {
      // Small delay to let others see
      setTimeout(async () => {
        if (game) {
          await safeUpdateGame(game.id, { phase: 'clue_giving', clue_pass: 0 });
        }
      }, 2000);
    }
  }, [currentPlayer.isHost, game]);

  // Start clue phase (host)
  const startCluePhase = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;
    await safeUpdateGame(game.id, { phase: 'clue_giving', current_player_index: 0, clue_pass: 0 });
  }, [game, currentPlayer.isHost]);

  useEffect(() => {
    setHasSeenWord(false);
  }, [game?.id, game?.current_round]);

  // Init + realtime
  useEffect(() => {
    if (currentPlayer.isHost) {
      initializeGame();
    } else {
      fetchGame();
    }
  }, [currentPlayer.isHost, initializeGame, fetchGame]);

  useEffect(() => {
    if (!game || !currentPlayer.isHost || game.phase !== 'clue_giving') {
      turnAdvanceLockRef.current = null;
      return;
    }

    const alivePlayers = gamePlayers.filter((player) => player.is_alive);
    const aliveOrder = game.player_order.filter((playerId) =>
      alivePlayers.some((player) => player.player_id === playerId)
    );
    const currentTurnId = aliveOrder[game.current_player_index];
    const currentTurnPlayer = alivePlayers.find((player) => player.player_id === currentTurnId);

    if (!currentTurnPlayer?.current_clue) {
      turnAdvanceLockRef.current = null;
      return;
    }

    const lockKey = [
      game.id,
      game.current_round,
      game.current_player_index,
      currentTurnPlayer.player_id,
      currentTurnPlayer.current_clue,
    ].join(':');

    if (turnAdvanceLockRef.current === lockKey) {
      return;
    }

    turnAdvanceLockRef.current = lockKey;

    void (async () => {
      if (game.current_player_index + 1 >= aliveOrder.length) {
        // All alive players have given their clue for this pass.
        const currentPass = (game as any).clue_pass ?? 0;

        if (currentPass < 1) {
          // First pass done → start second pass: archive current clues into
          // clue_history (so they stay visible), clear current_clue, bump pass.
          // Use the DB function for atomicity; fall back to raw clear if the
          // function doesn't exist yet (migration not applied).
          const { error: rpcErr } = await (supabase as any).rpc('archive_undercover_clues', {
            p_game_id: game.id,
          });
          if (rpcErr) {
            // Fallback: just clear current_clue (clues will disappear but game continues)
            await supabase
              .from('undercover_players')
              .update({ current_clue: null })
              .eq('game_id', game.id);
          }

          await safeUpdateGame(game.id, { current_player_index: 0, clue_pass: currentPass + 1 });
          return;
        }

        // Second pass done → move to discussion
        await supabase
          .from('undercover_games')
          .update({ phase: 'discussion', current_player_index: 0 })
          .eq('id', game.id);
        return;
      }

      await supabase
        .from('undercover_games')
        .update({ current_player_index: game.current_player_index + 1 })
        .eq('id', game.id);
    })();
  }, [game, gamePlayers, currentPlayer.isHost]);

  useEffect(() => {
    if (!game || !currentPlayer.isHost || game.phase !== 'voting') {
      voteResolutionLockRef.current = null;
      return;
    }

    const alivePlayers = gamePlayers.filter((player) => player.is_alive);
    if (alivePlayers.length === 0) {
      return;
    }

    if (alivePlayers.some((player) => !player.vote_target)) {
      voteResolutionLockRef.current = null;
      return;
    }

    const lockKey = [
      game.id,
      game.current_round,
      ...alivePlayers
        .map((player) => `${player.player_id}:${player.vote_target}`)
        .sort(),
    ].join('|');

    if (voteResolutionLockRef.current === lockKey) {
      return;
    }

    voteResolutionLockRef.current = lockKey;
    void resolveVotingRound();
  }, [game, gamePlayers, currentPlayer.isHost, resolveVotingRound]);

  /* ==============================================================
     BOT AUTO-PLAY — when admin plays solo with bots
     Bots auto: confirmWordSeen, submitClue, submitVote
  ============================================================== */
  const isBotId = (id: string) => id.startsWith('bot-');
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!game || !currentPlayer.isHost) return;
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }

    const phase = game.phase as GamePhase;

    // --- WORD REVEAL: auto-confirm for all bots after 1.5s ---
    if (phase === 'word_reveal') {
      botTimerRef.current = setTimeout(async () => {
        // Host auto-starts clue phase (which also confirms word seen for everyone)
        if (game) {
          await safeUpdateGame(game.id, { phase: 'clue_giving', current_player_index: 0, clue_pass: 0 });
        }
      }, 2500);
      return;
    }

    // --- CLUE GIVING: if it's a bot's turn, auto-submit a clue ---
    if (phase === 'clue_giving') {
      const aliveOrder = game.player_order.filter((id) =>
        gamePlayers.some((p) => p.player_id === id && p.is_alive),
      );
      const currentTurnId = aliveOrder[game.current_player_index];
      if (!currentTurnId || !isBotId(currentTurnId)) return;

      const botPlayer = gamePlayers.find((p) => p.player_id === currentTurnId);
      if (!botPlayer || botPlayer.current_clue) return;

      // Generate a random clue based on the bot's word
      botTimerRef.current = setTimeout(async () => {
        const clue = generateBotClue(botPlayer.word, botPlayer.role);
        await supabase
          .from('undercover_players')
          .update({ current_clue: clue })
          .eq('id', botPlayer.id);
      }, 1200 + Math.random() * 1500); // 1.2-2.7s delay for realism
      return;
    }

    // --- VOTING: bots auto-vote after a short delay ---
    if (phase === 'voting') {
      const aliveBots = gamePlayers.filter(
        (p) => p.is_alive && isBotId(p.player_id) && !p.vote_target,
      );
      if (aliveBots.length === 0) return;

      botTimerRef.current = setTimeout(async () => {
        const alivePlayerIds = gamePlayers
          .filter((p) => p.is_alive)
          .map((p) => p.player_id);

        for (const bot of aliveBots) {
          // Bot votes for a random alive player (not itself)
          const candidates = alivePlayerIds.filter((id) => id !== bot.player_id);
          if (candidates.length === 0) continue;
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          await supabase
            .from('undercover_players')
            .update({ vote_target: target })
            .eq('id', bot.id);
          // Stagger votes slightly
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
        }
      }, 1500 + Math.random() * 1000);
      return;
    }

    // --- DISCUSSION: in admin solo (only 1 human + bots) skip the
    //     timer and advance to voting after 3s. Real multiplayer
    //     keeps the manual "Passer au vote" button.
    if (phase === 'discussion') {
      const humans = gamePlayers.filter(
        (p) => p.is_alive && !isBotId(p.player_id),
      );
      if (humans.length > 1) return; // multiplayer — wait for manual click

      botTimerRef.current = setTimeout(async () => {
        // Reset votes then move to voting
        await supabase
          .from('undercover_players')
          .update({ vote_target: null })
          .eq('game_id', game.id);
        await supabase
          .from('undercover_games')
          .update({ phase: 'voting' })
          .eq('id', game.id);
      }, 3000);
      return;
    }

    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [game?.phase, game?.current_player_index, (game as any)?.clue_pass, game?.id, gamePlayers, currentPlayer.isHost]);

  // Realtime subscriptions
  useEffect(() => {
    if (!game) return;

    const gameChannel = supabase
      .channel(`undercover-game-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'undercover_games',
        filter: `id=eq.${game.id}`,
      }, () => fetchGame())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'undercover_players',
        filter: `game_id=eq.${game.id}`,
      }, () => fetchGame())
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [game?.id, fetchGame]);

  // Derived state
  const alivePlayers = gamePlayers.filter(p => p.is_alive);
  const aliveOrder = game ? game.player_order.filter(id => alivePlayers.some(p => p.player_id === id)) : [];
  const currentTurnPlayerId = game ? aliveOrder[game.current_player_index] : null;
  const isMyTurn = currentTurnPlayerId === currentPlayer.id;

  return {
    game,
    gamePlayers,
    myPlayer,
    loading,
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
  };
};
