import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Check, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPhoneRecorder } from '@/hooks/useAudioPhoneRecorder';
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
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { AudioPhoneStudio, AudioPhoneProgress, AudioPhoneRoster, AudioPhoneButton } from './audiophone/BubbleAudioPhone';

interface AudioPhoneRecordingAllPhaseProps {
  variant?: 'default' | 'inkBeta';
  /** Il y a de quoi lancer les imitations, même si tout le monde n'a pas parlé. */
  canStartImitation?: boolean;
  /** Ce joueur est arrivé après le tirage : il regarde la manche. */
  isSpectator?: boolean;
  maxSeconds: number;
  playerName: string;
  hasSubmitted: boolean;
  allSubmitted: boolean;
  playersCount: number;
  submittedCount: number;
  submittedPlayerIds: string[];
  pendingPlayerNames: string[];
  playerNames: string[];
  /** Optional player ids paired with playerNames (same order) for avatar lookup */
  playerIds?: string[];
  isHost: boolean;
  isSubmitting: boolean;
  /** `onStage` remonte l'étape en cours pour l'afficher pendant l'attente. */
  onSubmit: (audioBlob: Blob, onStage?: (label: string) => void) => Promise<boolean>;
  onStartImitation: () => void;
}

const ACCENT = PULP.red;
const READY = PULP.green;

