import { useState, useEffect, useRef } from 'react';
import { WebRTCManager, GameStateMessage, LocalSignaling } from '@/lib/webrtc';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connectionId?: string;
}

export const useWebRTC = (
  currentPlayer: Player | null,
  lobbyCode: string,
  isHost: boolean
) => {
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const { toast } = useToast();

  // Initialize WebRTC manager
  useEffect(() => {
    if (!currentPlayer) return;

    const manager = new WebRTCManager(currentPlayer.id, isHost);
    webrtcRef.current = manager;

    // Setup message handler
    manager.onMessage((message: GameStateMessage) => {
      console.log('Received message:', message);
      // Handle different message types
      handleIncomingMessage(message);
    });

    // Setup connection handlers
    manager.onPlayerConnected((playerId: string) => {
      console.log('Player connected:', playerId);
      setConnectedPlayers(prev => [...new Set([...prev, playerId])]);
      
      toast({
        title: "Joueur connecté",
        description: `Un joueur a rejoint la partie`,
      });
    });

    manager.onPlayerDisconnected((playerId: string) => {
      console.log('Player disconnected:', playerId);
      setConnectedPlayers(prev => prev.filter(id => id !== playerId));
      
      toast({
        title: "Joueur déconnecté",
        description: `Un joueur a quitté la partie`,
        variant: "destructive",
      });
    });

    return () => {
      manager.closeAll();
    };
  }, [currentPlayer?.id, isHost]);

  // Host: Listen for incoming connection requests
  useEffect(() => {
    if (!isHost || !currentPlayer || !lobbyCode) return;

    const interval = setInterval(async () => {
      const signals = LocalSignaling.getSignalsFor(lobbyCode, currentPlayer.id);
      
      for (const signal of signals) {
        if (signal.type === 'offer' && webrtcRef.current) {
          try {
            const answer = await webrtcRef.current.acceptConnection(
              signal.senderId,
              signal.offer
            );
            
            // Send answer back
            LocalSignaling.sendSignal(lobbyCode, signal.senderId, {
              type: 'answer',
              answer,
              senderId: currentPlayer.id,
            });
          } catch (error) {
            console.error('Error accepting connection:', error);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, currentPlayer?.id, lobbyCode]);

  // Client: Connect to host
  const connectToHost = async (hostId: string) => {
    if (!currentPlayer || !webrtcRef.current || isHost) return;

    setIsConnecting(true);
    try {
      // Create offer
      const offer = await webrtcRef.current.createConnection(hostId);
      
      // Send offer via signaling
      LocalSignaling.sendSignal(lobbyCode, hostId, {
        type: 'offer',
        offer,
        senderId: currentPlayer.id,
      });

      // Wait for answer
      const waitForAnswer = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
        
        const checkInterval = setInterval(async () => {
          const signals = LocalSignaling.getSignalsFor(lobbyCode, currentPlayer.id);
          
          for (const signal of signals) {
            if (signal.type === 'answer' && signal.senderId === hostId) {
              clearTimeout(timeout);
              clearInterval(checkInterval);
              
              if (webrtcRef.current) {
                await webrtcRef.current.completeConnection(hostId, signal.answer);
                resolve();
              }
            }
          }
        }, 500);
      });

      await waitForAnswer;

      toast({
        title: "Connexion établie",
        description: "Vous êtes connecté à l'hôte",
      });
    } catch (error) {
      console.error('Error connecting to host:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter à l'hôte",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Broadcast game state to all connected players
  const broadcastGameState = (type: string, payload: any) => {
    if (!webrtcRef.current) return;
    
    webrtcRef.current.broadcast({
      type: type as any,
      payload,
    });
  };

  // Send message to specific player
  const sendToPlayer = (playerId: string, type: string, payload: any) => {
    if (!webrtcRef.current) return;
    
    webrtcRef.current.sendToPeer(playerId, {
      type: type as any,
      payload,
    });
  };

  // Handle incoming messages
  const handleIncomingMessage = (message: GameStateMessage) => {
    // This will be expanded based on game logic
    console.log('Handling message:', message);
  };

  // Cleanup on lobby exit
  const disconnectAll = () => {
    if (webrtcRef.current) {
      webrtcRef.current.closeAll();
    }
    if (lobbyCode) {
      LocalSignaling.clearLobby(lobbyCode);
    }
    setConnectedPlayers([]);
  };

  return {
    connectedPlayers,
    isConnecting,
    connectToHost,
    broadcastGameState,
    sendToPlayer,
    disconnectAll,
    isConnected: connectedPlayers.length > 0,
  };
};
