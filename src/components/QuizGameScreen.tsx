import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Brain, Loader2 } from 'lucide-react';
import { QuizQuestion } from './QuizQuestion';
import { QuizReveal } from './QuizReveal';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QuizFinalResults } from './QuizFinalResults';
import { QuizCountdown } from './QuizCountdown';
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from './QuizSettingsPanel';
import { QuizWaitingScreen } from './QuizWaitingScreen';
import { INITIAL_JOKERS, type JokersState } from './QuizJokers';
import { LobbyChat } from './LobbyChat';
import { useQuizGame } from '@/hooks/useQuizGame';
import { useInkMode } from '@/hooks/useInkMode';
import { cn } from '@/lib/utils';
import { InkBetaGameBadge, InkBetaGameStage } from '@/components/game-beta/InkBetaGameLayout';

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
  const { isInkMode } = useInkMode();

  const {
    phase,
    currentRound,
    quizSessionId,
    totalRounds,
    currentQuestion,
    timeRemaining,
    answerDurationMs,
    enableJokers,
    enableStreak,
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
    leaveQuiz,
    submitAnswer,
    advanceToScores,
    nextRound,
  } = useQuizGame(lobbyId, currentPlayer, players, selectedCategory, hostSettings);

  useEffect(() => {
    if (phase === 'countdown' || phase === 'answering') setHiddenOptions([]);
  }, [currentRound, phase]);

  useEffect(() => {
    if (!quizSessionId) {
      setJokers(INITIAL_JOKERS);
      return;
    }
    const storageKey = `quiz-jokers:${lobbyId}:${quizSessionId}:${currentPlayer.id}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setJokers(INITIAL_JOKERS);
        return;
      }
      const parsed = JSON.parse(saved) as Partial<JokersState>;
      if (
        typeof parsed.fiftyFifty === 'boolean'
        && typeof parsed.freeze === 'boolean'
        && typeof parsed.skip === 'boolean'
      ) {
        setJokers({
          fiftyFifty: parsed.fiftyFifty,
          freeze: parsed.freeze,
          skip: parsed.skip,
        });
      } else {
        setJokers(INITIAL_JOKERS);
      }
    } catch {
      setJokers(INITIAL_JOKERS);
    }
  }, [currentPlayer.id, lobbyId, quizSessionId]);

  const consumeJoker = (joker: keyof JokersState) => {
    setJokers((current) => {
      const next = { ...current, [joker]: false };
      if (quizSessionId) {
        try {
          localStorage.setItem(
            `quiz-jokers:${lobbyId}:${quizSessionId}:${currentPlayer.id}`,
            JSON.stringify(next),
          );
        } catch {
          // Storage can be unavailable in private or embedded browsing modes.
        }
      }
      return next;
    });
  };

  const handleFiftyFifty = () => {
    if (!currentQuestion?.options || hiddenOptions.length > 0) return;
    const wrongAnswers = currentQuestion.options.filter(
      (option) => option !== currentQuestion.answer,
    );
    const hidden = [...wrongAnswers].sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(hidden);
    consumeJoker('fiftyFifty');
  };

  const handleFreeze = () => {
    triggerFreezeJoker();
    consumeJoker('freeze');
  };

  const handleSkip = () => {
    void submitAnswer('__SKIP__');
    consumeJoker('skip');
  };

  const handleLeave = () => {
    void (async () => {
      const closed = await leaveQuiz();
      if (closed) onEndGame();
    })();
  };

  const withBetaStage = (
    label: string,
    canvasClassName: string,
    content: ReactNode,
    step?: string,
  ) => {
    const chat = (
      <LobbyChat
        variant={variant}
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
            onClick={handleLeave}
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

  if (phase === 'waiting') {
    return withBetaStage(
      'Quiz',
      'ik-quiz-canvas ik-quiz-canvas--lobby',
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
        onStart={() => { void startQuiz(selectedCategory); }}
        onLeave={handleLeave}
      />,
      `${totalRounds} questions`,
    );
  }

  if (phase === 'countdown') {
    return withBetaStage(
      'Préparez-vous',
      'ik-quiz-canvas ik-quiz-canvas--focus',
      <QuizCountdown
        key={currentRound}
        variant={variant}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        category={currentQuestion?.category || ''}
      />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  if (phase === 'answering' && currentQuestion) {
    return withBetaStage(
      'À vous',
      'ik-quiz-canvas ik-quiz-canvas--play',
      <QuizQuestion
        key={currentRound}
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
        onSubmitAnswer={(answer) => { void submitAnswer(answer); }}
        jokers={enableJokers ? jokers : null}
        onFiftyFifty={handleFiftyFifty}
        onFreeze={handleFreeze}
        onSkip={handleSkip}
        hiddenOptions={hiddenOptions}
        currentStreak={enableStreak ? currentStreak : 0}
        bestStreak={enableStreak ? bestStreak : 0}
      />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  if (phase === 'reveal' && currentQuestion) {
    return withBetaStage(
      'Réponse',
      'ik-quiz-canvas ik-quiz-canvas--reveal',
      <QuizReveal
        variant={variant}
        question={currentQuestion.question}
        correctAnswer={currentQuestion.answer}
        roundAnswers={roundAnswers}
        isHost={currentPlayer.isHost}
        onContinue={() => { void advanceToScores(); }}
      />,
      `Question ${currentRound}/${totalRounds}`,
    );
  }

  if (phase === 'scores') {
    return withBetaStage(
      'Classement',
      'ik-quiz-canvas ik-quiz-canvas--results',
      <QuizLeaderboard
        variant={variant}
        scores={scores}
        currentPlayerId={currentPlayer.id}
        roundNumber={currentRound}
        totalRounds={totalRounds}
        roundAnswers={roundAnswers}
        roundInsight={roundInsight}
        isHost={currentPlayer.isHost}
        onNextRound={() => { void nextRound(); }}
      />,
      `Après ${currentRound}/${totalRounds}`,
    );
  }

  if (phase === 'final') {
    return withBetaStage(
      'Résultats',
      'ik-quiz-canvas ik-quiz-canvas--results',
      <QuizFinalResults
        variant={variant}
        scores={scores}
        currentPlayerId={currentPlayer.id}
        instanceKey={`quiz:${currentRound}`}
        onEndGame={handleLeave}
      />,
      `${totalRounds} questions`,
    );
  }

  if (isInkBeta) {
    return withBetaStage(
      'Quiz',
      'ik-quiz-canvas ik-quiz-canvas--focus',
      <section className="ik-gpanel is-featured ik-quiz-status-panel" aria-live="polite">
        <div className="ik-gpanel-body">
          <p className="ik-game-note">
            <Loader2 className="animate-spin" aria-hidden="true" /> Synchronisation du quiz…
          </p>
        </div>
      </section>,
    );
  }

  return (
    <div className={cn(
      'h-screen flex items-center justify-center',
      isInkMode ? 'bg-background' : 'bg-mesh',
    )}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
        <Loader2 className="relative h-16 w-16 animate-spin text-primary" />
      </div>
    </div>
  );
};
