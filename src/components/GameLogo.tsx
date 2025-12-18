import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export const GameLogo = ({ className = "", size = "lg", animated = true }: GameLogoProps) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl", 
    lg: "text-4xl"
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28
  };

  const iconContainerSizes = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2"
  };

  return (
    <div className={cn(
      "flex items-center gap-3 group",
      animated && "hover:scale-105 transition-transform duration-300",
      className
    )}>
      {/* Netflix-style M icon with glow */}
      <div className="relative">
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 bg-primary rounded blur-lg opacity-50",
          animated && "group-hover:opacity-80 transition-opacity duration-300"
        )} />
        
        {/* Icon container */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary to-primary-light rounded",
          iconContainerSizes[size],
          animated && "group-hover:shadow-glow transition-shadow duration-300"
        )}>
          <Play 
            className="text-white drop-shadow-lg" 
            size={iconSizes[size]} 
            fill="currentColor"
          />
        </div>
      </div>
      
      {/* Text with premium styling */}
      <div className="flex flex-col leading-none">
        <h1 className={cn(
          "font-display text-white tracking-wider",
          sizeClasses[size],
          animated && "group-hover:text-gradient transition-colors duration-300"
        )}>
          <span className="inline-block animate-fadeIn">MIMIC</span>
        </h1>
        <span className={cn(
          "font-display text-primary tracking-widest",
          size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-xs',
          animated && "group-hover:drop-shadow-glow transition-all duration-300"
        )}>
          <span className="inline-block animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            MASTER
          </span>
        </span>
      </div>
    </div>
  );
};
