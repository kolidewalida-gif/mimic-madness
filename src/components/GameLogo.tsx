import { Play } from "lucide-react";

interface GameLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const GameLogo = ({ className = "", size = "lg" }: GameLogoProps) => {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl", 
    lg: "text-6xl"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-lg opacity-75 animate-pulse-slow" />
        <div className="relative bg-gradient-to-r from-primary to-secondary p-4 rounded-full">
          <Play className="text-white fill-current" size={size === "lg" ? 32 : size === "md" ? 24 : 16} />
        </div>
      </div>
      <h1 className={`font-bold text-gradient ${sizeClasses[size]}`}>
        Jeu de l'Imitation Pro
      </h1>
    </div>
  );
};