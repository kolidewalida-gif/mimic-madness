import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Check, Play, Pause, Volume2, Loader2, ChevronRight, Users } from 'lucide-react';
import {
  PulpStage,
  PulpPanel,
  PulpTitle,
  PulpButton,
  PulpTag,
  PulpRule,
  PULP,
  PULP_FONT,
} from '@/components/audiophone/PulpComic';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useStagedTask } from '@/hooks/useStagedTask';
import { ProcessingOverlay } from '@/components/ProcessingOverlay';
import { useAudioPhoneRecorder } from '@/hooks/useAudioPhoneRecorder';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { cn } from '@/lib/utils';
import {
  InkBetaPanel,
  InkBetaCount,
} from '@/components/game-beta/InkBetaGameLayout';

interface AudioPhoneImitationPhaseProps {
  variant?: 'default' | 'inkBeta';
  /** Ce joueur est arrivé après le tirage : il regarde la manche. */
  isSpectator?: boolean;
  currentPhraseIndex: number;
  totalPhrases: number;
  authorName: string;
  reversedAudioUrl: string | null;
  shouldImitate: boolean;
  hasImitated: boolean;
  isAuthor: boolean;
  allImitationsDone: boolean;
  completedImitations: number;
  totalImitations: number;
  pendingPlayerNames: string[];
  isHost: boolean;
  isSubmitting: boolean;
  maxSeconds: number;
  /** `onStage` remonte l'étape en cours pour l'afficher pendant l'attente. */
  onSubmitImitation: (audioBlob: Blob, onStage?: (label: string) => void) => Promise<boolean>;
  onNextPhrase: () => void;
}

const BLUE = PULP.blue;
const YELLOW = PULP.yellow;
const GREEN = PULP.green;

/* Progress bar shared block */
const ProgressBlock = ({
  label,
  completed,
  total,
  pending,
  color,
}: {
  label: React.ReactNode;
  completed: number;
  total: number;
  pending: string[];
  color: string;
}) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div
      className="px-4 py-3 text-left"
      style={{ background: 'rgba(8,7,10,0.45)', border: `2px solid ${PULP.ink}` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="uppercase text-[color:var(--pulp-paper)]/60 text-xs"
          style={{ fontFamily: PULP_FONT, letterSpacing: '0.06em' }}
        >
          {label}
        </span>
        <span style={{ fontFamily: PULP_FONT, fontSize: '1.3rem', color }}>
          {completed}/{total}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden" style={{ background: 'rgba(8,7,10,0.7)' }}>
        <motion.div animate={{ width: `${pct}%` }} className="h-full" style={{ background: color }} />
      </div>
      {pending.length > 0 && (
        <p className="mt-2 text-xs text-[color:var(--pulp-paper)]/45" style={{ fontFamily: PULP_FONT, letterSpacing: '0.04em' }}>
          ENCORE ATTENDUS : <span className="text-[color:var(--pulp-paper)]">{pending.join(', ')}</span>
        </p>
      )}
    </div>
  );
};

