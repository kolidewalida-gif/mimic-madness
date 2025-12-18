import { GameCard } from "@/components/GameCard";
import { Users, Swords, Brain, Check, Sparkles } from "lucide-react";
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

  const modes = [
    {
      id: 'normal' as const,
      name: 'Normal',
      subtitle: 'Imitation',
      icon: Users,
      canPlay: true,
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/30',
      glow: 'hover:shadow-blue-500/50',
    },
    {
      id: '2v2' as const,
      name: '2v2',
      subtitle: canPlay2v2 ? 'Équipes' : playerCount < 4 ? 'Min. 4' : 'Pairs',
      icon: Swords,
      canPlay: canPlay2v2,
      gradient: 'from-orange-500 to-amber-500',
      shadow: 'shadow-orange-500/30',
      glow: 'hover:shadow-orange-500/50',
    },
    {
      id: 'quiz' as const,
      name: 'Quiz',
      subtitle: canPlayQuiz ? 'Culture' : 'Min. 2',
      icon: Brain,
      canPlay: canPlayQuiz,
      gradient: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/30',
      glow: 'hover:shadow-purple-500/50',
    },
  ];

  return (
    <div className="relative">
      {/* Glassmorphism container */}
      <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10 shadow-2xl overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <h3 className="text-lg font-display font-bold text-center uppercase tracking-wider">
              Mode de Jeu
            </h3>
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          
          {/* Mode buttons */}
          <div className="grid grid-cols-3 gap-3">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = gameMode === mode.id;
              const isDisabled = disabled || !mode.canPlay;

              return (
                <button
                  key={mode.id}
                  onClick={() => mode.canPlay && onGameModeChange(mode.id)}
                  disabled={isDisabled}
                  className={cn(
                    "relative p-4 rounded-xl transition-all duration-300 group",
                    "border-2 backdrop-blur-sm overflow-hidden",
                    isSelected
                      ? `border-white/30 bg-gradient-to-br ${mode.gradient} shadow-xl ${mode.shadow}`
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    !isDisabled && "hover:scale-[1.03] active:scale-[0.98]",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 animate-scale-in">
                      <div className="p-1 rounded-full bg-white/20 backdrop-blur-sm">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Glow effect on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 transition-opacity duration-300 rounded-xl",
                    !isDisabled && `group-hover:opacity-100 bg-gradient-to-br ${mode.gradient} blur-xl -z-10`
                  )} />

                  <div className="flex flex-col items-center gap-2 relative z-10">
                    {/* Icon container */}
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300",
                      isSelected 
                        ? "bg-white/20" 
                        : "bg-white/5 group-hover:bg-white/10"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6 transition-colors duration-300",
                        isSelected ? "text-white" : "text-foreground-muted group-hover:text-foreground"
                      )} />
                    </div>

                    {/* Text */}
                    <div className="text-center">
                      <p className={cn(
                        "font-display font-bold text-sm transition-colors duration-300",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {mode.name}
                      </p>
                      <p className={cn(
                        "text-[10px] mt-0.5 transition-colors duration-300",
                        isSelected ? "text-white/70" : "text-foreground-muted"
                      )}>
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
};
