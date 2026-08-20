import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Check, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { processStreamWithNoiseReduction } from '@/hooks/useNoiseReduction';

interface AudioPhoneRecordingAllPhaseProps {
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
  onSubmit: (audioBlob: Blob) => Promise<boolean>;
  onStartImitation: () => void;
}

const ACCENT = PULP.red;
const READY = PULP.green;

export const AudioPhoneRecordingAllPhase = ({
  maxSeconds,
  playerName,
  hasSubmitted,
  allSubmitted,
  playersCount,
  submittedCount,
  pendingPlayerNames,
  playerNames,
  playerIds = [],
  isHost,
  isSubmitting,
  onSubmit,
  onStartImitation,
}: AudioPhoneRecordingAllPhaseProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const staged = useStagedTask();
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const noiseReductionCleanupRef = useRef<(() => void) | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const startRecording = async () => {
    try {
      playInkSound('cartoonPop', 0.3);
      const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const { stream, cleanup } = await processStreamWithNoiseReduction(rawStream);
      noiseReductionCleanupRef.current = cleanup;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'audio/webm' });
        setRecordedBlob(blob);
        rawStream.getTracks().forEach((track) => track.stop());
        stream.getTracks().forEach((track) => track.stop());
        if (noiseReductionCleanupRef.current) {
          noiseReductionCleanupRef.current();
          noiseReductionCleanupRef.current = null;
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      startedAtRef.current = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - startedAtRef.current) / 1000;
        const clamped = Math.min(elapsed, maxSeconds);
        setRecordingTime(clamped);
        if (elapsed >= maxSeconds) {
          stopRecording();
          return;
        }
        timerRafRef.current = requestAnimationFrame(tick);
      };
      timerRafRef.current = requestAnimationFrame(tick);

      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!recordedBlob) return;
    playInkSound('cartoonDing', 0.5);
    /*
     * L'inversion de l'audio est le cœur du mode : c'est elle qui rend la phrase
     * méconnaissable. Elle était masquée derrière une roue de 16 pixels dans le
     * bouton, alors qu'elle enchaîne un décodage, un retournement échantillon par
     * échantillon, un ré-encodage WAV et deux envois. On la met en scène.
     */
    const success = await staged.run(() => onSubmit(recordedBlob), {
      label: 'Inversion de ta phrase…',
      minDurationMs: 6_000,
      sound: 'processRewind',
      endSound: 'processDone',
    });
    if (success) setRecordedBlob(null);
  };

  useEffect(() => {
    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const memoizedIds = useMemo(() => playerIds ?? [], [playerIds]);
  const renderRoster = () => (
    <RosterList
      playerNames={playerNames}
      pendingPlayerNames={pendingPlayerNames}
      playerIds={memoizedIds}
    />
  );

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
                  disabled={isSubmitting}
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
                  <audio src={URL.createObjectURL(recordedBlob)} controls className="w-full" />
                  <div className="flex gap-3">
                    <PulpButton onClick={startRecording} color={PULP.paperDim} variant="ghost" size="sm" className="flex-1">
                      Recommencer
                    </PulpButton>
                    <PulpButton onClick={handleSubmit} disabled={isSubmitting} color={READY} size="sm" className="flex-1">
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
