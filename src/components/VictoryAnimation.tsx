import { useEffect, useState } from "react";
import { Trophy, Sparkles, Star, PartyPopper } from "lucide-react";
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
    // Generate confetti particles
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB', '#E91E63'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
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
      {/* Confetti particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-secondary/20 via-transparent to-transparent animate-pulse" />

      {/* Main content */}
      {showContent && (
        <div className="text-center space-y-6 animate-scale-in">
          {/* Trophy with effects */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-secondary/50 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative animate-bounce-slow">
              <Trophy className="h-32 w-32 text-secondary drop-shadow-glow" />
              <Sparkles className="absolute -top-4 -right-4 h-10 w-10 text-primary animate-spin-slow" />
              <Sparkles className="absolute -bottom-4 -left-4 h-8 w-8 text-accent animate-spin-slow" style={{ animationDirection: 'reverse' }} />
              <Star className="absolute top-0 left-0 h-6 w-6 text-yellow-400 animate-ping" />
              <Star className="absolute bottom-0 right-0 h-6 w-6 text-yellow-400 animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Winner text */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <PartyPopper className="h-8 w-8 text-secondary animate-bounce" />
              <h1 className="text-5xl font-display font-black text-gradient animate-pulse">
                VICTOIRE !
              </h1>
              <PartyPopper className="h-8 w-8 text-secondary animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            
            {isTeam && teamPlayers ? (
              <div className="space-y-2">
                <p className="text-3xl font-display font-bold text-secondary neon-text-pink">
                  {teamPlayers.join(' & ')}
                </p>
                <p className="text-xl text-foreground-secondary">remportent la manche !</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-display font-bold text-secondary neon-text-pink">
                  {winnerName}
                </p>
                <p className="text-xl text-foreground-secondary">remporte la manche !</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
