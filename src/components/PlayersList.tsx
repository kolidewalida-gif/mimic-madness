import { Users, Crown, Copy, CheckCircle2, Sparkles, Zap, Wifi, WifiOff, X, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
  gameMode?: 'normal' | '2v2' | 'quiz';
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
  
  // Only count connected players for start conditions
  const connectedPlayers = players.filter(p => !p.isDisconnected);
  const canStart = externalCanStart ?? (connectedPlayers.length >= 2 && connectedPlayers.length <= 8);

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
    }
    setPlayerToKick(null);
  };

  const handleTransferClick = (player: Player) => {
    setPlayerToTransfer(player);
  };

  const confirmTransfer = () => {
    if (playerToTransfer && onTransferHost) {
      onTransferHost(playerToTransfer.id);
    }
    setPlayerToTransfer(null);
  };

  return (
    <>
      <div className="relative group">
        {/* Outer glow on hover */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
        
        {/* Main container */}
        <div className="relative card-premium overflow-hidden transition-all duration-500 group-hover:border-primary/30">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1500 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <div className="relative space-y-6">
            {/* Lobby Code Section */}
            {lobbyCode && (
              <div className="text-center space-y-4">
                <p className="text-foreground-muted text-xs font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  Code du Lobby
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative group/code">
                    {/* Animated border */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl opacity-60 blur-sm group-hover/code:opacity-100 transition-opacity duration-300 animate-gradient" />
                    
                    <div className="relative px-10 py-5 rounded-2xl bg-background/90 backdrop-blur-sm">
                      <span className="text-5xl font-bold tracking-[0.4em] text-gradient drop-shadow-lg">
                        {lobbyCode}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="glass"
                    size="icon"
                    onClick={copyLobbyCode}
                    className={cn(
                      "transition-all duration-300 rounded-xl h-14 w-14",
                      copied && "bg-success/20 border-success/50"
                    )}
                    title="Copier le code"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-6 w-6 text-success animate-bounceIn" />
                    ) : (
                      <Copy className="h-6 w-6 text-primary" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-foreground-muted">
                  Partagez ce code avec vos amis
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="relative h-px">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-sm" />
            </div>

            {/* Players Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-foreground-muted">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">
                    Joueurs
                  </span>
                </div>
                <span className="text-sm font-bold px-5 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20">
                  {connectedPlayers.length}/8
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {players.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative inline-block">
                      <Users className="h-16 w-16 mx-auto mb-4 text-foreground-muted/20" />
                      <div className="absolute inset-0 animate-ping opacity-30">
                        <Users className="h-16 w-16 text-primary/30" />
                      </div>
                    </div>
                    <p className="text-foreground-muted font-medium">
                      Aucun joueur connecté
                    </p>
                  </div>
                ) : (
                  players.map((player, index) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                        "bg-white/5 border border-white/10",
                        player.isDisconnected 
                          ? "opacity-60 bg-amber-500/10 border-amber-500/30" 
                          : "hover:bg-white/10 hover:border-primary/30",
                        player.id === currentPlayerId && !player.isDisconnected && "ring-1 ring-primary/40 bg-primary/10",
                        "animate-fadeIn"
                      )}
                      style={{ 
                        animationDelay: `${index * 80}ms`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <PlayerAvatar
                          playerId={player.id}
                          playerName={player.name}
                          size="lg"
                          isHost={player.isHost}
                          animated
                        />
                        
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-lg flex items-center gap-2">
                            {player.name}
                            {player.id === currentPlayerId && (
                              <span className="text-xs text-primary/70">(vous)</span>
                            )}
                          </span>
                          {player.isHost && (
                            <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                              <Crown className="h-3.5 w-3.5 animate-bounce-slow" />
                              Hôte de la partie
                            </span>
                          )}
                          {player.isDisconnected && player.disconnectedTimeLeft && (
                            <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                              <WifiOff className="h-3 w-3" />
                              Reconnexion... {player.disconnectedTimeLeft}s
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Connection indicator */}
                        {player.isDisconnected ? (
                          <div className="flex items-center gap-2">
                            <WifiOff className="h-4 w-4 text-amber-500" />
                            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                          </div>
                        ) : (
                          <div className="relative flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-success/60" />
                            <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_15px_rgba(74,222,128,0.6)]">
                              <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-40" />
                            </div>
                          </div>
                        )}
                        
                        {/* Host actions - kick & transfer */}
                        {isHost && !player.isHost && !player.isDisconnected && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/10 transition-colors"
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-ultra">
                              {onTransferHost && (
                                <DropdownMenuItem 
                                  onClick={() => handleTransferClick(player)}
                                  className="cursor-pointer"
                                >
                                  <Crown className="h-4 w-4 mr-2 text-amber-400" />
                                  Transférer l'hôte
                                </DropdownMenuItem>
                              )}
                              {onKickPlayer && (
                                <DropdownMenuItem 
                                  onClick={() => handleKickClick(player)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
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
              <div className="space-y-4 pt-2">
                <Button
                  onClick={onStartGame}
                  disabled={!canStart}
                  variant="hero"
                  size="xl"
                  className={cn(
                    "w-full font-bold uppercase tracking-wider group rounded-xl h-16",
                    !canStart && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Zap className={cn(
                      "h-6 w-6 transition-all",
                      canStart && "group-hover:animate-pulse"
                    )} />
                    <span className="text-lg">
                      {!canStart 
                        ? gameMode === '2v2' 
                          ? "Conditions 2v2 non remplies"
                          : "En attente de joueurs..." 
                        : `Lancer la Partie ${gameMode === '2v2' ? '2v2' : gameMode === 'quiz' ? 'Quiz' : ''}`
                      }
                    </span>
                  </div>
                </Button>
                {!canStart && (
                  <p className="text-sm text-center text-foreground-muted animate-pulse font-medium">
                    {gameMode === '2v2' 
                      ? "Min. 4 joueurs pairs + équipes formées" 
                      : "Minimum 2 joueurs connectés requis"}
                  </p>
                )}
              </div>
            )}

            {!isHost && (
              <div className="text-center p-5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-amber-400 font-medium text-sm flex items-center justify-center gap-3">
                  <span className="animate-bounce text-lg">⏳</span>
                  En attente du lancement par l'hôte...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={!!playerToKick} onOpenChange={() => setPlayerToKick(null)}>
        <AlertDialogContent className="glass-ultra border-destructive/30">
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
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmKick}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Exclure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Host Confirmation Dialog */}
      <AlertDialog open={!!playerToTransfer} onOpenChange={() => setPlayerToTransfer(null)}>
        <AlertDialogContent className="glass-ultra border-amber-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Transférer l'hôte à {playerToTransfer?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {playerToTransfer?.name} deviendra l'hôte de la partie et aura le contrôle du lobby. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransfer}
              className="bg-amber-500 hover:bg-amber-600 text-black rounded-xl"
            >
              Transférer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};