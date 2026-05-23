import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Timer,
  Trophy,
  Send,
  Sparkles,
  Image as ImageIcon,
  Users,
  ShieldAlert,
  Zap,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { usePixoguessGame } from '@/hooks/usePixoguessGame';
import { LobbyChat } from '@/components/LobbyChat';
import { cn } from '@/lib/utils';
import { BlurRushLiveScoreboard } from '@/components/BlurRushLiveScoreboard';
import { BlurRushCategorySelector } from '@/components/BlurRushCategorySelector';
import { getProxyImageCandidates, proxyImageUrl } from '@/lib/imageProxy';
import {
  InkGameStage,
  InkCard,
  InkButton,
  InkPhasePill,
  InkTitle,
  InkPill,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';

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

const ACCENT = '#06b6d4'; // cyan — matches the BLIND TEST card

export const PixoguessGameScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
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
    roundHint,
    roundAttemptCount,
    solvedPlayersCount,
    isLoading,
    isHost,
    selectedCategories,
    imagePoolSize,
    setCategories,
    startGame,
    advanceToScores,
    submitGuess,
    skipBrokenImage,
    nextRound,
  } = usePixoguessGame(lobbyId, currentPlayer, players);

  const [categoriesConfirmed, setCategoriesConfirmed] = useState(!isHost);
  const [guess, setGuess] = useState('');
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(
    null,
  );
  const [lastInfo, setLastInfo] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  // Reset image state on each new round
  useEffect(() => {
    setImageBroken(false);
  }, [roundData?.id]);

  // Draw pixelated image with multi-source fallback
  useEffect(() => {
    if (!roundData?.image_url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const candidates = getProxyImageCandidates(roundData.image_url);
    let i = 0;
    const PER_CANDIDATE_TIMEOUT_MS = 3500;

    const tryNext = () => {
      if (cancelled) return;
      const next = candidates[i];
      if (!next) {
        console.error('[BlurRush] all image candidates failed:', roundData.image_url);
        setImageBroken(true);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        if (cancelled) return;
        cleanup();
        imageRef.current = img;
        const targetSize = 560;
        const ratio = targetSize / Math.max(img.width, img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        drawPixelated(ctx, img, canvas.width, canvas.height, pixelLevel);
        setImageBroken(false);
      };

      img.onerror = () => {
        if (cancelled) return;
        cleanup();
        i += 1;
        tryNext();
      };

      // Hard timeout per candidate so a slow proxy doesn't block forever
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        cleanup();
        console.warn(`[BlurRush] candidate ${i} timed out after ${PER_CANDIDATE_TIMEOUT_MS}ms`);
        i += 1;
        tryNext();
      }, PER_CANDIDATE_TIMEOUT_MS);

      img.src = next;
    };

    tryNext();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundData?.image_url]);

  // Update pixelation
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPixelated(ctx, imageRef.current, canvas.width, canvas.height, pixelLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelLevel]);

  const drawPixelated = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    level: number,
  ) => {
    const pixelSize = Math.max(1, Math.floor((level / maxPixelLevel) * 50));
    const smallW = Math.max(1, Math.floor(width / pixelSize));
    const smallH = Math.max(1, Math.floor(height / pixelSize));
    ctx.imageSmoothingEnabled = false;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(img, 0, 0, smallW, smallH);
      ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, width, height);
    }
  };

  const cooldownMs = useMemo(
    () => Math.max(0, cooldownUntil - Date.now()),
    [cooldownUntil],
  );

  const doSubmit = useCallback(async () => {
    if (!guess.trim() || hasGuessedCorrectly) return;
    if (roundWinner) return;
    const result = await submitGuess(guess);

    if (result.outcome === 'cooldown') {
      setLastInfo(
        `Cooldown: ${(Math.ceil((result.cooldownMs ?? 0) / 100) / 10).toFixed(1)}s`,
      );
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSubmit();
      }
    },
    [doSubmit],
  );

  // Auto-skip a broken image after 4 seconds (host only)
  useEffect(() => {
    if (!imageBroken || phase !== 'playing' || !isHost) return;
    const t = setTimeout(() => {
      console.warn('[BlurRush] image broken, picking a replacement');
      skipBrokenImage().catch(() => {});
    }, 3500);
    return () => clearTimeout(t);
  }, [imageBroken, phase, isHost, skipBrokenImage]);

  const timeProgress = (timeRemaining / totalTime) * 100;
  const pixelProgress = ((maxPixelLevel - pixelLevel) / maxPixelLevel) * 100;

  if (isLoading) {
    return (
      <InkGameStage accent={ACCENT}>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
              border: '4px solid #0a0810',
              boxShadow: `0 5px 0 #0a0810, 0 10px 24px ${ACCENT}66`,
            }}
          >
            <Loader2 className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.div>
        </div>
      </InkGameStage>
    );
  }

  return (
    <InkGameStage accent={ACCENT}>
      <div className="min-h-screen px-4 py-5 pb-[200px]">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* HEADER */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                  border: '3px solid #0a0810',
                  boxShadow: '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                }}
              >
                <ImageIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
              </motion.div>
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.25em] text-white/55 font-black"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Mode
                </p>
                <h1
                  className="text-3xl font-black leading-none text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  BlurRush
                </h1>
              </div>
            </div>

            {phase !== 'waiting' && phase !== 'final' && (
              <InkPill
                label="Round"
                value={`${currentRound} / ${totalRounds}`}
                color={ACCENT}
              />
            )}
          </div>

          {/* WAITING — CATEGORY SELECTOR */}
          {phase === 'waiting' && !categoriesConfirmed && (
            <BlurRushCategorySelector
              onSelect={(categories) => {
                setCategories(categories);
                setCategoriesConfirmed(true);
              }}
              isHost={isHost}
            />
          )}

          {/* WAITING — READY TO START */}
          {phase === 'waiting' && categoriesConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 max-w-md mx-auto"
            >
              <InkCard accent={ACCENT} highlighted className="p-8 text-center w-full">
                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                    border: '3px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810',
                  }}
                >
                  <Eye className="w-8 h-8 text-white" strokeWidth={2.5} />
                </motion.div>

                <InkTitle size="xl" className="mb-2">
                  BlurRush
                </InkTitle>
                <p
                  className="text-base text-white/70 mb-4 font-bold"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Une image floue va apparaître et se clarifier progressivement.
                  Sois le premier à deviner !
                </p>

                <div
                  className="rounded-2xl p-3 mb-4"
                  style={{
                    background: `linear-gradient(180deg, ${ACCENT}22, ${ACCENT}08)`,
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 3px 0 #0a0810',
                  }}
                >
                  <span
                    className="text-sm font-bold text-white/70"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Catégories :{' '}
                  </span>
                  <span
                    className="text-base font-black text-cyan-300"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {selectedCategories.includes('Mix')
                      ? 'Mix (toutes)'
                      : selectedCategories.join(', ')}
                  </span>
                  <span className="text-xs text-white/55 ml-2 font-bold">
                    ({imagePoolSize} images)
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <Users className="w-4 h-4 text-white/60" />
                  <span
                    className="text-base font-black text-white"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {players.length} joueur{players.length > 1 ? 's' : ''}
                  </span>
                </div>

                {isHost ? (
                  <div className="space-y-3">
                    <InkButton
                      onClick={startGame}
                      color={ACCENT}
                      size="lg"
                      className="w-full"
                    >
                      <Sparkles className="w-6 h-6" strokeWidth={2.5} />
                      Lancer la partie
                    </InkButton>
                    <button
                      onClick={() => setCategoriesConfirmed(false)}
                      className="text-sm text-white/55 hover:text-white transition-colors font-black"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      ← Changer les catégories
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-base text-white/65 font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    En attente de l'hôte…
                  </p>
                )}
              </InkCard>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === 'playing' && roundData && (
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Main Game Area */}
              <div className="lg:col-span-2 space-y-4">
                {/* Timer Bar */}
                <div
                  className="relative h-4 rounded-full overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '2.5px solid #0a0810',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${timeProgress}%`,
                      background:
                        timeProgress > 30
                          ? 'linear-gradient(90deg, #34d399, #10b981)'
                          : timeProgress > 10
                            ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                            : 'linear-gradient(90deg, #ef4444, #b91c1c)',
                      boxShadow:
                        timeProgress > 30
                          ? '0 0 8px rgba(52,211,153,0.6)'
                          : timeProgress > 10
                            ? '0 0 8px rgba(251,191,36,0.6)'
                            : '0 0 8px rgba(239,68,68,0.7)',
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Image Container */}
                <InkCard accent={ACCENT} highlighted className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-cyan-300" strokeWidth={2.5} />
                      <span
                        className="text-2xl font-black tabular-nums text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {Math.ceil(timeRemaining / 1000)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs uppercase tracking-wider font-black text-white/65"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Clarté
                      </span>
                      <div
                        className="w-24 h-3 rounded-full overflow-hidden"
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          border: '2px solid #0a0810',
                        }}
                      >
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${pixelProgress}%`,
                            background:
                              'linear-gradient(90deg, #ec4899, #f472b6)',
                            boxShadow: '0 0 6px rgba(236,72,153,0.6)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '4px solid #0a0810',
                        boxShadow: '0 5px 0 #0a0810',
                      }}
                    >
                      {imageBroken ? (
                        <div className="w-[480px] max-w-full aspect-square flex flex-col items-center justify-center gap-3 p-6 text-center">
                          <motion.div
                            animate={{ rotate: [-3, 3, -3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-6xl"
                          >
                            🖼️
                          </motion.div>
                          <p
                            className="text-2xl font-black text-white"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW,
                            }}
                          >
                            Image indisponible
                          </p>
                          <p
                            className="text-sm text-white/55 font-bold"
                            style={{ fontFamily: "'Caveat', cursive" }}
                          >
                            On passe à la suivante…
                          </p>
                          <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                        </div>
                      ) : (
                        <canvas
                          ref={canvasRef}
                          className="block max-w-full"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}

                      <AnimatePresence>
                        {roundWinner && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-black/75"
                          >
                            <div className="text-center space-y-2">
                              <motion.div
                                animate={{ rotate: [-5, 5, -5] }}
                                transition={{ duration: 1.4, repeat: Infinity }}
                                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #fbbf24, #d97706)',
                                  border: '4px solid #0a0810',
                                  boxShadow: '0 5px 0 #0a0810',
                                }}
                              >
                                <Trophy className="w-8 h-8 text-white" strokeWidth={2.5} />
                              </motion.div>
                              <p
                                className="text-3xl font-black text-white leading-none"
                                style={{
                                  fontFamily: "'Caveat', cursive",
                                  textShadow: GRAFFITI_TEXT_SHADOW,
                                }}
                              >
                                {roundWinner.name} a trouvé !
                              </p>
                              <p
                                className="text-2xl font-black text-amber-300"
                                style={{
                                  fontFamily: "'Caveat', cursive",
                                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                }}
                              >
                                +{roundWinner.points} pts
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {roundData.category && (
                    <div className="text-center mt-4">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-base font-black text-white"
                        style={{
                          background:
                            'linear-gradient(180deg, #a855f7, #6b21a8)',
                          border: '2.5px solid #0a0810',
                          boxShadow: '0 3px 0 #0a0810',
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {roundData.category}
                      </span>
                    </div>
                  )}
                </InkCard>

                {/* Stats + Guess Input */}
                <InkCard accent={ACCENT} className="p-4">
                  <div className="grid gap-2 grid-cols-3 mb-3">
                    <StatBlock
                      label="Pression"
                      value={`${roundAttemptCount}`}
                      sublabel="tentatives"
                      color="#ef4444"
                    />
                    <StatBlock
                      label="Lecture"
                      value={`${solvedPlayersCount}`}
                      sublabel={`joueur${solvedPlayersCount > 1 ? 's' : ''} ont lock`}
                      color="#34d399"
                    />
                    <StatBlock
                      label="Hint live"
                      value={roundHint ?? '—'}
                      sublabel={roundHint ? '' : 'Aucun indice'}
                      color="#fbbf24"
                      compact
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        roundWinner
                          ? "Quelqu'un a déjà trouvé…"
                          : hasGuessedCorrectly
                            ? '✓ Bonne réponse !'
                            : 'Tape ta réponse…'
                      }
                      disabled={
                        hasGuessedCorrectly ||
                        Boolean(roundWinner) ||
                        cooldownMs > 0
                      }
                      className={cn(
                        'flex-1 px-4 py-3 rounded-2xl text-lg font-black text-white transition-all',
                        showFeedback === 'correct' && 'animate-none',
                        showFeedback === 'wrong' && 'animate-shake',
                      )}
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                        border:
                          showFeedback === 'correct'
                            ? '3px solid #34d399'
                            : showFeedback === 'wrong'
                              ? '3px solid #ef4444'
                              : '3px solid #0a0810',
                        boxShadow:
                          showFeedback === 'correct'
                            ? '0 4px 0 #0a0810, 0 0 14px rgba(52,211,153,0.4)'
                            : showFeedback === 'wrong'
                              ? '0 4px 0 #0a0810, 0 0 14px rgba(239,68,68,0.4)'
                              : 'inset 0 2px 4px rgba(0,0,0,0.4), 0 4px 0 #0a0810',
                        fontFamily: "'Caveat', cursive",
                      }}
                    />
                    <InkButton
                      onClick={doSubmit}
                      disabled={
                        hasGuessedCorrectly ||
                        Boolean(roundWinner) ||
                        !guess.trim() ||
                        cooldownMs > 0
                      }
                      color="#fbbf24"
                      size="md"
                    >
                      <Send className="w-5 h-5" strokeWidth={2.5} />
                    </InkButton>
                  </div>

                  <div
                    className="mt-2 flex items-center justify-between text-xs font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    <div className="flex items-center gap-2 text-white/60">
                      {cooldownMs > 0 && (
                        <span className="inline-flex items-center gap-1 text-red-300">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Cooldown {Math.ceil(cooldownMs / 100) / 10}s
                        </span>
                      )}
                      {!cooldownMs && roundHint && (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Sparkles className="w-3.5 h-3.5" />
                          {roundHint}
                        </span>
                      )}
                    </div>
                    {lastInfo && (
                      <span className="truncate max-w-[60%] text-white/65">
                        {lastInfo}
                      </span>
                    )}
                  </div>
                </InkCard>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <BlurRushLiveScoreboard
                  stats={liveStats}
                  currentPlayerId={currentPlayer.id}
                />
                <InkCard accent="#fbbf24" className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <motion.div
                      animate={{ rotate: [-5, 5, -5] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #fbbf24, #d97706)',
                        border: '2.5px solid #0a0810',
                        boxShadow: '0 3px 0 #0a0810',
                      }}
                    >
                      <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <h3
                      className="text-2xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Classement
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {scores.map((score, index) => {
                      const isMe = score.player_id === currentPlayer.id;
                      const medalColors = ['#fbbf24', '#9ca3af', '#a16207'];
                      const medal = medalColors[index];
                      return (
                        <motion.div
                          key={score.player_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            rotate: index % 2 === 0 ? -0.5 : 0.5,
                          }}
                          className="flex items-center justify-between p-2.5 rounded-2xl"
                          style={{
                            background: isMe
                              ? `linear-gradient(180deg, ${ACCENT}33, ${ACCENT}10)`
                              : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                            border: '2.5px solid #0a0810',
                            boxShadow: '0 2px 0 #0a0810',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black leading-none"
                              style={{
                                background: medal
                                  ? `linear-gradient(180deg, ${medal}, ${medal}cc)`
                                  : 'rgba(255,255,255,0.06)',
                                border: '2px solid #0a0810',
                                boxShadow: '0 2px 0 #0a0810',
                                fontFamily: "'Caveat', cursive",
                                textShadow: GRAFFITI_TEXT_SHADOW_SM,
                              }}
                            >
                              {index + 1}
                            </div>
                            <span
                              className="text-base font-black text-white truncate max-w-[120px] leading-none"
                              style={{
                                fontFamily: "'Caveat', cursive",
                                textShadow: GRAFFITI_TEXT_SHADOW_SM,
                              }}
                            >
                              {score.player_name}
                            </span>
                          </div>
                          <span
                            className="text-base font-black text-cyan-300 leading-none"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            {score.score}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </InkCard>
              </div>
            </div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && roundData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6"
            >
              <InkCard
                accent={ACCENT}
                highlighted
                className="p-6 text-center max-w-lg w-full"
              >
                <h2
                  className="text-3xl font-black text-white mb-4 leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  La réponse était…
                </h2>

                <div
                  className="relative w-72 h-72 mx-auto mb-4 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.2))',
                    border: '4px solid #0a0810',
                    boxShadow: '0 5px 0 #0a0810',
                  }}
                >
                  <img
                    src={proxyImageUrl(roundData.image_url)}
                    alt={roundData.correct_answer || 'Answer'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const imgEl = e.currentTarget;
                      const tried = imgEl.dataset.tried || '0';
                      const idx = parseInt(tried, 10) + 1;
                      const candidates = getProxyImageCandidates(roundData.image_url);
                      if (idx < candidates.length) {
                        imgEl.dataset.tried = String(idx);
                        imgEl.src = candidates[idx];
                      } else {
                        imgEl.style.display = 'none';
                        const parent = imgEl.parentElement;
                        if (parent && !parent.querySelector('[data-fallback]')) {
                          const ph = document.createElement('div');
                          ph.dataset.fallback = 'true';
                          ph.className =
                            'absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/55';
                          ph.innerHTML = `<div style="font-size:64px">🖼️</div><span style="font-family:'Caveat',cursive;font-size:20px;font-weight:900;color:white">Image indisponible</span>`;
                          parent.appendChild(ph);
                        }
                      }
                    }}
                  />
                </div>

                <div
                  className="text-4xl font-black text-cyan-300 mb-4 capitalize leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {roundData.correct_answer}
                </div>

                {roundWinner ? (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-amber-300" />
                    <span
                      className="text-xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      <span className="text-amber-300">{roundWinner.name}</span>{' '}
                      a trouvé en premier !
                    </span>
                  </div>
                ) : (
                  <p
                    className="text-base text-white/65 mb-4 font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Personne n'a trouvé…
                  </p>
                )}

                {isHost && (
                  <InkButton onClick={advanceToScores} color={ACCENT}>
                    Voir les scores
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                  </InkButton>
                )}
              </InkCard>
            </motion.div>
          )}

          {/* SCORES */}
          {phase === 'scores' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-6"
            >
              <InkCard
                accent={ACCENT}
                highlighted
                className="p-6 max-w-md w-full"
              >
                <InkTitle size="lg" className="text-center mb-4">
                  Round {currentRound}
                </InkTitle>

                <div className="space-y-2 mb-4">
                  {scores.map((score, index) => {
                    const medalColors = ['#fbbf24', '#9ca3af', '#a16207'];
                    const medal = medalColors[index];
                    return (
                      <motion.div
                        key={score.player_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          rotate: index % 2 === 0 ? -0.6 : 0.6,
                        }}
                        transition={{ delay: index * 0.06 }}
                        className="flex items-center justify-between p-3 rounded-2xl"
                        style={{
                          background: medal
                            ? `linear-gradient(180deg, ${medal}33, ${medal}10)`
                            : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                          border: '2.5px solid #0a0810',
                          boxShadow: '0 3px 0 #0a0810',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-black leading-none"
                            style={{
                              background: medal
                                ? `linear-gradient(180deg, ${medal}, ${medal}cc)`
                                : 'rgba(255,255,255,0.08)',
                              border: '2.5px solid #0a0810',
                              boxShadow: '0 2px 0 #0a0810',
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            #{index + 1}
                          </div>
                          <span
                            className="text-base font-black text-white leading-none"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            {score.player_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-xl font-black text-cyan-300 leading-none"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            {score.score} pts
                          </div>
                          <div className="text-[10px] text-white/55 font-bold mt-0.5">
                            {score.correct_guesses} bonne
                            {score.correct_guesses > 1 ? 's' : ''} réponse
                            {score.correct_guesses > 1 ? 's' : ''}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {isHost && (
                  <InkButton
                    onClick={nextRound}
                    color={ACCENT}
                    size="lg"
                    className="w-full"
                  >
                    {currentRound >= totalRounds
                      ? 'Résultats finaux'
                      : 'Round suivant'}
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                  </InkButton>
                )}
              </InkCard>
            </motion.div>
          )}

          {/* FINAL */}
          {phase === 'final' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6"
            >
              <InkCard
                accent="#fbbf24"
                highlighted
                className="p-6 text-center max-w-md w-full"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, stiffness: 220 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                    border: '4px solid #0a0810',
                    boxShadow: '0 5px 0 #0a0810, 0 10px 24px rgba(251,191,36,0.5)',
                  }}
                >
                  <Trophy className="w-10 h-10 text-white" strokeWidth={2} />
                </motion.div>

                <InkTitle size="xl" className="mb-2">
                  Partie terminée !
                </InkTitle>

                {scores[0] && (
                  <div className="mb-4">
                    <p
                      className="text-base text-white/65 mb-1 font-bold"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Le gagnant est
                    </p>
                    <p
                      className="text-3xl font-black text-amber-300 leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      {scores[0].player_name}
                    </p>
                    <p
                      className="text-2xl font-black text-cyan-300 mt-1 leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      {scores[0].score} points
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {scores.slice(0, 5).map((score, index) => (
                    <div
                      key={score.player_id}
                      className="flex items-center justify-between p-2.5 rounded-2xl"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                        border: '2.5px solid #0a0810',
                        boxShadow: '0 2px 0 #0a0810',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-black text-white/85"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <span
                          className="text-base font-black text-white leading-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {score.player_name}
                        </span>
                      </div>
                      <span
                        className="text-base font-black text-cyan-300 leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {score.score}
                      </span>
                    </div>
                  ))}
                </div>

                {isHost && (
                  <InkButton
                    onClick={onEndGame}
                    color="#fbbf24"
                    size="lg"
                    className="w-full"
                  >
                    Retour au lobby
                  </InkButton>
                )}
              </InkCard>
            </motion.div>
          )}
        </div>

        {/* Chat */}
        <div className="fixed bottom-20 right-4 z-50">
          <LobbyChat
            lobbyId={lobbyId}
            playerId={currentPlayer.id}
            playerName={currentPlayer.name}
          />
        </div>
      </div>
    </InkGameStage>
  );
};

/* ============================================================
   Stat block — small graffiti card
============================================================ */
const StatBlock = ({
  label,
  value,
  sublabel,
  color,
  compact = false,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
  compact?: boolean;
}) => (
  <div
    className="rounded-2xl px-3 py-2.5"
    style={{
      background: `linear-gradient(180deg, ${color}22, ${color}08)`,
      border: '2.5px solid #0a0810',
      boxShadow: '0 2px 0 #0a0810',
    }}
  >
    <div
      className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-black"
      style={{ fontFamily: "'Caveat', cursive" }}
    >
      {label}
    </div>
    <div
      className={cn(
        'mt-0.5 font-black leading-none truncate',
        compact ? 'text-sm text-white' : 'text-xl',
      )}
      style={{
        fontFamily: "'Caveat', cursive",
        color: compact ? 'white' : color,
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {value}
    </div>
    {sublabel && (
      <div
        className="text-[10px] text-white/45 font-bold mt-0.5"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        {sublabel}
      </div>
    )}
  </div>
);

export default PixoguessGameScreen;
