import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import {
  canCommitSyncToken,
  deriveConnectionState,
  equalJitterBackoff,
  shouldReportSyncing,
  type SnapshotState,
  type TransportState,
} from '@/lib/syncState';
import { setLobbyPlayerConnection } from '@/lib/imitationSyncClient';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

type LobbyConnectionState = 'online' | 'offline' | 'reconnecting';

interface Lobby {
  id: string;
  code: string;
  host_id: string;
  status: string;
  game_phase?: string;
  game_mode?: string;
}

interface UseLobbyResult {
  lobby: Lobby | null;
  players: Player[];
  isLoading: boolean;
  wasKicked: boolean;
  lobbyDeleted: boolean;
  connectionState: LobbyConnectionState;
  retryConnection: () => void;
  createLobby: (hostId: string, hostName: string) => Promise<{ lobby: Lobby; code: string } | null>;
  joinLobby: (code: string, playerId: string, playerName: string) => Promise<{ lobby: Lobby } | null>;
  leaveLobby: (playerId: string) => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  updateLobbyStatus: (status: string) => Promise<void>;
  resetState: () => void;
}

const RECONNECTION_TIMEOUT = 60000;
const HEARTBEAT_INTERVAL = 15000; // 15s (was 3s — caused realtime spam)
const HOST_MIGRATION_GRACE = 10000;
/**
 * A lobby snapshot read that exceeds this is treated as a failure and retried.
 *
 * Volontairement généreux : dans l'aperçu Lovable (iframe) les requêtes vers
 * Supabase sont bridées par le navigateur, et ces deux SELECT atteignaient bien
 * le serveur — c'est le client qui abandonnait trop tôt, ce qui affichait
 * « Reconnexion… » alors que la partie fonctionnait.
 */
const SNAPSHOT_READ_TIMEOUT_MS = 20000;

