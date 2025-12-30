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
  Volume2
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Cleanup stream
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

  if (permissionDenied) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full p-6 bg-card/60 backdrop-blur-sm border-destructive/30">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Accès au microphone refusé</h2>
            <p className="text-foreground-secondary">
              Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur pour jouer.
            </p>
            <Button variant="outline" onClick={() => setPermissionDenied(false)}>
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-success/15 to-success/5 border border-success/30 mb-4">
           <Mic className="h-4 w-4 text-success" />
           <span className="text-sm font-medium text-success">
             {isFirstPlayer ? "Première phrase" : "Votre interprétation"}
           </span>
         </div>
        
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-foreground">
          À vous de jouer, <span className="text-primary">{playerName}</span> !
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto">
          {isFirstPlayer 
            ? "Enregistrez une phrase claire et distincte"
            : "Répétez ce que vous avez entendu (ou cru entendre !)"
          }
        </p>
      </div>

      {/* Recording Card */}
      <Card className="max-w-xl w-full p-6 md:p-8 bg-card/60 backdrop-blur-sm border-border/30 mb-6">
        {/* Timer and status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-foreground-muted" />
             <span className={cn(
               "font-mono text-2xl font-bold transition-colors",
               isRecording ? "text-destructive" : "text-foreground"
             )}>
               {formatTime(recordingTime)}
             </span>
             <span className="text-foreground-muted">/ {formatTime(maxSeconds)}</span>
           </div>

           {isRecording && (
             <div className="flex items-center gap-2">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-40"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
               </span>
               <span className="text-sm font-medium text-destructive">Enregistrement</span>
             </div>
           )}
        </div>

        {/* Audio visualization */}
        <div className="relative h-32 bg-background/50 rounded-2xl border border-border/50 mb-6 overflow-hidden">
          {/* Waveform visualization */}
          <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 rounded-full transition-all duration-75",
                  isRecording
                    ? "bg-gradient-to-t from-primary to-secondary"
                    : audioBlob
                    ? "bg-foreground-muted/30"
                    : "bg-foreground-muted/20"
                )}
                style={{
                  height: isRecording
                    ? `${Math.random() * audioLevel * 100 + 10}%`
                    : audioBlob
                    ? "30%"
                    : "20%",
                }}
              />
            ))}
          </div>

          {/* Center icon */}
          {!isRecording && !audioBlob && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Mic className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}

          {/* Playback indicator */}
          {audioBlob && !isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50">
                <Volume2 className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm font-medium">Enregistrement prêt</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {!audioBlob ? (
            <Button
              variant={isRecording ? "destructive" : "hero"}
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              className="min-w-[160px]"
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
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Recommencer
              </Button>

              <Button
                variant="hero"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
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
        <Card className="max-w-xl w-full p-6 bg-card/60 backdrop-blur-sm border-border/30">
           <div className="flex items-start gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-primary flex items-center justify-center flex-shrink-0">
               <Sparkles className="h-5 w-5 text-primary-foreground" />
             </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Notez votre phrase</h3>
              <p className="text-sm text-foreground-secondary">
                Facultatif mais recommandé pour la révélation finale !
              </p>
            </div>
          </div>
          
          <Textarea
            value={originalPhrase}
            onChange={(e) => setOriginalPhrase(e.target.value)}
            placeholder="Tapez ici la phrase exacte que vous avez prononcée..."
            className="min-h-[80px] bg-background/50 border-border/50 resize-none"
          />
        </Card>
      )}
    </div>
  );
});

AudioPhoneRecordingPhase.displayName = "AudioPhoneRecordingPhase";
