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
    setIsLoading(true);
    try {
      // Generate a unique 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .insert({
          code,
          host_id: hostId,
          status: 'waiting'
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      // Add host as first player
      const { error: playerError } = await supabase
        .from('lobby_players')
        .insert({
          lobby_id: lobbyData.id,
          player_id: hostId,
          player_name: hostName,
          is_host: true
        });

      if (playerError) throw playerError;

      setLobby(lobbyData);
      
      toast({
        title: "Lobby créé",
        description: `Code: ${code}`,
      });

      return { lobby: lobbyData, code };
    } catch (error) {
      console.error('Error creating lobby:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le lobby",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Join an existing lobby
  const joinLobby = useCallback(async (code: string, playerId: string, playerName: string) => {
    setIsLoading(true);
    try {
      // Find lobby by code
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('lobbies')
        .select()
        .eq('code', code.toUpperCase())
        .single();

      if (lobbyError) throw lobbyError;

      if (!lobbyData) {
        toast({
          title: "Erreur",
          description: "Lobby introuvable",
          variant: "destructive",
        });
        return null;
      }

      // Check if player already in lobby
      const { data: existingPlayer } = await supabase
        .from('lobby_players')
        .select()
        .eq('lobby_id', lobbyData.id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (!existingPlayer) {
        // Add player to lobby
        const { error: playerError } = await supabase
          .from('lobby_players')
          .insert({
            lobby_id: lobbyData.id,
            player_id: playerId,
            player_name: playerName,
            is_host: false
          });

        if (playerError) throw playerError;
      }

      setLobby(lobbyData);

      toast({
        title: "Connecté",
        description: "Vous avez rejoint le lobby",
      });

      return { lobby: lobbyData };
    } catch (error) {
      console.error('Error joining lobby:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre le lobby",
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
    if (!lobby) return;

    const newChannel = supabase
      .channel(`lobby:${lobby.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobby.id}`
        },
        async () => {
          // Fetch updated players list
          const { data } = await supabase
            .from('lobby_players')
            .select('*')
            .eq('lobby_id', lobby.id)
            .order('joined_at', { ascending: true });

          if (data) {
            setPlayers(
              data.map((p) => ({
                id: p.player_id,
                name: p.player_name,
                isHost: p.is_host,
              }))
            );
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    // Initial fetch
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('lobby_players')
        .select('*')
        .eq('lobby_id', lobby.id)
        .order('joined_at', { ascending: true });

      if (data) {
        setPlayers(
          data.map((p) => ({
            id: p.player_id,
            name: p.player_name,
            isHost: p.is_host,
          }))
        );
      }
    };

    fetchPlayers();

    return () => {
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
