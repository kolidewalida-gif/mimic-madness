import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, Home, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PodiumAd } from "@/components/PodiumAd";
import {
  PulpStage,
  PulpPanel,
  PulpTitle,
  PulpButton,
  PulpTag,
  PulpRule,
  PULP,
  PULP_FONT,
} from "@/components/audiophone/PulpComic";
import { InkBetaPanel } from "@/components/game-beta/InkBetaGameLayout";

interface RevealPhraseData {
  original: {
    id: string;
    player_id: string;
    player_name: string;
    originalUrl: string;
    reversedUrl: string | null;
  };
  imitations: Array<{
    id: string;
    imitator_player_id: string;
    imitator_player_name: string;
    reversedUrl: string | null; // This is the RE-reversed = back to normal
  }>;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface SyncState {
  isPlaying: boolean;
  phraseIndex: number;
  step: string; // 'idle' | 'original' | 'reversed' | 'imitation_0' | 'imitation_1' etc.
}

interface AudioPhoneRevealPhaseV2Props {
  variant?: 'default' | 'inkBeta';
  revealData: RevealPhraseData[];
  players: Player[];
  isHost: boolean;
  instanceKey: string;
  syncState: SyncState;
  onSyncStateChange: (isPlaying: boolean, phraseIndex: number, step: string) => void;
  onPlayAgain: () => void;
  onEndGame: () => void;
}

export const AudioPhoneRevealPhaseV2 = ({
  variant = 'default',
  revealData,
  players,
  isHost,
  instanceKey,
  syncState,
  onSyncStateChange,
  onPlayAgain,
  onEndGame,
}: AudioPhoneRevealPhaseV2Props) => {
  const [expandedPhrase, setExpandedPhrase] = useState<number | null>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [requiresInteraction, setRequiresInteraction] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMediaKeyRef = useRef<string | null>(null);
  const syncStateRef = useRef(syncState);
  const onSyncStateChangeRef = useRef(onSyncStateChange);
  syncStateRef.current = syncState;
  onSyncStateChangeRef.current = onSyncStateChange;

  const currentPhrase = revealData[syncState.phraseIndex] || null;

  const getAudioUrlForStep = useCallback((step: string): string | null => {
    const phrase = revealData[syncState.phraseIndex];
    if (!phrase) return null;

    if (step === 'original') {
      return phrase.original.originalUrl || null;
    } else if (step === 'reversed') {
      return phrase.original.reversedUrl;
    } else if (step.startsWith('imitation_')) {
      const idx = parseInt(step.split('_')[1], 10);
      const imitation = phrase.imitations[idx];
      return imitation?.reversedUrl || null;
    }
    return null;
  }, [revealData, syncState.phraseIndex]);

  const getNextStep = useCallback((currentStep: string): string | null => {
    const phrase = revealData[syncState.phraseIndex];
    if (!phrase) return null;

    if (currentStep === 'idle' || currentStep === '') {
      return 'original';
    } else if (currentStep === 'original') {
      return 'reversed';
    } else if (currentStep === 'reversed') {
      if (phrase.imitations.length > 0) {
        return 'imitation_0';
      }
      return null;
    } else if (currentStep.startsWith('imitation_')) {
      const idx = parseInt(currentStep.split('_')[1], 10);
      if (Number.isFinite(idx) && idx + 1 < phrase.imitations.length) {
        return `imitation_${idx + 1}`;
      }
      return null;
    }
    return null;
  }, [revealData, syncState.phraseIndex]);

  const getNextPlayableStep = useCallback((completedStep: string): string | null => {
    let candidate = getNextStep(completedStep);
    let guard = 0;
    while (candidate && !getAudioUrlForStep(candidate) && guard < 100) {
      candidate = getNextStep(candidate);
      guard += 1;
    }
    return candidate;
  }, [getAudioUrlForStep, getNextStep]);

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current === null) return;
    clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  }, []);

  const resetAudioElement = useCallback((clearSource: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
    } catch {
      // A detached media element may already be inert.
    }
    if (clearSource) {
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        // JSDOM and a few embedded browsers do not implement `load`.
      }
    }
  }, []);

  const scheduleAdvance = useCallback((completedStep: string, delayMs = 600) => {
    clearAdvanceTimeout();
    const state = syncStateRef.current;
    const phraseIndex = state.phraseIndex;
    const generation = playbackGenerationRef.current;
    const nextStep = getNextPlayableStep(completedStep);

    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      const latest = syncStateRef.current;
      if (
        !mountedRef.current
        || playbackGenerationRef.current !== generation
        || latest.phraseIndex !== phraseIndex
        || latest.step !== completedStep
      ) {
        return;
      }

      if (nextStep) {
        onSyncStateChangeRef.current(true, phraseIndex, nextStep);
      } else {
        onSyncStateChangeRef.current(false, phraseIndex, 'complete');
      }
    }, delayMs);
  }, [clearAdvanceTimeout, getNextPlayableStep]);

  const playStep = useCallback(async (step: string) => {
    clearAdvanceTimeout();
    const audio = audioRef.current;
    const url = getAudioUrlForStep(step);
    const state = syncStateRef.current;
    const mediaKey = `${state.phraseIndex}:${step}`;
    const generation = playbackGenerationRef.current + 1;
    playbackGenerationRef.current = generation;
    activeMediaKeyRef.current = mediaKey;

    if (mountedRef.current) {
      setRequiresInteraction(false);
      setPlaybackMessage(null);
      setLocalIsPlaying(false);
    }

    if (!url || !audio) {
      activeMediaKeyRef.current = null;
      if (mountedRef.current) {
        setPlaybackMessage('Cet extrait est indisponible.');
      }
      if (isHost) scheduleAdvance(step, 0);
      return;
    }

    resetAudioElement(false);
    audio.src = url;

    try {
      // `play()` is called synchronously from the retry button as well, so the
      // browser can associate that attempt with the user's gesture.
      await audio.play();
      if (
        !mountedRef.current
        || playbackGenerationRef.current !== generation
        || activeMediaKeyRef.current !== mediaKey
      ) {
        return;
      }
      setLocalIsPlaying(true);
    } catch (error) {
      if (
        !mountedRef.current
        || playbackGenerationRef.current !== generation
        || activeMediaKeyRef.current !== mediaKey
      ) {
        return;
      }
      setLocalIsPlaying(false);
      setRequiresInteraction(true);
      setPlaybackMessage(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Le navigateur a bloqué la lecture automatique.'
          : 'La lecture n’a pas démarré.',
      );
    }
  }, [clearAdvanceTimeout, getAudioUrlForStep, isHost, resetAudioElement, scheduleAdvance]);

  const handleAudioEnded = useCallback(() => {
    if (!mountedRef.current) return;
    setLocalIsPlaying(false);
    activeMediaKeyRef.current = null;
    if (isHost) scheduleAdvance(syncStateRef.current.step);
  }, [isHost, scheduleAdvance]);

  const handleAudioError = useCallback(() => {
    if (!mountedRef.current) return;
    const state = syncStateRef.current;
    const mediaKey = `${state.phraseIndex}:${state.step}`;
    if (activeMediaKeyRef.current !== mediaKey) return;

    activeMediaKeyRef.current = null;
    setLocalIsPlaying(false);
    setRequiresInteraction(false);
    setPlaybackMessage('Cet extrait audio est illisible et a été ignoré.');
    if (isHost) scheduleAdvance(state.step, 0);
  }, [isHost, scheduleAdvance]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      playbackGenerationRef.current += 1;
      activeMediaKeyRef.current = null;
      clearAdvanceTimeout();
      resetAudioElement(true);
    };
  }, [clearAdvanceTimeout, resetAudioElement]);

  useEffect(() => {
    clearAdvanceTimeout();
    const step = syncState.step;
    if (syncState.isPlaying && step && step !== 'idle' && step !== 'complete') {
      void playStep(step);
      return;
    }

    playbackGenerationRef.current += 1;
    activeMediaKeyRef.current = null;
    resetAudioElement(false);
    setLocalIsPlaying(false);
    setRequiresInteraction(false);
    setPlaybackMessage(null);
  }, [
    clearAdvanceTimeout,
    playStep,
    resetAudioElement,
    syncState.isPlaying,
    syncState.phraseIndex,
    syncState.step,
  ]);

  const retryCurrentStep = () => {
    const step = syncStateRef.current.step;
    if (!step || step === 'idle' || step === 'complete') return;
    void playStep(step);
  };

  const startPhrasePlayback = () => {
    if (!isHost) return;
    const currentStep = syncStateRef.current.step;
    const targetStep = currentStep === 'idle' || currentStep === 'complete'
      ? 'original'
      : currentStep;
    onSyncStateChangeRef.current(true, syncStateRef.current.phraseIndex, targetStep);
  };

  const pausePlayback = () => {
    if (!isHost) return;
    clearAdvanceTimeout();
    playbackGenerationRef.current += 1;
    activeMediaKeyRef.current = null;
    resetAudioElement(false);
    onSyncStateChangeRef.current(
      false,
      syncStateRef.current.phraseIndex,
      syncStateRef.current.step,
    );
  };

  const goToNextPhrase = () => {
    if (!isHost) return;
    const state = syncStateRef.current;
    if (state.phraseIndex < revealData.length - 1) {
      clearAdvanceTimeout();
      playbackGenerationRef.current += 1;
      activeMediaKeyRef.current = null;
      resetAudioElement(false);
      onSyncStateChangeRef.current(false, state.phraseIndex + 1, 'idle');
    }
  };

  const goToPreviousPhrase = () => {
    if (!isHost) return;
    const state = syncStateRef.current;
    if (state.phraseIndex > 0) {
      clearAdvanceTimeout();
      playbackGenerationRef.current += 1;
      activeMediaKeyRef.current = null;
      resetAudioElement(false);
      onSyncStateChangeRef.current(false, state.phraseIndex - 1, 'idle');
    }
  };

  if (!revealData.length) {
    return (
      <PulpStage accent={PULP.red} accent2={PULP.blue}>
        <div className="menu-screen-safe h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="relative flex min-h-full items-start justify-center p-3 sm:items-center sm:p-5">
          <PulpPanel accent={PULP.red} className="w-full max-w-md">
            <div className="px-7 py-9 text-center">
              <PulpTitle size="md">Aucune donnée à afficher</PulpTitle>
            </div>
          </PulpPanel>
          </div>
        </div>
      </PulpStage>
    );
  }

  const currentStep = syncState.step;
  const revealComplete = syncState.phraseIndex === revealData.length - 1
    && currentStep === 'complete'
    && !syncState.isPlaying;
  const currentImitationIndex = currentStep.startsWith('imitation_')
    ? parseInt(currentStep.split('_')[1], 10)
    : -1;

  const stepColor = (active: boolean, color: string) =>
    active
      ? { background: `${color}26`, border: `2px solid ${color}`, color }
      : { background: 'rgba(8,7,10,0.4)', border: '2px solid rgba(243,237,224,0.12)', color: 'rgba(243,237,224,0.45)' };

  /* ---------- INK BETA ---------- */
  if (variant === 'inkBeta') {
    /*
     * La chaîne de lecture est le sujet de cette phase : l'originale, la même à
     * l'envers, puis chaque imitation. On la montre comme une file d'étapes avec
     * l'étape en cours marquée, plutôt qu'en pastilles dispersées.
     */
    const chain: Array<{ key: string; label: string }> = [
      { key: 'original', label: 'Original' },
      { key: 'reversed', label: 'À l\'envers' },
      ...(currentPhrase?.imitations.map((im, idx) => ({
        key: `imitation_${idx}`,
        label: im.imitator_player_name,
      })) ?? []),
    ];
    const currentChainIndex = chain.findIndex((entry) => entry.key === currentStep);

    return (
      <>
        <audio
          ref={audioRef}
          onPlay={() => { if (mountedRef.current) setLocalIsPlaying(true); }}
          onPause={() => { if (mountedRef.current) setLocalIsPlaying(false); }}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />

        <InkBetaPanel
          featured
          className="ik-ap-panel ik-ap-reveal-panel"
          bodyClassName="ik-ap-reveal-body"
          step={`Phrase ${syncState.phraseIndex + 1} sur ${revealData.length}`}
          title={`Phrase de ${currentPhrase?.original.player_name ?? '—'}`}
          titleId="ik-ap-reveal-current"
          aside={currentStep === 'complete' ? (
            <span className="ik-seat-flag" aria-hidden="true"><Volume2 /></span>
          ) : undefined}
        >
          <ol className="ik-ap-chain">
            {chain.map((entry, idx) => (
              <li
                key={entry.key}
                className={cn(
                  'ik-ap-chain-step',
                  currentChainIndex > idx && 'is-past',
                  entry.key === currentStep && 'is-current',
                  !getAudioUrlForStep(entry.key) && 'is-missing',
                )}
              >
                <Volume2 aria-hidden="true" />
                <span>{entry.label}</span>
              </li>
            ))}
          </ol>

          {requiresInteraction && (
            <div className="ik-ap-playback-retry">
              <p className="ik-game-note ik-game-note--warn">
                <Volume2 aria-hidden="true" /> {playbackMessage} Relance ce son pour continuer.
              </p>
              {!isHost && (
                <button
                  type="button"
                  onClick={retryCurrentStep}
                  className="ik-secondary-action menu-focus"
                >
                  <RotateCcw aria-hidden="true" /> Relancer ce son
                </button>
              )}
            </div>
          )}

          {playbackMessage && !requiresInteraction && (
            <p className="ik-game-note ik-game-note--warn">
              <Volume2 aria-hidden="true" /> {playbackMessage}
            </p>
          )}

          {isHost ? (
            <div className="ik-game-actions--split">
              <button
                type="button"
                onClick={requiresInteraction
                  ? retryCurrentStep
                  : localIsPlaying
                    ? pausePlayback
                    : startPhrasePlayback}
                className="ik-primary-action menu-focus"
              >
                <span className="ik-primary-action-icon">
                  {requiresInteraction ? (
                    <RotateCcw aria-hidden="true" />
                  ) : localIsPlaying ? (
                    <Pause aria-hidden="true" />
                  ) : (
                    <Play fill="currentColor" aria-hidden="true" />
                  )}
                </span>
                <span>
                  {requiresInteraction
                    ? 'Relancer ce son'
                    : localIsPlaying
                      ? 'Pause'
                      : currentStep === 'idle'
                        ? 'Démarrer'
                        : currentStep === 'complete'
                          ? 'Rejouer'
                          : 'Reprendre'}
                </span>
              </button>
              <button
                type="button"
                onClick={goToNextPhrase}
                disabled={syncState.phraseIndex === revealData.length - 1 || localIsPlaying}
                className="ik-secondary-action menu-focus"
              >
                Phrase suivante <SkipForward aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="ik-game-note">
              {localIsPlaying ? (
                <>
                  <Volume2 aria-hidden="true" /> Lecture en cours…
                </>
              ) : (
                <>
                  <Play aria-hidden="true" /> L'hôte pilote la lecture.
                </>
              )}
            </p>
          )}

          {revealData.length > 1 && (
            <div className="ik-dots" aria-hidden="true">
              {revealData.map((phrase, idx) => (
                <span
                  key={phrase.original.id}
                  className={cn(
                    idx < syncState.phraseIndex && 'is-past',
                    idx === syncState.phraseIndex && 'is-current',
                  )}
                />
              ))}
            </div>
          )}
        </InkBetaPanel>

        {revealComplete && (
          <PodiumAd gameMode="audiophone" instanceKey={`${instanceKey}:reveal-complete`} />
        )}

        {isHost && (
          <InkBetaPanel
            className="ik-ap-panel ik-ap-reveal-actions"
            step="Et après"
            title="La suite"
            titleId="ik-ap-reveal-next"
          >
            <div className="ik-game-actions--split">
              <button
                type="button"
                onClick={onPlayAgain}
                disabled={localIsPlaying}
                className="ik-secondary-action menu-focus"
              >
                <RotateCcw aria-hidden="true" /> Rejouer une manche
              </button>
              <button
                type="button"
                onClick={onEndGame}
                disabled={localIsPlaying}
                className="ik-primary-action menu-focus"
              >
                <span className="ik-primary-action-icon">
                  <Home aria-hidden="true" />
                </span>
                <span>Terminer</span>
              </button>
            </div>
          </InkBetaPanel>
        )}
      </>
    );
  }

  return (
    <PulpStage accent={PULP.red} accent2={PULP.blue}>
      <div className="menu-screen-safe h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="relative flex min-h-full items-start justify-center p-3 pb-24 sm:items-center sm:p-5 sm:pb-24 landscape:py-3 landscape:pb-24">
        <audio
          ref={audioRef}
          onPlay={() => { if (mountedRef.current) setLocalIsPlaying(true); }}
          onPause={() => { if (mountedRef.current) setLocalIsPlaying(false); }}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl"
        >
          <PulpPanel accent={PULP.red}>
            <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-7 landscape:space-y-3 landscape:py-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <PulpTitle size="lg" accent={PULP.red} accent2={PULP.blue}>
                  Révélation !
                </PulpTitle>
                <p className="text-sm uppercase text-[color:var(--pulp-paper)]/55" style={{ fontFamily: PULP_FONT, letterSpacing: '0.06em' }}>
                  Phrase{' '}
                  <span style={{ color: PULP.yellow }}>{syncState.phraseIndex + 1}</span> / {revealData.length}
                </p>
                {!isHost && (
                  <div className="flex justify-center pt-1">
                    <PulpTag color={PULP.yellow} rotate={-2}>L'hôte contrôle la lecture</PulpTag>
                  </div>
                )}
              </div>

              {/* Current phrase block */}
              <div
                className="space-y-3 p-3 sm:space-y-4 sm:p-5 landscape:space-y-2"
                style={{ background: 'rgba(8,7,10,0.5)', border: `2px solid ${PULP.ink}` }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3
                    className="uppercase"
                    style={{ fontFamily: PULP_FONT, fontSize: '1.4rem', color: PULP.paper, letterSpacing: '0.03em' }}
                  >
                    Phrase de {currentPhrase?.original.player_name}
                  </h3>
                  {currentStep !== 'idle' && currentStep !== 'complete' && (
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="uppercase px-3 py-1"
                      style={{
                        fontFamily: PULP_FONT,
                        fontSize: '0.85rem',
                        letterSpacing: '0.08em',
                        ...(currentStep === 'original'
                          ? { color: PULP.green, border: `2px solid ${PULP.green}` }
                          : currentStep === 'reversed'
                            ? { color: PULP.yellow, border: `2px solid ${PULP.yellow}` }
                            : { color: PULP.blue, border: `2px solid ${PULP.blue}` }),
                      }}
                    >
                      {currentStep === 'original' && '🎤 Original'}
                      {currentStep === 'reversed' && '🔄 Inversé'}
                      {currentStep.startsWith('imitation_') && `🗣️ Imitation ${currentImitationIndex + 1}`}
                    </motion.span>
                  )}
                  {currentStep === 'complete' && (
                    <PulpTag color={PULP.green} rotate={0}>✓ Terminé</PulpTag>
                  )}
                </div>

                {requiresInteraction && (
                  <div className="space-y-2 text-center">
                    <p
                      className="text-sm uppercase"
                      style={{ color: PULP.yellow, fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                    >
                      {playbackMessage} Relance ce son pour continuer.
                    </p>
                    {!isHost && (
                      <PulpButton onClick={retryCurrentStep} color={PULP.yellow} size="sm">
                        <RotateCcw className="h-4 w-4" /> Relancer ce son
                      </PulpButton>
                    )}
                  </div>
                )}

                {playbackMessage && !requiresInteraction && (
                  <p
                    className="text-center text-sm uppercase"
                    style={{ color: PULP.yellow, fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                  >
                    {playbackMessage}
                  </p>
                )}

                {/* Host controls */}
                {isHost && (
                  <div className="flex justify-center">
                    <PulpButton
                      onClick={requiresInteraction
                        ? retryCurrentStep
                        : localIsPlaying
                          ? pausePlayback
                          : startPhrasePlayback}
                      color={PULP.red}
                      size="md"
                    >
                      {requiresInteraction ? (
                        <>
                          <RotateCcw className="w-5 h-5" strokeWidth={3} />
                          Relancer ce son
                        </>
                      ) : localIsPlaying ? (
                        <>
                          <Pause className="w-5 h-5" strokeWidth={3} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" strokeWidth={3} />
                          {currentStep === 'idle' ? 'Démarrer' : currentStep === 'complete' ? 'Rejouer' : 'Reprendre'}
                        </>
                      )}
                    </PulpButton>
                  </div>
                )}

                {/* Non-host play indicator */}
                {!isHost && localIsPlaying && (
                  <div className="flex justify-center">
                    <div
                      className="flex items-center gap-2 px-4 py-2"
                      style={{ background: `${PULP.red}1f`, border: `2px solid ${PULP.red}66` }}
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 h-4 rounded-full"
                            style={{ background: PULP.red }}
                            animate={{ scaleY: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="uppercase text-sm" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em', color: PULP.paper }}>
                        Lecture en cours…
                      </span>
                    </div>
                  </div>
                )}

                {/* Sequence visualization */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-2 text-sm uppercase" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em', ...stepColor(currentStep === 'original', PULP.green) }}>
                    <Volume2 className="mr-1 inline h-4 w-4" />
                    Original
                  </span>
                  <span style={{ color: 'rgba(243,237,224,0.35)' }}>→</span>
                  <span className="px-3 py-2 text-sm uppercase" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em', ...stepColor(currentStep === 'reversed', PULP.yellow) }}>
                    <Volume2 className="mr-1 inline h-4 w-4" />
                    Inversé
                  </span>
                  {currentPhrase?.imitations.map((im, idx) => (
                    <div key={im.id} className="flex items-center gap-2">
                      <span style={{ color: 'rgba(243,237,224,0.35)' }}>→</span>
                      <span className="px-3 py-2 text-sm uppercase" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em', ...stepColor(currentStep === `imitation_${idx}`, PULP.blue) }}>
                        <Volume2 className="mr-1 inline h-4 w-4" />
                        {im.imitator_player_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              {isHost && (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
                  <PulpButton onClick={goToPreviousPhrase} disabled={syncState.phraseIndex === 0 || localIsPlaying} color={PULP.blue} variant="ghost" size="sm">
                    <RotateCcw className="w-4 h-4" strokeWidth={3} />
                    Préc.
                  </PulpButton>

                  <div className="flex max-w-full gap-2 overflow-x-auto px-1 py-1">
                    {revealData.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (!localIsPlaying) onSyncStateChange(false, idx, 'idle');
                        }}
                        disabled={localIsPlaying}
                        className="h-3.5 w-3.5 transition-all"
                        style={{
                          background: idx === syncState.phraseIndex ? PULP.yellow : 'rgba(243,237,224,0.25)',
                          border: `2px solid ${PULP.ink}`,
                          transform: idx === syncState.phraseIndex ? 'scale(1.3) rotate(45deg)' : 'rotate(45deg)',
                        }}
                      />
                    ))}
                  </div>

                  <PulpButton onClick={goToNextPhrase} disabled={syncState.phraseIndex === revealData.length - 1 || localIsPlaying} color={PULP.blue} variant="ghost" size="sm">
                    Suiv.
                    <SkipForward className="w-4 h-4" strokeWidth={3} />
                  </PulpButton>
                </div>
              )}

              {!isHost && (
                <div className="flex max-w-full justify-start gap-2 overflow-x-auto px-1 py-1 sm:justify-center">
                  {revealData.map((_, idx) => (
                    <div
                      key={idx}
                      className="h-3.5 w-3.5"
                      style={{
                        background: idx === syncState.phraseIndex ? PULP.yellow : 'rgba(243,237,224,0.25)',
                        border: `2px solid ${PULP.ink}`,
                        transform: idx === syncState.phraseIndex ? 'scale(1.3) rotate(45deg)' : 'rotate(45deg)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* All phrases */}
              <div className="max-h-[min(40dvh,24rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 pt-2 landscape:max-h-[32dvh]">
                <PulpRule />
                <h4 className="uppercase text-[color:var(--pulp-paper)]/55 text-sm" style={{ fontFamily: PULP_FONT, letterSpacing: '0.1em' }}>
                  Toutes les phrases
                </h4>
                {revealData.map((phrase, idx) => (
                  <div key={phrase.original.id} style={{ border: `2px solid ${PULP.ink}` }}>
                    <button
                      onClick={() => setExpandedPhrase(expandedPhrase === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-3 uppercase"
                      style={{
                        fontFamily: PULP_FONT,
                        letterSpacing: '0.04em',
                        background: idx === syncState.phraseIndex ? `${PULP.red}22` : 'rgba(8,7,10,0.4)',
                        color: idx === syncState.phraseIndex ? PULP.paper : 'rgba(243,237,224,0.7)',
                      }}
                    >
                      <span>{phrase.original.player_name}</span>
                      {expandedPhrase === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedPhrase === idx && (
                      <div className="space-y-1 p-3 text-sm" style={{ background: 'rgba(8,7,10,0.25)', color: 'rgba(243,237,224,0.6)' }}>
                        <div style={{ fontFamily: PULP_FONT, letterSpacing: '0.04em' }}>
                          {phrase.imitations.length} imitation(s)
                        </div>
                        {phrase.imitations.map((im) => (
                          <div key={im.id} style={{ fontFamily: PULP_FONT, letterSpacing: '0.04em' }}>
                            → {im.imitator_player_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {revealComplete && (
                <PodiumAd
                  gameMode="audiophone"
                  instanceKey={`${instanceKey}:reveal-complete`}
                />
              )}

              {/* End game actions */}
              {isHost && (
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <PulpButton onClick={onPlayAgain} disabled={localIsPlaying} color={PULP.blue} variant="ghost" size="sm" className="flex-1">
                    <RotateCcw className="w-4 h-4" strokeWidth={3} />
                    Rejouer
                  </PulpButton>
                  <PulpButton onClick={onEndGame} disabled={localIsPlaying} color={PULP.red} size="sm" className="flex-1">
                    <Home className="w-4 h-4" strokeWidth={3} />
                    Terminer
                  </PulpButton>
                </div>
              )}
            </div>
          </PulpPanel>
        </motion.div>
        </div>
      </div>
    </PulpStage>
  );
};
