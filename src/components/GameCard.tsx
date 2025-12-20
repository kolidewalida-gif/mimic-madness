import { ReactNode, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
  glowing?: boolean;
  variant?: "default" | "accent" | "highlight" | "premium" | "neon" | "glass";
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
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const cardRef = useRef<HTMLDivElement>(null);

  const variantClasses = {
    default: "glass-card",
    accent: "card-premium border-primary/20",
    highlight: "card-premium border-accent/30",
    premium: "card-premium",
    neon: "card-neon",
    glass: "glass-ultra rounded-2xl p-6"
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover3D || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;
    
    setTransform({ rotateX, rotateY, scale: 1.02 });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  return (
    <div 
      ref={cardRef}
      className={cn(
        "relative overflow-hidden",
        variantClasses[variant],
        animated && "animate-scaleIn transition-all duration-500",
        glowing && "glow-primary animate-glow-pulse",
        hover3D && "perspective-1000",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={hover3D ? {
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
        transition: 'transform 0.15s ease-out'
      } : undefined}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Inner border glow */}
      <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Bottom accent line for premium variants */}
      {(variant === 'premium' || variant === 'accent' || variant === 'highlight') && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      )}
    </div>
  );
};
