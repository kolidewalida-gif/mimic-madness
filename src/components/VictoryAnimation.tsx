import { useEffect, useState } from "react";
import { Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface VictoryAnimationProps {
  winnerName: string;
  isTeam?: boolean;
  teamPlayers?: string[];
}

export const VictoryAnimation = ({ winnerName, isTeam, teamPlayers }: VictoryAnimationProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Generate confetti particles with Netflix-like colors
    const colors = ['#E50914', '#B20710', '#FFD700', '#FFFFFF', '#FF4444'];
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
    
    // Show content after initial animation
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/80" />
      
      {/* Confetti particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm animate-confetti"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      {/* Main content */}
      {showContent && (
        <div className="relative text-center space-y-6 animate-scale-in">
          {/* Trophy with glow */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
            <div className="relative animate-bounce-slow">
              <Trophy className="h-24 w-24 text-primary drop-shadow-glow" />
              <Star className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-ping" />
            </div>
          </div>

          {/* Winner text */}
          <div className="space-y-4">
            <h1 className="text-5xl font-display text-white tracking-wider">
              VICTOIRE
            </h1>
            
            {isTeam && teamPlayers ? (
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-primary">
                  {teamPlayers.join(' & ')}
                </p>
                <p className="text-lg text-foreground-secondary">remportent la manche</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-primary">
                  {winnerName}
                </p>
                <p className="text-lg text-foreground-secondary">remporte la manche</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
