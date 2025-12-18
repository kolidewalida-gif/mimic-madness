import { useEffect, useState } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { Trophy, Medal, Star, Crown, Sparkles, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

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
    
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Sort by total points
  const sortedScores = [...scores].sort((a, b) => b.total_points - a.total_points);
  const winner = sortedScores[0];
  const isWinner = winner?.player_id === currentPlayerId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <Sparkles 
                className="h-4 w-4" 
                style={{ 
                  color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Winner Announcement */}
      <div className="text-center animate-bounce-in">
        <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-float" />
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wider mb-2">
          {isWinner ? "Vous avez gagné !" : `${winner?.player_name} gagne !`}
        </h1>
        <p className="text-xl text-foreground-muted">
          avec {winner?.total_points} points
        </p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 max-w-xl w-full">
        {/* 2nd Place */}
        {sortedScores[1] && (
          <div className="flex flex-col items-center animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className={cn(
              "w-24 md:w-32 p-4 rounded-t-xl text-center",
              "bg-gray-400/20 border-2 border-gray-400/50",
              sortedScores[1].player_id === currentPlayerId && "ring-2 ring-primary"
            )}>
              <Medal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-sm truncate">{sortedScores[1].player_name}</p>
              <p className="font-display font-bold text-xl">{sortedScores[1].total_points}</p>
            </div>
            <div className="w-24 md:w-32 h-20 bg-gray-400/30 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-400">2</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {sortedScores[0] && (
          <div className="flex flex-col items-center animate-bounce-in">
            <div className={cn(
              "w-28 md:w-36 p-4 rounded-t-xl text-center",
              "bg-yellow-500/20 border-2 border-yellow-500/50",
              sortedScores[0].player_id === currentPlayerId && "ring-2 ring-primary"
            )}>
              <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-2 animate-pulse" />
              <p className="font-semibold truncate">{sortedScores[0].player_name}</p>
              <p className="font-display font-bold text-2xl">{sortedScores[0].total_points}</p>
            </div>
            <div className="w-28 md:w-36 h-28 bg-yellow-500/30 flex items-center justify-center">
              <span className="text-4xl font-bold text-yellow-400">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {sortedScores[2] && (
          <div className="flex flex-col items-center animate-fadeIn" style={{ animationDelay: '400ms' }}>
            <div className={cn(
              "w-24 md:w-32 p-4 rounded-t-xl text-center",
              "bg-amber-600/20 border-2 border-amber-600/50",
              sortedScores[2].player_id === currentPlayerId && "ring-2 ring-primary"
            )}>
              <Medal className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="font-semibold text-sm truncate">{sortedScores[2].player_name}</p>
              <p className="font-display font-bold text-xl">{sortedScores[2].total_points}</p>
            </div>
            <div className="w-24 md:w-32 h-16 bg-amber-600/30 flex items-center justify-center">
              <span className="text-3xl font-bold text-amber-600">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Results */}
      <GameCard className="max-w-xl w-full">
        <h3 className="text-lg font-semibold mb-4 text-center">Classement complet</h3>
        <div className="space-y-2">
          {sortedScores.map((score, index) => (
            <div 
              key={score.player_id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                score.player_id === currentPlayerId && "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                  index === 0 && "bg-yellow-500 text-black",
                  index === 1 && "bg-gray-400 text-black",
                  index === 2 && "bg-amber-600 text-black",
                  index > 2 && "bg-muted text-foreground"
                )}>
                  {index + 1}
                </span>
                <span className="font-semibold">{score.player_name}</span>
              </div>
              <div className="text-right">
                <span className="font-display font-bold">{score.total_points} pts</span>
                <div className="flex items-center gap-1 text-xs text-foreground-muted">
                  <Star className="h-3 w-3" />
                  {score.correct_answers} bonnes
                </div>
              </div>
            </div>
          ))}
        </div>
      </GameCard>

      {/* End Game Button */}
      <Button onClick={onEndGame} size="lg" className="gap-2">
        <Home className="h-5 w-5" />
        Retour à l'accueil
      </Button>
    </div>
  );
};
