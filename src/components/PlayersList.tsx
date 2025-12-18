import { Users, Crown, Copy, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface PlayersListProps {
  players: Player[];
  lobbyCode?: string;
  lobbyId?: string;
  isHost?: boolean;
  onStartGame?: () => void;
  canStart?: boolean;
  gameMode?: 'normal' | '2v2' | 'quiz';
}

export const PlayersList = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost = false, 
  onStartGame,
  canStart: externalCanStart,
  gameMode = 'normal',
}: PlayersListProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const canStart = externalCanStart ?? (players.length >= 2 && players.length <= 8);

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

  return (
    <div className="relative group">
      {/* Outer glow on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glassmorphism container */}
      <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 group-hover:border-white/20">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        <div className="relative space-y-6">
          {/* Lobby Code Section */}
          {lobbyCode && (
            <div className="text-center space-y-3">
              <p className="text-foreground-muted text-xs font-display uppercase tracking-widest flex items-center justify-center gap-2">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                Code du Lobby
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="relative group/code">
                  {/* Animated border */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-xl opacity-50 blur group-hover/code:opacity-100 transition-opacity duration-300 animate-gradient" />
                  
                  <div className="relative px-8 py-4 rounded-xl bg-background/80 border border-primary/30">
                    <span className="text-4xl font-display font-black tracking-[0.4em] text-transparent bg-gradient-to-r from-primary to-purple-400 bg-clip-text drop-shadow-glow">
                      {lobbyCode}
                    </span>
                  </div>
                </div>
                <Button
                  variant="glass"
                  size="icon"
                  onClick={copyLobbyCode}
                  className={cn(
                    "transition-all duration-300",
                    copied && "bg-success/20 border-success/50"
                  )}
                  title="Copier le code"
                >
                  {copied ? (
                    <CheckCircle2 className="h-5 w-5 text-success animate-bounceIn" />
                  ) : (
                    <Copy className="h-5 w-5 text-primary" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-foreground-muted font-body">
                Partagez ce code avec vos amis
              </p>
            </div>
          )}

          {/* Divider with glow */}
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-sm" />
          </div>

          {/* Players Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground-muted">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-display text-sm uppercase tracking-wider">
                  Joueurs
                </span>
              </div>
              <span className="text-sm font-display px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border border-primary/20">
                {players.length}/8
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {players.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-foreground-muted/30 animate-pulse" />
                  <p className="text-foreground-muted font-body">
                    Aucun joueur connecté
                  </p>
                </div>
              ) : (
                players.map((player, index) => (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all duration-300",
                      "bg-white/5 border border-white/10",
                      "hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
                      "animate-stagger opacity-0"
                    )}
                    style={{ 
                      animationDelay: `${index * 80}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        playerId={player.id}
                        playerName={player.name}
                        size="lg"
                        isHost={player.isHost}
                        animated
                      />
                      
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground font-body">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Crown className="h-3 w-3 animate-bounce-slow" />
                            Hôte
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Online indicator with pulse ring */}
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_12px_rgba(74,222,128,0.6)]" />
                      <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-50" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Start Button - Premium */}
          {isHost && onStartGame && (
            <div className="space-y-3 pt-2">
              <Button
                onClick={onStartGame}
                disabled={!canStart}
                variant="hero"
                size="xl"
                className={cn(
                  "w-full font-display uppercase tracking-wider group",
                  !canStart && "opacity-50"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className={cn(
                    "h-5 w-5 transition-all",
                    canStart && "group-hover:animate-pulse"
                  )} />
                  <span>
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
                <p className="text-xs text-center text-foreground-muted font-body animate-pulse">
                  {gameMode === '2v2' 
                    ? "Min. 4 joueurs pairs + équipes formées" 
                    : "Minimum 2 joueurs requis"}
                </p>
              )}
            </div>
          )}

          {!isHost && (
            <div className="text-center p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 animate-pulse">
              <p className="text-amber-400 font-body text-sm flex items-center justify-center gap-2">
                <span className="animate-bounce">⏳</span>
                En attente du lancement...
              </p>
            </div>
          )}
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
};
