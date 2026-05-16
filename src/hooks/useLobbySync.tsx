import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
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
  transferHost: (newHostId: string) => Promise<void>;
  updateLobbyStatus: (status: string) => Promise<void>;
  resetState: () => void;
}

const RECONNECTION_TIMEOUT = 30000; // 30 seconds before disconnected players are removed
const HEARTBEAT_INTERVAL = 3000; // 3 seconds heartbeat tick
const HOST_MIGRATION_GRACE = 8000; // wait 8s before promoting a new host

export const useLobbySync = (): UseLobbyResult => {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [lobbyDeleted, setLobbyDeleted] = useState(false);
  const { toast } = useToast();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lobbyRef = useRef<Lobby | null>(null);
  const playersRef = useRef<Player[]>([]);
  const toastRef = useRef(toast);
  const prevPlayerIdsRef = useRef<Set<string>>(new Set());
  const prevDisconnectedRef = useRef<Set<string>>(new Set());
  const onlinePresenceRef = useRef<Set<string>>(new Set());
  const hostMigrationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { lobbyRef.current = lobby; }, [lobby]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { toastRef.current = toast; }, [toast]);

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
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, [channel]);

  // Mark player as connected (heartbeat)
  const markConnected = useCallback(async () => {
    if (!lobby || !currentPlayerIdRef.current) return;

    try {
      await supabase
        .from('lobby_players')
        .update({ 
          connection_status: 'connected',
          disconnected_at: null 
        })
        .eq('lobby_id', lobby.id)
        .eq('player_id', currentPlayerIdRef.current);
    } catch (error) {
      console.error('Error marking player as connected:', error);
    }
  }, [lobby]);

  // Mark player as disconnected
  const markDisconnected = useCallback(async () => {
    if (!lobby || !currentPlayerIdRef.current) return;

    try {
      await supabase
        .from('lobby_players')
        .update({ 
          connection_status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq('lobby_id', lobby.id)
        .eq('player_id', currentPlayerIdRef.current);
    } catch (error) {
      console.error('Error marking player as disconnected:', error);
    }
  }, [lobby]);

  // Transfer host to another player
  const transferHost = useCallback(async (newHostId: string) => {
    if (!lobby) return;

    try {
      console.log('Transferring host to:', newHostId);
      
      // Get the new host's name
      const newHost = players.find(p => p.id === newHostId);
      if (!newHost) {
        toast({
          title: "Erreur",
          description: "Joueur introuvable",
          variant: "destructive",
        });
        return;
      }

      // Update lobby host_id
      const { error: lobbyError } = await supabase
        .from('lobbies')
        .update({ host_id: newHostId })
        .eq('id', lobby.id);

      if (lobbyError) throw lobbyError;

      // Update old host's is_host to false
      await supabase
        .from('lobby_players')
        .update({ is_host: false })
        .eq('lobby_id', lobby.id)
        .eq('is_host', true);

      // Update new host's is_host to true
      const { error: playerError } = await supabase
        .from('lobby_players')
        .update({ is_host: true })
        .eq('lobby_id', lobby.id)
        .eq('player_id', newHostId);

      if (playerError) throw playerError;

      playSoundEffect('success', 0.5);
      toast({
        title: "Hôte transféré",
        description: `${newHost.name} est maintenant l'hôte`,
      });
    } catch (error) {
      console.error('Error transferring host:', error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer l'hôte",
        variant: "destructive",
      });
    }
  }, [lobby, players, toast]);

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
          is_host: true,
          connection_status: 'connected'
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

      const { data: existingPlayers, error: countError } = await supabase
        .from('lobby_players')
        .select('player_id, connection_status, disconnected_at')
        .eq('lobby_id', lobbyData.id);

      if (countError) {
        console.error('Error counting players:', countError);
        throw new Error('Erreur lors de la vérification du lobby');
      }

      // Count only connected players
      const connectedPlayers = existingPlayers?.filter(p => 
        p.connection_status === 'connected' || !p.disconnected_at
      ) || [];

      if (connectedPlayers.length >= 8) {
        toast({
          title: "Lobby complet",
          description: "Ce lobby a atteint le nombre maximum de joueurs",
          variant: "destructive",
        });
        return null;
      }

      const existingPlayer = existingPlayers?.find(p => p.player_id === playerId);

      if (existingPlayer) {
        // Player exists, update their connection status (reconnecting)
        await supabase
          .from('lobby_players')
          .update({ 
            connection_status: 'connected',
            disconnected_at: null 
          })
          .eq('lobby_id', lobbyData.id)
          .eq('player_id', playerId);
        
        playSoundEffect('success', 0.5);
        toast({
          title: "Reconnecté !",
          description: "Bienvenue de retour dans le lobby",
        });
      } else {
        // Check if game already started (only for new players)
        if (lobbyData.status === 'playing' && lobbyData.game_phase !== 'lobby') {
          toast({
            title: "Partie en cours",
            description: "Cette partie a déjà commencé",
            variant: "destructive",
          });
          return null;
        }

        const { error: playerError } = await supabase
          .from('lobby_players')
          .insert({
            lobby_id: lobbyData.id,
            player_id: playerId,
            player_name: playerName.trim(),
            is_host: false,
            connection_status: 'connected'
          });

        if (playerError) {
          console.error('Error adding player:', playerError);
          throw new Error('Impossible de rejoindre le lobby');
        }

        toast({
          title: "Connecté !",
          description: `Bienvenue dans le lobby ${normalizedCode}`,
        });
      }

      setLobby(lobbyData);
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
      
      // Check if player is host
      const isLeavingHost = lobby.host_id === playerId;
      
      if (isLeavingHost) {
        // Find another player to transfer host to
        const otherPlayers = players.filter(p => p.id !== playerId && !p.isDisconnected);
        
        if (otherPlayers.length > 0) {
          // Transfer host to first available player
          const newHost = otherPlayers[0];
          console.log('Transferring host to:', newHost.name);
          
          // Update lobby host_id
          await supabase
            .from('lobbies')
            .update({ host_id: newHost.id })
            .eq('id', lobby.id);

          // Update new host's is_host to true
          await supabase
            .from('lobby_players')
            .update({ is_host: true })
            .eq('lobby_id', lobby.id)
            .eq('player_id', newHost.id);
        } else {
          // No other players, delete the lobby
          console.log('No other players, deleting lobby');
          await supabase
            .from('lobbies')
            .delete()
            .eq('id', lobby.id);
        }
      }

      // Remove player from lobby
      await supabase
        .from('lobby_players')
        .delete()
        .eq('lobby_id', lobby.id)
        .eq('player_id', playerId);

      resetState();
    } catch (error) {
      console.error('Error leaving lobby:', error);
    }
  }, [lobby, players, resetState]);

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

  // Cleanup disconnected players after timeout
  const cleanupDisconnectedPlayers = useCallback(async () => {
    if (!lobby) return;

    try {
      const cutoffTime = new Date(Date.now() - RECONNECTION_TIMEOUT).toISOString();
      
      // Get players to remove
      const { data: expiredPlayers } = await supabase
        .from('lobby_players')
        .select('player_id, player_name')
        .eq('lobby_id', lobby.id)
        .eq('connection_status', 'disconnected')
        .lt('disconnected_at', cutoffTime);

      if (expiredPlayers && expiredPlayers.length > 0) {
        // Remove expired disconnected players
        await supabase
          .from('lobby_players')
          .delete()
          .eq('lobby_id', lobby.id)
          .eq('connection_status', 'disconnected')
          .lt('disconnected_at', cutoffTime);

        expiredPlayers.forEach(p => {
          console.log(`Removed disconnected player: ${p.player_name}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning up disconnected players:', error);
    }
  }, [lobby]);

  // Subscribe to lobby changes — keyed only on lobby.id so the channel
  // is created once per lobby and not torn down on every player change.
  useEffect(() => {
    if (!lobby?.id) {
      setPlayers([]);
      return;
    }

    let isSubscribed = true;
    const lobbyId = lobby.id;

    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('lobby_players')
          .select('*')
          .eq('lobby_id', lobbyId)
          .order('joined_at', { ascending: true });

        if (error) {
          console.error('Error fetching players:', error);
          return;
        }

        if (data && isSubscribed) {
          const currentPlayerId = currentPlayerIdRef.current;
          // Check if current player was removed (kicked)
          if (currentPlayerId) {
            const stillInLobby = data.some(p => p.player_id === currentPlayerId);
            if (!stillInLobby && playersRef.current.length > 0) {
              console.log('Current player was kicked from lobby');
              setWasKicked(true);
              playSoundEffect('error', 0.5);
              return;
            }
          }

          const now = Date.now();
          setPlayers(
            data.map((p) => {
              const isDisconnected = p.connection_status === 'disconnected' && p.disconnected_at;
              let disconnectedTimeLeft = 0;
              
              if (isDisconnected && p.disconnected_at) {
                const disconnectedTime = new Date(p.disconnected_at).getTime();
                const elapsed = now - disconnectedTime;
                disconnectedTimeLeft = Math.max(0, Math.ceil((RECONNECTION_TIMEOUT - elapsed) / 1000));
              }

              return {
                id: p.player_id,
                name: p.player_name,
                isHost: p.is_host,
                isDisconnected: isDisconnected && disconnectedTimeLeft > 0,
                disconnectedTimeLeft,
              };
            }).filter(p => !p.isDisconnected || p.disconnectedTimeLeft! > 0)
          );
        }
      } catch (error) {
        console.error('Error in fetchPlayers:', error);
      }
    };

    // Initial fetch
    fetchPlayers();

    // Inline heartbeat helpers using refs (avoid stale closures + re-subscriptions)
    const beatConnected = async () => {
      const pid = currentPlayerIdRef.current;
      if (!pid) return;
      try {
        await supabase
          .from('lobby_players')
          .update({ connection_status: 'connected', disconnected_at: null })
          .eq('lobby_id', lobbyId)
          .eq('player_id', pid);
      } catch (e) { console.error('heartbeat connected error', e); }
    };
    const beatDisconnected = async () => {
      const pid = currentPlayerIdRef.current;
      if (!pid) return;
      try {
        await supabase
          .from('lobby_players')
          .update({ connection_status: 'disconnected', disconnected_at: new Date().toISOString() })
          .eq('lobby_id', lobbyId)
          .eq('player_id', pid);
      } catch (e) { console.error('heartbeat disconnected error', e); }
    };
    const cleanupExpired = async () => {
      try {
        const cutoff = new Date(Date.now() - RECONNECTION_TIMEOUT).toISOString();
        await supabase
          .from('lobby_players')
          .delete()
          .eq('lobby_id', lobbyId)
          .eq('connection_status', 'disconnected')
          .lt('disconnected_at', cutoff);
      } catch (e) { console.error('cleanup error', e); }
    };

    // Auto host migration: if current host is offline > grace period,
    // the player with the smallest (alphabetical) player_id among the
    // connected ones promotes themselves. Deterministic, no race.
    const maybeMigrateHost = async () => {
      const lob = lobbyRef.current;
      const me = currentPlayerIdRef.current;
      if (!lob || !me) return;
      const list = playersRef.current;
      const host = list.find(p => p.isHost);
      if (!host) return;
      const hostOnline = onlinePresenceRef.current.has(host.id) && !host.isDisconnected;
      if (hostOnline) return;
      const connected = list
        .filter(p => !p.isDisconnected && onlinePresenceRef.current.has(p.id))
        .map(p => p.id)
        .sort();
      if (connected.length === 0) return;
      const elected = connected[0];
      if (elected !== me) return; // only the elected player performs the update
      try {
        const { error: lobbyErr } = await supabase
          .from('lobbies')
          .update({ host_id: me })
          .eq('id', lobbyId)
          .eq('host_id', host.id); // optimistic: only if host hasn't changed already
        if (lobbyErr) return;
        await supabase
          .from('lobby_players')
          .update({ is_host: false })
          .eq('lobby_id', lobbyId)
          .eq('is_host', true);
        await supabase
          .from('lobby_players')
          .update({ is_host: true })
          .eq('lobby_id', lobbyId)
          .eq('player_id', me);
      } catch (e) {
        console.error('host migration failed', e);
      }
    };

    const scheduleHostMigration = () => {
      if (hostMigrationTimerRef.current) return;
      hostMigrationTimerRef.current = setTimeout(() => {
        hostMigrationTimerRef.current = null;
        maybeMigrateHost();
      }, HOST_MIGRATION_GRACE);
    };
    const cancelHostMigration = () => {
      if (hostMigrationTimerRef.current) {
        clearTimeout(hostMigrationTimerRef.current);
        hostMigrationTimerRef.current = null;
      }
    };

    // Set up heartbeat
    heartbeatRef.current = setInterval(() => {
      beatConnected();
      cleanupExpired();
      fetchPlayers();
      // Re-evaluate host migration each tick
      const lob = lobbyRef.current;
      const host = playersRef.current.find(p => p.isHost);
      if (lob && host) {
        const hostOnline = onlinePresenceRef.current.has(host.id) && !host.isDisconnected;
        if (!hostOnline) scheduleHostMigration();
        else cancelHostMigration();
      }
    }, HEARTBEAT_INTERVAL);

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        beatDisconnected();
      } else {
        beatConnected();
      }
    };

    const handleBeforeUnload = () => {
      beatDisconnected();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Subscribe to realtime changes
    const newChannel = supabase
      .channel(`lobby:${lobbyId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentPlayerIdRef.current ?? `anon-${Math.random()}` },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        onlinePresenceRef.current = ids;
        // Mark presence-based disconnects (faster than DB heartbeat)
        const list = playersRef.current;
        list.forEach(p => {
          const presentOnSocket = ids.has(p.id);
          if (!presentOnSocket && !p.isDisconnected && p.id !== currentPlayerIdRef.current) {
            // Soft mark in DB so other clients converge — fire & forget
            supabase
              .from('lobby_players')
              .update({
                connection_status: 'disconnected',
                disconnected_at: new Date().toISOString(),
              })
              .eq('lobby_id', lobbyId)
              .eq('player_id', p.id)
              .eq('connection_status', 'connected')
              .then(() => {});
          }
        });
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobbyId}`
        },
        (payload) => {
          console.log('Realtime player event:', payload);
          const currentPlayerId = currentPlayerIdRef.current;
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
          filter: `id=eq.${lobbyId}`
        },
        (payload) => {
          console.log('Lobby updated:', payload);
          if (payload.new && isSubscribed) {
            const newLobby = payload.new as Lobby;
            const prevHostId = lobbyRef.current?.host_id;
            setLobby(newLobby);
            // Check if host changed
            if (prevHostId && newLobby.host_id !== prevHostId) {
              const currentPlayerId = currentPlayerIdRef.current;
              const newHost = playersRef.current.find(p => p.id === newLobby.host_id);
              if (newHost && newLobby.host_id === currentPlayerId) {
                playSoundEffect('success', 0.5);
                toastRef.current({
                  title: "Vous êtes l'hôte !",
                  description: "L'ancien hôte vous a transféré les droits",
                });
              } else if (newHost) {
                toastRef.current({
                  title: "Nouvel hôte",
                  description: `${newHost.name} est maintenant l'hôte`,
                });
              }
              fetchPlayers();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`
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
          console.log('Successfully subscribed to lobby:', lobbyId);
          // Announce ourselves on the presence layer
          const me = currentPlayerIdRef.current;
          if (me) {
            newChannel.track({ player_id: me, at: new Date().toISOString() });
          }
        }
      });

    setChannel(newChannel);

    return () => {
      isSubscribed = false;
      cancelHostMigration();
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lobby?.id]);

  // Diff players list → emit toasts for join / leave / disconnect / reconnect
  useEffect(() => {
    const me = currentPlayerIdRef.current;
    const currentIds = new Set(players.map(p => p.id));
    const currentDisc = new Set(players.filter(p => p.isDisconnected).map(p => p.id));
    const prevIds = prevPlayerIdsRef.current;
    const prevDisc = prevDisconnectedRef.current;

    if (prevIds.size > 0) {
      // Joined
      players.forEach(p => {
        if (!prevIds.has(p.id) && p.id !== me) {
          toastRef.current({
            title: 'Joueur rejoint',
            description: `${p.name} a rejoint le lobby`,
          });
        }
      });
      // Left (was present, no longer in list and wasn't disconnected)
      prevIds.forEach(id => {
        if (!currentIds.has(id) && id !== me) {
          const prevPlayer = playersRef.current.find(p => p.id === id);
          const name = prevPlayer?.name ?? 'Un joueur';
          toastRef.current({
            title: 'Joueur parti',
            description: `${name} a quitté la partie`,
          });
        }
      });
      // Disconnected (new)
      currentDisc.forEach(id => {
        if (!prevDisc.has(id) && id !== me) {
          const p = players.find(x => x.id === id);
          if (p) {
            toastRef.current({
              title: 'Connexion perdue',
              description: `${p.name} s'est déconnecté`,
              variant: 'destructive',
            });
          }
        }
      });
      // Reconnected
      prevDisc.forEach(id => {
        if (currentIds.has(id) && !currentDisc.has(id) && id !== me) {
          const p = players.find(x => x.id === id);
          if (p) {
            toastRef.current({
              title: 'Reconnecté',
              description: `${p.name} est de retour`,
            });
          }
        }
      });
    }

    prevPlayerIdsRef.current = currentIds;
    prevDisconnectedRef.current = currentDisc;
  }, [players]);

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
    transferHost,
    updateLobbyStatus,
    resetState,
  };
};