import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { QuizQuestion } from './QuizQuestion';
import { QuizReveal } from './QuizReveal';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QuizFinalResults } from './QuizFinalResults';
import { QuizCountdown } from './QuizCountdown';
import { QuizCategorySelector } from './QuizCategorySelector';
import { QuizSettingsPanel, DEFAULT_QUIZ_SETTINGS, type QuizSettings } from './QuizSettingsPanel';
import { INITIAL_JOKERS, type JokersState } from './QuizJokers';
import { LobbyChat } from './LobbyChat';
import { useQuizGame } from '@/hooks/useQuizGame';
import { useInkMode } from '@/hooks/useInkMode';
import { InkHideable, InkCard } from '@/components/InkAdaptive';
import { Brain, Play, Loader2, Sparkles, ArrowLeft, Zap, Users, Star } from 'lucide-react';
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
<<<<<<< HEAD
    playersRemaining,
    isLoading,
    currentStreak,
    bestStreak,
    roundInsight,
=======
    isLoading,
    currentStreak,
    bestStreak,
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    useFreezeJoker,
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
    useFreezeJoker();
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
        <div className={cn(
          "h-screen flex items-center justify-center p-4 relative overflow-hidden",
          isInkMode ? "bg-background" : "bg-mesh"
        )}>
          {/* Animated orbs - hidden in Ink mode */}
          <InkHideable>
            <div className="orb-container">
              <div className="orb orb-primary" style={{ background: 'radial-gradient(circle, hsl(280 100% 60% / 0.4), transparent)' }} />
              <div className="orb orb-accent" style={{ background: 'radial-gradient(circle, hsl(300 100% 70% / 0.3), transparent)' }} />
              <div className="orb orb-secondary" style={{ background: 'radial-gradient(circle, hsl(260 100% 50% / 0.3), transparent)' }} />
            </div>
            {/* Grid overlay */}
            <div className="fixed inset-0 bg-grid-modern pointer-events-none" />
          </InkHideable>
          
          {/* Ink mode subtle glow */}
          {isInkMode && (
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-15">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary rounded-full blur-[120px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary rounded-full blur-[100px]" />
            </div>
          )}
          
          <div className="relative z-10 max-w-2xl w-full space-y-8">
            {/* Main Card */}
            <div className="card-premium p-8 animate-fadeInUp">
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-[80px] animate-pulse-slow" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/20 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
              
              {/* Header */}
              <div className="relative flex flex-col items-center gap-6 mb-8">
                {/* Icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/40 rounded-3xl blur-xl animate-pulse" />
                  <div className="relative p-6 rounded-3xl bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/30 border border-primary/40 backdrop-blur-sm">
                    <Brain className="h-16 w-16 text-primary" />
                  </div>
                  {/* Floating sparkles */}
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-accent animate-bounce" />
                  <Star className="absolute -bottom-1 -left-1 h-5 w-5 text-yellow-400 animate-float" />
                </div>
                
                <div className="text-center space-y-2">
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient flex items-center justify-center gap-3">
                    <Zap className="h-8 w-8 text-accent" />
                    Mode Quiz
                    <Zap className="h-8 w-8 text-accent" />
                  </h1>
                  <p className="text-foreground-secondary text-lg">
                    {totalRounds} questions • 30 secondes par question
                  </p>
                </div>
              </div>

              {/* Players Grid */}
              <div className="relative space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                  <Users className="h-4 w-4" />
                  Joueurs ({players.length})
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {players.map((p, i) => (
                    <div 
                      key={p.id}
                      className={cn(
                        "relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-500",
                        "backdrop-blur-md border animate-fadeIn",
                        p.id === currentPlayer.id 
                          ? "bg-gradient-to-r from-primary/30 via-purple-500/20 to-pink-500/30 border-primary/50 text-white shadow-lg shadow-primary/20" 
                          : "glass-ultra text-foreground-secondary hover:border-primary/30"
                      )}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {p.id === currentPlayer.id && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
                      )}
                      {p.name}
                      {p.isHost && <span className="ml-2 text-accent">👑</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Selector - Host only */}
              {currentPlayer.isHost && (
                <div className="relative mb-8">
                  <QuizCategorySelector
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Host advanced settings */}
              {currentPlayer.isHost && (
                <div className="relative mb-8">
                  <QuizSettingsPanel
                    settings={hostSettings}
                    onChange={setHostSettings}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="relative space-y-4">
                {currentPlayer.isHost ? (
                  <Button 
                    onClick={() => startQuiz(selectedCategory)} 
                    disabled={isLoading}
                    variant="hero"
                    size="xl"
                    className="w-full h-16 text-lg rounded-2xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Chargement...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6" fill="currentColor" />
                        <span className="font-bold tracking-wide">Lancer le Quiz</span>
                        <Sparkles className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="relative p-6 rounded-2xl glass-ultra border border-primary/30 text-center">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
                    <p className="relative text-primary font-semibold flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      En attente de l'hôte...
                    </p>
                  </div>
                )}
                
                <Button 
                  variant="glass" 
                  onClick={onEndGame}
                  className="w-full h-12 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quitter</span>
                </Button>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full" />
            </div>
          </div>
        </div>
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
<<<<<<< HEAD
          playersRemaining={playersRemaining}
=======
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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
<<<<<<< HEAD
          roundInsight={roundInsight}
=======
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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
