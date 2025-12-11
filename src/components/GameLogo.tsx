import { Play } from "lucide-react";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const GameLogo = ({ className = "", size = "lg" }: GameLogoProps) => {
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Netflix-style M icon */}
      <div className="relative flex items-center justify-center">
        <div className="bg-primary rounded p-1.5">
          <Play 
            className="text-white" 
            size={iconSizes[size]} 
            fill="currentColor"
          />
        </div>
      </div>
      
      <div className="flex flex-col leading-none">
        <h1 className={`font-display ${sizeClasses[size]} text-white tracking-wider`}>
          MIMIC
        </h1>
        <span className={`font-display ${size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-xs'} text-primary tracking-widest`}>
          MASTER
        </span>
      </div>
    </div>
  );
};
