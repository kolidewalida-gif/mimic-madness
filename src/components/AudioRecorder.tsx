import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Save, Trash2 } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";

interface AudioRecorderProps {
  playerId: string;
  playerName: string;
  onAudioSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const AudioRecorder = React.forwardRef<any, AudioRecorderProps>(({
  playerId,
  playerName,
  onAudioSaved,
  lobbyId,
  onRecordingStart,
  onRecordingStop
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // Expose stopRecording via ref
  React.useImperativeHandle(ref, () => ({
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    };
  }, [previewUrl]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

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
      // Request audio only
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);

      // Setup audio visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Setup MediaRecorder for audio
      let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }

      mediaRecorderRef.current = new MediaRecorder(mediaStream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        
        // Create preview URL
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        // Set default audio name
        setAudioName(`Imitation ${new Date().toLocaleTimeString()}`);
        
        // Stop the stream and visualizer
        stopStream();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
        setAudioLevel(0);
        
        onRecordingStop?.();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateAudioLevel();
      onRecordingStart?.();

      toast({
        title: "🎤 Enregistrement audio démarré",
        description: "Imitez maintenant !",
      });

    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      
      let errorMessage = "Impossible d'accéder au microphone.";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Vous devez autoriser l'accès au microphone.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Aucun microphone détecté.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Le microphone est utilisé par une autre application.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSaveClip = async () => {
    if (!recordedBlob || !audioName.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez nommer votre audio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a File from the Blob
      const file = new File([recordedBlob], `${audioName}.webm`, { type: 'audio/webm' });
      
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name: audioName,
        playerId,
        playerName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        isMuted: false,
        lobbyId
      };

      const savedClip = await videoStorage.uploadVideo(file, clipData);
      
      onAudioSaved?.(savedClip);
      
      // Reset form
      handleClear();
      
      toast({
        title: "✅ Audio sauvegardé !",
        description: `"${audioName}" a été ajouté avec succès`,
      });
    } catch (error) {
      console.error("Error saving audio clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'audio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setAudioName("");
    stopStream();
  };

  return (
    <Card className="p-6 bg-background-secondary/50 border-glass-border">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-semibold text-gradient">
            Enregistrer votre imitation
          </h3>
        </div>

        {!isRecording && !recordedBlob && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary text-center">
              Cliquez pour commencer à enregistrer votre voix
            </p>
            <div className="flex justify-center">
              <Button
                onClick={startRecording}
                variant="hero"
                size="lg"
                className="w-32 h-32 rounded-full"
              >
                <Mic className="h-12 w-12" />
              </Button>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="w-32 h-32 rounded-full"
                >
                  <MicOff className="h-12 w-12" />
                </Button>
                
                {/* Animated waves */}
                <span
                  className="absolute inset-0 rounded-full border-4 border-destructive animate-ping"
                  style={{
                    opacity: audioLevel / 100,
                    animationDuration: '1s'
                  }}
                />
                <span
                  className="absolute inset-0 rounded-full border-4 border-destructive animate-ping"
                  style={{
                    opacity: audioLevel / 150,
                    animationDuration: '1.5s',
                    animationDelay: '0.3s'
                  }}
                />
              </div>

              {/* Audio level bars */}
              <div className="flex gap-2 items-end h-16">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 bg-secondary rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(12, (audioLevel / 100) * 64 * (0.4 + Math.random() * 0.6))}px`,
                    }}
                  />
                ))}
              </div>

              <p className="text-lg font-semibold text-secondary animate-pulse">
                🎤 Enregistrement en cours...
              </p>
            </div>
          </div>
        )}

        {recordedBlob && previewUrl && (
          <div className="space-y-4">
            {/* Audio preview */}
            <div className="p-4 bg-background/50 rounded-lg">
              <audio
                src={previewUrl}
                className="w-full"
                controls
              />
            </div>

            {/* Audio Name */}
            <div>
              <label htmlFor="audio-name" className="block mb-2 text-sm font-medium">
                Nom de votre imitation
              </label>
              <Input
                id="audio-name"
                value={audioName}
                onChange={(e) => setAudioName(e.target.value)}
                placeholder="Ex: Mon imitation"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="hero"
                onClick={handleSaveClip}
                disabled={isLoading}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

AudioRecorder.displayName = 'AudioRecorder';
