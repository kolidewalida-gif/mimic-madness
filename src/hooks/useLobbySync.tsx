import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

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
}

export const useLobbySync = () => {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

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
    try {
      // Generate a unique 6-character code
      let code = '';
      let attempts = 0;
      let lobbyData = null;

      // Try up to 5 times to generate a unique code
      while (attempts < 5 && !lobbyData) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Check if code already exists
        const { data: existingLobby } = await supabase
          .from('lobbies')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (!existingLobby) {
          // Code is unique, create lobby
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
              // Duplicate key, try again
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

      // Add host as first player
      const { error: playerError } = await supabase
        .from('lobby_players')
        .insert({
          lobby_id: lobbyData.id,
          player_id: hostId,
          player_name: hostName.trim(),
          is_host: true
        });

      if (playerError) {
        // Rollback: delete the lobby
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
    try {
      const normalizedCode = code.trim().toUpperCase();
      
      // Find lobby by code
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

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

      // Check if lobby is full (max 8 players)
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

      // Check if player already in lobby
      const alreadyInLobby = existingPlayers?.some(p => p.player_id === playerId);

      if (!alreadyInLobby) {
        // Add player to lobby
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
      // Remove player from lobby
      await supabase
        .from('lobby_players')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('player_id', playerId);

      // If host leaves, delete the lobby
      if (lobby.host_id === playerId) {
        await supabase
          .from('lobbies')
          .delete()
          .eq('id', lobby.id);
      }

      setLobby(null);
      setPlayers([]);
      
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  }, [lobby, channel]);

  // Subscribe to lobby changes
  useEffect(() => {
    if (!lobby) {
      setPlayers([]);
      return;
    }

    let isSubscribed = true;

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
          console.log('Realtime event:', payload);
          // Refetch players on any change
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
  }, [lobby?.id]);

  return {
    lobby,
    players,
    isLoading,
    createLobby,
    joinLobby,
    leaveLobby,
  };
};
