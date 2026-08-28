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
import { ArrowLeft, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InkBetaGameBadge, InkBetaGameStage } from '@/components/game-beta/InkBetaGameLayout';
import type { ReactNode } from 'react';

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
  variant?: 'default' | 'inkBeta';
}

export const QuizGameScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
  variant = 'default',
}: QuizGameScreenProps) => {
  const isInkBeta = variant === 'inkBeta';
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

  /*
   * Coquille beta commune aux six phases.
   *
   * Chaque phase portait son propre plein écran, son dégradé et ses taches
   * floues. En beta la scène est la même partout — barre de marque, cadre,
   * pastille de phase — et seul le contenu central change. Le chat reste un
   * frère du contenu : il se porte lui-même dans `document.body`.
   */
  const withBetaStage = (
    label: string,
    canvasClassName: string,
    content: ReactNode,
    step?: string,
  ) => {
    const chat = (
      <LobbyChat
        variant={isInkBeta ? 'inkBeta' : 'default'}
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    );

    if (!isInkBeta) {
      return (
        <>
          {content}
          {chat}
        </>
      );
    }

    return (
      <InkBetaGameStage
        titleId="ik-quiz-brand"
        canvasClassName={canvasClassName}
        badge={<InkBetaGameBadge label={label} step={step} icon={<Brain aria-hidden="true" />} />}
        tools={(
          <button
            type="button"
            onClick={onEndGame}
            data-back
            className="ik-tool ik-tool--leave menu-focus"
            aria-label="Quitter le quiz"
          >
            <ArrowLeft aria-hidden="true" />
            <span>Quitter</span>
          </button>
        )}
      >
        {content}
        {chat}
      </InkBetaGameStage>
    );
  };

  // Waiting phase - show category selector and start button for host
  if (phase === 'waiting') {
    return withBetaStage(
      'Quiz',
      'ik-game-canvas--center',
      <QuizWaitingScreen
        variant={variant}
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
      />,
      `${totalRounds} questions`,
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return withBetaStage(
      'Préparez-vous',
      'ik-game-canvas--center',
      <QuizCountdown
        variant={variant}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        category={currentQuestion?.category || ''}
      />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  // Answering phase
  if (phase === 'answering' && currentQuestion) {
    return withBetaStage(
      'À vous',
      'ik-game-canvas--quiz',
      <QuizQuestion
          variant={variant}
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
        />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  // Reveal phase
  if (phase === 'reveal' && currentQuestion) {
    return withBetaStage(
      'Réponse',
      'ik-game-canvas--center',
      <QuizReveal
        variant={variant}
        question={currentQuestion.question}
        correctAnswer={currentQuestion.answer}
        roundAnswers={roundAnswers}
        isHost={currentPlayer.isHost}
        onContinue={advanceToScores}
      />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  // Scores phase
  if (phase === 'scores') {
    return withBetaStage(
      'Classement',
      'ik-game-canvas--center',
      <QuizLeaderboard
        variant={variant}
        scores={scores}
        currentPlayerId={currentPlayer.id}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        roundAnswers={roundAnswers}
        roundInsight={roundInsight}
        isHost={currentPlayer.isHost}
        onNextRound={nextRound}
      />,
      `Après ${currentRound}/${totalRounds}`,
    );
  }

  // Final results
  if (phase === 'final') {
    return withBetaStage(
      'Résultats',
      'ik-game-canvas--center',
      <QuizFinalResults
        variant={variant}
        scores={scores}
        currentPlayerId={currentPlayer.id}
        instanceKey={`quiz:${currentRound}`}
        onEndGame={onEndGame}
      />,
      `${totalRounds} questions`,
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