export const useLobbySync = (): UseLobbyResult => {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [lobbyDeleted, setLobbyDeleted] = useState(false);
  const [connectionState, setConnectionState] = useState<LobbyConnectionState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  );
  const [connectionGeneration, setConnectionGeneration] = useState(0);
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
  /** Pending automatic re-subscribe, and how many have been tried in a row. */
  const resubscribeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptsRef = useRef(0);
  const transportStateRef = useRef<TransportState>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting',
  );
  const snapshotStateRef = useRef<SnapshotState>('idle');
  /** Only a player already seen in a snapshot can be reported as kicked. */
  const hasSeenSelfRef = useRef(false);

  const updateSyncState = useCallback((
    transport?: TransportState,
    snapshot?: SnapshotState,
  ) => {
    if (transport) transportStateRef.current = transport;
    if (snapshot) snapshotStateRef.current = snapshot;
    setConnectionState(deriveConnectionState(
      transportStateRef.current,
      snapshotStateRef.current,
    ));
  }, []);

  useEffect(() => { lobbyRef.current = lobby; }, [lobby]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Reset state
  const resetState = useCallback(() => {
    setLobby(null);
    setPlayers([]);
    setWasKicked(false);
    setLobbyDeleted(false);
    const transport: TransportState =
      typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting';
    transportStateRef.current = transport;
    snapshotStateRef.current = 'idle';
    setConnectionState(deriveConnectionState(transport, 'idle'));
    currentPlayerIdRef.current = null;
    hasSeenSelfRef.current = false;
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, [channel]);

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
        description: "Impossible de créer le lobby. Vérifie ta connexion et réessaie.",
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
        description: "Impossible de rejoindre le lobby. Vérifie le code et réessaie.",
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

  const retryConnection = useCallback(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateSyncState('offline', 'idle');
      return;
    }
    // Drop any pending backoff and go now: the player asked explicitly, and
    // waiting out a 15 s timer would look like the button did nothing.
    if (resubscribeTimerRef.current) {
      clearTimeout(resubscribeTimerRef.current);
      resubscribeTimerRef.current = null;
    }
    retryAttemptsRef.current = 0;
    updateSyncState('connecting', 'syncing');
    setConnectionGeneration((generation) => generation + 1);
  }, [updateSyncState]);

  // Subscribe to lobby changes — keyed on lobby.id so the channel
  // is created once per lobby and not torn down on every player change.
  useEffect(() => {
    if (!lobby?.id) {
      setPlayers([]);
      return;
    }

    let isSubscribed = true;
    const lobbyId = lobby.id;
    const generation = connectionGeneration;
    let latestSnapshotRequest = 0;
    let channelEpoch = 0;
    let channelSubscribed = false;
    let presenceSynchronized = false;
    let snapshotRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let snapshotRetryAttempt = 0;
    hasSeenSelfRef.current = false;

    /**
     * Rebuild the channel after a failure, with a backoff.
     *
     * Bumping the generation re-runs this effect, which tears the dead channel
     * down and subscribes a fresh one. Capped delay so a long outage keeps
     * retrying quietly instead of hammering the server.
     */
    const scheduleResubscribe = () => {
      if (!isSubscribed || resubscribeTimerRef.current) return;
      const attempt = retryAttemptsRef.current;
      retryAttemptsRef.current = Math.min(attempt + 1, 8);
      const delay = equalJitterBackoff(attempt, 1_000, 15_000);

      resubscribeTimerRef.current = setTimeout(() => {
        resubscribeTimerRef.current = null;
        if (!isSubscribed) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          updateSyncState('offline', 'idle');
          return;
        }
        setConnectionGeneration((current) => current + 1);
      }, delay);
    };

    const clearSnapshotRetry = () => {
      if (!snapshotRetryTimer) return;
      clearTimeout(snapshotRetryTimer);
      snapshotRetryTimer = null;
    };

    const scheduleSnapshotRetry = () => {
      if (!isSubscribed || !channelSubscribed || snapshotRetryTimer) return;
      const delay = equalJitterBackoff(snapshotRetryAttempt, 1_000, 15_000);
      snapshotRetryAttempt = Math.min(snapshotRetryAttempt + 1, 8);
      snapshotRetryTimer = setTimeout(() => {
        snapshotRetryTimer = null;
        if (isSubscribed && channelSubscribed) void requestLobbySnapshot('retry');
      }, delay);
    };

    const withSnapshotTimeout = <T,>(operation: PromiseLike<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('La lecture du salon a expiré.')),
          SNAPSHOT_READ_TIMEOUT_MS,
        );
        Promise.resolve(operation).then(
          (value) => { clearTimeout(timer); resolve(value); },
          (error: unknown) => { clearTimeout(timer); reject(error); },
        );
      });

    async function requestLobbySnapshot(reason: string) {
      if (!isSubscribed || !channelSubscribed) return;
      const requestId = ++latestSnapshotRequest;
      const requestEpoch = channelEpoch;
      const token = { generation, requestId };
      const canCommit = () =>
        isSubscribed &&
        channelSubscribed &&
        requestEpoch === channelEpoch &&
        canCommitSyncToken(token, generation, latestSnapshotRequest);

      // Une relecture de fond garde l'affichage « en ligne » : sans ce garde,
      // chaque battement de cœur et chaque signal realtime faisait clignoter
      // « Reconnexion… » alors que rien n'était cassé.
      if (shouldReportSyncing(snapshotStateRef.current, lobbyRef.current !== null)) {
        updateSyncState('connected', 'syncing');
      } else {
        updateSyncState('connected');
      }
      try {
        // Bound the reads. The Supabase client has no timeout, so when the
        // project is slow (waking from pause, Cloudflare edge issues in an
        // iframe) these selects hang and the state is stuck on "syncing" —
        // "Reconnexion…" forever — even though the realtime socket is up. A
        // timeout turns that into a retryable error instead of a dead screen.
        const [lobbyResult, playersResult] = await withSnapshotTimeout(
          Promise.all([
            supabase.from('lobbies').select('*').eq('id', lobbyId).maybeSingle(),
            supabase
              .from('lobby_players')
              .select('*')
              .eq('lobby_id', lobbyId)
              .order('joined_at', { ascending: true }),
          ]),
        );

        if (lobbyResult.error) throw lobbyResult.error;
        if (playersResult.error) throw playersResult.error;
        if (!canCommit()) return;

        const lobbySnapshot = lobbyResult.data as Lobby | null;
        if (!lobbySnapshot) {
          setLobbyDeleted(true);
          updateSyncState('connected', 'synchronized');
          playSoundEffect('error', 0.5);
          return;
        }

        const rows = playersResult.data ?? [];
        const currentPlayerId = currentPlayerIdRef.current;
        const selfPresent = currentPlayerId
          ? rows.some((row) => row.player_id === currentPlayerId)
          : false;

        if (selfPresent) hasSeenSelfRef.current = true;
        // Absence only means "kicked" once this client has actually been seen
        // in the lobby: a join still committing must not eject the player.
        else if (currentPlayerId && hasSeenSelfRef.current) {
          setWasKicked(true);
          updateSyncState('connected', 'synchronized');
          playSoundEffect('error', 0.5);
          return;
        }

        const now = Date.now();
        const playerSnapshot = rows.map((row) => {
          const disconnectedAt = row.disconnected_at
            ? new Date(row.disconnected_at).getTime()
            : null;
          const disconnectedTimeLeft =
            row.connection_status === 'disconnected' && disconnectedAt !== null
              ? Math.max(0, Math.ceil((RECONNECTION_TIMEOUT - (now - disconnectedAt)) / 1000))
              : 0;
          return {
            id: row.player_id,
            name: row.player_name,
            // `lobbies.host_id` is the sole authority; is_host is a legacy mirror.
            isHost: row.player_id === lobbySnapshot.host_id,
            isDisconnected: disconnectedTimeLeft > 0,
            disconnectedTimeLeft,
          } satisfies Player;
        }).filter((player) => !player.isDisconnected || (player.disconnectedTimeLeft ?? 0) > 0);

        const previousHostId = lobbyRef.current?.host_id;
        setLobby(lobbySnapshot);
        setPlayers(playerSnapshot);
        setLobbyDeleted(false);
        setWasKicked(false);
        clearSnapshotRetry();
        snapshotRetryAttempt = 0;
        retryAttemptsRef.current = 0;
        updateSyncState('connected', 'synchronized');

        if (previousHostId && previousHostId !== lobbySnapshot.host_id) {
          const newHost = playerSnapshot.find((player) => player.id === lobbySnapshot.host_id);
          if (newHost?.id === currentPlayerId) {
            playSoundEffect('success', 0.5);
            toastRef.current({
              title: "Vous êtes l'hôte !",
              description: "L'ancien hôte vous a transféré les droits",
            });
          } else if (newHost) {
            toastRef.current({
              title: 'Nouvel hôte',
              description: `${newHost.name} est maintenant l'hôte`,
            });
          }
        }
      } catch (error) {
        if (!canCommit()) return;
        console.error(`[lobby-sync] snapshot ${reason} failed:`, error);
        updateSyncState('connected', 'error');
        scheduleSnapshotRetry();
      }
    }

    // Inline heartbeat helpers using refs (avoid stale closures + re-subscriptions)
    const beatConnected = async () => {
      const pid = currentPlayerIdRef.current;
      if (!pid) return;
      try {
        await setLobbyPlayerConnection(lobbyId, pid, true);
      } catch (e) { console.error('heartbeat connected error', e); }
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
      if (
        !lob ||
        !me ||
        !presenceSynchronized ||
        transportStateRef.current !== 'connected' ||
        snapshotStateRef.current !== 'synchronized'
      ) return;
      const list = playersRef.current;
      const host = list.find((player) => player.id === lob.host_id);
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
        const { data: migratedLobby, error: lobbyErr } = await supabase
          .from('lobbies')
          .update({ host_id: me })
          .eq('id', lobbyId)
          .eq('host_id', host.id)
          .select('host_id')
          .maybeSingle();
        if (lobbyErr || !migratedLobby) return;

        const { error: clearHostError } = await supabase
          .from('lobby_players')
          .update({ is_host: false })
          .eq('lobby_id', lobbyId)
          .eq('is_host', true);
        if (clearHostError) throw clearHostError;

        const { error: setHostError } = await supabase
          .from('lobby_players')
          .update({ is_host: true })
          .eq('lobby_id', lobbyId)
          .eq('player_id', me);
        if (setHostError) throw setHostError;
        void requestLobbySnapshot('host-migration');
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
      if (!navigator.onLine) {
        updateSyncState('offline', 'idle');
        return;
      }
      void beatConnected();
      void cleanupExpired();
      void requestLobbySnapshot('heartbeat');

      const lob = lobbyRef.current;
      const host = playersRef.current.find((player) => player.id === lob?.host_id);
      if (lob && host && presenceSynchronized) {
        const hostOnline = onlinePresenceRef.current.has(host.id) && !host.isDisconnected;
        if (!hostOnline) scheduleHostMigration();
        else cancelHostMigration();
      }
    }, HEARTBEAT_INTERVAL);

    const resync = () => {
      if (!navigator.onLine) {
        latestSnapshotRequest += 1;
        updateSyncState('offline', 'idle');
        return;
      }
      void beatConnected();
      if (channelSubscribed) {
        void requestLobbySnapshot('browser-resume');
      } else {
        updateSyncState('connecting', 'syncing');
        setConnectionGeneration((current) => current + 1);
      }
    };

    // Backgrounding a tab or closing one of several tabs is not a disconnect.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') resync();
    };
    const handleOnline = () => resync();
    const handleOffline = () => {
      latestSnapshotRequest += 1;
      presenceSynchronized = false;
      cancelHostMigration();
      updateSyncState('offline', 'idle');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateSyncState(navigator.onLine ? 'connecting' : 'offline', 'idle');

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
        presenceSynchronized = true;
        // Mark presence-based disconnects (faster than DB heartbeat)
        const list = playersRef.current;
        list.forEach(p => {
          const presentOnSocket = ids.has(p.id);
          if (!presentOnSocket && !p.isDisconnected && p.id !== currentPlayerIdRef.current) {
            // Presence key keeps all metas for the same player; this runs only
            // after the last tab/socket has disappeared.
            void setLobbyPlayerConnection(lobbyId, p.id, false).catch((error) => {
              console.error('presence disconnect error', error);
            });
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
          console.log('Realtime player signal:', payload.eventType);
          void requestLobbySnapshot('player-signal');
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
          console.log('Realtime lobby signal:', payload.eventType);
          void requestLobbySnapshot('lobby-signal');
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
          console.log('Realtime lobby delete signal');
          void requestLobbySnapshot('lobby-delete-signal');
        }
      )
      .subscribe((status) => {
        console.log('Channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to lobby:', lobbyId);
          channelSubscribed = true;
          channelEpoch += 1;
          updateSyncState('connected', 'syncing');
          void beatConnected();
          void requestLobbySnapshot('subscribed');

          const me = currentPlayerIdRef.current;
          if (me) {
            void newChannel.track({ player_id: me, at: new Date().toISOString() });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          channelSubscribed = false;
          channelEpoch += 1;
          latestSnapshotRequest += 1;
          presenceSynchronized = false;
          clearSnapshotRetry();
          cancelHostMigration();
          updateSyncState(navigator.onLine ? 'connecting' : 'offline', 'idle');
          scheduleResubscribe();
        }
      });

    setChannel(newChannel);

    return () => {
      isSubscribed = false;
      channelSubscribed = false;
      channelEpoch += 1;
      latestSnapshotRequest += 1;
      presenceSynchronized = false;
      clearSnapshotRetry();
      cancelHostMigration();
      if (resubscribeTimerRef.current) {
        clearTimeout(resubscribeTimerRef.current);
        resubscribeTimerRef.current = null;
      }
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionGeneration, lobby?.id, updateSyncState]);

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
    connectionState,
    retryConnection,
    createLobby,
    joinLobby,
    leaveLobby,
    kickPlayer,
    transferHost,
    updateLobbyStatus,
    resetState,
  };
};