import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, 
  Square, 
  Send, 
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  Sparkles,
  Clock,
  Volume2,
  Radio,
  Waves
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

interface AudioPhoneRecordingPhaseProps {
  isFirstPlayer: boolean;
  maxSeconds: number;
  playerName: string;
  onSubmit: (audioBlob: Blob, originalPhrase?: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export const AudioPhoneRecordingPhase = memo(({
  isFirstPlayer,
  maxSeconds,
  playerName,
  onSubmit,
  isSubmitting,
}: AudioPhoneRecordingPhaseProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [originalPhrase, setOriginalPhrase] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showReady, setShowReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setShowReady(true);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Setup MediaRecorder
      const preferredMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const selectedMimeType =
        preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: selectedMimeType || mediaRecorder.mimeType || 'audio/webm' 
        });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(t => t.stop());
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setAudioLevel(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      playSoundEffect('start', 0.3);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxSeconds) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start audio level updates
      updateAudioLevel();

    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        setPermissionDenied(true);
      }
    }
  }, [maxSeconds, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      playSoundEffect('success', 0.3);
    }
  }, [isRecording]);

  // Reset recording
  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    playSoundEffect('whoosh', 0.3);
  }, [audioUrl]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!audioBlob) return;
    
    const success = await onSubmit(audioBlob, isFirstPlayer ? originalPhrase : undefined);
    if (success) {
      playSoundEffect('success', 0.5);
    }
  }, [audioBlob, onSubmit, isFirstPlayer, originalPhrase]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = (recordingTime / maxSeconds) * 100;

  if (permissionDenied) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full p-8 bg-card/60 backdrop-blur-md border-destructive/30">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Accès au microphone refusé</h2>
              <p className="text-foreground-secondary">
                Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur pour jouer.
              </p>
            </div>
            <Button variant="outline" size="lg" onClick={() => setPermissionDenied(false)}>
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-1000",
          isRecording 
            ? "bg-gradient-to-br from-destructive/40 to-primary/30 scale-110" 
            : "bg-gradient-to-br from-primary/20 to-accent/15 scale-100"
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl transition-all duration-1000 delay-100",
          isRecording 
            ? "bg-gradient-to-br from-accent/40 to-destructive/30 scale-110" 
            : "bg-gradient-to-br from-secondary/20 to-primary/15 scale-100"
        )} />
      </div>

      {/* Header */}
      <div className={cn(
        "text-center mb-8 relative z-10 transition-all duration-700",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}>
        <div className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-5 backdrop-blur-sm",
          isFirstPlayer 
            ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/30" 
            : "bg-gradient-to-r from-accent/15 to-primary/10 border-accent/30"
        )}>
          <div className="relative">
            <Mic className={cn(
              "h-4 w-4",
              isFirstPlayer ? "text-emerald-400" : "text-accent"
            )} />
            {isRecording && (
              <div className="absolute inset-0 animate-ping">
                <Mic className="h-4 w-4 text-destructive opacity-75" />
              </div>
            )}
          </div>
          <span className={cn(
            "text-sm font-semibold",
            isFirstPlayer ? "text-emerald-400" : "text-accent"
          )}>
            {isFirstPlayer ? "🎤 Première phrase" : "🔊 Votre interprétation"}
          </span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground">
          À vous, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{playerName}</span> !
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto text-lg">
          {isFirstPlayer 
            ? "Enregistrez une phrase claire et distincte"
            : "Répétez ce que vous avez entendu (ou cru entendre !)"
          }
        </p>
      </div>

      {/* Recording Card */}
      <Card className={cn(
        "max-w-xl w-full p-6 md:p-8 relative z-10 overflow-hidden transition-all duration-500 mb-6",
        "bg-card/60 backdrop-blur-md",
        isRecording 
          ? "border-destructive/50 shadow-lg shadow-destructive/20" 
          : "border-border/30"
      )}>
        {/* Recording glow effect */}
        {isRecording && (
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent animate-pulse" />
        )}

        {/* Timer and status */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              isRecording 
                ? "bg-gradient-to-br from-destructive to-red-600" 
                : "bg-gradient-to-br from-primary/20 to-accent/20"
            )}>
              <Clock className={cn(
                "h-6 w-6",
                isRecording ? "text-white" : "text-foreground-muted"
              )} />
            </div>
            <div>
              <span className={cn(
                "font-mono text-3xl font-black transition-colors block",
                isRecording ? "text-destructive" : "text-foreground"
              )}>
                {formatTime(recordingTime)}
              </span>
              <span className="text-xs text-foreground-muted">/ {formatTime(maxSeconds)} max</span>
            </div>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/15 border border-destructive/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              <span className="text-sm font-semibold text-destructive">REC</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-6">
          <div 
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              isRecording 
                ? "bg-gradient-to-r from-destructive via-red-500 to-orange-500" 
                : "bg-gradient-to-r from-primary to-accent"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Audio visualization */}
        <div className={cn(
          "relative h-36 rounded-2xl border overflow-hidden mb-6 transition-all duration-300",
          isRecording 
            ? "bg-gradient-to-br from-destructive/10 to-background/50 border-destructive/30" 
            : "bg-background/50 border-border/50"
        )}>
          {/* Waveform visualization */}
          <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-6">
            {Array.from({ length: 50 }).map((_, i) => {
              const baseHeight = isRecording 
                ? Math.random() * audioLevel * 100 + 15
                : audioBlob ? 30 : 20;
                
              return (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full transition-all",
                    isRecording
                      ? "bg-gradient-to-t from-destructive via-red-400 to-orange-400"
                      : audioBlob
                      ? "bg-gradient-to-t from-primary to-accent"
                      : "bg-foreground-muted/20"
                  )}
                  style={{
                    height: `${baseHeight}%`,
                    transitionDuration: isRecording ? '50ms' : '300ms',
                  }}
                />
              );
            })}
          </div>

          {/* Center icon when not recording */}
          {!isRecording && !audioBlob && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center backdrop-blur-sm border border-primary/30">
                  <Mic className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 animate-ping" />
              </div>
            </div>
          )}

          {/* Ready indicator */}
          {audioBlob && !isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-background/90 backdrop-blur-sm border border-primary/30 shadow-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Enregistrement prêt !</p>
                  <p className="text-xs text-foreground-muted">Durée: {formatTime(recordingTime)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
          {!audioBlob ? (
            <Button
              variant={isRecording ? "destructive" : "hero"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "min-w-[180px] h-14 text-lg transition-all duration-300",
                isRecording && "animate-pulse"
              )}
            >
              {isRecording ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  Arrêter
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={togglePlayback}
                className="h-12 w-12 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={resetRecording}
                className="h-12"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Recommencer
              </Button>

              <Button
                variant="hero"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-12 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Audio element for playback */}
        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onEnded={() => setIsPlaying(false)}
            hidden
          />
        )}
      </Card>

      {/* Original phrase input (first player only) */}
      {isFirstPlayer && (
        <Card className={cn(
          "max-w-xl w-full p-6 relative z-10 overflow-hidden transition-all duration-700 delay-300",
          "bg-card/60 backdrop-blur-md border-border/30",
          showReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground mb-1">📝 Notez votre phrase</h3>
              <p className="text-sm text-foreground-secondary">
                Facultatif mais recommandé pour la révélation finale !
              </p>
            </div>
          </div>
          
          <Textarea
            value={originalPhrase}
            onChange={(e) => setOriginalPhrase(e.target.value)}
            placeholder="Tapez ici la phrase exacte que vous avez prononcée..."
            className="min-h-[100px] bg-background/50 border-border/50 resize-none text-base"
          />
        </Card>
      )}
    </div>
  );
});

AudioPhoneRecordingPhase.displayName = "AudioPhoneRecordingPhase";
