import { cn } from "@/lib/utils";
import mimicMasterLogo from "@/assets/mimic-master-logo.png";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export const GameLogo = ({ className = "", size = "lg", animated = true }: GameLogoProps) => {
  const sizeClasses = {
    sm: "h-12",
    md: "h-20", 
    lg: "h-32"
  };

  return (
    <div className={cn(
      "flex items-center justify-center group",
      animated && "hover:scale-105 transition-transform duration-500",
      className
    )}>
      {/* Logo with glow effect */}
      <div className="relative">
        {/* Outer glow */}
        <div className={cn(
          "absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-amber-500 via-primary to-cyan-400",
          animated && "group-hover:opacity-60 transition-opacity duration-500 animate-pulse"
        )} />
        
        {/* Logo image */}
        <img 
          src={mimicMasterLogo}
          alt="Mimic Master - Le jeu d'imitation ultime"
          className={cn(
            "relative object-contain drop-shadow-2xl",
            sizeClasses[size],
            animated && "group-hover:drop-shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-500"
          )}
        />
      </div>
    </div>
  );
};
