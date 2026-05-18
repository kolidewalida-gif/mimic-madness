import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Check, Play, Pause, Volume2, Loader2, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoodleBorder, DoodleStage } from '@/components/doodle/Doodle';
import { playInkSound } from '@/hooks/useInkSoundEffects';

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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        stream.getTracks().forEach((track) => track.stop());
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

  const progressPercent = totalImitations > 0 ? (completedImitations / totalImitations) * 100 : 0;

  if (isAuthor) {
    return (
      <DoodleStage accent="#fbbf24">
        <div className="relative z-10 min-h-screen flex items-center justify-center p-5 pb-[120px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-xl px-6 py-8"
          >
            <DoodleBorder color="#fbbf24" filled rotation={1} thick />
            <div className="relative text-center space-y-5">
              <motion.div
                animate={{ scale: [1, 1.06, 1], rotate: [-3, 3, -3] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-20 h-20 mx-auto flex items-center justify-center"
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                  <path
                    d="M50,8 Q70,7 82,18 Q94,32 92,52 Q90,72 76,86 Q60,96 42,92 Q24,90 12,76 Q4,60 8,40 Q14,20 30,12 Q40,8 50,8 Z"
                    fill="#fbbf24"
                    fillOpacity="0.2"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <Volume2 className="relative w-9 h-9" style={{ color: '#fbbf24' }} />
              </motion.div>

              <div>
                <h2
                  className="text-3xl font-black mb-1"
                  style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
                >
                  C'est ta phrase
                </h2>
                <p className="text-sm text-white/55">
                  Observe comment les autres la réinterprètent.
                </p>
              </div>

              <div className="relative px-3 py-3 text-left">
                <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
                <div className="relative">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/55">
                      Phrase {currentPhraseIndex + 1} / {totalPhrases}
                    </span>
                    <span
                      className="font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
                    >
                      {completedImitations}/{totalImitations}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full rounded-full"
                      style={{ background: '#fbbf24' }}
                    />
                  </div>
                  {pendingPlayerNames.length > 0 && (
                    <p className="mt-2 text-xs text-white/45">
                      Encore attendus :{' '}
                      <span className="text-white font-bold">{pendingPlayerNames.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>

              {allImitationsDone && isHost && (
                <motion.button
                  type="button"
                  onClick={() => {
                    playInkSound('cartoonSwoosh', 0.4);
                    onNextPhrase();
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full px-6 py-3"
                >
                  <DoodleBorder color="#c084fc" filled rotation={-1} thick />
                  <div className="relative flex items-center justify-center gap-2">
                    <ChevronRight className="w-4 h-4" style={{ color: '#c084fc' }} />
                    <span
                      className="text-lg font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: '#c084fc' }}
                    >
                      Phrase suivante
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

  if (hasImitated) {
    return (
      <DoodleStage accent="#34d399">
        <div className="relative z-10 min-h-screen flex items-center justify-center p-5 pb-[120px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            className="relative w-full max-w-xl px-6 py-8"
          >
            <DoodleBorder color="#34d399" filled rotation={-1} thick />
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
                    fill="#34d399"
                    fillOpacity="0.18"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <Check className="relative w-9 h-9" style={{ color: '#34d399' }} />
              </motion.div>

              <div>
                <h2
                  className="text-3xl font-black mb-1"
                  style={{ fontFamily: "'Caveat', cursive", color: '#34d399' }}
                >
                  Imitation envoyée !
                </h2>
                <p className="text-sm text-white/55">
                  Le plateau attend encore quelques performances.
                </p>
              </div>

              <div className="relative px-3 py-3 text-left">
                <DoodleBorder color="rgba(255,255,255,0.18)" rotation={1} />
                <div className="relative">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/55">
                      Phrase de{' '}
                      <span className="font-bold text-white">{authorName}</span>
                    </span>
                    <span
                      className="font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: '#34d399' }}
                    >
                      {completedImitations}/{totalImitations}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full rounded-full"
                      style={{ background: '#34d399' }}
                    />
                  </div>
                  {pendingPlayerNames.length > 0 && (
                    <p className="mt-2 text-xs text-white/45">
                      En attente :{' '}
                      <span className="text-white font-bold">{pendingPlayerNames.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>

              {allImitationsDone && isHost && (
                <motion.button
                  type="button"
                  onClick={() => {
                    playInkSound('cartoonSwoosh', 0.4);
                    onNextPhrase();
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full px-6 py-3"
                >
                  <DoodleBorder color="#c084fc" filled rotation={-1} thick />
                  <div className="relative flex items-center justify-center gap-2">
                    <ChevronRight className="w-4 h-4" style={{ color: '#c084fc' }} />
                    <span
                      className="text-lg font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: '#c084fc' }}
                    >
                      Phrase suivante
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
    <DoodleStage accent="#38bdf8">
      <div className="relative z-10 min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-xl px-6 py-8"
        >
          <DoodleBorder color="#38bdf8" filled rotation={1} thick />
          <div className="relative text-center space-y-5">
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

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 relative">
                <DoodleBorder color="#38bdf8" filled />
                <span
                  className="relative text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: '#38bdf8', fontFamily: "'Caveat', cursive" }}
                >
                  Phrase {currentPhraseIndex + 1} / {totalPhrases}
                </span>
              </div>
              <h2
                className="text-2xl md:text-3xl font-black mb-1 text-white"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Phrase de{' '}
                <span style={{ color: '#38bdf8' }}>{authorName}</span>
              </h2>
              <p className="text-sm text-white/55">
                Écoute l'audio inversé, capte son rythme, puis rejoue-le.
              </p>
            </div>

            <div className="relative px-3 py-3 text-left">
              <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
              <div className="relative">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-white/55">
                    <Users className="w-3.5 h-3.5" />
                    Avancement
                  </span>
                  <span
                    className="font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: '#38bdf8' }}
                  >
                    {completedImitations}/{totalImitations}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full rounded-full"
                    style={{ background: '#38bdf8' }}
                  />
                </div>
                {pendingPlayerNames.length > 0 && (
                  <p className="mt-2 text-xs text-white/45">
                    Encore attendus :{' '}
                    <span className="text-white font-bold">{pendingPlayerNames.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={() => {
                  playInkSound('cartoonPop', 0.3);
                  isPlaying ? pauseAudio() : playReversedAudio();
                }}
                disabled={!reversedAudioUrl}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full px-6 py-3 disabled:opacity-50"
              >
                <DoodleBorder color="#38bdf8" filled rotation={-1} thick />
                <div className="relative flex items-center justify-center gap-2">
                  {isPlaying ? (
                    <Pause className="w-5 h-5" style={{ color: '#38bdf8' }} />
                  ) : (
                    <Play className="w-5 h-5" style={{ color: '#38bdf8' }} />
                  )}
                  <span
                    className="text-lg font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: '#38bdf8' }}
                  >
                    {isPlaying ? 'Pause' : 'Écouter l\'audio inversé'}
                  </span>
                </div>
              </motion.button>

              {hasListened && (
                <div
                  className="flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ color: '#34d399', fontFamily: "'Caveat', cursive" }}
                >
                  <Check className="w-4 h-4" />
                  Écoute terminée. Tu peux enregistrer.
                </div>
              )}
            </div>

            {hasListened && !recordedBlob && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 italic">
                  Reproduis le groove. Le naturel vaut mieux qu'un volume trop fort.
                </p>

                <div className="relative flex justify-center">
                  <motion.button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={isRecording ? { scale: [1, 1.04, 1] } : { y: [0, -3, 0] }}
                    transition={
                      isRecording
                        ? { duration: 0.5, repeat: Infinity }
                        : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                    }
                    className={cn('w-24 h-24 rounded-full flex items-center justify-center')}
                    style={{
                      background: isRecording
                        ? '#f87171'
                        : `linear-gradient(135deg, #38bdf8, #38bdf8cc)`,
                      boxShadow: isRecording
                        ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px rgba(248,113,113,0.45)`
                        : `0 8px 24px rgba(56,189,248,0.4)`,
                    }}
                  >
                    {isRecording ? (
                      <MicOff className="w-10 h-10 text-white" />
                    ) : (
                      <Mic className="w-10 h-10 text-white" />
                    )}
                  </motion.button>
                </div>

                {isRecording && (
                  <div
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: '#f87171' }}
                  >
                    {recordingTime.toFixed(1)}s / {maxSeconds}s
                  </div>
                )}
              </div>
            )}

            {recordedBlob && (
              <div className="space-y-3 pt-3 border-t border-white/10">
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
                    <DoodleBorder color="#34d399" filled rotation={-1} thick />
                    <div className="relative flex items-center justify-center gap-1.5">
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#34d399' }} />
                      ) : (
                        <Check className="w-4 h-4" style={{ color: '#34d399' }} />
                      )}
                      <span
                        className="text-base font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: '#34d399' }}
                      >
                        Envoyer
                      </span>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DoodleStage>
  );
};
