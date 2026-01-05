import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  glow?: boolean;
  animate?: boolean;
}

export const HolographicCard = memo(({
  children,
  className,
  variant = "default",
  glow = false,
  animate = false,
}: HolographicCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          border: "border-emerald-500/30",
          bg: "from-emerald-950/80 via-emerald-900/60 to-teal-950/80",
          glow: "shadow-emerald-500/20",
          scanLine: "via-emerald-400/30",
        };
      case "warning":
        return {
          border: "border-amber-500/30",
          bg: "from-amber-950/80 via-amber-900/60 to-orange-950/80",
          glow: "shadow-amber-500/20",
          scanLine: "via-amber-400/30",
        };
      case "danger":
        return {
          border: "border-rose-500/30",
          bg: "from-rose-950/80 via-rose-900/60 to-red-950/80",
          glow: "shadow-rose-500/20",
          scanLine: "via-rose-400/30",
        };
      case "info":
        return {
          border: "border-cyan-500/30",
          bg: "from-cyan-950/80 via-cyan-900/60 to-blue-950/80",
          glow: "shadow-cyan-500/20",
          scanLine: "via-cyan-400/30",
        };
      default:
        return {
          border: "border-primary/30",
          bg: "from-violet-950/80 via-purple-900/60 to-fuchsia-950/80",
          glow: "shadow-primary/20",
          scanLine: "via-primary/30",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden backdrop-blur-xl",
        "bg-gradient-to-br",
        styles.bg,
        styles.border,
        "border",
        glow && `shadow-2xl ${styles.glow}`,
        animate && "hover:scale-[1.02] transition-transform duration-300",
        className
      )}
    >
      {/* Holographic shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
      
      {/* Top scan line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
        styles.scanLine
      )} />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8">
        <div className={cn("absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/50 to-transparent")} />
        <div className={cn("absolute top-0 left-0 w-px h-full bg-gradient-to-b from-primary/50 to-transparent")} />
      </div>
      <div className="absolute top-0 right-0 w-8 h-8">
        <div className={cn("absolute top-0 right-0 w-full h-px bg-gradient-to-l from-primary/50 to-transparent")} />
        <div className={cn("absolute top-0 right-0 w-px h-full bg-gradient-to-b from-primary/50 to-transparent")} />
      </div>
      <div className="absolute bottom-0 left-0 w-8 h-8">
        <div className={cn("absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-primary/50 to-transparent")} />
        <div className={cn("absolute bottom-0 left-0 w-px h-full bg-gradient-to-t from-primary/50 to-transparent")} />
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8">
        <div className={cn("absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-primary/50 to-transparent")} />
        <div className={cn("absolute bottom-0 right-0 w-px h-full bg-gradient-to-t from-primary/50 to-transparent")} />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

HolographicCard.displayName = "HolographicCard";
