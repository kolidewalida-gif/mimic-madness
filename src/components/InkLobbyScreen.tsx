import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Users, Wifi, Play, X, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { InkGameModeSelector } from '@/components/InkGameModeSelector';
import { InkPlayersList } from '@/components/InkPlayersList';
import { LobbyChat } from '@/components/LobbyChat';
import { DeviceSettings } from '@/components/DeviceSettings';
import { useGameTeams } from '@/hooks/useGameTeams';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InkLobbyCanvas } from '@/components/InkLobbyCanvas';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { getStartStatus, getModeLabel, type LobbyGameMode } from '@/lib/gameModes';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface InkLobbyScreenProps {
  players: Player[];
  lobbyCode: string;
  lobbyId: string;
  isHost: boolean;
  currentPlayer: Player;
  onStartGame: (gameMode: LobbyGameMode) => void | Promise<void>;
  onLeaveGame: () => void;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export const InkLobbyScreen = ({
  players,
  lobbyCode,
  lobbyId,
  isHost,
  currentPlayer,
  onStartGame,
  onLeaveGame,
  onKickPlayer,
  onTransferHost,
}: InkLobbyScreenProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const { isAdmin } = useAdmin();
  const [gameMode, setGameMode] = useState<LobbyGameMode>('normal');
  const { teams, assignRandomTeams } = useGameTeams(lobbyId);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGameMode = async () => {
      const { data } = await supabase
        .from('lobbies')
        .select('game_mode')
        .eq('id', lobbyId)
        .single();
      
      if (data?.game_mode) setGameMode(data.game_mode as LobbyGameMode);
    };

    fetchGameMode();

    const channel = supabase
      .channel(`lobby-mode:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (payload.new.game_mode) setGameMode(payload.new.game_mode as LobbyGameMode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = async (mode: LobbyGameMode) => {
    if (!isHost) return;

    try {
      const { error } = await supabase
        .from('lobbies')
        .update({ game_mode: mode })
        .eq('id', lobbyId);

      if (error) throw error;

      setGameMode(mode);

      if (mode === '2v2' && players.length >= 4 && players.length % 2 === 0) {
        await assignRandomTeams(players);
      }
    } catch (error) {
      console.error('Error updating game mode:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le mode de jeu",
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    console.log('[InkLobby] handleStartGame called', { gameMode, canStart, teamsCount: teams.length });
    
    if (gameMode === '2v2' && teams.length === 0) {
      toast({
        title: "Équipes requises",
        description: "Veuillez d'abord former les équipes",
        variant: "destructive",
      });
      return;
    }

    playInkSound('inkSuccess', 0.5);
    try {
      await onStartGame(gameMode);
      console.log('[InkLobby] onStartGame completed successfully');
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
    }
  };

  const connectedCount = players.filter(p => !p.isDisconnected).length;
  const { canStart, reasons } = getStartStatus({
    mode: gameMode,
    connectedCount,
    teamsCount: teams.length,
    isAdmin,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Collaborative Drawing Canvas */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />
      
      {/* Cursor Particles */}
      <InkCursorParticles />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-60 h-60 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-border/30">
        <button
          onClick={() => {
            playInkSound('brushTap', 0.4);
            onLeaveGame();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quitter</span>
        </button>

        <h1 
          className="text-3xl font-black text-primary"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          MIMIC MASTER
        </h1>

        <button
          onClick={() => {
            playInkSound('brushTap', 0.3);
            setShowSettings(!showSettings);
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
            showSettings
              ? 'bg-primary text-primary-foreground'
              : 'border-2 border-primary/50 text-primary hover:bg-primary/10'
          )}
        >
          <Settings className={cn('w-4 h-4 transition-transform', showSettings && 'rotate-90')} />
          <span className="hidden sm:inline">Audio/Vidéo</span>
        </button>
      </header>

      {/* Status Banner */}
      <div className="relative z-10 text-center py-4 space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
          </span>
        </div>
        <h2 
          className="text-2xl font-bold text-primary"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          Salle d'attente
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-4 pb-28 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* Left Column - Players */}
          <div className="space-y-4">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
              <InkPlayersList
                players={players}
                lobbyCode={lobbyCode}
                isHost={isHost}
                currentPlayerId={currentPlayer.id}
                onKickPlayer={isHost ? onKickPlayer : undefined}
                onTransferHost={isHost ? onTransferHost : undefined}
              />
            </div>

            {/* Friend Invitation Panel */}
            <LobbyInvitePanel
              lobbyCode={lobbyCode}
              lobbyId={lobbyId}
              players={players}
              isHost={isHost}
            />
          </div>

          {/* Right Column - Game Mode + Actions */}
          <div className="space-y-4">
            {isHost && (
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
                <InkGameModeSelector
                  gameMode={gameMode}
                  onGameModeChange={handleGameModeChange}
                  playerCount={connectedCount}
                  isAdmin={isAdmin}
                />
              </div>
            )}

            {/* Start Button - Host Only */}
            {isHost && (
              <motion.button
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.02 } : undefined}
                whileTap={canStart ? { scale: 0.98 } : undefined}
                className={cn(
                  'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300',
                  'flex items-center justify-center gap-3',
                  canStart
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Lancer la Partie
              </motion.button>
            )}

            {/* Cannot Start Reasons */}
            {isHost && !canStart && reasons.length > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <ul className="text-xs text-warning space-y-1">
                  {reasons.map((reason, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span>⚠️</span> {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden"
                >
                  <div className="p-4">
                    <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Lobby Chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
