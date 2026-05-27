import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mic, StopCircle, Save, Trash2, Play, RotateCcw } from "lucide-react";
import { videoStorage, VideoClip } from "@/lib/videoStorageSupabase";
import { applyVoiceFilter, postProcessRecordedBlob, requiresPostProcessing, VoiceFilterId } from "@/lib/voiceFilters";
import { InkVoiceFilterPicker } from "@/components/InkVoiceFilterPicker";

interface AudioRecorderProps {
  playerId: string;
  playerName: string;
  onAudioSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  /** Show the voice-filter picker above the mic button (Ink mode) */
  showVoiceFilters?: boolean;
}

export const AudioRecorder = React.forwardRef<any, AudioRecorderProps>(({
  playerId,
  playerName,
  onAudioSaved,
  lobbyId,
  onRecordingStart,
  onRecordingStop,
  showVoiceFilters = false,
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilterId>('none');
  const filterDisposeRef = useRef<(() => void) | null>(null);
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
      if (filterDisposeRef.current) {
        filterDisposeRef.current();
        filterDisposeRef.current = null;
      }
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
    // Guard against double-clicks / stuck state
    if (isRecording || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    try {
      // Add a 10s safety timeout for getUserMedia — some browsers (notably
      // certain mobile Chrome builds) hang the permission dialog silently.
      const mediaStream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }),
        new Promise<MediaStream>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_GETUSERMEDIA')), 10000)
        ),
      ]);

      setStream(mediaStream);

      // Setup audio visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Apply voice filter (if any) — produces a processed MediaStream that
      // we feed to MediaRecorder. The original mediaStream still feeds the
      // analyser so the level meter reacts to the user's actual mic.
      const filtered = applyVoiceFilter(mediaStream, voiceFilter);
      filterDisposeRef.current = filtered.dispose;
      const recordingStream = filtered.stream;

      // Setup MediaRecorder for audio
      let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Last resort: let the browser pick.
        options = {};
      }

      mediaRecorderRef.current = new MediaRecorder(recordingStream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: 'Erreur d\'enregistrement',
          description: 'Le microphone a rencontré un problème. Réessayez.',
          variant: 'destructive',
        });
        // Cleanup and reset so the user can retry
        try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
        stopStream();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setIsRecording(false);
        setAudioLevel(0);
        onRecordingStop?.();
      };

      mediaRecorderRef.current.onstop = () => {
        const rawBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Stop the stream and visualizer immediately so the mic LED turns off
        stopStream();
        if (filterDisposeRef.current) {
          filterDisposeRef.current();
          filterDisposeRef.current = null;
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
        setAudioLevel(0);

        onRecordingStop?.();

        // For post-process filters (helium / deep) we render the blob through
        // OfflineAudioContext to actually pitch-shift the audio. Otherwise we
        // use the raw blob as-is. The await is wrapped in an IIFE because
        // onstop itself can't be async (MediaRecorder API).
        const finalize = async () => {
          let blob = rawBlob;
          if (requiresPostProcessing(voiceFilter)) {
            setIsLoading(true);
            try {
              blob = await postProcessRecordedBlob(rawBlob, voiceFilter);
            } catch (err) {
              console.warn('[recorder] post-process failed, using raw blob', err);
            } finally {
              setIsLoading(false);
            }
          }

          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);

          const autoName = `Imitation ${new Date().toLocaleTimeString()}`;
          setAudioName(autoName);

          void autoSaveClip(blob, autoName);
        };
        void finalize();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateAudioLevel();
      onRecordingStart?.();

      toast({
        title: '🎤 Enregistrement audio démarré',
        description: 'Imitez maintenant !',
      });

    } catch (error: any) {
      console.error('Error accessing microphone:', error);

      // Cleanup any half-initialized resources so the user can retry
      try { stopStream(); } catch { /* noop */ }
      try { if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close(); } catch { /* noop */ }
      setIsRecording(false);
      setAudioLevel(0);

      let errorMessage = 'Impossible d\'accéder au microphone.';

      if (error?.message === 'TIMEOUT_GETUSERMEDIA') {
        errorMessage = 'Le micro met trop de temps à répondre. Vérifiez les permissions.';
      } else if (error?.name === 'NotAllowedError') {
        errorMessage = 'Vous devez autoriser l\'accès au microphone.';
      } else if (error?.name === 'NotFoundError') {
        errorMessage = 'Aucun microphone détecté.';
      } else if (error?.name === 'NotReadableError') {
        errorMessage = 'Le microphone est utilisé par une autre application. Fermez-la et réessayez.';
      } else if (error?.name === 'AbortError') {
        errorMessage = 'L\'accès au microphone a été interrompu. Réessayez.';
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const autoSaveClip = async (blob: Blob, name: string) => {
    setIsLoading(true);
    try {
      // Use the blob's actual MIME type — post-processed clips come back as
      // audio/wav from the OfflineAudioContext renderer, while live-FX clips
      // remain audio/webm. Hardcoding webm broke playback for helium / deep.
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.includes('wav') ? 'wav' : 'webm';
      const file = new File([blob], `${name}.${ext}`, { type: mimeType });
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name,
        playerId,
        playerName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        isMuted: false,
        lobbyId,
      };
      const savedClip = await videoStorage.uploadVideo(file, clipData);
      onAudioSaved?.(savedClip);
    } catch (error) {
      console.error("Error auto-saving audio clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'audio automatiquement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            {showVoiceFilters && (
              <InkVoiceFilterPicker
                value={voiceFilter}
                onChange={setVoiceFilter}
              />
            )}
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
                <div className="w-32 h-32 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-destructive animate-pulse" />
                </div>
                
                {/* Animated waves */}
                <span
                  className="absolute inset-0 rounded-full border-4 border-destructive animate-ping"
                  style={{
                    opacity: audioLevel / 100,
                    animationDuration: '1s'
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

              <p className="text-lg font-semibold text-destructive animate-pulse">
                🎤 Enregistrement en cours...
              </p>

              {/* STOP BUTTON - clearly visible */}
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="w-full mt-4"
              >
                <StopCircle className="h-5 w-5 mr-2" />
                Arrêter l'enregistrement
              </Button>
            </div>
          </div>
        )}

        {recordedBlob && previewUrl && (
          <div className="space-y-4">
            <p className="text-center text-sm text-foreground-secondary">
              ✅ Enregistrement terminé ! Écoutez et sauvegardez.
            </p>

            {/* Audio preview with play button */}
            <div className="p-4 bg-background/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                <Play className="h-4 w-4" />
                Écouter votre imitation
              </div>
              <audio
                src={previewUrl}
                className="w-full"
                controls
                autoPlay={false}
              />
            </div>

            {/* Action Buttons - Clear layout */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isLoading}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Recommencer
              </Button>
              <Button
                variant="hero"
                onClick={handleSaveClip}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "..." : "Sauvegarder"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

AudioRecorder.displayName = 'AudioRecorder';
