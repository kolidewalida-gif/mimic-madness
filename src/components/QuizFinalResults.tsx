import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Trophy, Medal, Star, Crown, Sparkles, Home, Flame, Zap, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { ParticleSystem } from './ParticleSystem';

interface QuizScore {
  player_id: string;
  player_name: string;
  total_points: number;
  correct_answers: number;
  average_time_ms: number;
}

interface QuizFinalResultsProps {
  scores: QuizScore[];
  currentPlayerId: string;
  onEndGame: () => void;
}

export const QuizFinalResults = ({
  scores,
  currentPlayerId,
  onEndGame
}: QuizFinalResultsProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    playSoundEffect('celebration', 0.6);
    setShowConfetti(true);
    
    const timer = setTimeout(() => setShowConfetti(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  const winner = sortedScores[0];
  const isWinner = winner?.player_id === currentPlayerId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8 relative overflow-hidden bg-mesh">
      {/* Background effects */}
      <div className="orb-container">
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(45 100% 50% / 0.4), transparent)', top: '10%', left: '20%' }} />
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)', top: '60%', right: '10%' }} />
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(280 100% 60% / 0.3), transparent)', bottom: '10%', left: '40%' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Confetti Particles */}
      {showConfetti && (
        <ParticleSystem 
          type="confetti" 
          count={100} 
          colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']}
        />
      )}

      {/* Winner Announcement */}
      <div className="relative z-10 text-center space-y-6 animate-zoomInBounce">
        {/* Crown with glow */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-yellow-500/40 rounded-full blur-[60px] animate-pulse" />
          <Crown className="relative h-20 w-20 text-yellow-400 mx-auto animate-float drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-display font-black uppercase tracking-wide">
            {isWinner ? (
              <span className="text-gradient animate-text-glow">Victoire !</span>
            ) : (
              <span className="text-gradient">{winner?.player_name} gagne !</span>
            )}
          </h1>
          <div className="flex items-center justify-center gap-3 text-2xl text-foreground-secondary">
            <Flame className="h-6 w-6 text-orange-400 animate-bounce" />
            <span className="font-bold">{winner?.total_points} points</span>
            <Flame className="h-6 w-6 text-orange-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="relative z-10 flex items-end justify-center gap-4 max-w-2xl w-full my-8">
        {/* 2nd Place */}
        {sortedScores[1] && (
          <div className="flex flex-col items-center animate-fadeInUp" style={{ animationDelay: '300ms' }}>
            <div className={cn(
              "w-28 md:w-36 p-5 rounded-t-3xl text-center backdrop-blur-md",
              "bg-gradient-to-b from-slate-400/30 to-slate-500/20 border-2 border-slate-400/50",
              sortedScores[1].player_id === currentPlayerId && "ring-4 ring-primary shadow-lg shadow-primary/30"
            )}>
              <Medal className="h-10 w-10 text-slate-300 mx-auto mb-2 drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]" />
              <p className="font-bold text-lg truncate">{sortedScores[1].player_name}</p>
              <p className="font-display font-black text-2xl">{sortedScores[1].total_points}</p>
            </div>
            <div className="w-28 md:w-36 h-24 bg-gradient-to-b from-slate-400/40 to-slate-500/30 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-slate-400/30">
              <span className="text-5xl font-black text-slate-300">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {sortedScores[0] && (
          <div className="flex flex-col items-center animate-zoomInBounce">
            <div className={cn(
              "relative w-32 md:w-44 p-6 rounded-t-3xl text-center backdrop-blur-md overflow-hidden",
              "bg-gradient-to-b from-yellow-500/30 to-amber-600/20 border-2 border-yellow-500/60",
              sortedScores[0].player_id === currentPlayerId && "ring-4 ring-primary shadow-xl shadow-primary/40"
            )}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              
              <Trophy className="relative h-14 w-14 text-yellow-400 mx-auto mb-3 animate-pulse drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
              <p className="relative font-bold text-xl truncate">{sortedScores[0].player_name}</p>
              <p className="relative font-display font-black text-3xl text-yellow-400">{sortedScores[0].total_points}</p>
            </div>
            <div className="w-32 md:w-44 h-32 bg-gradient-to-b from-yellow-500/40 to-amber-600/30 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-yellow-500/40">
              <span className="text-6xl font-black text-yellow-400 drop-shadow-lg">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {sortedScores[2] && (
          <div className="flex flex-col items-center animate-fadeInUp" style={{ animationDelay: '500ms' }}>
            <div className={cn(
              "w-28 md:w-36 p-5 rounded-t-3xl text-center backdrop-blur-md",
              "bg-gradient-to-b from-amber-700/30 to-amber-800/20 border-2 border-amber-600/50",
              sortedScores[2].player_id === currentPlayerId && "ring-4 ring-primary shadow-lg shadow-primary/30"
            )}>
              <Medal className="h-10 w-10 text-amber-600 mx-auto mb-2 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" />
              <p className="font-bold text-lg truncate">{sortedScores[2].player_name}</p>
              <p className="font-display font-black text-2xl">{sortedScores[2].total_points}</p>
            </div>
            <div className="w-28 md:w-36 h-20 bg-gradient-to-b from-amber-700/40 to-amber-800/30 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-amber-600/30">
              <span className="text-5xl font-black text-amber-600">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Results Card */}
      <div className="relative z-10 max-w-xl w-full card-premium p-6 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
        <h3 className="text-xl font-display font-bold mb-6 text-center flex items-center justify-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          Classement Complet
          <Star className="h-5 w-5 text-accent" />
        </h3>
        <div className="space-y-3">
          {sortedScores.map((score, index) => (
            <div 
              key={score.player_id}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl transition-all duration-300",
                "backdrop-blur-sm border",
                score.player_id === currentPlayerId 
                  ? "bg-primary/20 border-primary/50 ring-2 ring-primary/30" 
                  : "bg-card/30 border-border/50"
              )}
            >
              <div className="flex items-center gap-4">
                <span className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black",
                  index === 0 && "bg-yellow-500/30 text-yellow-400",
                  index === 1 && "bg-slate-400/30 text-slate-300",
                  index === 2 && "bg-amber-600/30 text-amber-500",
                  index > 2 && "bg-muted text-foreground-muted"
                )}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </span>
                <span className="font-bold text-lg">{score.player_name}</span>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-xl">{score.total_points} pts</span>
                <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
                  <Zap className="h-4 w-4 text-accent" />
                  {score.correct_answers} bonnes
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* End Game Button */}
      <Button 
        onClick={onEndGame} 
        variant="hero"
        size="xl"
        className="relative z-10 gap-3 h-16 px-10 rounded-2xl animate-fadeInUp"
        style={{ animationDelay: '0.8s' }}
      >
        <Home className="h-6 w-6" />
        <span className="font-bold text-lg">Retour à l'accueil</span>
        <PartyPopper className="h-5 w-5" />
      </Button>
    </div>
  );
};
