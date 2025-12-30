import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  Clock, 
  Mic, 
  Check, 
  User,
  Loader2,
  Headphones
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneWaitingPhaseProps {
  currentPlayerIndex: number;
  playerOrder: string[];
  players: Player[];
  currentPhase: 'recording' | 'listening';
  completedCount: number;
}

export const AudioPhoneWaitingPhase = memo(({
  currentPlayerIndex,
  playerOrder,
  players,
  currentPhase,
  completedCount,
}: AudioPhoneWaitingPhaseProps) => {
  // Get player info by ID
  const getPlayerById = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  // Build player status list
  const playerStatuses = useMemo(() => {
    return playerOrder.map((playerId, index) => {
      const player = getPlayerById(playerId);
      const isCompleted = index < currentPlayerIndex;
      const isCurrent = index === currentPlayerIndex;
      const isPending = index > currentPlayerIndex;

      return {
        playerId,
        playerName: player?.name || 'Joueur inconnu',
        index,
        isCompleted,
        isCurrent,
        isPending,
      };
    });
  }, [playerOrder, currentPlayerIndex, players]);

  const currentPlayer = getPlayerById(playerOrder[currentPlayerIndex]);
  const progress = ((completedCount) / playerOrder.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/30 mb-4">
           <Clock className="h-4 w-4 text-primary" />
           <span className="text-sm font-medium text-primary">En attente</span>
         </div>
        
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-foreground">
          La chaîne continue...
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto">
          Patientez pendant que les autres joueurs enregistrent leurs interprétations
        </p>
      </div>

      {/* Current player card */}
      <Card className="max-w-md w-full p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              {currentPhase === 'recording' ? (
                <Mic className="h-8 w-8 text-white" />
              ) : (
                <Headphones className="h-8 w-8 text-white" />
              )}
            </div>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
               <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
             </div>
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-foreground-muted mb-1">C'est au tour de</p>
            <p className="text-xl font-bold text-foreground">{currentPlayer?.name || 'Chargement...'}</p>
            <p className="text-sm text-primary">
              {currentPhase === 'recording' ? 'En train d\'enregistrer...' : 'En train d\'écouter...'}
            </p>
          </div>
        </div>
      </Card>

      {/* Progress */}
      <Card className="max-w-md w-full p-6 bg-card/60 backdrop-blur-sm border-border/30 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Progression</span>
          <span className="text-sm text-foreground-muted">
            {completedCount}/{playerOrder.length} joueurs
          </span>
        </div>
        
        <div className="h-3 bg-background/50 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Player chain */}
      <Card className="max-w-md w-full p-6 bg-card/60 backdrop-blur-sm border-border/30">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">
          Ordre de passage
        </h3>
        
        <div className="space-y-3">
          {playerStatuses.map((status, idx) => (
            <div 
              key={status.playerId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                 status.isCompleted && "bg-success/10 border border-success/30",
                 status.isCurrent && "bg-primary/10 border border-primary/30",
                 status.isPending && "bg-background/50 border border-border/30 opacity-50"
              )}
            >
              {/* Status indicator */}
               <div className={cn(
                 "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                 status.isCompleted && "bg-success",
                 status.isCurrent && "bg-primary",
                 status.isPending && "bg-foreground-muted/20"
               )}>
                {status.isCompleted ? (
                  <Check className="h-5 w-5 text-white" />
                ) : status.isCurrent ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <User className="h-5 w-5 text-foreground-muted" />
                )}
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                 <p className={cn(
                   "font-medium truncate",
                   status.isCompleted && "text-success",
                   status.isCurrent && "text-primary",
                   status.isPending && "text-foreground-muted"
                 )}>
                  {status.playerName}
                </p>
                <p className="text-xs text-foreground-muted">
                  {status.isCompleted && "Terminé"}
                  {status.isCurrent && (currentPhase === 'recording' ? 'Enregistre...' : 'Écoute...')}
                  {status.isPending && `Position ${idx + 1}`}
                </p>
              </div>

              {/* Order number */}
               <div className={cn(
                 "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                 status.isCompleted && "bg-success/15 text-success",
                 status.isCurrent && "bg-primary/20 text-primary",
                 status.isPending && "bg-foreground-muted/10 text-foreground-muted"
               )}>
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});

AudioPhoneWaitingPhase.displayName = "AudioPhoneWaitingPhase";
