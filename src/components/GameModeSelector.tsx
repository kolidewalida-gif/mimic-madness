import { GameCard } from "@/components/GameCard";
import { Users, Swords, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameModeSelectorProps {
  gameMode: 'normal' | '2v2' | 'quiz';
  onGameModeChange: (mode: 'normal' | '2v2' | 'quiz') => void;
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
  const canPlayQuiz = playerCount >= 2;

  return (
    <GameCard className="animate-fadeIn">
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-center uppercase tracking-wider">
          Mode de Jeu
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Normal Mode */}
          <button
            onClick={() => onGameModeChange('normal')}
            disabled={disabled}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              gameMode === 'normal'
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-border bg-background-secondary/30 hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {gameMode === 'normal' && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                gameMode === 'normal' ? "bg-primary/20" : "bg-background-secondary"
              )}>
                <Users className={cn(
                  "h-6 w-6",
                  gameMode === 'normal' ? "text-primary" : "text-foreground-muted"
                )} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-display font-bold text-sm",
                  gameMode === 'normal' ? "text-primary" : "text-foreground"
                )}>
                  Normal
                </p>
                <p className="text-[10px] text-foreground-muted mt-0.5">
                  Imitation
                </p>
              </div>
            </div>
          </button>

          {/* 2v2 Mode */}
          <button
            onClick={() => canPlay2v2 && onGameModeChange('2v2')}
            disabled={disabled || !canPlay2v2}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              gameMode === '2v2'
                ? "border-secondary bg-secondary/10 shadow-lg shadow-secondary/20"
                : "border-border bg-background-secondary/30 hover:border-secondary/50",
              (disabled || !canPlay2v2) && "opacity-50 cursor-not-allowed"
            )}
          >
            {gameMode === '2v2' && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                gameMode === '2v2' ? "bg-secondary/20" : "bg-background-secondary"
              )}>
                <Swords className={cn(
                  "h-6 w-6",
                  gameMode === '2v2' ? "text-secondary-foreground" : "text-foreground-muted"
                )} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-display font-bold text-sm",
                  gameMode === '2v2' ? "text-secondary-foreground" : "text-foreground"
                )}>
                  2v2
                </p>
                <p className="text-[10px] text-foreground-muted mt-0.5">
                  {canPlay2v2 
                    ? "Équipes" 
                    : playerCount < 4 
                      ? "Min. 4" 
                      : "Pairs"
                  }
                </p>
              </div>
            </div>
          </button>

          {/* Quiz Mode */}
          <button
            onClick={() => canPlayQuiz && onGameModeChange('quiz')}
            disabled={disabled || !canPlayQuiz}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              gameMode === 'quiz'
                ? "border-accent bg-accent/10 shadow-lg shadow-accent/20"
                : "border-border bg-background-secondary/30 hover:border-accent/50",
              (disabled || !canPlayQuiz) && "opacity-50 cursor-not-allowed"
            )}
          >
            {gameMode === 'quiz' && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-accent" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                gameMode === 'quiz' ? "bg-accent/20" : "bg-background-secondary"
              )}>
                <Brain className={cn(
                  "h-6 w-6",
                  gameMode === 'quiz' ? "text-accent" : "text-foreground-muted"
                )} />
              </div>
              <div className="text-center">
                <p className={cn(
                  "font-display font-bold text-sm",
                  gameMode === 'quiz' ? "text-accent" : "text-foreground"
                )}>
                  Quiz
                </p>
                <p className="text-[10px] text-foreground-muted mt-0.5">
                  {canPlayQuiz ? "Culture" : "Min. 2"}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </GameCard>
  );
};
