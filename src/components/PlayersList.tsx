import { Users, Crown, Copy, CheckCircle2, Sparkles } from "lucide-react";
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
    <div className="relative">
      {/* Glassmorphism container */}
      <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10 shadow-2xl overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        
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
                <Sparkles className="h-3 w-3 text-primary" />
                Code du Lobby
                <Sparkles className="h-3 w-3 text-primary" />
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="relative px-6 py-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30">
                  <span className="text-4xl font-display font-black tracking-[0.3em] text-primary drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                    {lobbyCode}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyLobbyCode}
                  className="hover:bg-primary/20 transition-all duration-300 hover:scale-110"
                  title="Copier le code"
                >
                  {copied ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
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

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Players Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground-muted">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-display text-sm uppercase tracking-wider">
                  Joueurs
                </span>
              </div>
              <span className="text-sm font-display px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {players.length}/8
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {players.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-3 text-foreground-muted/30" />
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
                      "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
                      "animate-slideInLeft"
                    )}
                    style={{ animationDelay: `${index * 80}ms` }}
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
                            <Crown className="h-3 w-3" />
                            Hôte
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
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
                  "w-full py-6 text-lg font-display uppercase tracking-wider transition-all duration-300",
                  "bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary",
                  "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50",
                  "border-0 rounded-xl",
                  !canStart && "opacity-50 cursor-not-allowed"
                )}
              >
                {!canStart 
                  ? gameMode === '2v2' 
                    ? "Conditions 2v2 non remplies"
                    : "En attente de joueurs..." 
                  : `🎮 Lancer la Partie ${gameMode === '2v2' ? '2v2' : gameMode === 'quiz' ? 'Quiz' : ''}`
                }
              </Button>
              {!canStart && (
                <p className="text-xs text-center text-foreground-muted font-body">
                  {gameMode === '2v2' 
                    ? "Min. 4 joueurs pairs + équipes formées" 
                    : "Minimum 2 joueurs requis"}
                </p>
              )}
            </div>
          )}

          {!isHost && (
            <div className="text-center p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-amber-400 font-body text-sm flex items-center justify-center gap-2">
                <span className="animate-pulse">⏳</span>
                En attente du lancement...
              </p>
            </div>
          )}
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
};
