import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Check, Loader2, Zap, AudioWaveform } from "lucide-react";
import { cn } from "@/lib/utils";
import { FuturisticBackground } from "./audio-phone/FuturisticBackground";
import { HolographicCard } from "./audio-phone/HolographicCard";
import { NeonButton } from "./audio-phone/NeonButton";
import { StatusBadge } from "./audio-phone/StatusBadge";
import { RecordButton } from "./audio-phone/RecordButton";
import { CircularProgress } from "./audio-phone/CircularProgress";
import { PlayerProgress } from "./audio-phone/PlayerProgress";
import { WaveformVisualizer } from "./audio-phone/WaveformVisualizer";

interface AudioPhoneRecordingAllPhaseProps {
  maxSeconds: number;
  playerName: string;
  hasSubmitted: boolean;
  allSubmitted: boolean;
  playersCount: number;
  submittedCount: number;
  isHost: boolean;
  isSubmitting: boolean;
  onSubmit: (audioBlob: Blob) => Promise<boolean>;
  onStartImitation: () => void;
}

export const AudioPhoneRecordingAllPhase = memo(({
  maxSeconds,
  playerName,
  hasSubmitted,
  allSubmitted,
  playersCount,
  submittedCount,
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

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
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
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
      const success = await onSubmit(recordedBlob);
      if (success) {
        setRecordedBlob(null);
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

  // Already submitted - waiting for others
  if (hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FuturisticBackground variant="listening" />
        
        <HolographicCard variant="success" glow className="w-full max-w-lg p-8 relative z-10">
          <div className="text-center space-y-6">
            {/* Success icon */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-emerald-500/30 animate-ping" />
            </div>
            
            <div>
              <StatusBadge variant="success" icon={<AudioWaveform className="w-4 h-4" />}>
                Phrase transmise
              </StatusBadge>
              <h2 className="text-2xl md:text-3xl font-bold text-emerald-400 mt-4 mb-2">
                Mission accomplie !
              </h2>
              <p className="text-muted-foreground">
                En attente des autres agents...
              </p>
            </div>

            {/* Player progress */}
            <PlayerProgress 
              current={submittedCount} 
              total={playersCount}
              label="Transmissions reçues"
              variant="success"
            />

            {/* Waiting animation */}
            <div className="flex justify-center pt-2">
              <WaveformVisualizer isActive barCount={20} variant="playing" className="h-10 opacity-60" />
            </div>

            {allSubmitted && isHost && (
              <NeonButton
                onClick={onStartImitation}
                size="lg"
                variant="primary"
                icon={<Zap className="w-5 h-5" />}
              >
                Lancer les imitations
              </NeonButton>
            )}
          </div>
        </HolographicCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FuturisticBackground variant={isRecording ? "recording" : "default"} />
      
      <HolographicCard 
        variant={isRecording ? "danger" : "default"} 
        glow 
        className="w-full max-w-lg p-6 md:p-8 relative z-10"
      >
        <div className="text-center space-y-6">
          {/* Header */}
          <div>
            <StatusBadge 
              variant={isRecording ? "recording" : "default"} 
              icon={<AudioWaveform className="w-4 h-4" />}
              pulse={isRecording}
            >
              {isRecording ? "Enregistrement en cours" : "Phase d'enregistrement"}
            </StatusBadge>
            
            <h2 className="text-2xl md:text-3xl font-bold mt-4 mb-2">
              <span className="text-primary">{playerName}</span>
              <span className="text-foreground">, à toi !</span>
            </h2>
            <p className="text-muted-foreground">
              Enregistre une phrase mystère ({maxSeconds} secondes max)
            </p>
          </div>

          {/* Recording interface */}
          {!recordedBlob ? (
            <div className="py-4">
              <CircularProgress
                progress={(recordingTime / maxSeconds) * 100}
                size={180}
                strokeWidth={8}
                variant={isRecording ? "recording" : "default"}
                showGlow={isRecording}
              >
                <RecordButton
                  isRecording={isRecording}
                  isLoading={isSubmitting}
                  audioLevel={audioLevel}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting}
                  size="md"
                />
              </CircularProgress>

              {/* Timer display */}
              {isRecording && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <div className="text-4xl font-mono font-bold text-rose-400">
                    {recordingTime}<span className="text-2xl text-rose-400/60">s</span>
                    <span className="text-muted-foreground text-xl"> / {maxSeconds}s</span>
                  </div>
                  <WaveformVisualizer 
                    isActive 
                    audioLevel={audioLevel} 
                    variant="recording" 
                    barCount={30}
                    className="h-12 w-full max-w-xs"
                  />
                </div>
              )}
            </div>
          ) : (
            // Recorded preview
            <div className="space-y-5 py-4">
              <div className="p-4 rounded-xl bg-muted/20 backdrop-blur-sm border border-border/30">
                <p className="text-sm text-muted-foreground mb-3">Aperçu de ton enregistrement</p>
                <audio 
                  src={URL.createObjectURL(recordedBlob)} 
                  controls 
                  className="w-full h-12"
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
                  {isSubmitting ? "Envoi..." : "Valider"}
                </NeonButton>
              </div>
            </div>
          )}

          {/* Progress footer */}
          <div className="pt-4 border-t border-border/30">
            <PlayerProgress 
              current={submittedCount} 
              total={playersCount}
              label="Phrases enregistrées"
            />
          </div>
        </div>
      </HolographicCard>
    </div>
  );
});

AudioPhoneRecordingAllPhase.displayName = "AudioPhoneRecordingAllPhase";
