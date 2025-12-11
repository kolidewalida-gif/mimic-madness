import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { Users, Swords, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameModeSelectorProps {
  gameMode: 'normal' | '2v2';
  onGameModeChange: (mode: 'normal' | '2v2') => void;
  disabled?: boolean;
  playerCount: number;
}

export const GameModeSelector = ({
  gameMode,
  onGameModeChange,
  disabled = false,
  playerCount,
}: GameModeSelectorProps) => {
  const canPlay2v2 = playerCount >= 4 && playerCount % 2 === 0;

  return (
    <GameCard className="animate-fadeIn">
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-center uppercase tracking-wider">
          Mode de Jeu
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Normal Mode */}
          <button
            onClick={() => onGameModeChange('normal')}
            disabled={disabled}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              gameMode === 'normal'
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-glass-border bg-background-secondary/30 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {gameMode === 'normal' && (
              <div className="absolute top-2 right-2">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "p-3 rounded-full",
                gameMode === 'normal' ? "bg-primary/20" : "bg-background-secondary"
              )}>
                <Users className={cn(
                  "h-8 w-8",
                  gameMode === 'normal' ? "text-primary" : "text-foreground-muted"
                )} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-display font-bold",
                  gameMode === 'normal' ? "text-primary" : "text-foreground"
                )}>
                  Normal
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  Chacun pour soi
                </p>
              </div>
            </div>
          </button>

          {/* 2v2 Mode */}
          <button
            onClick={() => canPlay2v2 && onGameModeChange('2v2')}
            disabled={disabled || !canPlay2v2}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              gameMode === '2v2'
                ? "border-secondary bg-secondary/10 shadow-lg shadow-secondary/20"
                : "border-glass-border bg-background-secondary/30 hover:border-secondary/50",
              (disabled || !canPlay2v2) && "opacity-50 cursor-not-allowed"
            )}
          >
            {gameMode === '2v2' && (
              <div className="absolute top-2 right-2">
                <Check className="h-5 w-5 text-secondary" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "p-3 rounded-full",
                gameMode === '2v2' ? "bg-secondary/20" : "bg-background-secondary"
              )}>
                <Swords className={cn(
                  "h-8 w-8",
                  gameMode === '2v2' ? "text-secondary" : "text-foreground-muted"
                )} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-display font-bold",
                  gameMode === '2v2' ? "text-secondary" : "text-foreground"
                )}>
                  2v2
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  {canPlay2v2 
                    ? "Équipes de 2" 
                    : playerCount < 4 
                      ? "Min. 4 joueurs" 
                      : "Joueurs pairs requis"
                  }
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </GameCard>
  );
};
