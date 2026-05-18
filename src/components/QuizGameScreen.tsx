import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { QuizQuestion } from './QuizQuestion';
import { QuizReveal } from './QuizReveal';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QuizFinalResults } from './QuizFinalResults';
import { QuizCountdown } from './QuizCountdown';
import { QuizSettingsPanel, DEFAULT_QUIZ_SETTINGS, type QuizSettings } from './QuizSettingsPanel';
import { QuizWaitingScreen } from './QuizWaitingScreen';
import { INITIAL_JOKERS, type JokersState } from './QuizJokers';
import { LobbyChat } from './LobbyChat';
import { useQuizGame } from '@/hooks/useQuizGame';
import { useInkMode } from '@/hooks/useInkMode';
import { Loader2 } from 'lucide-react';
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
  const [hostSettings, setHostSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [jokers, setJokers] = useState<JokersState>(INITIAL_JOKERS);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  
  const { isInkMode, inkClasses, inkFont } = useInkMode();
  
  const {
    phase,
    currentRound,
    totalRounds,
    currentQuestion,
    timeRemaining,
    answerDurationMs,
    hasAnswered,
    scores,
    roundAnswers,
    answeredPlayers,
    playersRemaining,
    isLoading,
    currentStreak,
    bestStreak,
    roundInsight,
    triggerFreezeJoker,
    startQuiz,
    submitAnswer,
    advanceToReveal,
    advanceToScores,
    nextRound
  } = useQuizGame(lobbyId, currentPlayer, players, selectedCategory, hostSettings);

  // Reset hidden options each new question
  useEffect(() => {
    if (phase === 'countdown' || phase === 'answering') setHiddenOptions([]);
  }, [currentRound, phase]);

  const handleFiftyFifty = () => {
    if (!currentQuestion?.options || hiddenOptions.length > 0) return;
    const wrong = currentQuestion.options.filter(o => o !== currentQuestion.answer);
    const shuffled = [...wrong].sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(shuffled);
    setJokers(j => ({ ...j, fiftyFifty: false }));
  };
  const handleFreeze = () => {
    triggerFreezeJoker();
    setJokers(j => ({ ...j, freeze: false }));
  };
  const handleSkip = () => {
    submitAnswer('__SKIP__');
    setJokers(j => ({ ...j, skip: false }));
  };

  // Waiting phase - show category selector and start button for host
  if (phase === 'waiting') {
    return (
      <>
        <QuizWaitingScreen
          isHost={currentPlayer.isHost}
          isLoading={isLoading}
          totalRounds={totalRounds}
          players={players}
          currentPlayerId={currentPlayer.id}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          hostSettings={hostSettings}
          onSettingsChange={setHostSettings}
          onStart={() => startQuiz(selectedCategory)}
          onLeave={onEndGame}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <>
        <QuizCountdown 
          roundNumber={currentRound} 
          totalRounds={totalRounds}
          category={currentQuestion?.category || ''}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Answering phase
  if (phase === 'answering' && currentQuestion) {
    return (
      <>
        <QuizQuestion
          question={currentQuestion.question}
          options={currentQuestion.options || []}
          questionType={currentQuestion.questionType || 'qcm'}
          category={currentQuestion.category}
          difficulty={currentQuestion.difficulty}
          roundNumber={currentRound}
          totalRounds={totalRounds}
          timeRemaining={timeRemaining}
          totalTime={answerDurationMs}
          hasAnswered={hasAnswered}
          answeredPlayers={answeredPlayers}
          playersRemaining={playersRemaining}
          players={players}
          scores={scores}
          currentPlayerId={currentPlayer.id}
          onSubmitAnswer={submitAnswer}
          jokers={hostSettings.enableJokers ? jokers : null}
          onFiftyFifty={handleFiftyFifty}
          onFreeze={handleFreeze}
          onSkip={handleSkip}
          hiddenOptions={hiddenOptions}
          currentStreak={hostSettings.enableStreak ? currentStreak : 0}
          bestStreak={hostSettings.enableStreak ? bestStreak : 0}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Reveal phase
  if (phase === 'reveal' && currentQuestion) {
    return (
      <>
        <QuizReveal
          question={currentQuestion.question}
          correctAnswer={currentQuestion.answer}
          roundAnswers={roundAnswers}
          isHost={currentPlayer.isHost}
          onContinue={advanceToScores}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Scores phase
  if (phase === 'scores') {
    return (
      <>
        <QuizLeaderboard
          scores={scores}
          currentPlayerId={currentPlayer.id}
          roundNumber={currentRound}
          totalRounds={totalRounds}
          roundAnswers={roundAnswers}
          roundInsight={roundInsight}
          isHost={currentPlayer.isHost}
          onNextRound={nextRound}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Final results
  if (phase === 'final') {
    return (
      <>
        <QuizFinalResults
          scores={scores}
          currentPlayerId={currentPlayer.id}
          onEndGame={onEndGame}
        />
        <LobbyChat
          lobbyId={lobbyId}
          playerId={currentPlayer.id}
          playerName={currentPlayer.name}
        />
      </>
    );
  }

  // Loading state
  return (
    <div className={cn(
      "h-screen flex items-center justify-center",
      isInkMode ? "bg-background" : "bg-mesh"
    )}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
        <Loader2 className="relative h-16 w-16 animate-spin text-primary" />
      </div>
    </div>
  );
};