export const AudioPhoneRecordingAllPhase = ({
  variant = 'default',
  canStartImitation = false,
  isSpectator = false,
  maxSeconds,
  playerName,
  hasSubmitted,
  allSubmitted,
  playersCount,
  submittedCount,
  submittedPlayerIds,
  pendingPlayerNames,
  playerNames,
  playerIds = [],
  isHost,
  isSubmitting,
  onSubmit,
  onStartImitation,
}: AudioPhoneRecordingAllPhaseProps) => {
  const isInkBeta = variant === 'inkBeta';
  const staged = useStagedTask();
  const [recordError, setRecordError] = useState('');
  const {
    isRecording,
    isStarting,
    isStopping,
    recordedBlob,
    previewUrl,
    recordingTime,
    audioLevel,
    startRecording: startRecorder,
    stopRecording,
    clearRecording,
  } = useAudioPhoneRecorder({
    maxSeconds,
    onError: () => setRecordError('Micro indisponible. Vérifie l’autorisation du navigateur et le micro choisi dans les réglages, puis réessaie.'),
  });

  const startRecording = useCallback(() => {
    setRecordError('');
    playInkSound('cartoonPop', 0.3);
    void startRecorder();
  }, [startRecorder]);

  const handleSubmit = async () => {
    if (!recordedBlob || isSubmitting || staged.state.isRunning) return;
    setRecordError('');
    playInkSound('cartoonDing', 0.5);
    try {
      const success = await staged.run((report) => onSubmit(recordedBlob, report), {
        label: 'Inversion de ta phrase…', minDurationMs: 1_000,
        sound: 'processRewind', endSound: 'processDone',
      });
      if (success) clearRecording();
      else setRecordError('Ta prise n’a pas été envoyée. Elle est conservée : tu peux réessayer.');
    } catch {
      setRecordError('Envoi impossible. Ta prise est conservée : vérifie ta connexion puis réessaie.');
    }
  };

  const memoizedIds = useMemo(() => playerIds ?? [], [playerIds]);
  const renderRoster = () => (
    <RosterList
      playerNames={playerNames}
      pendingPlayerNames={pendingPlayerNames}
      playerIds={memoizedIds}
    />
  );

  /* ---------- INK BETA ---------- */
  if (isInkBeta) {
    return <>
      <ProcessingOverlay state={staged.state} icon="⏪" accent="#a6efd8" />
      <AudioPhoneStudio
        title={hasSubmitted ? 'Ta phrase est partie.' : 'Qu’est-ce qu’on enregistre ?'}
        description={hasSubmitted ? 'On attend les derniers micros avant de passer aux imitations.' : 'Invente une petite phrase. Parle clairement : c’est encore plus drôle à l’envers.'}
        tapeTitle={`La phrase de ${playerName}`} maxSeconds={maxSeconds}
        recordingTime={recordingTime} audioLevel={audioLevel}
        isRecording={isRecording} isStarting={isStarting} isStopping={isStopping}
        isSubmitting={isSubmitting || staged.state.isRunning} previewUrl={previewUrl}
        hasRecording={!!recordedBlob} startRecording={startRecording} stopRecording={stopRecording}
        onSubmit={() => void handleSubmit()} error={recordError}
        status={isSpectator ? 'spectator' : hasSubmitted ? 'sent' : undefined}
        sidebar={<AudioPhoneProgress completed={submittedCount} total={playersCount}>
          <AudioPhoneRoster names={playerNames} ids={playerIds} readyIds={submittedPlayerIds} pending={pendingPlayerNames} />
          {isHost && !allSubmitted && canStartImitation && <AudioPhoneButton secondary onClick={() => { playInkSound('cartoonSwoosh', .4); onStartImitation(); }}>
            <Users /> Continuer sans {pendingPlayerNames.length} joueur{pendingPlayerNames.length > 1 ? 's' : ''}
          </AudioPhoneButton>}
        </AudioPhoneProgress>}
      />
    </>;
  }

  /* ---------- SUBMITTED STATE ---------- */
  if (hasSubmitted) {
    return (
      <PulpStage accent={READY} accent2={PULP.blue}>
        <div className="relative min-h-screen flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="w-full max-w-xl"
          >
            <PulpPanel accent={READY}>
              <div className="px-7 py-9 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 13, stiffness: 200 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${READY}, ${READY}aa)`,
                    border: `4px solid ${PULP.ink}`,
                    boxShadow: `0 0 26px ${READY}88`,
                  }}
                >
                  <Check className="h-10 w-10" style={{ color: PULP.ink }} strokeWidth={3} />
                </motion.div>

                <PulpTitle size="md" accent={READY} accent2={PULP.blue}>
                  Phrase enregistrée !
                </PulpTitle>
                <p
                  className="text-sm uppercase text-[color:var(--pulp-paper)]/55"
                  style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                >
                  La manche attend les derniers micros
                </p>

                <div className="flex items-center justify-center">
                  <PulpTag color={READY} rotate={-2}>
                    <Users className="w-3.5 h-3.5" /> {submittedCount} / {playersCount} joueurs
                  </PulpTag>
                </div>

                <div
                  className="h-3 w-full overflow-hidden"
                  style={{ background: 'rgba(8,7,10,0.6)', border: `2px solid ${PULP.ink}` }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(submittedCount / playersCount) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                    style={{ background: `linear-gradient(90deg, ${READY}, ${PULP.yellow})` }}
                  />
                </div>

                {renderRoster()}

                {pendingPlayerNames.length > 0 && (
                  <p className="text-xs text-[color:var(--pulp-paper)]/45" style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}>
                    MANQUE ENCORE :{' '}
                    <span className="text-[color:var(--pulp-paper)]">{pendingPlayerNames.join(', ')}</span>
                  </p>
                )}

                {allSubmitted && isHost && (
                  <PulpButton
                    onClick={() => {
                      playInkSound('cartoonSwoosh', 0.4);
                      onStartImitation();
                    }}
                    color={PULP.red}
                    size="md"
                    className="w-full"
                  >
                    Lancer les imitations
                  </PulpButton>
                )}
              </div>
            </PulpPanel>
          </motion.div>
        </div>
      </PulpStage>
    );
  }

  /* ---------- RECORDING STATE ---------- */
  return (
    <PulpStage accent={ACCENT} accent2={PULP.blue}>
      {/* Voile d'inversion : rend visible et sonore une étape jusqu'ici muette. */}
      <ProcessingOverlay state={staged.state} icon="⏪" accent={ACCENT} />
      <div className="relative min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          <PulpPanel accent={ACCENT}>
            <div className="px-7 py-9 text-center space-y-5">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <PulpTag color={PULP.yellow} rotate={-3}>
                    <Mic className="w-3.5 h-3.5" /> À toi le micro
                  </PulpTag>
                </div>
                <PulpTitle size="md">{playerName}, enregistre ta phrase</PulpTitle>
                <p
                  className="text-sm uppercase text-[color:var(--pulp-paper)]/55"
                  style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                >
                  Une phrase originale (max{' '}
                  <span style={{ color: ACCENT }}>{maxSeconds}s</span>)
                </p>
                <p className="text-[11px] text-[color:var(--pulp-paper)]/40 uppercase" style={{ fontFamily: PULP_FONT, letterSpacing: '0.07em' }}>
                  Astuce : courte, rythmique, fun à rejouer à l'envers
                </p>
              </div>

              {/* MIC BUTTON */}
              <div className="relative inline-block">
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
                  className="relative flex h-32 w-32 items-center justify-center rounded-full"
                  style={{
                    background: isRecording
                      ? `radial-gradient(circle at 35% 30%, ${PULP.red}, #b3121f)`
                      : `radial-gradient(circle at 35% 30%, ${ACCENT}, ${ACCENT}bb)`,
                    border: `5px solid ${PULP.ink}`,
                    boxShadow: isRecording
                      ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px ${PULP.red}77`
                      : `0 0 0 ${PULP.ink}, 0 14px 30px ${ACCENT}66`,
                  }}
                >
                  {isRecording ? (
                    <MicOff className="h-12 w-12" style={{ color: PULP.paper }} />
                  ) : (
                    <Mic className="h-12 w-12" style={{ color: PULP.paper }} />
                  )}
                </motion.button>

                {isRecording && (
                  <div className="pointer-events-none absolute inset-0">
                    {[...Array(3)].map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute inset-0 rounded-full border-2"
                        style={{
                          borderColor: `${PULP.red}80`,
                          transform: `scale(${1 + audioLevel * (idx + 1) * 0.3})`,
                          opacity: 1 - audioLevel * 0.3 * idx,
                          transition: 'transform 0.1s, opacity 0.1s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {isRecording && (
                <div
                  className="uppercase"
                  style={{ fontFamily: PULP_FONT, fontSize: '2rem', color: PULP.red, letterSpacing: '0.04em' }}
                >
                  {recordingTime.toFixed(1)}s / {maxSeconds}s
                </div>
              )}

              {recordedBlob && !isRecording && (
                <div className="space-y-3">
                  <audio src={previewUrl ?? undefined} controls className="w-full" />
                  <div className="flex gap-3">
                    <PulpButton onClick={startRecording} color={PULP.paperDim} variant="ghost" size="sm" className="flex-1">
                      Recommencer
                    </PulpButton>
                    <PulpButton onClick={handleSubmit} disabled={isSubmitting || isStarting || isStopping} color={READY} size="sm" className="flex-1">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                      Valider
                    </PulpButton>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-3">
                <PulpRule />
                <div className="flex items-center justify-center">
                  <PulpTag color={PULP.blue} rotate={2}>
                    <Users className="w-3.5 h-3.5" /> {submittedCount} / {playersCount} phrases
                  </PulpTag>
                </div>
                {renderRoster()}
              </div>
            </div>
          </PulpPanel>
        </motion.div>
      </div>
    </PulpStage>
  );
};

/**
 * Internal roster list with avatar lookup — pulp comic credits style.
 */
const RosterList = ({
  playerNames,
  pendingPlayerNames,
  playerIds,
}: {
  playerNames: string[];
  pendingPlayerNames: string[];
  playerIds: string[];
}) => {
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);
  return (
    <div className="grid gap-2 text-left">
      {playerNames.map((name, index) => {
        const isPending = pendingPlayerNames.includes(name);
        const id = playerIds[index];
        const av = id ? getAvatar(id) : null;
        const hasImage = av?.type === 'image' && av.imageUrl;
        const color = isPending ? 'rgba(243,237,224,0.3)' : PULP.green;
        return (
          <motion.div
            key={`${name}-${index}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-3 px-3 py-2"
            style={{
              background: 'rgba(8,7,10,0.45)',
              border: `2px solid ${isPending ? 'rgba(243,237,224,0.14)' : `${PULP.green}66`}`,
              transform: `rotate(${index % 2 === 0 ? -0.4 : 0.4}deg)`,
            }}
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: hasImage ? 'transparent' : isPending ? 'rgba(255,255,255,0.08)' : `${PULP.green}33`,
                border: `2px solid ${PULP.ink}`,
              }}
            >
              {hasImage ? (
                <img src={av!.imageUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span style={{ fontFamily: PULP_FONT, fontSize: '0.9rem', color }}>
                  {name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <span
              className="flex-1 truncate uppercase text-[color:var(--pulp-paper)]"
              style={{ fontFamily: PULP_FONT, letterSpacing: '0.04em' }}
            >
              {name}
            </span>
            <span
              className="flex-shrink-0 uppercase"
              style={{ fontFamily: PULP_FONT, fontSize: '0.7rem', letterSpacing: '0.12em', color }}
            >
              {isPending ? 'En attente' : '✓ Prêt'}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
