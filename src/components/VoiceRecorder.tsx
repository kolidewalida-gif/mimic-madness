import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const VoiceRecorder = ({ onRecordingStart, onRecordingStop }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100);
    setAudioLevel(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Start recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();

      setIsRecording(true);
      updateAudioLevel();
      onRecordingStart?.();

    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setAudioLevel(0);
    onRecordingStop?.();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : "hero"}
        size="lg"
        className="relative w-20 h-20 rounded-full"
      >
        {isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
        
        {/* Animated waves when recording */}
        {isRecording && (
          <>
            <span
              className="absolute inset-0 rounded-full border-2 border-destructive animate-ping"
              style={{
                opacity: audioLevel / 100,
                animationDuration: '1s'
              }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-destructive animate-ping"
              style={{
                opacity: audioLevel / 150,
                animationDuration: '1.5s',
                animationDelay: '0.3s'
              }}
            />
          </>
        )}
      </Button>

      {/* Audio level indicator */}
      {isRecording && (
        <div className="flex gap-1 items-end h-12">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-secondary rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(8, (audioLevel / 100) * 48 * (0.5 + Math.random() * 0.5))}px`,
              }}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-foreground-secondary">
        {isRecording ? "🎤 Enregistrement en cours..." : "Appuyez pour imiter"}
      </p>
    </div>
  );
};