export const AudioPhoneImitationPhase = ({
  variant = 'default',
  isSpectator = false,
  currentPhraseIndex,
  totalPhrases,
  authorName,
  reversedAudioUrl,
  hasImitated,
  isAuthor,
  allImitationsDone,
  completedImitations,
  totalImitations,
  pendingPlayerNames,
  isHost,
  isSubmitting,
  maxSeconds,
  onSubmitImitation,
  onNextPhrase,
}: AudioPhoneImitationPhaseProps) => {
  const { setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();

  useEffect(() => {
    if (autoMode) {
      setSituation('audiophone-rewind', { priority: 4, source: 'audiophone-imitation' });
    }
    return () => clearSituationOverride('audiophone-imitation');
  }, [autoMode, setSituation, clearSituationOverride]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const staged = useStagedTask();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(false);
  const {
    isRecording,
    isStarting,
    isStopping,
    recordedBlob,
    previewUrl,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    clearRecording,
    resetRecording,
  } = useAudioPhoneRecorder({
    maxSeconds,
    onError: (error) => console.error('Error starting Audio Phone imitation:', error),
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    };
  }, []);

  const playReversedAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch (error) {
      if (mountedRef.current) setIsPlaying(false);
      console.warn('[AudioPhone] Unable to play reversed phrase:', error);
    }
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  };

  const handleSubmit = async () => {
    if (!recordedBlob) return;
    // Même mise en scène que la phase d'enregistrement : l'imitation est
    // inversée puis envoyée, ce n'est pas instantané.
    const success = await staged.run((report) => onSubmitImitation(recordedBlob, report), {
      label: 'Inversion de ton imitation…',
      minDurationMs: 1_000,
      sound: 'processRewind',
      endSound: 'processDone',
    });
    if (success) {
      clearRecording();
      if (mountedRef.current) setHasListened(false);
    }
  };

  useEffect(() => {
    resetRecording();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // A source may not have loaded enough metadata to seek yet.
      }
    }
    setHasListened(false);
    setIsPlaying(false);
  }, [currentPhraseIndex, resetRecording]);

  const nextPhraseButton = allImitationsDone && isHost && (
    <PulpButton
      onClick={() => {
        playInkSound('cartoonSwoosh', 0.4);
        onNextPhrase();
      }}
      color={PULP.red}
      size="md"
      className="w-full"
    >
      <ChevronRight className="w-5 h-5" strokeWidth={3} />
      Phrase suivante
    </PulpButton>
  );

  /* ---------- INK BETA ---------- */
  if (variant === 'inkBeta') {
    /*
     * Le micro n'apparaissait qu'après la fin de l'écoute. Si l'audio inversé
     * manque — fichier absent, réseau coupé — le bouton d'écoute reste
     * désactivé, `onEnded` ne se déclenche jamais et la phrase devient une
     * impasse pour tout le monde. Sans URL, on autorise donc l'enregistrement
     * directement, en le disant.
     */
    const audioMissing = !reversedAudioUrl;
    const canRecord = hasListened || audioMissing;
    const remaining = Math.max(0, maxSeconds - recordingTime);
    const timerClass = cn(
      'ik-quiz-timer',
      remaining <= 3 && remaining > 1.5 && 'is-urgent',
      remaining <= 1.5 && 'is-critical',
    );
    const ratio = totalImitations > 0 ? completedImitations / totalImitations : 0;

    /* Colonne de droite : où l'on en est dans la manche. */
    const sidePanel = (
      <InkBetaPanel
        className="ik-ap-panel ik-ap-progress-panel"
        bodyClassName="ik-ap-progress-body"
        step={`Phrase ${Math.min(currentPhraseIndex + 1, Math.max(totalPhrases, 1))} sur ${totalPhrases}`}
        title="Avancement"
        titleId="ik-ap-progress-title"
        aside={<InkBetaCount value={completedImitations} total={totalImitations} />}
      >
        {totalPhrases > 1 && (
          <div className="ik-dots" aria-hidden="true">
            {Array.from({ length: totalPhrases }).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  idx < currentPhraseIndex && 'is-past',
                  idx === currentPhraseIndex && 'is-current',
                )}
              />
            ))}
          </div>
        )}

        <div className="ik-progress" aria-hidden="true">
          <span style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="ik-progress-label">
          {completedImitations} imitation{completedImitations > 1 ? 's' : ''} sur {totalImitations}
        </p>

        {pendingPlayerNames.length > 0 ? (
          <p className="ik-game-note ik-game-note--warn">
            <Users aria-hidden="true" /> On attend {pendingPlayerNames.join(', ')}
          </p>
        ) : (
          <p className="ik-game-note ik-game-note--done">
            <Check aria-hidden="true" /> Tout le monde est passé — ça enchaîne.
          </p>
        )}

        {/*
          Le bouton reste, pour ne pas attendre l'avance automatique quand
          l'hôte est là et pressé.
        */}
        {allImitationsDone && isHost && (
          <button
            type="button"
            onClick={() => {
              playInkSound('cartoonSwoosh', 0.4);
              onNextPhrase();
            }}
            className="ik-secondary-action menu-focus"
          >
            <ChevronRight aria-hidden="true" /> Phrase suivante
          </button>
        )}
      </InkBetaPanel>
    );

    /* Colonne de gauche : ce qu'on a à faire, selon qui l'on est. */
    let mainPanel: React.ReactNode;

    if (isSpectator) {
      mainPanel = (
        <InkBetaPanel
          className="ik-ap-panel ik-ap-work-panel"
          bodyClassName="ik-ap-work-body"
          step="Spectateur"
          title="Tu regardes cette manche"
          titleId="ik-ap-main-title"
        >
          <p className="ik-game-note ik-game-note--warn">
            <Users aria-hidden="true" /> Tu es arrivé après le tirage : tu joueras à la prochaine.
          </p>
        </InkBetaPanel>
      );
    } else if (isAuthor) {
      mainPanel = (
        <InkBetaPanel
          featured
          className="ik-ap-panel ik-ap-work-panel"
          bodyClassName="ik-ap-work-body"
          step="C'est ta phrase"
          title="Écoute les dégâts"
          titleId="ik-ap-main-title"
        >
          <p className="ik-game-lead">
            Les autres essaient de reproduire ta phrase à l'envers. Tu la retrouveras à la
            révélation, avec <strong>toutes leurs versions</strong>.
          </p>
        </InkBetaPanel>
      );
    } else if (hasImitated) {
      mainPanel = (
        <InkBetaPanel
          featured
          className="ik-ap-panel ik-ap-work-panel"
          bodyClassName="ik-ap-work-body"
          step="Imitation envoyée"
          title="Bien joué"
          titleId="ik-ap-main-title"
        >
          <p className="ik-game-note ik-game-note--done">
            <Check aria-hidden="true" /> Ta version de la phrase de {authorName} est enregistrée.
          </p>
          <p className="ik-game-lead">
            On passe à la phrase suivante dès que tout le monde est passé.
          </p>
        </InkBetaPanel>
      );
    } else {
      mainPanel = (
        <InkBetaPanel
          featured
          className="ik-ap-panel ik-ap-work-panel"
          bodyClassName="ik-ap-work-body"
          step={`Phrase de ${authorName}`}
          title="Écoute, puis rejoue-la"
          titleId="ik-ap-main-title"
          aside={isRecording ? (
            <p className={timerClass}>
              {recordingTime.toFixed(1)}<span>/ {maxSeconds}s</span>
            </p>
          ) : undefined}
        >
          {reversedAudioUrl && (
            <audio
              ref={audioRef}
              src={reversedAudioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setHasListened(true);
              }}
            />
          )}

          <p className="ik-game-lead">
            Le son est <strong>à l'envers</strong>. Capte son rythme plutôt que ses mots, puis
            reproduis-le au micro.
          </p>

          {audioMissing ? (
            <p className="ik-game-note ik-game-note--warn">
              <Volume2 aria-hidden="true" /> L'audio de cette phrase est introuvable. Enregistre au
              feeling pour ne pas bloquer la manche.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                playInkSound('cartoonPop', 0.3);
                isPlaying ? pauseAudio() : void playReversedAudio();
              }}
              className="ik-secondary-action menu-focus"
            >
              {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {isPlaying ? 'Pause' : hasListened ? 'Réécouter' : "Écouter l'audio inversé"}
            </button>
          )}

          {canRecord ? (
            <>
              <div className="ik-ap-mic-zone">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting || isStarting || isStopping}
                  className={cn('ik-ap-mic menu-focus', isRecording && 'is-recording')}
                  style={{ ['--ap-level' as string]: audioLevel.toFixed(3) }}
                  aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
                >
                  <span className="ik-ap-mic-ring" aria-hidden="true" />
                  {isRecording ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
                </button>
                <p className="ik-progress-label">
                  {isRecording ? 'Rejoue la phrase, puis appuie pour arrêter' : 'Appuie pour imiter'}
                </p>
              </div>

              {recordedBlob && !isRecording && (
                <div className="ik-ap-review">
                  <audio src={previewUrl ?? undefined} controls className="ik-ap-audio" />
                  <div className="ik-game-actions--split">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="ik-secondary-action menu-focus"
                    >
                      <Mic aria-hidden="true" /> Recommencer
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isStarting || isStopping}
                      className="ik-primary-action menu-focus"
                    >
                      <span className="ik-primary-action-icon">
                        {isSubmitting ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                      </span>
                      <span>Envoyer</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="ik-game-note">
              <Play aria-hidden="true" /> Écoute la phrase en entier pour débloquer le micro.
            </p>
          )}
        </InkBetaPanel>
      );
    }

    return (
      <>
        <ProcessingOverlay state={staged.state} icon="⏪" accent={BLUE} />
        {mainPanel}
        {sidePanel}
      </>
    );
  }

  /* ---------- AUTHOR (watching) ---------- */
  if (isAuthor) {
    return (
      <PulpStage accent={YELLOW} accent2={PULP.red}>
        <div className="relative min-h-screen flex items-center justify-center p-5 pb-[120px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            className="w-full max-w-xl"
          >
            <PulpPanel accent={YELLOW}>
              <div className="px-7 py-9 text-center space-y-5">
                <motion.div
                  animate={{ scale: [1, 1.06, 1], rotate: [-4, 4, -4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${YELLOW}, ${YELLOW}aa)`,
                    border: `4px solid ${PULP.ink}`,
                    boxShadow: `0 0 24px ${YELLOW}88`,
                  }}
                >
                  <Volume2 className="h-10 w-10" style={{ color: PULP.ink }} strokeWidth={2.5} />
                </motion.div>

                <PulpTitle size="md" accent={PULP.red} accent2={PULP.blue}>
                  C'est ta phrase
                </PulpTitle>
                <p className="text-sm uppercase text-[color:var(--pulp-paper)]/55" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}>
                  Observe comment les autres la réinterprètent
                </p>

                <ProgressBlock
                  label={`Phrase ${currentPhraseIndex + 1} / ${totalPhrases}`}
                  completed={completedImitations}
                  total={totalImitations}
                  pending={pendingPlayerNames}
                  color={YELLOW}
                />

                {nextPhraseButton}
              </div>
            </PulpPanel>
          </motion.div>
        </div>
      </PulpStage>
    );
  }

  /* ---------- DONE ---------- */
  if (hasImitated) {
    return (
      <PulpStage accent={GREEN} accent2={PULP.blue}>
        <div className="relative min-h-screen flex items-center justify-center p-5 pb-[120px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="w-full max-w-xl"
          >
            <PulpPanel accent={GREEN}>
              <div className="px-7 py-9 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 13, stiffness: 200 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${GREEN}, ${GREEN}aa)`,
                    border: `4px solid ${PULP.ink}`,
                    boxShadow: `0 0 24px ${GREEN}88`,
                  }}
                >
                  <Check className="h-10 w-10" style={{ color: PULP.ink }} strokeWidth={3} />
                </motion.div>

                <PulpTitle size="md" accent={PULP.red} accent2={PULP.blue}>
                  Imitation envoyée !
                </PulpTitle>
                <p className="text-sm uppercase text-[color:var(--pulp-paper)]/55" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}>
                  Le plateau attend encore quelques performances
                </p>

                <ProgressBlock
                  label={<>Phrase de {authorName}</>}
                  completed={completedImitations}
                  total={totalImitations}
                  pending={pendingPlayerNames}
                  color={GREEN}
                />

                {nextPhraseButton}
              </div>
            </PulpPanel>
          </motion.div>
        </div>
      </PulpStage>
    );
  }

  /* ---------- LISTEN + IMITATE ---------- */
  return (
    <PulpStage accent={BLUE} accent2={PULP.red}>
      <ProcessingOverlay state={staged.state} icon="⏪" accent={BLUE} />
      <div className="relative min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          <PulpPanel accent={BLUE}>
            <div className="px-7 py-9 text-center space-y-5">
              {reversedAudioUrl && (
                <audio
                  ref={audioRef}
                  src={reversedAudioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    setHasListened(true);
                  }}
                />
              )}

              <div className="space-y-3">
                <div className="flex justify-center">
                  <PulpTag color={BLUE} rotate={-3}>
                    Phrase {currentPhraseIndex + 1} / {totalPhrases}
                  </PulpTag>
                </div>
                <PulpTitle size="md" accent={BLUE} accent2={PULP.red}>
                  Phrase de {authorName}
                </PulpTitle>
                <p className="text-sm uppercase text-[color:var(--pulp-paper)]/55" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}>
                  Écoute l'audio inversé, capte son rythme, puis rejoue-le
                </p>
              </div>

              <ProgressBlock
                label={<><Users className="mr-1 inline h-3.5 w-3.5" />Avancement</>}
                completed={completedImitations}
                total={totalImitations}
                pending={pendingPlayerNames}
                color={BLUE}
              />

              <div className="space-y-3">
                <PulpButton
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    isPlaying ? pauseAudio() : void playReversedAudio();
                  }}
                  disabled={!reversedAudioUrl}
                  color={BLUE}
                  size="md"
                  className="w-full"
                >
                  {isPlaying ? <Pause className="w-5 h-5" strokeWidth={3} /> : <Play className="w-5 h-5" strokeWidth={3} />}
                  {isPlaying ? 'Pause' : "Écouter l'audio inversé"}
                </PulpButton>

                {hasListened && (
                  <div
                    className="flex items-center justify-center gap-2 uppercase"
                    style={{ color: GREEN, fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                    Écoute terminée. Tu peux enregistrer.
                  </div>
                )}
              </div>

              {hasListened && !recordedBlob && (
                <div className="space-y-3 pt-3">
                  <PulpRule />
                  <p className="text-xs text-[color:var(--pulp-paper)]/50 uppercase" style={{ fontFamily: PULP_FONT, letterSpacing: '0.06em' }}>
                    Reproduis le groove. Le naturel vaut mieux qu'un volume trop fort.
                  </p>

                  <div className="flex justify-center">
                    <motion.button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isSubmitting || isStarting || isStopping}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.94 }}
                      animate={isRecording ? { scale: [1, 1.04, 1] } : { y: [0, -3, 0] }}
                      transition={
                        isRecording
                          ? { duration: 0.5, repeat: Infinity }
                          : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="flex h-24 w-24 items-center justify-center rounded-full"
                      style={{
                        background: isRecording
                          ? `radial-gradient(circle at 35% 30%, ${PULP.red}, #b3121f)`
                          : `radial-gradient(circle at 35% 30%, ${BLUE}, ${BLUE}bb)`,
                        border: `4px solid ${PULP.ink}`,
                        boxShadow: isRecording
                          ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px ${PULP.red}77`
                          : `0 0 0 ${PULP.ink}, 0 12px 24px ${BLUE}55`,
                      }}
                    >
                      {isRecording ? (
                        <MicOff className="h-10 w-10" style={{ color: PULP.paper }} />
                      ) : (
                        <Mic className="h-10 w-10" style={{ color: PULP.paper }} />
                      )}
                    </motion.button>
                  </div>

                  {isRecording && (
                    <div className="uppercase" style={{ fontFamily: PULP_FONT, fontSize: '1.6rem', color: PULP.red, letterSpacing: '0.04em' }}>
                      {recordingTime.toFixed(1)}s / {maxSeconds}s
                    </div>
                  )}
                </div>
              )}

              {recordedBlob && (
                <div className="space-y-3 pt-3">
                  <PulpRule />
                  <audio src={previewUrl ?? undefined} controls className="w-full" />
                  <div className="flex gap-3">
                    <PulpButton onClick={startRecording} color={PULP.paperDim} variant="ghost" size="sm" className="flex-1">
                      Recommencer
                    </PulpButton>
                    <PulpButton onClick={handleSubmit} disabled={isSubmitting || isStarting || isStopping} color={GREEN} size="sm" className="flex-1">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                      Envoyer
                    </PulpButton>
                  </div>
                </div>
              )}
            </div>
          </PulpPanel>
        </motion.div>
      </div>
    </PulpStage>
  );
};
