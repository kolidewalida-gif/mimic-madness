import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { LobbyInvitePanel } from "@/components/LobbyInvitePanel";
import { DeviceSettings } from "@/components/DeviceSettings";
import { InkHideable, InkCard } from "@/components/InkAdaptive";
import { useInkMode } from "@/hooks/useInkMode";
import { 
  HolographicCard, 
  NeonText, 
  FloatingParticles, 
  PremiumButton, 
  InteractiveWrapper,
  GlowingOrb,
  CyberGrid
} from "@/components/premium";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bug, Settings, Users, Wifi, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useGameTeams } from "@/hooks/useGameTeams";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getModeEmojiLabel, getModeLabel, getStartStatus, type LobbyGameMode } from "@/lib/gameModes";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface LobbyScreenProps {
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

export const LobbyScreen = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost, 
  currentPlayer, 
  onStartGame, 
  onLeaveGame,
  onKickPlayer,
  onTransferHost
}: LobbyScreenProps) => {
  const { isInkMode, inkClasses, inkFont } = useInkMode();
  const [showSettings, setShowSettings] = useState(false);
  const [gameMode, setGameMode] = useState<LobbyGameMode>('normal');
  const [lastStartAttemptAt, setLastStartAttemptAt] = useState<string | null>(null);
  const [lastStartError, setLastStartError] = useState<string | null>(null);
  const { teams, isLoading: teamsLoading, assignRandomTeams } = useGameTeams(lobbyId);
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

  const handleShuffleTeams = async () => {
    await assignRandomTeams(players);
  };

  const handleStartGame = async () => {
    if (gameMode === '2v2' && teams.length === 0) {
      toast({
        title: "Équipes requises",
        description: "Veuillez d'abord former les équipes",
        variant: "destructive",
      });
      return;
    }

    setLastStartAttemptAt(new Date().toISOString());
    setLastStartError(null);
    try {
      await onStartGame(gameMode);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setLastStartError(msg);
    }
  };

  const connectedCount = players.filter(p => !p.isDisconnected).length;
  const { canStart, reasons } = getStartStatus({
    mode: gameMode,
    connectedCount,
    teamsCount: teams.length,
  });

  return (
    <div className={cn(
      "h-screen flex flex-col p-4 sm:p-6 pb-28 relative overflow-hidden",
      isInkMode ? "bg-background" : ""
    )}>
      {/* Premium Background Effects - Hidden in Ink Mode */}
      <InkHideable>
        <CyberGrid color="primary" opacity={0.04} animated />
        <FloatingParticles count={50} color="mixed" speed="slow" size="small" glow />
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <GlowingOrb size="xl" color="primary" className="absolute top-[-15%] right-[-5%]" animated />
          <GlowingOrb size="lg" color="accent" className="absolute bottom-[-15%] left-[-5%]" animated />
          <GlowingOrb size="md" color="accent" className="absolute top-[40%] left-[30%]" intensity="low" />
        </div>
      </InkHideable>
      
      {/* Ink Mode Decorations - subtle red glow */}
      {isInkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-primary rounded-full blur-3xl" />
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10 flex-1">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in">
          {isInkMode ? (
            <Button
              variant="outline"
              onClick={onLeaveGame}
              className="gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quitter</span>
            </Button>
          ) : (
            <InteractiveWrapper hoverLift clickSound="click">
              <PremiumButton
                variant="default"
                onClick={onLeaveGame}
                className="gap-2 bg-transparent hover:bg-destructive/10 hover:text-destructive"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Quitter</span>
              </PremiumButton>
            </InteractiveWrapper>
          )}
          
          {isInkMode ? (
            <h1 className="text-2xl font-black" style={inkFont}>MIMIC MASTER</h1>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 -m-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <GameLogo size="sm" animated />
            </div>
          )}
          
          {isInkMode ? (
            <Button
              variant={showSettings ? "default" : "outline"}
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "gap-2",
                showSettings ? "bg-primary text-primary-foreground" : "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Audio/Vidéo</span>
            </Button>
          ) : (
            <InteractiveWrapper glow glowColor="hsl(var(--primary))" clickSound="click">
              <PremiumButton
                variant={showSettings ? "holographic" : "default"}
                onClick={() => setShowSettings(!showSettings)}
                className={cn("gap-2", !showSettings && "bg-transparent hover:bg-primary/10")}
              >
                <Settings className={cn(
                  "h-4 w-4 transition-transform duration-500",
                  showSettings && "rotate-180"
                )} />
                <span className="hidden sm:inline">Audio/Vidéo</span>
              </PremiumButton>
            </InteractiveWrapper>
          )}
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {isInkMode ? (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border-2 border-primary/30">
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
              </span>
            </div>
          ) : (
            <InteractiveWrapper glow glowIntensity="low">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/70 backdrop-blur-md border border-primary/20 shadow-lg shadow-primary/5 group cursor-default">
                <div className="relative">
                  <Wifi className="h-4 w-4 text-success" />
                  <div className="absolute inset-0 bg-success/50 rounded-full blur-md animate-ping" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
                </span>
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping" />
                </div>
              </div>
            </InteractiveWrapper>
          )}
          
          {isInkMode ? (
            <h2 className="text-4xl font-black text-primary" style={inkFont}>Salle d'attente</h2>
          ) : (
            <NeonText color="primary" size="4xl" animate="pulse">
              Salle d'attente
            </NeonText>
          )}
          
          <p className={cn(
            "text-sm max-w-md mx-auto leading-relaxed",
            isInkMode ? "text-muted-foreground" : "text-foreground-muted"
          )}>
            {isHost 
              ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Players List + Invite Panel */}
          <div className="space-y-4">
            {/* Fortnite-style Invite Slots */}
            {isHost && (
              isInkMode ? (
                <InkCard className="p-0">
                  <LobbyInvitePanel
                    lobbyCode={lobbyCode}
                    lobbyId={lobbyId}
                    players={players}
                    maxPlayers={8}
                    isHost={isHost}
                  />
                </InkCard>
              ) : (
                <HolographicCard intensity="medium" className="p-0">
                  <LobbyInvitePanel
                    lobbyCode={lobbyCode}
                    lobbyId={lobbyId}
                    players={players}
                    maxPlayers={8}
                    isHost={isHost}
                  />
                </HolographicCard>
              )
            )}
            
            {isInkMode ? (
              <InkCard className="p-0 overflow-hidden">
                <PlayersList
                  players={players}
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  isHost={isHost}
                  currentPlayerId={currentPlayer.id}
                  onStartGame={handleStartGame}
                  onKickPlayer={isHost ? onKickPlayer : undefined}
                  onTransferHost={isHost ? onTransferHost : undefined}
                  canStart={canStart}
                  gameMode={gameMode}
                />
              </InkCard>
            ) : (
              <HolographicCard intensity="low" className="p-0 overflow-hidden">
                <PlayersList
                  players={players}
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  isHost={isHost}
                  currentPlayerId={currentPlayer.id}
                  onStartGame={handleStartGame}
                  onKickPlayer={isHost ? onKickPlayer : undefined}
                  onTransferHost={isHost ? onTransferHost : undefined}
                  canStart={canStart}
                  gameMode={gameMode}
                />
              </HolographicCard>
            )}
          </div>

          {/* Right Column - Game Mode & Teams / Settings */}
          <div className="space-y-4">
            {isHost && (
              isInkMode ? (
                <InkCard className="p-0 overflow-hidden">
                  <GameModeSelector
                    gameMode={gameMode}
                    onGameModeChange={handleGameModeChange}
                    playerCount={players.filter(p => !p.isDisconnected).length}
                  />
                </InkCard>
              ) : (
                <HolographicCard intensity="medium" className="p-0 overflow-hidden">
                  <GameModeSelector
                    gameMode={gameMode}
                    onGameModeChange={handleGameModeChange}
                    playerCount={players.filter(p => !p.isDisconnected).length}
                  />
                </HolographicCard>
              )
            )}

            {isHost && (
              isInkMode ? (
                <InkCard>
                  <details className="p-4">
                    <summary className="cursor-pointer select-none flex items-center justify-between text-sm font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-muted-foreground" />
                        Debug lancement
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border-2",
                          canStart
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-warning/10 border-warning/30 text-warning"
                        )}
                      >
                        {canStart ? 'OK' : 'BLOQUÉ'}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3 text-xs text-muted-foreground">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          Mode: <span className="text-foreground">{getModeLabel(gameMode)}</span>
                          <span className="text-muted-foreground"> ({gameMode})</span>
                        </div>
                        <div>
                          Joueurs: <span className="text-foreground">{connectedCount}</span>
                          <span className="text-muted-foreground">/{players.length}</span>
                        </div>
                        <div>
                          Équipes: <span className="text-foreground">{teams.length}</span>
                        </div>
                        <div>
                          Min requis: <span className="text-foreground">{gameMode === '2v2' ? 4 : 2}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div>
                          Dernière tentative: <span className="text-foreground">{lastStartAttemptAt ? new Date(lastStartAttemptAt).toLocaleTimeString() : '—'}</span>
                        </div>
                        <div>
                          Dernière erreur backend: <span className={cn("font-medium", lastStartError ? "text-destructive" : "text-foreground")}>{lastStartError ?? '—'}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-medium text-foreground">États joueurs :</div>
                        <ul className="space-y-0.5">
                          {players.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3">
                              <span className="truncate">{p.name}{p.id === currentPlayer.id ? ' (vous)' : ''}</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border-2",
                                p.isDisconnected
                                  ? "bg-warning/10 border-warning/30 text-warning"
                                  : "bg-primary/10 border-primary/30 text-primary"
                              )}>
                                {p.isDisconnected ? `déco ${p.disconnectedTimeLeft ?? ''}`.trim() : 'connecté'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!canStart && (
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">Raisons :</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {canStart && (
                        <div className="text-muted-foreground">
                          Tout est bon — si ça échoue encore, l'erreur affichée devrait donner le détail.
                        </div>
                      )}
                    </div>
                  </details>
                </InkCard>
              ) : (
                <HolographicCard intensity="low">
                  <details className="p-4">
                    <summary className="cursor-pointer select-none flex items-center justify-between text-sm font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-foreground-muted" />
                        Debug lancement
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border",
                          canStart
                            ? "bg-success/10 border-success/20 text-success"
                            : "bg-warning/10 border-warning/20 text-warning"
                        )}
                      >
                        {canStart ? 'OK' : 'BLOQUÉ'}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3 text-xs text-foreground-muted">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          Mode: <span className="text-foreground">{getModeLabel(gameMode)}</span>
                          <span className="text-foreground-muted"> ({gameMode})</span>
                        </div>
                        <div>
                          Joueurs: <span className="text-foreground">{connectedCount}</span>
                          <span className="text-foreground-muted">/{players.length}</span>
                        </div>
                        <div>
                          Équipes: <span className="text-foreground">{teams.length}</span>
                        </div>
                        <div>
                          Min requis: <span className="text-foreground">{gameMode === '2v2' ? 4 : 2}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div>
                          Dernière tentative: <span className="text-foreground">{lastStartAttemptAt ? new Date(lastStartAttemptAt).toLocaleTimeString() : '—'}</span>
                        </div>
                        <div>
                          Dernière erreur backend: <span className={cn("font-medium", lastStartError ? "text-destructive" : "text-foreground")}>{lastStartError ?? '—'}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="font-medium text-foreground">États joueurs :</div>
                        <ul className="space-y-0.5">
                          {players.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3">
                              <span className="truncate">{p.name}{p.id === currentPlayer.id ? ' (vous)' : ''}</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border",
                                p.isDisconnected
                                  ? "bg-warning/10 border-warning/20 text-warning"
                                  : "bg-success/10 border-success/20 text-success"
                              )}>
                                {p.isDisconnected ? `déco ${p.disconnectedTimeLeft ?? ''}`.trim() : 'connecté'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!canStart && (
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">Raisons :</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {canStart && (
                        <div className="text-foreground-muted">
                          Tout est bon — si ça échoue encore, l'erreur affichée devrait donner le détail.
                        </div>
                      )}
                    </div>
                  </details>
                </HolographicCard>
              )
            )}

            {!isHost && (
              isInkMode ? (
                <InkCard>
                  <div className="text-center space-y-2 p-6">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Mode sélectionné
                    </p>
                    <p className="text-2xl font-black text-primary">{getModeEmojiLabel(gameMode)}</p>
                  </div>
                </InkCard>
              ) : (
                <HolographicCard intensity="low">
                  <div className="text-center space-y-2 p-6">
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider flex items-center justify-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Mode sélectionné
                    </p>
                    <NeonText color="accent" size="2xl">
                      {getModeEmojiLabel(gameMode)}
                    </NeonText>
                  </div>
                </HolographicCard>
              )
            )}

            {gameMode === '2v2' && (
              isInkMode ? (
                <InkCard className="p-0 overflow-hidden">
                  <TeamDisplay
                    teams={teams}
                    currentPlayerId={currentPlayer.id}
                    lobbyId={lobbyId}
                    isHost={isHost}
                    onShuffleTeams={handleShuffleTeams}
                    isLoading={teamsLoading}
                  />
                </InkCard>
              ) : (
                <HolographicCard intensity="medium" className="p-0 overflow-hidden">
                  <TeamDisplay
                    teams={teams}
                    currentPlayerId={currentPlayer.id}
                    lobbyId={lobbyId}
                    isHost={isHost}
                    onShuffleTeams={handleShuffleTeams}
                    isLoading={teamsLoading}
                  />
                </HolographicCard>
              )
            )}

            {showSettings && (
              isInkMode ? (
                <InkCard>
                  <DeviceSettings 
                    showPreview={true} 
                    playerId={currentPlayer.id}
                    playerName={currentPlayer.name}
                    lobbyId={lobbyId}
                  />
                </InkCard>
              ) : (
                <HolographicCard intensity="high">
                  <DeviceSettings 
                    showPreview={true} 
                    playerId={currentPlayer.id}
                    playerName={currentPlayer.name}
                    lobbyId={lobbyId}
                  />
                </HolographicCard>
              )
            )}
          </div>
        </div>
      </div>

      {/* Lobby Chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
