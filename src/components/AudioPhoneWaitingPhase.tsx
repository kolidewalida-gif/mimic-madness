import { memo, useMemo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Clock, 
  Mic, 
  Check, 
  User,
  Loader2,
  Headphones,
  Radio,
  Waves
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
  const [showReady, setShowReady] = useState(false);
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    setShowReady(true);
    const interval = setInterval(() => {
      setPulseIndex(prev => (prev + 1) % 5);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const getPlayerById = (playerId: string) => players.find(p => p.id === playerId);

  const playerStatuses = useMemo(() => {
    return playerOrder.map((playerId, index) => {
      const player = getPlayerById(playerId);
      return {
        playerId,
        playerName: player?.name || 'Joueur inconnu',
        index,
        isCompleted: index < currentPlayerIndex,
        isCurrent: index === currentPlayerIndex,
        isPending: index > currentPlayerIndex,
      };
    });
  }, [playerOrder, currentPlayerIndex, players]);

  const currentPlayer = getPlayerById(playerOrder[currentPlayerIndex]);
  const progress = (completedCount / playerOrder.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-gradient-to-br from-secondary/20 to-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className={cn(
        "text-center mb-8 relative z-10 transition-all duration-700",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/30 mb-5 backdrop-blur-sm">
          <Clock className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-primary">En attente</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          La chaîne continue...
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto text-lg">
          Patientez pendant que les autres joueurs participent
        </p>
      </div>

      {/* Current player card */}
      <Card className={cn(
        "max-w-md w-full p-6 relative z-10 overflow-hidden mb-6 transition-all duration-700 delay-100",
        "bg-gradient-to-br from-primary/15 to-accent/10 border-primary/30 backdrop-blur-md",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              {currentPhase === 'recording' ? (
                <Mic className="h-9 w-9 text-white" />
              ) : (
                <Headphones className="h-9 w-9 text-white" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            </div>
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-foreground-muted mb-1">C'est au tour de</p>
            <p className="text-2xl font-black text-foreground">{currentPlayer?.name}</p>
            <p className="text-sm font-medium text-primary mt-1">
              {currentPhase === 'recording' ? '🎤 En train d\'enregistrer...' : '🎧 En train d\'écouter...'}
            </p>
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mt-5">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                pulseIndex === i ? "bg-primary scale-150" : "bg-primary/30"
              )}
            />
          ))}
        </div>
      </Card>

      {/* Progress */}
      <Card className={cn(
        "max-w-md w-full p-5 relative z-10 mb-6 transition-all duration-700 delay-200",
        "bg-card/60 backdrop-blur-md border-border/30",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-foreground">Progression</span>
          <span className="text-foreground-muted font-mono">{completedCount}/{playerOrder.length}</span>
        </div>
        <div className="h-3 bg-background/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-700 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Player chain */}
      <Card className={cn(
        "max-w-md w-full p-5 relative z-10 transition-all duration-700 delay-300",
        "bg-card/60 backdrop-blur-md border-border/30",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-4">
          Ordre de passage
        </h3>
        
        <div className="space-y-2">
          {playerStatuses.map((status, idx) => (
            <div 
              key={status.playerId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                status.isCompleted && "bg-emerald-500/10 border border-emerald-500/30",
                status.isCurrent && "bg-primary/15 border border-primary/40 scale-[1.02]",
                status.isPending && "bg-background/30 opacity-50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold",
                status.isCompleted && "bg-emerald-500 text-white",
                status.isCurrent && "bg-primary text-white",
                status.isPending && "bg-foreground-muted/20 text-foreground-muted"
              )}>
                {status.isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
              </div>
              <p className={cn(
                "font-semibold flex-1 truncate",
                status.isCompleted && "text-emerald-400",
                status.isCurrent && "text-primary",
                status.isPending && "text-foreground-muted"
              )}>
                {status.playerName}
              </p>
              {status.isCurrent && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});

AudioPhoneWaitingPhase.displayName = "AudioPhoneWaitingPhase";
