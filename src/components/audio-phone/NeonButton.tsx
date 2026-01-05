import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "success" | "danger" | "info" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  pulse?: boolean;
  icon?: ReactNode;
}

export const NeonButton = memo(({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className,
  pulse = false,
  icon,
}: NeonButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: "from-emerald-600 via-emerald-500 to-teal-500",
          border: "border-emerald-400/50",
          shadow: "shadow-emerald-500/40",
          text: "text-white",
          hover: "hover:shadow-emerald-400/60 hover:border-emerald-300/70",
        };
      case "danger":
        return {
          bg: "from-rose-600 via-rose-500 to-red-500",
          border: "border-rose-400/50",
          shadow: "shadow-rose-500/40",
          text: "text-white",
          hover: "hover:shadow-rose-400/60 hover:border-rose-300/70",
        };
      case "info":
        return {
          bg: "from-cyan-600 via-cyan-500 to-blue-500",
          border: "border-cyan-400/50",
          shadow: "shadow-cyan-500/40",
          text: "text-white",
          hover: "hover:shadow-cyan-400/60 hover:border-cyan-300/70",
        };
      case "warning":
        return {
          bg: "from-amber-600 via-amber-500 to-orange-500",
          border: "border-amber-400/50",
          shadow: "shadow-amber-500/40",
          text: "text-white",
          hover: "hover:shadow-amber-400/60 hover:border-amber-300/70",
        };
      default:
        return {
          bg: "from-violet-600 via-primary to-fuchsia-500",
          border: "border-primary/50",
          shadow: "shadow-primary/40",
          text: "text-white",
          hover: "hover:shadow-primary/60 hover:border-primary-light/70",
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-4 py-2 text-sm gap-1.5";
      case "lg":
        return "px-8 py-4 text-lg gap-3";
      case "xl":
        return "px-10 py-5 text-xl gap-4";
      default:
        return "px-6 py-3 text-base gap-2";
    }
  };

  const styles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center font-semibold rounded-xl",
        "bg-gradient-to-r",
        styles.bg,
        styles.border,
        styles.text,
        "border-2",
        "shadow-lg",
        styles.shadow,
        "transition-all duration-300",
        !disabled && styles.hover,
        !disabled && "hover:scale-105 active:scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        pulse && "animate-pulse-glow",
        sizeStyles,
        className
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      
      {/* Content */}
      <span className="relative flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
});

NeonButton.displayName = "NeonButton";
