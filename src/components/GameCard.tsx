import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  glowing?: boolean;
  variant?: "default" | "accent" | "highlight";
}

export const GameCard = ({ 
  children, 
  className = "", 
  animated = true, 
  glowing = false,
  variant = "default"
}: GameCardProps) => {
  const variantClasses = {
    default: "border-glass-border",
    accent: "border-primary/30",
    highlight: "border-secondary/30"
  };

  return (
    <div 
      className={cn(
        "relative rounded-2xl p-6 backdrop-blur-xl",
        "bg-gradient-to-br from-card/80 to-background-secondary/60",
        "border",
        variantClasses[variant],
        animated && "animate-scaleIn hover-lift",
        glowing && "shadow-neon animate-glow-pulse",
        className
      )}
    >
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};