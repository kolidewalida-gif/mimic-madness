import { memo } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  isRecording: boolean;
  isLoading?: boolean;
  audioLevel?: number;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RecordButton = memo(({
  isRecording,
  isLoading = false,
  audioLevel = 0,
  onClick,
  disabled = false,
  size = "lg",
}: RecordButtonProps) => {
  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { button: "w-20 h-20", icon: "w-8 h-8", rings: 3 };
      case "md":
        return { button: "w-28 h-28", icon: "w-10 h-10", rings: 4 };
      case "lg":
        return { button: "w-36 h-36", icon: "w-14 h-14", rings: 5 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings when recording */}
      {isRecording && (
        <>
          {[...Array(sizeStyles.rings)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-rose-500/30 animate-ping"
              style={{
                width: `${100 + i * 30 + audioLevel * 50}%`,
                height: `${100 + i * 30 + audioLevel * 50}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${1.5 + i * 0.3}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Audio level reactive glow */}
      {isRecording && (
        <div
          className="absolute rounded-full bg-gradient-to-r from-rose-500/40 via-red-500/40 to-orange-500/40 blur-2xl transition-all duration-100"
          style={{
            width: `${120 + audioLevel * 80}%`,
            height: `${120 + audioLevel * 80}%`,
          }}
        />
      )}

      {/* Main button */}
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={cn(
          "relative rounded-full flex items-center justify-center",
          "transition-all duration-300",
          "border-4",
          sizeStyles.button,
          isRecording
            ? "bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 border-rose-400/50 shadow-[0_0_40px_rgba(244,63,94,0.4)]"
            : "bg-gradient-to-br from-violet-600 via-primary to-fuchsia-500 border-primary/50 shadow-[0_0_30px_rgba(139,92,246,0.3)]",
          !disabled && !isRecording && "hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-105",
          !disabled && isRecording && "hover:shadow-[0_0_60px_rgba(244,63,94,0.6)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Inner glow */}
        <div className={cn(
          "absolute inset-2 rounded-full",
          isRecording 
            ? "bg-gradient-to-br from-rose-400/30 to-transparent" 
            : "bg-gradient-to-br from-white/20 to-transparent"
        )} />

        {/* Icon */}
        {isLoading ? (
          <Loader2 className={cn(sizeStyles.icon, "text-white animate-spin")} />
        ) : isRecording ? (
          <MicOff className={cn(sizeStyles.icon, "text-white relative z-10")} />
        ) : (
          <Mic className={cn(sizeStyles.icon, "text-white relative z-10")} />
        )}

        {/* Recording indicator dot */}
        {isRecording && (
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-white animate-pulse shadow-lg" />
        )}
      </button>

      {/* Status text */}
      <div className={cn(
        "absolute -bottom-8 text-sm font-medium",
        isRecording ? "text-rose-400" : "text-muted-foreground"
      )}>
        {isRecording ? "Appuie pour arrêter" : "Appuie pour enregistrer"}
      </div>
    </div>
  );
});

RecordButton.displayName = "RecordButton";
