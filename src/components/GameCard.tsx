import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  glowing?: boolean;
  variant?: "default" | "accent" | "highlight" | "premium";
  hover3D?: boolean;
}

export const GameCard = ({ 
  children, 
  className = "", 
  animated = true, 
  glowing = false,
  variant = "default",
  hover3D = false
}: GameCardProps) => {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const variantClasses = {
    default: "border-border bg-card",
    accent: "border-primary/30 bg-gradient-to-br from-card to-card-hover",
    highlight: "border-primary/50 bg-gradient-to-br from-primary/10 to-card",
    premium: "border-white/20 bg-gradient-to-br from-card via-card-hover to-card"
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover3D) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div 
      className={cn(
        "relative rounded-xl p-6 overflow-hidden",
        "border",
        variantClasses[variant],
        animated && "animate-scaleIn transition-all duration-500",
        animated && "hover:shadow-xl hover:shadow-primary/10",
        glowing && "shadow-glow animate-glow-pulse",
        hover3D && "perspective-1000",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={hover3D ? {
        transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transition: 'transform 0.1s ease-out'
      } : undefined}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Bottom accent line */}
      {variant !== 'default' && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      )}
    </div>
  );
};
