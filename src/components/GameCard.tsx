import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  glowing?: boolean;
}

export const GameCard = ({ 
  children, 
  className = "", 
  animated = true, 
  glowing = false 
}: GameCardProps) => {
  return (
    <div 
      className={cn(
        "glass-card",
        animated && "animate-scaleIn hover-lift",
        glowing && "glow-primary",
        className
      )}
    >
      {children}
    </div>
  );
};