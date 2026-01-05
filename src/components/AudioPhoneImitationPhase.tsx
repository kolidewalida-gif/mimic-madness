import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Check, Play, Pause, Loader2, ChevronRight, Headphones, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FuturisticBackground } from "./audio-phone/FuturisticBackground";
import { HolographicCard } from "./audio-phone/HolographicCard";
import { NeonButton } from "./audio-phone/NeonButton";
import { StatusBadge } from "./audio-phone/StatusBadge";
import { RecordButton } from "./audio-phone/RecordButton";
import { WaveformVisualizer } from "./audio-phone/WaveformVisualizer";
import { CircularProgress } from "./audio-phone/CircularProgress";

interface AudioPhoneImitationPhaseProps {
  currentPhraseIndex: number;
  totalPhrases: number;
  authorName: string;
  reversedAudioUrl: string | null;
  shouldImitate: boolean;
  hasImitated: boolean;
  isAuthor: boolean;
  allImitationsDone: boolean;
  isHost: boolean;
  isSubmitting: boolean;
  maxSeconds: number;
  onSubmitImitation: (audioBlob: Blob) => Promise<boolean>;
  onNextPhrase: () => void;
}

export const AudioPhoneImitationPhase = memo(({
  currentPhraseIndex,
  totalPhrases,
  authorName,
  reversedAudioUrl,
  shouldImitate,
  hasImitated,
  isAuthor,
  allImitationsDone,
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
  const [playProgress, setPlayProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const playReversedAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
        mimeType: selectedMimeType || undefined 
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxSeconds) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (recordedBlob) {
      const success = await onSubmitImitation(recordedBlob);
      if (success) {
        setRecordedBlob(null);
        setHasListened(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    setHasListened(false);
    setRecordedBlob(null);
    setIsRecording(false);
    setIsPlaying(false);
    setPlayProgress(0);
  }, [currentPhraseIndex]);

  // Phrase progress indicator
  const PhraseIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[...Array(totalPhrases)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === currentPhraseIndex 
              ? "w-8 bg-gradient-to-r from-primary to-accent" 
              : i < currentPhraseIndex 
                ? "w-2 bg-emerald-500" 
                : "w-2 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );

  // Author view - waiting for others
  if (isAuthor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FuturisticBackground variant="default" />
        
        <HolographicCard variant="warning" glow className="w-full max-w-lg p-8 relative z-10">
          <div className="text-center space-y-6">
            <PhraseIndicator />
            
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                <Volume2 className="w-12 h-12 text-amber-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-amber-500/30 animate-[spin_10s_linear_infinite]" 
                   style={{ borderStyle: 'dashed' }} />
            </div>
            
            <div>
              <StatusBadge variant="warning" icon={<RotateCcw className="w-4 h-4" />}>
                Ta phrase est en cours d'imitation
              </StatusBadge>
              <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mt-4 mb-2">
                C'est ta phrase !
              </h2>
              <p className="text-muted-foreground">
                Les autres joueurs tentent de l'imiter à l'envers...
              </p>
            </div>

            <WaveformVisualizer isActive barCount={25} className="h-12 opacity-60" />

            {allImitationsDone && isHost && (
              <NeonButton
                onClick={onNextPhrase}
                size="lg"
                variant="primary"
                icon={<ChevronRight className="w-5 h-5" />}
              >
                Phrase suivante
              </NeonButton>
            )}
          </div>
        </HolographicCard>
      </div>
    );
  }

  // Already imitated - waiting
  if (hasImitated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FuturisticBackground variant="listening" />
        
        <HolographicCard variant="success" glow className="w-full max-w-lg p-8 relative z-10">
          <div className="text-center space-y-6">
            <PhraseIndicator />
            
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-emerald-500/30 animate-ping opacity-50" />
            </div>
            
            <div>
              <StatusBadge variant="success" icon={<Check className="w-4 h-4" />}>
                Imitation envoyée
              </StatusBadge>
              <h2 className="text-2xl md:text-3xl font-bold text-emerald-400 mt-4 mb-2">
                Bien joué !
              </h2>
              <p className="text-muted-foreground">
                Phrase de <span className="text-primary font-medium">{authorName}</span> • En attente des autres...
              </p>
            </div>

            <WaveformVisualizer isActive barCount={20} variant="playing" className="h-10 opacity-60" />

            {allImitationsDone && isHost && (
              <NeonButton
                onClick={onNextPhrase}
                size="lg"
                variant="primary"
                icon={<ChevronRight className="w-5 h-5" />}
              >
                Phrase suivante
              </NeonButton>
            )}
          </div>
        </HolographicCard>
      </div>
    );
  }

  // Main imitation view
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FuturisticBackground variant={isRecording ? "recording" : "listening"} />
      
      {/* Hidden audio element */}
      {reversedAudioUrl && (
        <audio
          ref={audioRef}
          src={reversedAudioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setHasListened(true);
            setPlayProgress(100);
          }}
          onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            if (audio.duration) {
              setPlayProgress((audio.currentTime / audio.duration) * 100);
            }
          }}
        />
      )}

      <HolographicCard 
        variant={isRecording ? "danger" : "info"} 
        glow 
        className="w-full max-w-lg p-6 md:p-8 relative z-10"
      >
        <div className="text-center space-y-5">
          <PhraseIndicator />

          {/* Header */}
          <div>
            <StatusBadge 
              variant={hasListened ? (isRecording ? "recording" : "success") : "info"} 
              icon={<Headphones className="w-4 h-4" />}
            >
              Phrase de {authorName}
            </StatusBadge>
            
            <h2 className="text-xl md:text-2xl font-bold mt-4 mb-2 text-foreground">
              {!hasListened ? "Écoute l'audio inversé" : "Reproduis ce que tu as entendu !"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {!hasListened 
                ? "Concentre-toi bien... c'est à l'envers !" 
                : "Parle à l'envers pour reproduire ce que tu as entendu"}
            </p>
          </div>

          {/* Listen section */}
          {!hasListened && (
            <div className="space-y-4 py-4">
              <CircularProgress
                progress={playProgress}
                size={160}
                strokeWidth={6}
                variant="default"
              >
                <button
                  onClick={isPlaying ? pauseAudio : playReversedAudio}
                  disabled={!reversedAudioUrl}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                    "bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-500",
                    "border-2 border-cyan-400/50",
                    "shadow-[0_0_30px_rgba(6,182,212,0.4)]",
                    "hover:shadow-[0_0_50px_rgba(6,182,212,0.6)] hover:scale-105",
                    isPlaying && "animate-pulse"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
              </CircularProgress>
              
              <WaveformVisualizer 
                isActive={isPlaying} 
                barCount={30}
                variant="playing"
                className="h-12 w-full max-w-xs mx-auto"
              />
              
              <p className="text-xs text-muted-foreground">
                {isPlaying ? "Écoute en cours..." : "Appuie pour écouter"}
              </p>
            </div>
          )}

          {/* Recording section */}
          {hasListened && !recordedBlob && (
            <div className="space-y-4 py-4">
              <CircularProgress
                progress={(recordingTime / maxSeconds) * 100}
                size={160}
                strokeWidth={6}
                variant={isRecording ? "recording" : "default"}
                showGlow={isRecording}
              >
                <RecordButton
                  isRecording={isRecording}
                  isLoading={isSubmitting}
                  audioLevel={audioLevel}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting}
                  size="sm"
                />
              </CircularProgress>

              {isRecording && (
                <div className="space-y-2">
                  <div className="text-3xl font-mono font-bold text-rose-400">
                    {recordingTime}<span className="text-xl text-rose-400/60">s</span>
                    <span className="text-muted-foreground text-lg"> / {maxSeconds}s</span>
                  </div>
                  <WaveformVisualizer 
                    isActive 
                    audioLevel={audioLevel} 
                    variant="recording" 
                    barCount={25}
                    className="h-10 w-full max-w-xs mx-auto"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit recorded audio */}
          {recordedBlob && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/30">
                <p className="text-sm text-muted-foreground mb-3">Ton imitation</p>
                <audio 
                  src={URL.createObjectURL(recordedBlob)} 
                  controls 
                  className="w-full h-10"
                />
              </div>
              
              <div className="flex gap-3">
                <NeonButton
                  onClick={startRecording}
                  variant="warning"
                  className="flex-1"
                >
                  Réenregistrer
                </NeonButton>
                <NeonButton
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  variant="success"
                  className="flex-1"
                  icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                >
                  {isSubmitting ? "Envoi..." : "Envoyer"}
                </NeonButton>
              </div>
            </div>
          )}
        </div>
      </HolographicCard>
    </div>
  );
});

AudioPhoneImitationPhase.displayName = "AudioPhoneImitationPhase";
