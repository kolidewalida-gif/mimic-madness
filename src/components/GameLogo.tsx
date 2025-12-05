import { Zap } from "lucide-react";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const GameLogo = ({ className = "", size = "lg" }: GameLogoProps) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl", 
    lg: "text-5xl"
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 bg-gradient-neon rounded-2xl blur-xl opacity-60 animate-pulse-slow scale-150" />
        
        {/* Icon container */}
        <div className="relative bg-gradient-neon p-3 rounded-2xl shadow-neon">
          <Zap 
            className="text-primary-foreground" 
            size={iconSizes[size]} 
            strokeWidth={2.5}
            fill="currentColor"
          />
        </div>
      </div>
      
      <div className="flex flex-col">
        <h1 className={`font-display font-black ${sizeClasses[size]} text-gradient tracking-wider`}>
          MIMIC
        </h1>
        <span className={`font-display font-bold ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'} text-secondary neon-text-pink -mt-1`}>
          MASTER
        </span>
      </div>
    </div>
  );
};