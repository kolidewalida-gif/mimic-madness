import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mic, MicOff, Check, Play, Pause, Volume2, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const AudioPhoneImitationPhase = ({
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
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
      // Reset recorded blob before starting new recording
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

      // Drift-free timer using performance.now() + rAF (smooth + survives bg tabs)
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
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Reset state when phrase changes
  useEffect(() => {
    setHasListened(false);
    setRecordedBlob(null);
    setIsRecording(false);
    setIsPlaying(false);
  }, [currentPhraseIndex]);

  // This player is the author - just wait for others
  if (isAuthor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-amber-950/80 to-orange-950/80 border-amber-500/30 backdrop-blur-xl">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-amber-400 mb-2">
                C'est ta phrase !
              </h2>
              <p className="text-muted-foreground">
                Les autres joueurs essaient de l'imiter...
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              Phrase {currentPhraseIndex + 1} / {totalPhrases}
            </div>

            {allImitationsDone && isHost && (
              <Button
                onClick={onNextPhrase}
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Phrase suivante
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Already imitated - waiting
  if (hasImitated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-500/30 backdrop-blur-xl">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                Imitation envoyée !
              </h2>
              <p className="text-muted-foreground">
                En attente des autres joueurs...
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              Phrase de {authorName} • {currentPhraseIndex + 1} / {totalPhrases}
            </div>

            {allImitationsDone && isHost && (
              <Button
                onClick={onNextPhrase}
                size="lg"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Phrase suivante
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-500/30 backdrop-blur-xl">
        <div className="text-center space-y-6">
          {/* Hidden audio element */}
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
            <div className="text-sm text-cyan-400 mb-2 font-medium">
              Phrase {currentPhraseIndex + 1} / {totalPhrases}
            </div>
            <h2 className="text-2xl font-bold text-cyan-300 mb-2">
              Phrase de {authorName}
            </h2>
            <p className="text-muted-foreground">
              Écoute l'audio inversé puis imite-le !
            </p>
          </div>

          {/* Listen section */}
          <div className="space-y-4">
            <Button
              onClick={isPlaying ? pauseAudio : playReversedAudio}
              disabled={!reversedAudioUrl}
              size="lg"
              className={cn(
                "w-full",
                isPlaying 
                  ? "bg-cyan-500 hover:bg-cyan-600" 
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Écouter l'audio inversé
                </>
              )}
            </Button>

            {hasListened && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                <Check className="w-4 h-4" />
                Audio écouté
              </div>
            )}
          </div>

          {/* Recording section */}
          {hasListened && !recordedBlob && (
            <div className="space-y-4 pt-4 border-t border-cyan-500/20">
              <p className="text-sm text-muted-foreground">
                Maintenant, enregistre ton imitation (parle à l'envers !)
              </p>
              
              <div className="relative flex justify-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  )}
                  style={{
                    boxShadow: isRecording 
                      ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px rgba(239, 68, 68, 0.4)`
                      : '0 0 30px rgba(6, 182, 212, 0.3)'
                  }}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </button>
              </div>

              {isRecording && (
                <div className="text-2xl font-mono font-bold text-red-400">
                  {recordingTime.toFixed(1)}s / {maxSeconds}s
                </div>
              )}
            </div>
          )}

          {/* Submit recorded audio */}
          {recordedBlob && (
            <div className="space-y-4 pt-4 border-t border-cyan-500/20">
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
                  Envoyer
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
