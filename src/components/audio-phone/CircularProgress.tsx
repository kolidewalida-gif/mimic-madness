import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  variant?: "default" | "recording" | "success" | "warning";
  children?: ReactNode;
  className?: string;
  showGlow?: boolean;
}

export const CircularProgress = memo(({
  progress,
  size = 160,
  strokeWidth = 6,
  variant = "default",
  children,
  className,
  showGlow = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColors = () => {
    switch (variant) {
      case "recording":
        return {
          track: "stroke-rose-500/20",
          progress: "stroke-rose-500",
          glow: "drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]",
        };
      case "success":
        return {
          track: "stroke-emerald-500/20",
          progress: "stroke-emerald-500",
          glow: "drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]",
        };
      case "warning":
        return {
          track: "stroke-amber-500/20",
          progress: "stroke-amber-500",
          glow: "drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]",
        };
      default:
        return {
          track: "stroke-primary/20",
          progress: "stroke-primary",
          glow: "drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]",
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn("-rotate-90", showGlow && colors.glow)}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.track}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(colors.progress, "transition-all duration-200")}
        />
        {/* Animated glow dot at progress end */}
        {progress > 0 && progress < 100 && (
          <circle
            cx={size / 2 + radius * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={size / 2 + radius * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 2 + 2}
            className={cn(
              "fill-current",
              variant === "recording" ? "text-rose-400" : "text-primary-light",
              "animate-pulse"
            )}
          />
        )}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
});

CircularProgress.displayName = "CircularProgress";
