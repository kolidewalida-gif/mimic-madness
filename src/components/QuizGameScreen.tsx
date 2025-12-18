import { useState } from 'react';
import { Button } from './ui/button';
import { QuizQuestion } from './QuizQuestion';
import { QuizReveal } from './QuizReveal';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QuizFinalResults } from './QuizFinalResults';
import { QuizCountdown } from './QuizCountdown';
import { QuizCategorySelector } from './QuizCategorySelector';
import { useQuizGame } from '@/hooks/useQuizGame';
import { Brain, Play, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface QuizGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

export const QuizGameScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame
}: QuizGameScreenProps) => {
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  
  const {
    phase,
    currentRound,
    totalRounds,
    currentQuestion,
    timeRemaining,
    hasAnswered,
    scores,
    roundAnswers,
    answeredPlayers,
    isLoading,
    startQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound
  } = useQuizGame(lobbyId, currentPlayer, players, selectedCategory);

  // Waiting phase - show category selector and start button for host
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-purple-950/20 -z-20" />
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] animate-float -z-10" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] animate-float -z-10" style={{ animationDelay: '2s' }} />
        
        <div className="relative rounded-2xl p-8 backdrop-blur-xl bg-background-secondary/40 border border-white/10 shadow-2xl max-w-2xl w-full space-y-8 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Header */}
          <div className="relative flex flex-col items-center gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 animate-pulse">
              <Brain className="h-16 w-16 text-purple-400" />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-display font-bold uppercase tracking-wider flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-purple-400" />
                Mode Quiz
                <Sparkles className="h-6 w-6 text-purple-400" />
              </h1>
              <p className="text-foreground-muted mt-2">
                {totalRounds} questions • 30 secondes par question
              </p>
            </div>
          </div>

          {/* Players */}
          <div className="relative space-y-3">
            <h3 className="text-sm font-display uppercase tracking-wider text-foreground-muted text-center">
              Joueurs ({players.length})
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map(p => (
                <span 
                  key={p.id}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    "border backdrop-blur-sm",
                    p.id === currentPlayer.id 
                      ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-white" 
                      : "bg-white/5 border-white/10 text-foreground-muted"
                  )}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Category Selector - Host only */}
          {currentPlayer.isHost && (
            <div className="relative">
              <QuizCategorySelector
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Start Button */}
          <div className="relative space-y-4">
            {currentPlayer.isHost ? (
              <Button 
                onClick={() => startQuiz(selectedCategory)} 
                disabled={isLoading}
                className={cn(
                  "w-full py-6 text-lg font-display uppercase tracking-wider",
                  "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
                  "shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50",
                  "border-0 rounded-xl transition-all duration-300"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Lancer le Quiz
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-400 animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En attente de l'hôte...
                </p>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              onClick={onEndGame}
              className="w-full hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quitter
            </Button>
          </div>

          {/* Bottom glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>
      </div>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <QuizCountdown 
        roundNumber={currentRound} 
        totalRounds={totalRounds}
        category={currentQuestion?.category || ''}
      />
    );
  }

  // Answering phase
  if (phase === 'answering' && currentQuestion) {
    return (
      <QuizQuestion
        question={currentQuestion.question}
        category={currentQuestion.category}
        difficulty={currentQuestion.difficulty}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        timeRemaining={timeRemaining}
        hasAnswered={hasAnswered}
        answeredPlayers={answeredPlayers}
        players={players}
        onSubmitAnswer={submitAnswer}
      />
    );
  }

  // Reveal phase
  if (phase === 'reveal' && currentQuestion) {
    return (
      <QuizReveal
        question={currentQuestion.question}
        correctAnswer={currentQuestion.answer}
        roundAnswers={roundAnswers}
        isHost={currentPlayer.isHost}
        onContinue={advanceToScores}
      />
    );
  }

  // Scores phase
  if (phase === 'scores') {
    return (
      <QuizLeaderboard
        scores={scores}
        currentPlayerId={currentPlayer.id}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        roundAnswers={roundAnswers}
        isHost={currentPlayer.isHost}
        onNextRound={nextRound}
      />
    );
  }

  // Final results
  if (phase === 'final') {
    return (
      <QuizFinalResults
        scores={scores}
        currentPlayerId={currentPlayer.id}
        onEndGame={onEndGame}
      />
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
    </div>
  );
};
