import { Users, Swords, Brain, Check, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameModeSelectorProps {
  gameMode: 'normal' | '2v2' | 'quiz' | 'audiophone';
  onGameModeChange: (mode: 'normal' | '2v2' | 'quiz' | 'audiophone') => void;
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
  const canPlayAudioPhone = playerCount >= 2;

  const modes = [
    {
      id: 'normal' as const,
      name: 'Normal',
      subtitle: 'Imitation',
      icon: Users,
      canPlay: true,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500',
    },
    {
      id: '2v2' as const,
      name: '2v2',
      subtitle: canPlay2v2 ? 'Équipes' : playerCount < 4 ? 'Min. 4' : 'Pairs',
      icon: Swords,
      canPlay: canPlay2v2,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500',
    },
    {
      id: 'quiz' as const,
      name: 'Quiz',
      subtitle: canPlayQuiz ? 'Culture' : 'Min. 2',
      icon: Brain,
      canPlay: canPlayQuiz,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500',
    },
    {
      id: 'audiophone' as const,
      name: 'Audio Phone',
      subtitle: canPlayAudioPhone ? 'Inversé' : 'Min. 2',
      icon: Phone,
      canPlay: canPlayAudioPhone,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500',
    },
  ];

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Mode de Jeu
        </h3>
      </div>
      
      {/* Mode buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                "border-2 overflow-hidden",
                isSelected
                  ? `border-transparent bg-gradient-to-br ${mode.color} text-white shadow-lg`
                  : "border-border/50 bg-background/50 hover:bg-background hover:border-border",
                !isDisabled && "hover:scale-[1.02] active:scale-[0.98]",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="p-1 rounded-full bg-white/30">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "p-3 rounded-lg transition-all",
                  isSelected 
                    ? "bg-white/20" 
                    : "bg-background"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-all",
                    isSelected ? "text-white" : "text-foreground-muted group-hover:text-foreground"
                  )} />
                </div>

                {/* Text */}
                <div className="text-center">
                  <p className={cn(
                    "font-bold text-sm",
                    isSelected ? "text-white" : "text-foreground"
                  )}>
                    {mode.name}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isSelected ? "text-white/80" : "text-foreground-muted"
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
  );
};
