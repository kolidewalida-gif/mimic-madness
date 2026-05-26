import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Check, Users, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoodleBorder, DoodleStage } from '@/components/doodle/Doodle';
import { playInkSound } from '@/hooks/useInkSoundEffects';
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

const ACCENT = '#c084fc';
const READY_COLOR = '#34d399';

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

      // Apply noise reduction (RNNoise) — falls back to raw stream if disabled or fails
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
    const success = await onSubmit(recordedBlob);
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

  if (hasSubmitted) {
    return (
      <DoodleStage accent={READY_COLOR}>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            className="relative w-full max-w-xl px-6 py-8"
          >
            <DoodleBorder color={READY_COLOR} filled rotation={-1} thick />
            <div className="relative text-center space-y-5">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                className="relative w-20 h-20 mx-auto flex items-center justify-center"
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                  <path
                    d="M50,8 Q70,7 82,18 Q94,32 92,52 Q90,72 76,86 Q60,96 42,92 Q24,90 12,76 Q4,60 8,40 Q14,20 30,12 Q40,8 50,8 Z"
                    fill={READY_COLOR}
                    fillOpacity="0.18"
                    stroke={READY_COLOR}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <Check className="relative w-9 h-9" style={{ color: READY_COLOR }} />
              </motion.div>

              <div>
                <h2
                  className="text-3xl md:text-4xl font-black mb-1"
                  style={{ fontFamily: "'Caveat', cursive", color: READY_COLOR }}
                >
                  Phrase enregistrée !
                </h2>
                <p className="text-sm text-white/55">
                  La manche attend les derniers micros.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-base">
                <Users className="w-4 h-4" style={{ color: READY_COLOR }} />
                <span
                  className="font-black text-white"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  {submittedCount} / {playersCount} joueurs
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(submittedCount / playersCount) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                  style={{ background: READY_COLOR }}
                />
              </div>

              {renderRoster()}

              {pendingPlayerNames.length > 0 && (
                <p className="text-xs text-white/45">
                  Manque encore :{' '}
                  <span className="font-bold text-white">{pendingPlayerNames.join(', ')}</span>
                </p>
              )}

              {allSubmitted && isHost && (
                <motion.button
                  type="button"
                  onClick={() => {
                    playInkSound('cartoonSwoosh', 0.4);
                    onStartImitation();
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full px-6 py-3"
                >
                  <DoodleBorder color={ACCENT} filled rotation={-1} thick />
                  <div className="relative flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                    <span
                      className="text-lg font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                    >
                      Lancer les imitations
                    </span>
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </DoodleStage>
    );
  }

  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-xl px-6 py-8"
        >
          <DoodleBorder color={ACCENT} filled rotation={1} thick />
          <div className="relative text-center space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 relative">
                <DoodleBorder color={ACCENT} />
                <Mic className="relative w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span
                  className="relative text-xs uppercase tracking-[0.2em] font-bold"
                  style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                >
                  À toi le micro
                </span>
              </div>
              <h2
                className="text-2xl md:text-3xl font-black mb-1 text-white"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {playerName}, enregistre ta phrase
              </h2>
              <p className="text-sm text-white/55">
                Une phrase originale (max{' '}
                <span className="font-bold" style={{ color: ACCENT }}>
                  {maxSeconds}s
                </span>
                )
              </p>
              <p className="mt-1 text-[11px] text-white/40 italic">
                Astuce : courte, rythmique, fun à rejouer à l'envers.
              </p>
            </div>

            <div className="relative inline-block">
              <motion.button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSubmitting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  isRecording
                    ? { scale: [1, 1.04, 1] }
                    : { y: [0, -3, 0] }
                }
                transition={
                  isRecording
                    ? { duration: 0.5, repeat: Infinity }
                    : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                }
                className={cn(
                  'relative w-32 h-32 rounded-full flex items-center justify-center transition-shadow',
                  isRecording ? 'bg-red-500' : '',
                )}
                style={{
                  background: isRecording
                    ? '#f87171'
                    : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                  boxShadow: isRecording
                    ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px rgba(248,113,113,0.45)`
                    : `0 8px 30px ${ACCENT}55`,
                }}
              >
                {isRecording ? (
                  <MicOff className="w-12 h-12 text-white" />
                ) : (
                  <Mic className="w-12 h-12 text-white" />
                )}
              </motion.button>

              {isRecording && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="absolute inset-0 rounded-full border-2"
                      style={{
                        borderColor: '#f8717180',
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
                className="text-3xl font-black"
                style={{ fontFamily: "'Caveat', cursive", color: '#f87171' }}
              >
                {recordingTime.toFixed(1)}s / {maxSeconds}s
              </div>
            )}

            {recordedBlob && !isRecording && (
              <div className="space-y-3">
                <audio
                  src={URL.createObjectURL(recordedBlob)}
                  controls
                  className="w-full"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="relative flex-1 py-3 group"
                  >
                    <DoodleBorder color="rgba(255,255,255,0.2)" />
                    <span
                      className="relative text-base font-black text-white/70 group-hover:text-white transition-colors"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Recommencer
                    </span>
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    whileHover={!isSubmitting ? { scale: 1.02, y: -1 } : undefined}
                    whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
                    className="relative flex-1 py-3 disabled:opacity-50"
                  >
                    <DoodleBorder color={READY_COLOR} filled rotation={-1} thick />
                    <div className="relative flex items-center justify-center gap-1.5">
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: READY_COLOR }} />
                      ) : (
                        <Check className="w-4 h-4" style={{ color: READY_COLOR }} />
                      )}
                      <span
                        className="text-base font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: READY_COLOR }}
                      >
                        Valider
                      </span>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-white/55">
                <Users className="w-3.5 h-3.5" />
                <span style={{ fontFamily: "'Caveat', cursive" }} className="font-bold">
                  {submittedCount} / {playersCount} phrases
                </span>
              </div>
              {renderRoster()}
            </div>
          </div>
        </motion.div>
      </div>
    </DoodleStage>
  );
};


/**
 * Internal roster list with avatar lookup.
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
        return (
          <motion.div
            key={`${name}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative px-3 py-2 flex items-center gap-3 text-sm"
          >
            <DoodleBorder
              color={isPending ? 'rgba(255,255,255,0.18)' : READY_COLOR}
              filled={!isPending}
              rotation={index % 2 === 0 ? -0.5 : 0.5}
            />
            <div
              className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                background: hasImage
                  ? 'transparent'
                  : isPending
                    ? 'rgba(255,255,255,0.08)'
                    : `${READY_COLOR}33`,
              }}
            >
              {hasImage ? (
                <img src={av!.imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span
                  className="text-xs font-black"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: isPending ? 'rgba(255,255,255,0.6)' : READY_COLOR,
                  }}
                >
                  {name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <span
              className="relative font-bold text-white flex-1 truncate"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {name}
            </span>
            <span
              className="relative text-[10px] uppercase tracking-wider font-bold flex-shrink-0"
              style={{ color: isPending ? 'rgba(255,255,255,0.45)' : READY_COLOR }}
            >
              {isPending ? 'En attente' : '✓ Prêt'}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
