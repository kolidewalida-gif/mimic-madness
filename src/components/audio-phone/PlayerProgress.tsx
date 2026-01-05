import { memo } from "react";
import { Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerProgressProps {
  current: number;
  total: number;
  label?: string;
  showIcons?: boolean;
  variant?: "default" | "success";
  className?: string;
}

export const PlayerProgress = memo(({
  current,
  total,
  label = "joueurs",
  showIcons = true,
  variant = "default",
  className,
}: PlayerProgressProps) => {
  const progress = (current / total) * 100;
  const isComplete = current === total;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcons && (
            isComplete ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-light" />
              </div>
            )
          )}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className={cn(
          "font-bold text-lg",
          isComplete ? "text-emerald-400" : "text-foreground"
        )}>
          {current} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-muted/30 backdrop-blur-sm">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] bg-[length:20px_100%]" />
        
        {/* Progress fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 relative overflow-hidden",
            isComplete 
              ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400" 
              : "bg-gradient-to-r from-violet-600 via-primary to-fuchsia-500"
          )}
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
        </div>

        {/* Segment indicators */}
        <div className="absolute inset-0 flex">
          {[...Array(total - 1)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-background/30"
            />
          ))}
        </div>
      </div>

      {/* Player dots */}
      <div className="flex justify-center gap-2">
        {[...Array(total)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              i < current
                ? isComplete
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
});

PlayerProgress.displayName = "PlayerProgress";
