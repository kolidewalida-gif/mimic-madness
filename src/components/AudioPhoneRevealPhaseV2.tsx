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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastStepRef = useRef<string>('');

  const currentPhrase = revealData[syncState.phraseIndex] || null;

  const getAudioUrlForStep = useCallback((step: string): string | null => {
    const phrase = revealData[syncState.phraseIndex];
    if (!phrase) return null;

    if (step === 'original') {
      return phrase.original.originalUrl;
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
      if (idx + 1 < phrase.imitations.length) {
        return `imitation_${idx + 1}`;
      }
      return null;
    }
    return null;
  }, [revealData, syncState.phraseIndex]);

  const playStep = useCallback((step: string) => {
    const url = getAudioUrlForStep(step);
    if (url && audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(console.error);
      setLocalIsPlaying(true);
    }
  }, [getAudioUrlForStep]);

  const handleAudioEnded = useCallback(() => {
    setLocalIsPlaying(false);

    if (!isHost) return;

    const nextStep = getNextStep(syncState.step);
    if (nextStep) {
      setTimeout(() => {
        onSyncStateChange(true, syncState.phraseIndex, nextStep);
      }, 600);
    } else {
      onSyncStateChange(false, syncState.phraseIndex, 'complete');
    }
  }, [isHost, syncState.step, syncState.phraseIndex, getNextStep, onSyncStateChange]);

  useEffect(() => {
    const stepKey = `${syncState.phraseIndex}_${syncState.step}_${syncState.isPlaying}`;

    if (stepKey === lastStepRef.current) return;
    lastStepRef.current = stepKey;

    if (syncState.isPlaying && syncState.step && syncState.step !== 'idle' && syncState.step !== 'complete') {
      playStep(syncState.step);
    } else if (!syncState.isPlaying && audioRef.current) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [syncState.isPlaying, syncState.step, syncState.phraseIndex, playStep]);

  const startPhrasePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(true, syncState.phraseIndex, 'original');
  };

  const pausePlayback = () => {
    if (!isHost) return;
    onSyncStateChange(false, syncState.phraseIndex, syncState.step);
  };

  const goToNextPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex < revealData.length - 1) {
      onSyncStateChange(false, syncState.phraseIndex + 1, 'idle');
    }
  };

  const goToPreviousPhrase = () => {
    if (!isHost) return;
    if (syncState.phraseIndex > 0) {
      onSyncStateChange(false, syncState.phraseIndex - 1, 'idle');
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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

  return (
    <PulpStage accent={PULP.red} accent2={PULP.blue}>
      <div className="menu-screen-safe h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="relative flex min-h-full items-start justify-center p-3 pb-24 sm:items-center sm:p-5 sm:pb-24 landscape:py-3 landscape:pb-24">
        <audio ref={audioRef} onEnded={handleAudioEnded} />

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

                {/* Host controls */}
                {isHost && (
                  <div className="flex justify-center">
                    <PulpButton
                      onClick={localIsPlaying ? pausePlayback : startPhrasePlayback}
                      color={PULP.red}
                      size="md"
                    >
                      {localIsPlaying ? (
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
