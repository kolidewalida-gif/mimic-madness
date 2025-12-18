import { GameCard } from "@/components/GameCard";
import { Users, Swords, Brain, Check, Sparkles, Zap } from "lucide-react";
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
      glow: 'group-hover:shadow-blue-500/50',
      bgGlow: 'bg-blue-500/20',
    },
    {
      id: '2v2' as const,
      name: '2v2',
      subtitle: canPlay2v2 ? 'Équipes' : playerCount < 4 ? 'Min. 4' : 'Pairs',
      icon: Swords,
      canPlay: canPlay2v2,
      gradient: 'from-orange-500 to-amber-500',
      shadow: 'shadow-orange-500/30',
      glow: 'group-hover:shadow-orange-500/50',
      bgGlow: 'bg-orange-500/20',
    },
    {
      id: 'quiz' as const,
      name: 'Quiz',
      subtitle: canPlayQuiz ? 'Culture' : 'Min. 2',
      icon: Brain,
      canPlay: canPlayQuiz,
      gradient: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/30',
      glow: 'group-hover:shadow-purple-500/50',
      bgGlow: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="relative group/container">
      {/* Outer glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur-xl opacity-0 group-hover/container:opacity-100 transition-opacity duration-500" />
      
      {/* Glassmorphism container */}
      <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 group-hover/container:border-white/20">
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
                    "relative p-4 rounded-xl transition-all duration-500 group",
                    "border-2 backdrop-blur-sm overflow-hidden",
                    "animate-stagger opacity-0",
                    isSelected
                      ? `border-white/40 bg-gradient-to-br ${mode.gradient} shadow-xl ${mode.shadow}`
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    !isDisabled && "hover:scale-[1.05] active:scale-[0.98]",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 animate-bounceIn">
                      <div className="p-1 rounded-full bg-white/30 backdrop-blur-sm">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Glow effect on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 transition-opacity duration-500 rounded-xl",
                    !isDisabled && `group-hover:opacity-100 ${mode.bgGlow} blur-xl -z-10`
                  )} />

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex flex-col items-center gap-3 relative z-10">
                    {/* Icon container with animation */}
                    <div className={cn(
                      "p-4 rounded-xl transition-all duration-500",
                      isSelected 
                        ? "bg-white/20 shadow-lg" 
                        : "bg-white/5 group-hover:bg-white/15"
                    )}>
                      <Icon className={cn(
                        "h-7 w-7 transition-all duration-500",
                        isSelected ? "text-white drop-shadow-lg" : "text-foreground-muted group-hover:text-foreground",
                        !isDisabled && "group-hover:scale-110"
                      )} />
                    </div>

                    {/* Text */}
                    <div className="text-center">
                      <p className={cn(
                        "font-display font-bold text-base transition-colors duration-300",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {mode.name}
                      </p>
                      <p className={cn(
                        "text-xs mt-1 transition-colors duration-300",
                        isSelected ? "text-white/80" : "text-foreground-muted"
                      )}>
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Bottom accent when selected */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white/50 rounded-full blur-sm" />
                  )}
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
