import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMediaDevices } from "@/hooks/useMediaDevices";

interface VoiceRecorderProps {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const VoiceRecorder = ({ onRecordingStart, onRecordingStop }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { selectedAudioId, audioInputs } = useMediaDevices();

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Microphone non disponible",
          description: "Votre navigateur ne supporte pas l'accès au microphone.",
          variant: "destructive",
        });
        return;
      }

      // Use selected audio device if available
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      // Add device ID if a specific device is selected
      if (selectedAudioId) {
        audioConstraints.deviceId = { exact: selectedAudioId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      
      setPermissionDenied(false);
      
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

    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      setPermissionDenied(true);
      
      let errorMessage = "Impossible d'accéder au microphone.";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Vous devez autoriser l'accès au microphone dans votre navigateur pour enregistrer.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucun microphone détecté. Veuillez connecter un microphone.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Le microphone est déjà utilisé par une autre application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Impossible d'accéder au microphone avec les paramètres demandés.";
      }
      
      toast({
        title: "Erreur Microphone",
        description: errorMessage,
        variant: "destructive",
      });
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

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
        variant={isRecording ? "destructive" : permissionDenied ? "outline" : "hero"}
        size="lg"
        className="relative w-20 h-20 rounded-full"
      >
        {isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : permissionDenied ? (
          <AlertCircle className="h-8 w-8" />
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

      <p className="text-sm text-foreground-secondary text-center max-w-xs">
        {isRecording ? "🎤 Enregistrement en cours..." : 
         permissionDenied ? "⚠️ Permission microphone refusée. Cliquez pour réessayer." :
         "Appuyez pour imiter"}
      </p>
    </div>
  );
};
