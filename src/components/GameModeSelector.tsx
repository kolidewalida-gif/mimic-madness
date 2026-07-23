import { Users, Swords, Brain, Check, Phone, Image, Landmark, UserX, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInkMode } from "@/hooks/useInkMode";
import { LobbyGameMode } from "@/lib/gameModes";

interface GameModeSelectorProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  disabled?: boolean;
  playerCount: number;
  isAdmin?: boolean;
}

export const GameModeSelector = ({
  gameMode,
  onGameModeChange,
  disabled = false,
  playerCount,
  isAdmin = false,
}: GameModeSelectorProps) => {
  const { isInkMode, inkFont } = useInkMode();
  const canPlay2v2 = isAdmin || (playerCount >= 4 && playerCount % 2 === 0);
  const canPlayQuiz = isAdmin || playerCount >= 2;
  const canPlayAudioPhone = isAdmin || playerCount >= 2;
  const canPlayPixoguess = isAdmin || playerCount >= 2;
  const canPlayMonopoly = isAdmin || playerCount >= 2;
  const canPlayUndercover = isAdmin || playerCount >= 3;
  const canPlayMemorise = isAdmin || playerCount >= 2;

  const modes = [
    {
      id: 'normal' as const,
      name: 'Normal',
      subtitle: 'Imitation',
      icon: Users,
      canPlay: true,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: '2v2' as const,
      name: '2v2',
      subtitle: canPlay2v2 ? 'Équipes' : playerCount < 4 ? 'Min. 4' : 'Pairs',
      icon: Swords,
      canPlay: canPlay2v2,
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'quiz' as const,
      name: 'Quiz',
      subtitle: canPlayQuiz ? 'Culture' : 'Min. 2',
      icon: Brain,
      canPlay: canPlayQuiz,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'audiophone' as const,
      name: 'Audio Phone',
      subtitle: canPlayAudioPhone ? 'Inversé' : 'Min. 2',
      icon: Phone,
      canPlay: canPlayAudioPhone,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'pixoguess' as const,
      name: 'BlurRush',
      subtitle: canPlayPixoguess ? 'Devine vite !' : 'Min. 2',
      icon: Image,
      canPlay: canPlayPixoguess,
      color: 'from-fuchsia-500 to-violet-600',
      bgColor: 'bg-fuchsia-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'monopoly' as const,
      name: 'Monopoly',
      subtitle: canPlayMonopoly ? '3D Board' : 'Min. 2',
      icon: Landmark,
      canPlay: canPlayMonopoly,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'undercover' as const,
      name: 'Undercover',
      subtitle: canPlayUndercover ? 'Démasque !' : 'Min. 3',
      icon: UserX,
      canPlay: canPlayUndercover,
      color: 'from-rose-500 to-red-600',
      bgColor: 'bg-rose-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
    {
      id: 'memorise' as const,
      name: 'Blindtest',
      subtitle: canPlayMemorise ? 'Devine la musique !' : 'Min. 2',
      icon: Music,
      canPlay: canPlayMemorise,
      color: 'from-fuchsia-500 to-purple-600',
      bgColor: 'bg-fuchsia-500',
      inkColor: 'border-primary bg-primary text-primary-foreground',
    },
  ];

  return (
    <div className={cn(
      "rounded-2xl p-5 space-y-4",
      isInkMode 
        ? "bg-card border-2 border-border" 
        : "bg-card/60 backdrop-blur-sm border border-border/30"
    )}>
      {/* Header */}
      <div className="text-center">
        <h3 
          className={cn(
            "text-sm font-semibold uppercase tracking-wider",
            isInkMode ? "text-primary font-black" : "text-foreground-muted"
          )}
          style={isInkMode ? inkFont : undefined}
        >
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
              type="button"
              onClick={() => !isDisabled && onGameModeChange(mode.id)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={cn(
                "menu-focus relative p-4 rounded-xl transition-all duration-300 group",
                "border-2 overflow-hidden",
                isInkMode
                  ? isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                    : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
                  : isSelected
                    ? `border-transparent bg-gradient-to-br ${mode.color} text-white shadow-lg`
                    : "border-border/50 bg-background/50 hover:bg-background hover:border-border",
                !isDisabled && "hover:scale-[1.02] active:scale-[0.98]",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className={cn(
                    "p-1 rounded-full",
                    isInkMode ? "bg-primary-foreground/20" : "bg-white/30"
                  )}>
                    <Check className={cn(
                      "h-3 w-3",
                      isInkMode ? "text-primary-foreground" : "text-white"
                    )} />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "p-3 rounded-lg transition-all",
                  isInkMode
                    ? isSelected 
                      ? "bg-primary-foreground/20" 
                      : "bg-muted border border-border"
                    : isSelected 
                      ? "bg-white/20" 
                      : "bg-background"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-all",
                    isInkMode
                      ? isSelected 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground group-hover:text-primary"
                      : isSelected 
                        ? "text-white" 
                        : "text-foreground-muted group-hover:text-foreground"
                  )} />
                </div>

                {/* Text */}
                <div className="text-center">
                  <p className={cn(
                    "font-bold text-sm",
                    isInkMode
                      ? isSelected ? "text-primary-foreground" : "text-foreground"
                      : isSelected ? "text-white" : "text-foreground"
                  )}>
                    {mode.name}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isInkMode
                      ? isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      : isSelected ? "text-white/80" : "text-foreground-muted"
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
