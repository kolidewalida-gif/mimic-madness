import { Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export const GameLogo = ({ className = "", size = "lg", animated = true }: GameLogoProps) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl", 
    lg: "text-5xl"
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 36
  };

  const iconContainerSizes = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4"
  };

  return (
    <div className={cn(
      "flex items-center gap-4 group",
      animated && "hover:scale-105 transition-transform duration-500",
      className
    )}>
      {/* Modern icon with glow */}
      <div className="relative">
        {/* Outer glow */}
        <div className={cn(
          "absolute inset-0 bg-primary rounded-xl blur-xl opacity-50",
          animated && "group-hover:opacity-80 transition-opacity duration-500"
        )} />
        
        {/* Animated ring */}
        <div className={cn(
          "absolute -inset-1 rounded-xl opacity-0 transition-opacity duration-500",
          "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]",
          animated && "group-hover:opacity-100 animate-gradient"
        )} />
        
        {/* Icon container */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary to-primary-light rounded-xl",
          iconContainerSizes[size],
          animated && "group-hover:shadow-glow transition-shadow duration-500"
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
          "font-bold tracking-tight",
          sizeClasses[size]
        )}>
          <span className="inline-block text-gradient animate-fadeIn">MIMIC</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-bold text-accent tracking-widest",
            size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm',
            animated && "group-hover:text-glow-cyan transition-all duration-500"
          )}>
            <span className="inline-block animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              MASTER
            </span>
          </span>
          {size === 'lg' && (
            <Sparkles className="h-5 w-5 text-accent animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          )}
        </div>
      </div>
    </div>
  );
};
