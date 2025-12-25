import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Lobby {
  id: string;
  code: string;
  host_id: string;
  status: string;
  game_phase?: string;
}

interface UseLobbyResult {
  lobby: Lobby | null;
  players: Player[];
  isLoading: boolean;
  wasKicked: boolean;
  lobbyDeleted: boolean;
  createLobby: (hostId: string, hostName: string) => Promise<{ lobby: Lobby; code: string } | null>;
  joinLobby: (code: string, playerId: string, playerName: string) => Promise<{ lobby: Lobby } | null>;
  leaveLobby: (playerId: string) => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  updateLobbyStatus: (status: string) => Promise<void>;
  resetState: () => void;
}

export const useLobbySync = (): UseLobbyResult => {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [lobbyDeleted, setLobbyDeleted] = useState(false);
  const { toast } = useToast();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);

  // Reset state
  const resetState = useCallback(() => {
    setLobby(null);
    setPlayers([]);
    setWasKicked(false);
    setLobbyDeleted(false);
    currentPlayerIdRef.current = null;
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
    }
  }, [channel]);

  // Create a new lobby
  const createLobby = useCallback(async (hostId: string, hostName: string) => {
    if (!hostId || !hostName) {
      toast({
        title: "Erreur",
        description: "Informations manquantes",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    setWasKicked(false);
    setLobbyDeleted(false);
    currentPlayerIdRef.current = hostId;

    try {
      let code = '';
      let attempts = 0;
      let lobbyData = null;

      while (attempts < 5 && !lobbyData) {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const { data: existingLobby } = await supabase
          .from('lobbies')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (!existingLobby) {
          const { data, error: lobbyError } = await supabase
            .from('lobbies')
            .insert({
              code,
              host_id: hostId,
              status: 'waiting'
            })
            .select()
            .single();

          if (lobbyError) {
            if (lobbyError.code === '23505') {
              attempts++;
              continue;
            }
            throw lobbyError;
          }

          lobbyData = data;
        } else {
          attempts++;
        }
      }

      if (!lobbyData) {
        throw new Error('Impossible de générer un code unique');
      }

      const { error: playerError } = await supabase
        .from('lobby_players')
        .insert({
          lobby_id: lobbyData.id,
          player_id: hostId,
          player_name: hostName.trim(),
          is_host: true
        });

      if (playerError) {
        await supabase.from('lobbies').delete().eq('id', lobbyData.id);
        throw playerError;
      }

      setLobby(lobbyData);
      
      toast({
        title: "Lobby créé !",
        description: `Code du lobby: ${code}`,
      });

      return { lobby: lobbyData, code };
    } catch (error: any) {
      console.error('Error creating lobby:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lobby",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Join an existing lobby
  const joinLobby = useCallback(async (code: string, playerId: string, playerName: string) => {
    if (!code || !playerId || !playerName) {
      toast({
        title: "Erreur",
        description: "Informations manquantes",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    setWasKicked(false);
    setLobbyDeleted(false);
    currentPlayerIdRef.current = playerId;

    try {
      const normalizedCode = code.trim().toUpperCase();
      
      console.log('Attempting to join lobby with code:', normalizedCode);
      
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();
      
      console.log('Lobby lookup result:', { lobbyData, lobbyError });

      if (lobbyError) {
        console.error('Lobby lookup error:', lobbyError);
        throw new Error('Erreur lors de la recherche du lobby');
      }

      if (!lobbyData) {
        toast({
          title: "Lobby introuvable",
          description: `Le code "${normalizedCode}" ne correspond à aucun lobby`,
          variant: "destructive",
        });
        return null;
      }

      // Check if game already started
      if (lobbyData.status === 'playing' && lobbyData.game_phase !== 'lobby') {
        toast({
          title: "Partie en cours",
          description: "Cette partie a déjà commencé",
          variant: "destructive",
        });
        return null;
      }

      const { data: existingPlayers, error: countError } = await supabase
        .from('lobby_players')
        .select('player_id')
        .eq('lobby_id', lobbyData.id);

      if (countError) {
        console.error('Error counting players:', countError);
        throw new Error('Erreur lors de la vérification du lobby');
      }

      if (existingPlayers && existingPlayers.length >= 8) {
        toast({
          title: "Lobby complet",
          description: "Ce lobby a atteint le nombre maximum de joueurs",
          variant: "destructive",
        });
        return null;
      }

      const alreadyInLobby = existingPlayers?.some(p => p.player_id === playerId);

      if (!alreadyInLobby) {
        const { error: playerError } = await supabase
          .from('lobby_players')
          .insert({
            lobby_id: lobbyData.id,
            player_id: playerId,
            player_name: playerName.trim(),
            is_host: false
          });

        if (playerError) {
          console.error('Error adding player:', playerError);
          throw new Error('Impossible de rejoindre le lobby');
        }
      }

      setLobby(lobbyData);

      toast({
        title: "Connecté !",
        description: `Bienvenue dans le lobby ${normalizedCode}`,
      });

      return { lobby: lobbyData };
    } catch (error: any) {
      console.error('Error joining lobby:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre le lobby",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Leave lobby
  const leaveLobby = useCallback(async (playerId: string) => {
    if (!lobby) return;

    try {
      console.log('Player leaving lobby:', playerId);
      
      // Remove player from lobby
      await supabase
        .from('lobby_players')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('player_id', playerId);

      // If host leaves, delete the lobby
      if (lobby.host_id === playerId) {
        console.log('Host leaving, deleting lobby');
        await supabase
          .from('lobbies')
          .delete()
          .eq('id', lobby.id);
      }

      resetState();
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  }, [lobby, resetState]);

  // Kick a player (host only)
  const kickPlayer = useCallback(async (playerId: string) => {
    if (!lobby) return;

    try {
      console.log('Kicking player:', playerId);
      
      const { error } = await supabase
        .from('lobby_players')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('player_id', playerId);

      if (error) {
        console.error('Error kicking player:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'exclure ce joueur",
          variant: "destructive",
        });
        return;
      }

      playSoundEffect('leave', 0.4);
      toast({
        title: "Joueur exclu",
        description: "Le joueur a été exclu du lobby",
      });
    } catch (error) {
      console.error('Error kicking player:', error);
    }
  }, [lobby, toast]);

  // Update lobby status
  const updateLobbyStatus = useCallback(async (status: string) => {
    if (!lobby) return;

    try {
      console.log('Updating lobby status to:', status);
      await supabase
        .from('lobbies')
        .update({ status })
        .eq('id', lobby.id);
    } catch (error) {
      console.error('Error updating lobby status:', error);
    }
  }, [lobby]);

  // Subscribe to lobby changes
  useEffect(() => {
    if (!lobby) {
      setPlayers([]);
      return;
    }

    let isSubscribed = true;
    const currentPlayerId = currentPlayerIdRef.current;

    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('lobby_players')
          .select('*')
          .eq('lobby_id', lobby.id)
          .order('joined_at', { ascending: true });

        if (error) {
          console.error('Error fetching players:', error);
          return;
        }

        if (data && isSubscribed) {
          // Check if current player was removed (kicked)
          if (currentPlayerId) {
            const stillInLobby = data.some(p => p.player_id === currentPlayerId);
            if (!stillInLobby && players.length > 0) {
              console.log('Current player was kicked from lobby');
              setWasKicked(true);
              playSoundEffect('error', 0.5);
              return;
            }
          }

          setPlayers(
            data.map((p) => ({
              id: p.player_id,
              name: p.player_name,
              isHost: p.is_host,
            }))
          );
        }
      } catch (error) {
        console.error('Error in fetchPlayers:', error);
      }
    };

    const checkLobbyExists = async () => {
      const { data, error } = await supabase
        .from('lobbies')
        .select('id')
        .eq('id', lobby.id)
        .maybeSingle();

      if (error || !data) {
        console.log('Lobby was deleted');
        setLobbyDeleted(true);
        playSoundEffect('error', 0.5);
      }
    };

    // Initial fetch
    fetchPlayers();

    // Subscribe to realtime changes
    const newChannel = supabase
      .channel(`lobby:${lobby.id}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobby.id}`
        },
        (payload) => {
          console.log('Realtime player event:', payload);
          
          // Check if current player was deleted
          if (payload.eventType === 'DELETE' && currentPlayerId) {
            const oldData = payload.old as { player_id?: string };
            if (oldData?.player_id === currentPlayerId) {
              console.log('Current player was kicked');
              setWasKicked(true);
              playSoundEffect('error', 0.5);
              return;
            }
          }
          
          fetchPlayers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`
        },
        (payload) => {
          console.log('Lobby updated:', payload);
          if (payload.new && isSubscribed) {
            setLobby(payload.new as Lobby);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`
        },
        () => {
          console.log('Lobby was deleted');
          if (isSubscribed) {
            setLobbyDeleted(true);
            playSoundEffect('error', 0.5);
          }
        }
      )
      .subscribe((status) => {
        console.log('Channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to lobby:', lobby.id);
        }
      });

    setChannel(newChannel);

    return () => {
      isSubscribed = false;
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [lobby?.id, players.length]);

  return {
    lobby,
    players,
    isLoading,
    wasKicked,
    lobbyDeleted,
    createLobby,
    joinLobby,
    leaveLobby,
    kickPlayer,
    updateLobbyStatus,
    resetState,
  };
};