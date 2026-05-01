import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mic, MicOff, Check, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const AudioPhoneRecordingAllPhase = ({
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
  const timerRafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Determine supported mime type
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

      // Smooth, drift-free timer using performance.now() + rAF
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

      // Animate audio level
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
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Already submitted - waiting for others
  if (hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-500/30 backdrop-blur-xl">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                Phrase enregistrée !
              </h2>
              <p className="text-muted-foreground">
                En attente des autres joueurs...
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-lg">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-foreground font-medium">
                {submittedCount} / {playersCount} joueurs
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${(submittedCount / playersCount) * 100}%` }}
              />
            </div>

            {allSubmitted && isHost && (
              <Button
                onClick={onStartImitation}
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                Lancer les imitations
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-violet-950/80 to-purple-950/80 border-violet-500/30 backdrop-blur-xl">
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-violet-300 mb-2">
              {playerName}, enregistre ta phrase !
            </h2>
            <p className="text-muted-foreground">
              Dis une phrase originale (max {maxSeconds} secondes)
            </p>
          </div>

          {/* Recording button */}
          <div className="relative">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting}
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              )}
              style={{
                boxShadow: isRecording 
                  ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px rgba(239, 68, 68, 0.4)`
                  : '0 0 30px rgba(139, 92, 246, 0.3)'
              }}
            >
              {isRecording ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>

            {/* Audio visualizer rings */}
            {isRecording && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-red-400/50"
                    style={{
                      transform: `scale(${1 + audioLevel * (i + 1) * 0.3})`,
                      opacity: 1 - audioLevel * 0.3 * i,
                      transition: 'transform 0.1s, opacity 0.1s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timer */}
          {isRecording && (
            <div className="text-3xl font-mono font-bold text-red-400">
              {recordingTime.toFixed(1)}s / {maxSeconds}s
            </div>
          )}

          {/* Recorded audio preview and submit */}
          {recordedBlob && !isRecording && (
            <div className="space-y-4">
              <audio 
                src={URL.createObjectURL(recordedBlob)} 
                controls 
                className="w-full"
              />
              <div className="flex gap-3">
                <Button
                  onClick={startRecording}
                  variant="outline"
                  className="flex-1"
                >
                  Réenregistrer
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Valider
                </Button>
              </div>
            </div>
          )}

          {/* Progress info */}
          <div className="pt-4 border-t border-violet-500/20">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{submittedCount} / {playersCount} phrases enregistrées</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
