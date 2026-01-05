import { memo } from "react";
import { cn } from "@/lib/utils";

interface FuturisticBackgroundProps {
  variant?: "default" | "recording" | "listening" | "reveal";
  className?: string;
}

export const FuturisticBackground = memo(({ 
  variant = "default",
  className 
}: FuturisticBackgroundProps) => {
  const getColors = () => {
    switch (variant) {
      case "recording":
        return {
          primary: "from-rose-600/20 via-red-500/10 to-orange-500/20",
          secondary: "from-rose-500/30 to-red-600/20",
          accent: "bg-rose-500/10",
          glow: "shadow-rose-500/20",
        };
      case "listening":
        return {
          primary: "from-cyan-600/20 via-blue-500/10 to-teal-500/20",
          secondary: "from-cyan-500/30 to-blue-600/20",
          accent: "bg-cyan-500/10",
          glow: "shadow-cyan-500/20",
        };
      case "reveal":
        return {
          primary: "from-violet-600/20 via-fuchsia-500/10 to-pink-500/20",
          secondary: "from-violet-500/30 to-fuchsia-600/20",
          accent: "bg-violet-500/10",
          glow: "shadow-violet-500/20",
        };
      default:
        return {
          primary: "from-primary/20 via-accent/10 to-secondary/20",
          secondary: "from-primary/30 to-accent/20",
          accent: "bg-primary/10",
          glow: "shadow-primary/20",
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Cyber grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      
      {/* Animated horizontal scan lines */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(139,92,246,0.05)_2px,rgba(139,92,246,0.05)_4px)]" />
        <div 
          className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan"
          style={{ animationDuration: "3s" }}
        />
      </div>

      {/* Floating orbs with glow */}
      <div className={cn(
        "absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] animate-float opacity-60 bg-gradient-to-br",
        colors.secondary
      )} />
      <div className={cn(
        "absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full blur-[100px] animate-float opacity-50 bg-gradient-to-br",
        colors.primary
      )} style={{ animationDelay: "-2s", animationDuration: "8s" }} />
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse-slow opacity-30",
        colors.accent
      )} />

      {/* Corner decorations */}
      <svg className="absolute top-4 left-4 w-20 h-20 text-primary/20" viewBox="0 0 100 100">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0 40 L0 20" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </svg>
      <svg className="absolute top-4 right-4 w-20 h-20 text-primary/20 rotate-90" viewBox="0 0 100 100">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-4 left-4 w-20 h-20 text-primary/20 -rotate-90" viewBox="0 0 100 100">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-4 right-4 w-20 h-20 text-primary/20 rotate-180" viewBox="0 0 100 100">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </svg>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

FuturisticBackground.displayName = "FuturisticBackground";
