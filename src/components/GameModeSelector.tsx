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
      gradient: 'from-blue-500 to-cyan-400',
      bgGlow: 'bg-blue-500/30',
      borderColor: 'border-blue-400/50',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      id: '2v2' as const,
      name: '2v2',
      subtitle: canPlay2v2 ? 'Équipes' : playerCount < 4 ? 'Min. 4' : 'Pairs',
      icon: Swords,
      canPlay: canPlay2v2,
      gradient: 'from-orange-500 to-amber-400',
      bgGlow: 'bg-orange-500/30',
      borderColor: 'border-orange-400/50',
      shadowColor: 'shadow-orange-500/30',
    },
    {
      id: 'quiz' as const,
      name: 'Quiz',
      subtitle: canPlayQuiz ? 'Culture' : 'Min. 2',
      icon: Brain,
      canPlay: canPlayQuiz,
      gradient: 'from-purple-500 to-pink-400',
      bgGlow: 'bg-purple-500/30',
      borderColor: 'border-purple-400/50',
      shadowColor: 'shadow-purple-500/30',
    },
  ];

  return (
    <div className="relative group/container">
      {/* Outer glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-0 group-hover/container:opacity-100 transition-all duration-700" />
      
      {/* Main container */}
      <div className="relative card-premium overflow-hidden transition-all duration-500 group-hover/container:border-primary/30">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        <div className="relative space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="text-xl font-bold text-center uppercase tracking-wider text-gradient">
              Mode de Jeu
            </h3>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          
          {/* Mode buttons */}
          <div className="grid grid-cols-3 gap-4">
            {modes.map((mode, index) => {
              const Icon = mode.icon;
              const isSelected = gameMode === mode.id;
              const isDisabled = disabled || !mode.canPlay;

              return (
                <button
                  key={mode.id}
                  onClick={() => mode.canPlay && onGameModeChange(mode.id)}
                  disabled={isDisabled}
                  className={cn(
                    "relative p-5 rounded-2xl transition-all duration-500 group",
                    "border-2 backdrop-blur-sm overflow-hidden",
                    "animate-stagger opacity-0",
                    isSelected
                      ? `${mode.borderColor} bg-gradient-to-br ${mode.gradient} shadow-xl ${mode.shadowColor}`
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    !isDisabled && "hover:scale-105 active:scale-98",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 animate-bounceIn">
                      <div className="p-1.5 rounded-full bg-white/30 backdrop-blur-sm">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Glow effect on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 transition-all duration-500 rounded-2xl -z-10",
                    !isDisabled && `group-hover:opacity-100 ${mode.bgGlow} blur-xl`
                  )} />

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex flex-col items-center gap-4 relative z-10">
                    {/* Icon container */}
                    <div className={cn(
                      "p-5 rounded-xl transition-all duration-500",
                      isSelected 
                        ? "bg-white/25 shadow-lg" 
                        : "bg-white/5 group-hover:bg-white/15"
                    )}>
                      <Icon className={cn(
                        "h-8 w-8 transition-all duration-500",
                        isSelected ? "text-white drop-shadow-lg" : "text-foreground-muted group-hover:text-foreground",
                        !isDisabled && "group-hover:scale-110"
                      )} />
                    </div>

                    {/* Text */}
                    <div className="text-center">
                      <p className={cn(
                        "font-bold text-lg transition-colors duration-300",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {mode.name}
                      </p>
                      <p className={cn(
                        "text-sm mt-1 font-medium transition-colors duration-300",
                        isSelected ? "text-white/80" : "text-foreground-muted"
                      )}>
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Bottom accent when selected */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-white/50 rounded-full blur-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
