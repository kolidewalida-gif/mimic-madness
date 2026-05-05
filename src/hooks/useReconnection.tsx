import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playSoundEffect } from '@/hooks/useSoundEffects';

const RECONNECTION_TIMEOUT = 60000; // 60 seconds

interface UseReconnectionProps {
  lobbyId: string | null;
  playerId: string | null;
  playerName: string | null;
  onReconnected: () => void;
  onTimeout: () => void;
}

interface DisconnectedPlayer {
  player_id: string;
  player_name: string;
  disconnected_at: string;
  timeLeft: number;
}

export const useReconnection = ({
  lobbyId,
  playerId,
  playerName,
  onReconnected,
  onTimeout,
}: UseReconnectionProps) => {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectTimeLeft, setReconnectTimeLeft] = useState(0);
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<DisconnectedPlayer[]>([]);
  const { toast } = useToast();
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Mark player as connected
  const markConnected = useCallback(async () => {
    if (!lobbyId || !playerId) return;

    try {
      await supabase
        .from('lobby_players')
        .update({ 
          connection_status: 'connected',
          disconnected_at: null 
        })
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId);
    } catch (error) {
      console.error('Error marking player as connected:', error);
    }
  }, [lobbyId, playerId]);

  // Mark player as disconnected
  const markDisconnected = useCallback(async () => {
    if (!lobbyId || !playerId) return;

    try {
      await supabase
        .from('lobby_players')
        .update({ 
          connection_status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId);
    } catch (error) {
      console.error('Error marking player as disconnected:', error);
    }
  }, [lobbyId, playerId]);

  // Attempt to reconnect
  const attemptReconnect = useCallback(async (code: string) => {
    if (!playerId || !playerName) return false;

    setIsReconnecting(true);
    
    try {
      // Check if player still exists in lobby (not kicked, just disconnected)
      const { data: existingPlayer } = await supabase
        .from('lobby_players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existingPlayer) {
        // Player was marked disconnected, reconnect them
        await markConnected();
        playSoundEffect('join', 0.5);
        toast({
          title: "Reconnecté !",
          description: "Vous avez rejoint la partie avec succès",
        });
        onReconnected();
        setIsReconnecting(false);
        return true;
      }

      // Player was removed, check if reconnection window is still open
      const { data: lobby } = await supabase
        .from('lobbies')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (lobby && lobby.status !== 'ended') {
        // Rejoin the lobby
        const { error } = await supabase
          .from('lobby_players')
          .insert({
            lobby_id: lobby.id,
            player_id: playerId,
            player_name: playerName,
            is_host: false,
            connection_status: 'connected'
          });

        if (!error) {
          playSoundEffect('join', 0.5);
          toast({
            title: "Reconnecté !",
            description: "Vous avez rejoint la partie avec succès",
          });
          onReconnected();
          setIsReconnecting(false);
          return true;
        }
      }

      setIsReconnecting(false);
      return false;
    } catch (error) {
      console.error('Reconnection failed:', error);
      setIsReconnecting(false);
      return false;
    }
  }, [lobbyId, playerId, playerName, markConnected, toast, onReconnected]);

  // Start reconnection countdown
  const startReconnectionCountdown = useCallback(() => {
    setReconnectTimeLeft(60);
    
    reconnectTimerRef.current = setInterval(() => {
      setReconnectTimeLeft(prev => {
        if (prev <= 1) {
          if (reconnectTimerRef.current) {
            clearInterval(reconnectTimerRef.current);
          }
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onTimeout]);

  // Clean up timed-out disconnected players
  const cleanupDisconnectedPlayers = useCallback(async () => {
    if (!lobbyId) return;

    try {
      const cutoffTime = new Date(Date.now() - RECONNECTION_TIMEOUT).toISOString();
      
      await supabase
        .from('lobby_players')
        .delete()
        .eq('lobby_id', lobbyId)
        .eq('connection_status', 'disconnected')
        .lt('disconnected_at', cutoffTime);
    } catch (error) {
      console.error('Error cleaning up disconnected players:', error);
    }
  }, [lobbyId]);

  // Fetch disconnected players
  const fetchDisconnectedPlayers = useCallback(async () => {
    if (!lobbyId) return;

    try {
      const { data } = await supabase
        .from('lobby_players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('connection_status', 'disconnected')
        .not('disconnected_at', 'is', null);

      if (data) {
        const now = Date.now();
        const playersWithTime = data.map(p => {
          const disconnectedTime = new Date(p.disconnected_at!).getTime();
          const elapsed = now - disconnectedTime;
          const timeLeft = Math.max(0, Math.ceil((RECONNECTION_TIMEOUT - elapsed) / 1000));
          return {
            player_id: p.player_id,
            player_name: p.player_name,
            disconnected_at: p.disconnected_at!,
            timeLeft
          };
        }).filter(p => p.timeLeft > 0);

        setDisconnectedPlayers(playersWithTime);
      }
    } catch (error) {
      console.error('Error fetching disconnected players:', error);
    }
  }, [lobbyId]);

  // Set up heartbeat and cleanup
  useEffect(() => {
    if (!lobbyId || !playerId) return;

    // Initial connection
    markConnected();

    // Heartbeat to keep connection alive
    heartbeatRef.current = setInterval(() => {
      markConnected();
      cleanupDisconnectedPlayers();
      fetchDisconnectedPlayers();
    }, 10000); // Every 10 seconds

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markDisconnected();
      } else {
        markConnected();
      }
    };

    // Handle beforeunload
    const handleBeforeUnload = () => {
      markDisconnected();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lobbyId, playerId, markConnected, markDisconnected, cleanupDisconnectedPlayers, fetchDisconnectedPlayers]);

  return {
    isReconnecting,
    reconnectTimeLeft,
    disconnectedPlayers,
    attemptReconnect,
    startReconnectionCountdown,
    markDisconnected,
    markConnected,
  };
};
