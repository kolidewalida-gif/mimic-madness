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
    default: "border-border",
    accent: "border-primary/30",
    highlight: "border-primary/50"
  };

  return (
    <div 
      className={cn(
        "relative rounded-lg p-6",
        "bg-card",
        "border",
        variantClasses[variant],
        animated && "animate-scaleIn transition-all duration-300 hover:bg-card-hover",
        glowing && "shadow-glow",
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
