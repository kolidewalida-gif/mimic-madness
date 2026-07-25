import { useState, useRef, useEffect, useCallback } from 'react';
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
import { processStreamWithNoiseReduction } from '@/hooks/useNoiseReduction';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

interface AudioPhoneImitationPhaseProps {
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
  onSubmitImitation: (audioBlob: Blob) => Promise<boolean>;
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const noiseReductionCleanupRef = useRef<(() => void) | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const playReversedAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

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
      setRecordedBlob(null);

      const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rawStreamRef.current = rawStream;

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
        rawStreamRef.current = null;
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
    const success = await onSubmitImitation(recordedBlob);
    if (success) {
      setRecordedBlob(null);
      setHasListened(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    setHasListened(false);
    setRecordedBlob(null);
    setIsRecording(false);
    setIsPlaying(false);
  }, [currentPhraseIndex]);

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
                    isPlaying ? pauseAudio() : playReversedAudio();
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
                      disabled={isSubmitting}
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
                          : `0 6px 0 ${PULP.ink}, 0 12px 24px ${BLUE}55`,
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
                  <audio src={URL.createObjectURL(recordedBlob)} controls className="w-full" />
                  <div className="flex gap-3">
                    <PulpButton onClick={startRecording} color={PULP.paperDim} variant="ghost" size="sm" className="flex-1">
                      Recommencer
                    </PulpButton>
                    <PulpButton onClick={handleSubmit} disabled={isSubmitting} color={GREEN} size="sm" className="flex-1">
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
