import { Users, Crown, Copy, CheckCircle2, Zap, Wifi, WifiOff, X, UserCog, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getModeLabel, type LobbyGameMode } from "@/lib/gameModes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface PlayersListProps {
  players: Player[];
  lobbyCode?: string;
  lobbyId?: string;
  isHost?: boolean;
  currentPlayerId?: string;
  onStartGame?: () => void;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
  canStart?: boolean;
  gameMode?: LobbyGameMode;
}

export const PlayersList = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost = false,
  currentPlayerId,
  onStartGame,
  onKickPlayer,
  onTransferHost,
  canStart: externalCanStart,
  gameMode = 'normal',
}: PlayersListProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [playerToKick, setPlayerToKick] = useState<Player | null>(null);
  const [playerToTransfer, setPlayerToTransfer] = useState<Player | null>(null);
  
  const connectedPlayers = players.filter(p => !p.isDisconnected);
  const connectedCount = connectedPlayers.length;
  const canStart = externalCanStart ?? (connectedCount >= 2 && connectedCount <= 8);

  const copyLobbyCode = async () => {
    if (!lobbyCode) return;
    
    try {
      await navigator.clipboard.writeText(lobbyCode);
      setCopied(true);
      toast({
        title: "Code copié !",
        description: "Le code du lobby a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  const handleKickClick = (player: Player) => {
    setPlayerToKick(player);
  };

  const confirmKick = () => {
    if (playerToKick && onKickPlayer) {
      onKickPlayer(playerToKick.id);
      toast({
        title: "Joueur exclu",
        description: `${playerToKick.name} a été exclu du lobby`,
      });
    }
    setPlayerToKick(null);
  };

  const handleTransferClick = (player: Player) => {
    setPlayerToTransfer(player);
  };

  const confirmTransfer = () => {
    if (playerToTransfer && onTransferHost) {
      onTransferHost(playerToTransfer.id);
      toast({
        title: "Hôte transféré",
        description: `${playerToTransfer.name} est maintenant l'hôte`,
      });
    }
    setPlayerToTransfer(null);
  };

  return (
    <>
      <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-5 space-y-5">
        {/* Lobby Code Section */}
        {lobbyCode && (
          <div className="text-center space-y-3">
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Code du Lobby
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl opacity-50 blur-sm" />
                <div className="relative px-6 py-3 rounded-xl bg-background/90">
                  <span className="text-3xl sm:text-4xl font-bold tracking-[0.3em] text-foreground">
                    {lobbyCode}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLobbyCode}
                className={cn(
                  "h-12 w-12 rounded-xl border border-border/50",
                  "hover:bg-primary/10 hover:border-primary/50",
                  copied && "bg-success/10 border-success/50"
                )}
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5 text-foreground-muted" />
                )}
              </Button>
            </div>
            <p className="text-xs text-foreground-muted">
              Partagez ce code avec vos amis
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Players Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Joueurs</span>
            </div>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {connectedPlayers.length}/8
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {players.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-foreground-muted/30" />
                <p className="text-foreground-muted text-sm">Aucun joueur connecté</p>
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl transition-all duration-200",
                    "bg-background/50 border border-transparent",
                    player.isDisconnected 
                      ? "opacity-60 bg-warning/5 border-warning/20" 
                      : "hover:bg-background/80 hover:border-border/50",
                    player.id === currentPlayerId && !player.isDisconnected && "border-primary/30 bg-primary/5"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar
                      playerId={player.id}
                      playerName={player.name}
                      size="md"
                      isHost={player.isHost}
                    />
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {player.name}
                        </span>
                        {player.id === currentPlayerId && (
                          <span className="text-[10px] text-primary/70 font-medium">(vous)</span>
                        )}
                      </div>
                      {player.isHost && (
                        <span className="text-[10px] text-warning flex items-center gap-1 font-medium">
                          <Crown className="h-3 w-3" />
                          Hôte
                        </span>
                      )}
                      {player.isDisconnected && player.disconnectedTimeLeft && (
                        <span className="text-[10px] text-warning flex items-center gap-1 animate-pulse">
                          <WifiOff className="h-3 w-3" />
                          Reconnexion... {player.disconnectedTimeLeft}s
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Connection indicator */}
                    {player.isDisconnected ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                    )}
                    
                    {/* Host actions */}
                    {isHost && !player.isHost && !player.isDisconnected && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-foreground-muted hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          {onTransferHost && (
                            <DropdownMenuItem onClick={() => handleTransferClick(player)}>
                              <Crown className="h-4 w-4 mr-2 text-warning" />
                              Transférer hôte
                            </DropdownMenuItem>
                          )}
                          {onKickPlayer && (
                            <DropdownMenuItem 
                              onClick={() => handleKickClick(player)}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Exclure
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Start Button */}
        {isHost && onStartGame && (
          <div className="space-y-3 pt-2">
            <Button
              onClick={onStartGame}
              disabled={!canStart}
              className={cn(
                "w-full h-14 rounded-xl font-bold text-base",
                "bg-gradient-to-r from-primary to-primary-hover",
                "hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]",
                "active:scale-[0.98] transition-all duration-200",
                "disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none",
                "group relative overflow-hidden"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Zap className="h-5 w-5 mr-2" />
              {!canStart
                ? gameMode === '2v2'
                  ? "Conditions 2v2 non remplies"
                  : "En attente de joueurs..."
                : gameMode === 'normal'
                  ? "Lancer la Partie"
                  : `Lancer ${getModeLabel(gameMode)}`}
            </Button>
            {!canStart && (
              <p className="text-xs text-center text-foreground-muted">
                {gameMode === '2v2'
                  ? "Min. 4 joueurs pairs + équipes formées"
                  : `Minimum 2 joueurs connectés requis (${connectedCount} actuellement)`}
              </p>
            )}
          </div>
        )}

        {!isHost && (
          <div className="text-center p-4 rounded-xl bg-warning/5 border border-warning/20">
            <p className="text-warning text-sm font-medium flex items-center justify-center gap-2">
              <span className="text-lg">⏳</span>
              En attente du lancement par l'hôte...
            </p>
          </div>
        )}
      </div>

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={!!playerToKick} onOpenChange={() => setPlayerToKick(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              Exclure {playerToKick?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ce joueur sera immédiatement retiré du lobby et devra rejoindre à nouveau avec le code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmKick}
              className="bg-destructive hover:bg-destructive/90"
            >
              Exclure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Host Confirmation Dialog */}
      <AlertDialog open={!!playerToTransfer} onOpenChange={() => setPlayerToTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              Transférer l'hôte à {playerToTransfer?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {playerToTransfer?.name} deviendra l'hôte de la partie et aura le contrôle du lobby.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransfer}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              Transférer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
