import { useState, useEffect } from 'react';
import { GameCard } from './GameCard';
import { Button } from './ui/button';
import { QuizQuestion } from './QuizQuestion';
import { QuizReveal } from './QuizReveal';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QuizFinalResults } from './QuizFinalResults';
import { QuizCountdown } from './QuizCountdown';
import { useQuizGame } from '@/hooks/useQuizGame';
import { Brain, Play, Loader2 } from 'lucide-react';
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
  } = useQuizGame(lobbyId, currentPlayer, players);

  // Waiting phase - show start button for host
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GameCard className="max-w-lg w-full text-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-accent/20 animate-pulse">
              <Brain className="h-16 w-16 text-accent" />
            </div>
            <h1 className="text-4xl font-display font-bold uppercase tracking-wider">
              Mode Quiz
            </h1>
            <p className="text-foreground-muted">
              {totalRounds} questions • 30 secondes par question
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Joueurs ({players.length})</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map(p => (
                <span 
                  key={p.id}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm",
                    p.id === currentPlayer.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          
          {currentPlayer.isHost ? (
            <Button 
              onClick={startQuiz} 
              size="lg" 
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Lancer le Quiz
                </>
              )}
            </Button>
          ) : (
            <p className="text-foreground-muted animate-pulse">
              En attente de l'hôte...
            </p>
          )}
          
          <Button variant="outline" onClick={onEndGame}>
            Quitter
          </Button>
        </GameCard>
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
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
};
