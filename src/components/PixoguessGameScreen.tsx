import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Timer, Trophy, Send, Sparkles, Image as ImageIcon, Users, ShieldAlert } from 'lucide-react';
import { usePixoguessGame } from '@/hooks/usePixoguessGame';
import { LobbyChat } from '@/components/LobbyChat';
import { HolographicCard, NeonText, PremiumButton, FloatingParticles, CyberGrid } from '@/components/premium';
import { cn } from '@/lib/utils';
import { BlurRushLiveScoreboard } from '@/components/BlurRushLiveScoreboard';
import { BlurRushCategorySelector } from '@/components/BlurRushCategorySelector';
import type { BlurRushCategory } from '@/lib/blurRushImages';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface PixoguessGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

export const PixoguessGameScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame
}: PixoguessGameScreenProps) => {
  const {
    phase,
    currentRound,
    totalRounds,
    roundData,
    pixelLevel,
    maxPixelLevel,
    timeRemaining,
    totalTime,
    scores,
    hasGuessedCorrectly,
    roundWinner,
    liveStats,
    cooldownUntil,
    isLoading,
    isHost,
    selectedCategories,
    imagePoolSize,
    setCategories,
    startGame,
    submitGuess,
    advanceToReveal,
    advanceToScores,
    nextRound
  } = usePixoguessGame(lobbyId, currentPlayer, players);
  // Non-host players skip category selection - they wait for the game to start
  const [categoriesConfirmed, setCategoriesConfirmed] = useState(!isHost);

  const [guess, setGuess] = useState('');
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lastInfo, setLastInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Focus input when playing
  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  // Draw pixelated image
  useEffect(() => {
    if (!roundData?.image_url || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      imageRef.current = img;
      
      // Set canvas size - LARGER for better visibility
      const maxSize = 520;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      drawPixelated(ctx, img, canvas.width, canvas.height, pixelLevel);
    };

    img.onerror = () => {
      console.error('Failed to load image:', roundData.image_url);
      // Try with a CORS proxy
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(roundData.image_url)}&w=520&h=520&fit=inside`;
      img.src = proxyUrl;
    };

    // Use CORS proxy for external images
    const isExternalUrl = roundData.image_url.startsWith('http');
    if (isExternalUrl) {
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(roundData.image_url)}&w=520&h=520&fit=inside`;
      img.src = proxyUrl;
    } else {
      img.src = roundData.image_url;
    }
  }, [roundData?.image_url]);

  // Update pixelation
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawPixelated(ctx, imageRef.current, canvas.width, canvas.height, pixelLevel);
  }, [pixelLevel]);

  const drawPixelated = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    level: number
  ) => {
    // Calculate pixel size based on level (higher level = more pixelated)
    const pixelSize = Math.max(1, Math.floor((level / maxPixelLevel) * 50));
    
    // Draw small version
    const smallW = Math.max(1, Math.floor(width / pixelSize));
    const smallH = Math.max(1, Math.floor(height / pixelSize));
    
    ctx.imageSmoothingEnabled = false;
    
    // Create temp canvas for pixelation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(img, 0, 0, smallW, smallH);
      ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, width, height);
    }
  };

  const cooldownMs = useMemo(() => Math.max(0, cooldownUntil - Date.now()), [cooldownUntil]);

  const doSubmit = useCallback(async () => {
    if (!guess.trim() || hasGuessedCorrectly) return;
    if (roundWinner) return;

    const result = await submitGuess(guess);

    if (result.outcome === 'cooldown') {
      setLastInfo(`Cooldown: ${(Math.ceil((result.cooldownMs ?? 0) / 100) / 10).toFixed(1)}s`);
      return;
    }

    if (result.outcome === 'wrong') {
      setShowFeedback('wrong');
      setLastInfo(null);
      setTimeout(() => setShowFeedback(null), 450);
      return;
    }

    if (result.outcome === 'late') {
      setLastInfo("Trop tard — quelqu'un a déjà trouvé.");
      setGuess('');
      return;
    }

    if (result.outcome === 'correct') {
      setShowFeedback('correct');
      setLastInfo('Bien joué !');
      setGuess('');
      return;
    }

    setLastInfo(null);
  }, [guess, hasGuessedCorrectly, roundWinner, submitGuess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSubmit();
    }
  }, [doSubmit]);

  // Calculate progress
  const timeProgress = (timeRemaining / totalTime) * 100;
  const pixelProgress = ((maxPixelLevel - pixelLevel) / maxPixelLevel) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CyberGrid opacity={0.03} />
      <FloatingParticles count={30} />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <NeonText className="text-2xl font-bold">BlurRush</NeonText>
              <p className="text-sm text-foreground-muted">L'image se dévoile, sois le plus rapide !</p>
            </div>
          </div>
          
          {phase !== 'waiting' && phase !== 'final' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/30">
              <span className="text-sm font-medium">Round</span>
              <span className="text-lg font-bold text-primary">{currentRound}</span>
              <span className="text-foreground-muted">/ {totalRounds}</span>
            </div>
          )}
        </div>

        {/* Waiting Phase - Category Selection */}
        {phase === 'waiting' && !categoriesConfirmed && (
          <BlurRushCategorySelector
            onSelect={(categories) => {
              setCategories(categories);
              setCategoriesConfirmed(true);
            }}
            isHost={isHost}
          />
        )}

        {/* Waiting Phase - Ready to Start */}
        {phase === 'waiting' && categoriesConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <HolographicCard className="p-8 text-center max-w-md">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 w-fit mx-auto mb-6">
                <Eye className="h-12 w-12 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold mb-4">BlurRush</h2>
              <p className="text-foreground-muted mb-4">
                Une image floue va apparaître et se clarifier progressivement.
                Soyez le premier à deviner ce qu'elle représente !
              </p>

              <div className="mb-4 p-3 rounded-lg bg-card/60 border border-border/30">
                <span className="text-sm text-foreground-muted">Catégories: </span>
                <span className="font-bold text-primary">
                  {selectedCategories.includes('Mix') ? 'Mix (toutes)' : selectedCategories.join(', ')}
                </span>
                <span className="text-sm text-foreground-muted ml-2">({imagePoolSize} images)</span>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-foreground-muted">
                <Users className="h-4 w-4" />
                <span>{players.length} joueur{players.length > 1 ? 's' : ''}</span>
              </div>

              {isHost ? (
                <div className="space-y-3">
                  <PremiumButton onClick={startGame} className="w-full">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Lancer la partie
                  </PremiumButton>
                  <button
                    onClick={() => setCategoriesConfirmed(false)}
                    className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                  >
                    ← Changer les catégories
                  </button>
                </div>
              ) : (
                <p className="text-foreground-muted animate-pulse">
                  En attente de l'hôte...
                </p>
              )}
            </HolographicCard>
          </motion.div>
        )}

        {/* Playing Phase */}
        {phase === 'playing' && roundData && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Game Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timer Bar */}
              <div className="relative h-3 bg-card/60 rounded-full overflow-hidden border border-border/30">
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    timeProgress > 30 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                    timeProgress > 10 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                    "bg-gradient-to-r from-red-500 to-rose-500"
                  )}
                  style={{ width: `${timeProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Image Container */}
              <HolographicCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    <span className="font-mono text-lg">
                      {Math.ceil(timeRemaining / 1000)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground-muted">Clarté:</span>
                    <div className="w-24 h-2 bg-card rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                        style={{ width: `${pixelProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    <canvas 
                      ref={canvasRef}
                      className="rounded-lg shadow-2xl max-w-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    
                    {/* Winner overlay */}
                    <AnimatePresence>
                      {roundWinner && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"
                        >
                          <div className="text-center">
                            <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
                            <p className="text-xl font-bold text-white">
                              {roundWinner.name} a trouvé !
                            </p>
                            <p className="text-yellow-400 font-bold">
                              +{roundWinner.points} pts
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Category hint */}
                {roundData.category && (
                  <div className="text-center mt-4">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                      {roundData.category}
                    </span>
                  </div>
                )}
              </HolographicCard>

              {/* Guess Input */}
              <HolographicCard className="p-4">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={roundWinner ? "Quelqu'un a déjà trouvé..." : hasGuessedCorrectly ? "✓ Bonne réponse !" : "Tapez votre réponse..."}
                    disabled={hasGuessedCorrectly || Boolean(roundWinner) || cooldownMs > 0}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl bg-background/50 border transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary",
                      showFeedback === 'correct' && "border-green-500 bg-green-500/10",
                      showFeedback === 'wrong' && "border-red-500 bg-red-500/10 animate-shake",
                      (hasGuessedCorrectly || roundWinner) && "border-green-500 bg-green-500/10"
                    )}
                  />
                  <PremiumButton
                    onClick={doSubmit}
                    disabled={hasGuessedCorrectly || Boolean(roundWinner) || !guess.trim() || cooldownMs > 0}
                  >
                    <Send className="h-5 w-5" />
                  </PremiumButton>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-foreground-muted">
                  <div className="flex items-center gap-2">
                    {cooldownMs > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Cooldown {Math.ceil(cooldownMs / 100) / 10}s
                      </span>
                    )}
                  </div>
                  {lastInfo && <span className="truncate max-w-[60%]">{lastInfo}</span>}
                </div>
              </HolographicCard>
            </div>

            {/* Scoreboard */}
            <div className="space-y-4">
              <BlurRushLiveScoreboard
                stats={liveStats}
                currentPlayerId={currentPlayer.id}
              />
              <HolographicCard className="p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Classement
                </h3>
                <div className="space-y-2">
                  {scores.map((score, index) => (
                    <div
                      key={score.player_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-all",
                        score.player_id === currentPlayer.id 
                          ? "bg-primary/20 border border-primary/30" 
                          : "bg-card/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 && "bg-yellow-500 text-black",
                          index === 1 && "bg-gray-400 text-black",
                          index === 2 && "bg-amber-700 text-white",
                          index > 2 && "bg-card text-foreground-muted"
                        )}>
                          {index + 1}
                        </span>
                        <span className="font-medium truncate max-w-[100px]">
                          {score.player_name}
                        </span>
                      </div>
                      <span className="font-bold text-primary">{score.score}</span>
                    </div>
                  ))}
                </div>
              </HolographicCard>
            </div>
          </div>
        )}

        {/* Reveal Phase */}
        {phase === 'reveal' && roundData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10"
          >
            <HolographicCard className="p-8 text-center max-w-lg">
              <h2 className="text-2xl font-bold mb-6">La réponse était...</h2>
              
              <img 
                src={roundData.image_url} 
                alt="Answer"
                className="w-64 h-64 object-contain mx-auto rounded-lg mb-6"
                crossOrigin="anonymous"
              />
              
              <div className="text-3xl font-bold text-primary mb-4 capitalize">
                {roundData.correct_answer}
              </div>

              {roundWinner ? (
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <Trophy className="h-6 w-6" />
                  <span className="font-bold">{roundWinner.name}</span>
                  <span>a trouvé en premier !</span>
                </div>
              ) : (
                <p className="text-foreground-muted">Personne n'a trouvé...</p>
              )}

              {isHost && (
                <PremiumButton onClick={advanceToScores} className="mt-6">
                  Voir les scores
                </PremiumButton>
              )}
            </HolographicCard>
          </motion.div>
        )}

        {/* Scores Phase */}
        {phase === 'scores' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-10"
          >
            <HolographicCard className="p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-center mb-6">
                Classement - Round {currentRound}
              </h2>
              
              <div className="space-y-3">
                {scores.map((score, index) => (
                  <motion.div
                    key={score.player_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl",
                      index === 0 && "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30",
                      index === 1 && "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30",
                      index === 2 && "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border border-amber-700/30",
                      index > 2 && "bg-card/60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">#{index + 1}</span>
                      <span className="font-medium">{score.player_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{score.score} pts</div>
                      <div className="text-xs text-foreground-muted">
                        {score.correct_guesses} bonne{score.correct_guesses > 1 ? 's' : ''} réponse{score.correct_guesses > 1 ? 's' : ''}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {isHost && (
                <PremiumButton onClick={nextRound} className="w-full mt-6">
                  {currentRound >= totalRounds ? 'Résultats finaux' : 'Round suivant'}
                </PremiumButton>
              )}
            </HolographicCard>
          </motion.div>
        )}

        {/* Final Phase */}
        {phase === 'final' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10"
          >
            <HolographicCard className="p-8 text-center max-w-md">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mb-6"
              >
                <div className="p-6 rounded-full bg-gradient-to-br from-yellow-500/30 to-amber-500/30 w-fit mx-auto">
                  <Trophy className="h-16 w-16 text-yellow-400" />
                </div>
              </motion.div>

              <h2 className="text-3xl font-bold mb-2">Partie terminée !</h2>
              
              {scores[0] && (
                <div className="mb-6">
                  <p className="text-foreground-muted mb-2">Le gagnant est</p>
                  <p className="text-2xl font-bold text-primary">{scores[0].player_name}</p>
                  <p className="text-yellow-400 font-bold">{scores[0].score} points</p>
                </div>
              )}

              <div className="space-y-2 mb-6">
                {scores.slice(0, 5).map((score, index) => (
                  <div
                    key={score.player_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold">#{index + 1}</span>
                      <span>{score.player_name}</span>
                    </div>
                    <span className="font-bold">{score.score}</span>
                  </div>
                ))}
              </div>

              {isHost && (
                <PremiumButton onClick={onEndGame} className="w-full">
                  Retour au lobby
                </PremiumButton>
              )}
            </HolographicCard>
          </motion.div>
        )}

        {/* Chat */}
        <div className="fixed bottom-20 right-4 z-50">
          <LobbyChat
            lobbyId={lobbyId}
            playerId={currentPlayer.id}
            playerName={currentPlayer.name}
          />
        </div>
      </div>
    </div>
  );
};

export default PixoguessGameScreen;
