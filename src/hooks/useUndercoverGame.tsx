import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRandomWordPair } from '@/lib/undercoverWords';

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
}

interface UndercoverGame {
  id: string;
  lobby_id: string;
  civilian_word: string;
  undercover_word: string;
  current_round: number;
  phase: string;
  current_player_index: number;
  player_order: string[];
  eliminated_player_id: string | null;
  eliminated_role: string | null;
  is_finished: boolean;
  winner_role: string | null;
}

type GamePhase = 'word_reveal' | 'clue_giving' | 'discussion' | 'voting' | 'vote_result' | 'game_over';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

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

  // Fetch game state
  const fetchGame = useCallback(async () => {
    const { data: gameData } = await supabase
      .from('undercover_games')
      .select('*')
      .eq('lobby_id', lobbyId)
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

  // Initialize game (host only)
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
    const playerOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);
    
    // Determine roles: 1 undercover for 3-6 players, 2 for 7+, add Mr White for 8+
    const numUndercover = players.length >= 7 ? 2 : 1;
    const hasMrWhite = players.length >= 8;
    
    // Shuffle and assign roles
    const shuffled = [...playerOrder];
    const roles: Record<string, 'civilian' | 'undercover' | 'mr_white'> = {};
    const words: Record<string, string | null> = {};
    
    for (let i = 0; i < numUndercover; i++) {
      roles[shuffled[i]] = 'undercover';
      words[shuffled[i]] = wordPair.undercover;
    }
    
    let startIdx = numUndercover;
    if (hasMrWhite) {
      roles[shuffled[startIdx]] = 'mr_white';
      words[shuffled[startIdx]] = null;
      startIdx++;
    }
    
    for (let i = startIdx; i < shuffled.length; i++) {
      roles[shuffled[i]] = 'civilian';
      words[shuffled[i]] = wordPair.civilian;
    }

    const { data: newGame, error: gameError } = await supabase
      .from('undercover_games')
      .insert({
        lobby_id: lobbyId,
        civilian_word: wordPair.civilian,
        undercover_word: wordPair.undercover,
        player_order: playerOrder,
        phase: 'word_reveal',
        current_round: 1,
        current_player_index: 0,
      })
      .select()
      .single();

    if (gameError || !newGame) {
      console.error('Error creating game:', gameError);
      initRef.current = false;
      return;
    }

    const playerInserts = players.map(p => ({
      game_id: newGame.id,
      player_id: p.id,
      player_name: p.name,
      role: roles[p.id] || 'civilian',
      word: words[p.id] ?? null,
      is_alive: true,
    }));

    await supabase.from('undercover_players').insert(playerInserts);
    await fetchGame();
  }, [lobbyId, players, fetchGame]);

  // Submit clue
  const submitClue = useCallback(async (clue: string) => {
    if (!game || !myPlayer) return;

    await supabase
      .from('undercover_players')
      .update({ current_clue: clue })
      .eq('id', myPlayer.id);

    // Move to next player or to discussion
    const alivePlayers = gamePlayers.filter(p => p.is_alive);
    const aliveOrder = game.player_order.filter(id => alivePlayers.some(p => p.player_id === id));
    const currentIdx = game.current_player_index;
    
    if (currentIdx + 1 >= aliveOrder.length) {
      // All players gave clues -> discussion
      if (currentPlayer.isHost) {
        await supabase
          .from('undercover_games')
          .update({ phase: 'discussion', current_player_index: 0 })
          .eq('id', game.id);
      }
    } else {
      // Next player
      if (currentPlayer.isHost) {
        await supabase
          .from('undercover_games')
          .update({ current_player_index: currentIdx + 1 })
          .eq('id', game.id);
      }
    }
  }, [game, myPlayer, gamePlayers, currentPlayer.isHost]);

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

  // Submit vote
  const submitVote = useCallback(async (targetPlayerId: string) => {
    if (!game || !myPlayer) return;

    await supabase
      .from('undercover_players')
      .update({ vote_target: targetPlayerId })
      .eq('id', myPlayer.id);

    // Check if all alive players voted
    const { data: updatedPlayers } = await supabase
      .from('undercover_players')
      .select('*')
      .eq('game_id', game.id);

    if (updatedPlayers) {
      const alive = (updatedPlayers as unknown as UndercoverPlayer[]).filter(p => p.is_alive);
      const allVoted = alive.every(p => 
        p.player_id === targetPlayerId ? true : p.vote_target !== null || p.player_id === currentPlayer.id
      );

      // Re-check with updated data
      const { data: recheckPlayers } = await supabase
        .from('undercover_players')
        .select('*')
        .eq('game_id', game.id);
      
      if (recheckPlayers) {
        const aliveRecheck = (recheckPlayers as unknown as UndercoverPlayer[]).filter(p => p.is_alive);
        const allVotedRecheck = aliveRecheck.every(p => p.vote_target !== null);
        
        if (allVotedRecheck) {
          // Tally votes
          const voteCounts: Record<string, number> = {};
          aliveRecheck.forEach(p => {
            if (p.vote_target) {
              voteCounts[p.vote_target] = (voteCounts[p.vote_target] || 0) + 1;
            }
          });

          // Find the most voted player
          let maxVotes = 0;
          let eliminatedId = '';
          let isTie = false;
          
          Object.entries(voteCounts).forEach(([id, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              eliminatedId = id;
              isTie = false;
            } else if (count === maxVotes) {
              isTie = true;
            }
          });

          if (isTie) {
            // Tie: no elimination, new round
            await supabase
              .from('undercover_games')
              .update({
                phase: 'vote_result',
                eliminated_player_id: null,
                eliminated_role: null,
              })
              .eq('id', game.id);
          } else {
            const eliminatedPlayer = aliveRecheck.find(p => p.player_id === eliminatedId);
            
            // Eliminate
            await supabase
              .from('undercover_players')
              .update({ is_alive: false })
              .eq('game_id', game.id)
              .eq('player_id', eliminatedId);

            // Check win condition
            const remainingAlive = aliveRecheck.filter(p => p.player_id !== eliminatedId);
            const remainingUndercover = remainingAlive.filter(p => p.role === 'undercover');
            const remainingMrWhite = remainingAlive.filter(p => p.role === 'mr_white');
            const remainingCivilians = remainingAlive.filter(p => p.role === 'civilian');

            const allBadGuysEliminated = remainingUndercover.length === 0 && remainingMrWhite.length === 0;
            const undercoverWins = remainingUndercover.length + remainingMrWhite.length >= remainingCivilians.length;

            if (allBadGuysEliminated) {
              await supabase
                .from('undercover_games')
                .update({
                  phase: 'game_over',
                  is_finished: true,
                  winner_role: 'civilian',
                  eliminated_player_id: eliminatedId,
                  eliminated_role: eliminatedPlayer?.role || null,
                })
                .eq('id', game.id);
            } else if (undercoverWins) {
              await supabase
                .from('undercover_games')
                .update({
                  phase: 'game_over',
                  is_finished: true,
                  winner_role: 'undercover',
                  eliminated_player_id: eliminatedId,
                  eliminated_role: eliminatedPlayer?.role || null,
                })
                .eq('id', game.id);
            } else {
              await supabase
                .from('undercover_games')
                .update({
                  phase: 'vote_result',
                  eliminated_player_id: eliminatedId,
                  eliminated_role: eliminatedPlayer?.role || null,
                })
                .eq('id', game.id);
            }
          }
        }
      }
    }
  }, [game, myPlayer, currentPlayer.id]);

  // Next round (host)
  const nextRound = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;

    // Clear clues and votes
    await supabase
      .from('undercover_players')
      .update({ current_clue: null, vote_target: null })
      .eq('game_id', game.id);

    await supabase
      .from('undercover_games')
      .update({
        phase: 'clue_giving',
        current_round: game.current_round + 1,
        current_player_index: 0,
        eliminated_player_id: null,
        eliminated_role: null,
      })
      .eq('id', game.id);
  }, [game, currentPlayer.isHost]);

  // Confirm word seen
  const confirmWordSeen = useCallback(async () => {
    setHasSeenWord(true);
    
    // Check if all players have seen - host moves to clue_giving
    if (currentPlayer.isHost) {
      // Small delay to let others see
      setTimeout(async () => {
        if (game) {
          await supabase
            .from('undercover_games')
            .update({ phase: 'clue_giving' })
            .eq('id', game.id);
        }
      }, 2000);
    }
  }, [currentPlayer.isHost, game]);

  // Start clue phase (host)
  const startCluePhase = useCallback(async () => {
    if (!game || !currentPlayer.isHost) return;
    await supabase
      .from('undercover_games')
      .update({ phase: 'clue_giving', current_player_index: 0 })
      .eq('id', game.id);
  }, [game, currentPlayer.isHost]);

  // Init + realtime
  useEffect(() => {
    if (currentPlayer.isHost) {
      initializeGame();
    } else {
      fetchGame();
    }
  }, [currentPlayer.isHost, initializeGame, fetchGame]);

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
  };
};
