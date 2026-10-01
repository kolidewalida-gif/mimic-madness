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
import { AudioPhoneStudio, AudioPhoneListening, AudioPhoneProgress, AudioPhoneRoster, AudioPhoneButton } from './audiophone/BubbleAudioPhone';

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
  const [sourceFailed, setSourceFailed] = useState(false);
  const [recordError, setRecordError] = useState('');
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
    onError: () => setRecordError('Micro indisponible. Vérifie l’autorisation du navigateur et le micro choisi dans les réglages, puis réessaie.'),
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
    if (!recordedBlob || isSubmitting || staged.state.isRunning) return;
    setRecordError('');
    try {
      const success = await staged.run((report) => onSubmitImitation(recordedBlob, report), {
        label: 'Inversion de ton imitation…', minDurationMs: 1_000,
        sound: 'processRewind', endSound: 'processDone',
      });
      if (success) {
        clearRecording();
        if (mountedRef.current) setHasListened(false);
      } else if (mountedRef.current) {
        setRecordError('Ta prise n’a pas été envoyée. Elle est conservée : tu peux réessayer.');
      }
    } catch {
      if (mountedRef.current) setRecordError('Envoi impossible. Ta prise est conservée : vérifie ta connexion puis réessaie.');
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
    setSourceFailed(false);
    setRecordError('');
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
    const audioMissing = !reversedAudioUrl || sourceFailed;
    const busy = isRecording || isStarting || isStopping || isSubmitting || staged.state.isRunning;
    return <>
      <ProcessingOverlay state={staged.state} icon="⏪" accent="#a6efd8" />
      {reversedAudioUrl && <audio ref={audioRef} src={reversedAudioUrl}
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setHasListened(true); }}
        onError={() => { setIsPlaying(false); setSourceFailed(true); }}
      />}
      <AudioPhoneStudio
        title={isAuthor ? 'La bande essaie de te suivre.' : hasImitated ? 'Ta version est partie.' : 'Ça ressemble à quoi, ce son ?'}
        description={`Phrase ${currentPhraseIndex + 1} sur ${totalPhrases} · ${isAuthor ? 'Tu n’imites pas ta propre phrase.' : 'Écoute le son inversé, puis reproduis-le à ta façon.'}`}
        tapeTitle={`La phrase de ${authorName}`} maxSeconds={maxSeconds}
        recordingTime={recordingTime} audioLevel={audioLevel}
        isRecording={isRecording} isStarting={isStarting} isStopping={isStopping}
        isSubmitting={isSubmitting || staged.state.isRunning} previewUrl={previewUrl}
        hasRecording={!!recordedBlob}
        startRecording={() => { pauseAudio(); setRecordError(''); void startRecording(); }}
        stopRecording={stopRecording} onSubmit={() => void handleSubmit()} error={recordError}
        canRecord={hasListened || audioMissing}
        status={isSpectator ? 'spectator' : isAuthor ? 'author' : hasImitated ? 'sent' : undefined}
        listening={<AudioPhoneListening author={authorName} isPlaying={isPlaying} hasListened={hasListened}
          audioMissing={audioMissing} disabled={busy}
          onToggle={() => { if (isPlaying) pauseAudio(); else void playReversedAudio(); }}
        />}
        sidebar={<AudioPhoneProgress completed={completedImitations} total={totalImitations} title="Les versions de la bande">
          {pendingPlayerNames.length > 0 ? <AudioPhoneRoster names={pendingPlayerNames} pending={pendingPlayerNames} /> : <p className="text-sm">Tout le monde est passé. La suite arrive !</p>}
          {allImitationsDone && isHost && <AudioPhoneButton onClick={() => { playInkSound('cartoonSwoosh', .4); onNextPhrase(); }}><ChevronRight /> Phrase suivante</AudioPhoneButton>}
        </AudioPhoneProgress>}
      />
    </>;
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
