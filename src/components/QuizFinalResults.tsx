import { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Trophy, Medal, Star, Crown, Sparkles, Home, Flame, Zap, PartyPopper, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { ParticleSystem } from './ParticleSystem';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';
import { usePlayerLevel, XP_REWARDS } from '@/hooks/usePlayerLevel';

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
  const [showPodium, setShowPodium] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const { addXp } = usePlayerLevel();
  const xpAwardedRef = useRef(false);

  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  const winner = sortedScores[0];
  const isWinner = winner?.player_id === currentPlayerId;

  useEffect(() => {
    playSoundEffect('celebration', 0.6);
    
    // Award XP based on position (only once)
    const awardXp = async () => {
      if (xpAwardedRef.current) return;
      xpAwardedRef.current = true;

      const playerRank = sortedScores.findIndex(s => s.player_id === currentPlayerId);
      
      if (playerRank === 0) {
        // Winner gets quizWin XP
        const result = await addXp('quizWin');
        emitXpGain(XP_REWARDS.quizWin, 'quizWin');
        if (result?.leveledUp) {
          emitLevelUpNotification(result.newLevel);
        }
      } else {
        // Others get participation XP
        const result = await addXp('gameParticipation');
        emitXpGain(XP_REWARDS.gameParticipation, 'gameParticipation');
        if (result?.leveledUp) {
          emitLevelUpNotification(result.newLevel);
        }
      }
    };

    awardXp();
    
    // Staggered animations
    const timer1 = setTimeout(() => setShowWinner(true), 300);
    const timer2 = setTimeout(() => setShowPodium(true), 800);
    const timer3 = setTimeout(() => setShowConfetti(true), 1000);
    const timer4 = setTimeout(() => setShowConfetti(false), 8000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [addXp, currentPlayerId, sortedScores]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden bg-mesh">
      {/* Background effects with gold tint */}
      <div className="orb-container">
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(45 100% 50% / 0.5), transparent)', top: '10%', left: '20%' }} />
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)', top: '60%', right: '10%' }} />
        <div className="orb" style={{ background: 'radial-gradient(circle, hsl(280 100% 60% / 0.3), transparent)', bottom: '10%', left: '40%' }} />
      </div>
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      {/* Confetti Particles */}
      {showConfetti && (
        <ParticleSystem 
          type="confetti" 
          count={150} 
          colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F8B500', '#FF69B4']}
          speed={1.2}
          gravity={0.15}
        />
      )}

      {/* Winner Announcement */}
      <div className={cn(
        "relative z-10 text-center space-y-4 transition-all duration-700",
        showWinner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
      )}>
        {/* Crown with epic glow */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-yellow-500/50 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-[40px] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Crown className="relative h-16 w-16 md:h-20 md:w-20 text-yellow-400 mx-auto animate-crownBounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-wide">
            {isWinner ? (
              <span className="text-gradient animate-text-glow">Victoire !</span>
            ) : (
              <span className="text-gradient">{winner?.player_name} gagne !</span>
            )}
          </h1>
          <div className="flex items-center justify-center gap-2 text-xl text-foreground-secondary">
            <Flame className="h-5 w-5 text-orange-400 animate-bounce" />
            <span className="font-bold">{winner?.total_points} points</span>
            <Flame className="h-5 w-5 text-orange-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className={cn(
        "relative z-10 flex items-end justify-center gap-3 max-w-2xl w-full my-4 transition-all duration-700",
        showPodium ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
      )}>
        {/* 2nd Place */}
        {sortedScores[1] && (
          <div 
            className="flex flex-col items-center animate-podiumRise" 
            style={{ animationDelay: '400ms' }}
          >
            <div className={cn(
              "w-24 md:w-32 p-4 rounded-t-2xl text-center backdrop-blur-md",
              "bg-gradient-to-b from-slate-400/40 to-slate-500/30 border-2 border-slate-400/60",
              sortedScores[1].player_id === currentPlayerId && "ring-2 ring-primary shadow-lg shadow-primary/30"
            )}>
              <Medal className="h-8 w-8 text-slate-300 mx-auto mb-1 drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]" />
              <p className="font-bold text-sm truncate">{sortedScores[1].player_name}</p>
              <p className="font-display font-black text-xl">{sortedScores[1].total_points}</p>
              <p className="text-xs text-foreground-muted">{sortedScores[1].correct_answers} ✓</p>
            </div>
            <div className="w-24 md:w-32 h-20 bg-gradient-to-b from-slate-400/50 to-slate-500/40 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-slate-400/40">
              <span className="text-4xl font-black text-slate-300">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {sortedScores[0] && (
          <div 
            className="flex flex-col items-center animate-podiumRise"
            style={{ animationDelay: '200ms' }}
          >
            <div className={cn(
              "relative w-28 md:w-40 p-5 rounded-t-2xl text-center backdrop-blur-md overflow-hidden",
              "bg-gradient-to-b from-yellow-500/40 to-amber-600/30 border-2 border-yellow-500/70",
              sortedScores[0].player_id === currentPlayerId && "ring-2 ring-primary shadow-xl shadow-primary/40"
            )}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              
              <Trophy className="relative h-12 w-12 text-yellow-400 mx-auto mb-2 animate-float drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
              <p className="relative font-bold text-base truncate">{sortedScores[0].player_name}</p>
              <p className="relative font-display font-black text-2xl text-yellow-400">{sortedScores[0].total_points}</p>
              <p className="relative text-xs text-foreground-muted">{sortedScores[0].correct_answers} ✓</p>
            </div>
            <div className="w-28 md:w-40 h-28 bg-gradient-to-b from-yellow-500/50 to-amber-600/40 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-yellow-500/50">
              <span className="text-5xl font-black text-yellow-400 drop-shadow-lg">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {sortedScores[2] && (
          <div 
            className="flex flex-col items-center animate-podiumRise"
            style={{ animationDelay: '600ms' }}
          >
            <div className={cn(
              "w-24 md:w-32 p-4 rounded-t-2xl text-center backdrop-blur-md",
              "bg-gradient-to-b from-amber-700/40 to-amber-800/30 border-2 border-amber-600/60",
              sortedScores[2].player_id === currentPlayerId && "ring-2 ring-primary shadow-lg shadow-primary/30"
            )}>
              <Medal className="h-8 w-8 text-amber-600 mx-auto mb-1 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" />
              <p className="font-bold text-sm truncate">{sortedScores[2].player_name}</p>
              <p className="font-display font-black text-xl">{sortedScores[2].total_points}</p>
              <p className="text-xs text-foreground-muted">{sortedScores[2].correct_answers} ✓</p>
            </div>
            <div className="w-24 md:w-32 h-16 bg-gradient-to-b from-amber-700/50 to-amber-800/40 flex items-center justify-center rounded-b-lg border-x-2 border-b-2 border-amber-600/40">
              <span className="text-4xl font-black text-amber-600">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Results Card */}
      <div className={cn(
        "relative z-10 max-w-xl w-full card-premium p-5 transition-all duration-500",
        showPodium ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )} style={{ transitionDelay: '0.8s' }}>
        <h3 className="text-base font-display font-bold mb-4 text-center flex items-center justify-center gap-2">
          <Award className="h-4 w-4 text-accent" />
          Classement Complet
          <Award className="h-4 w-4 text-accent" />
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sortedScores.map((score, index) => (
            <div 
              key={score.player_id}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl transition-all duration-300",
                "backdrop-blur-sm border",
                score.player_id === currentPlayerId 
                  ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30" 
                  : "bg-card/30 border-border/50"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black",
                  index === 0 && "bg-yellow-500/30 text-yellow-400",
                  index === 1 && "bg-slate-400/30 text-slate-300",
                  index === 2 && "bg-amber-600/30 text-amber-500",
                  index > 2 && "bg-muted text-foreground-muted"
                )}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </span>
                <span className="font-bold text-sm">{score.player_name}</span>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-lg">{score.total_points} pts</span>
                <div className="flex items-center gap-1 text-xs text-foreground-muted">
                  <Zap className="h-3 w-3 text-accent" />
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
        size="lg"
        className="relative z-10 gap-2 h-14 px-8 rounded-xl animate-fadeInUp"
        style={{ animationDelay: '1s' }}
      >
        <Home className="h-5 w-5" />
        <span className="font-bold">Retour à l'accueil</span>
        <PartyPopper className="h-4 w-4" />
      </Button>
    </div>
  );
};