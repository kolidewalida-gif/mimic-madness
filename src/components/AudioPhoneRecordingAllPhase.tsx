import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Mic, MicOff, Check, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPhoneRecordingAllPhaseProps {
  maxSeconds: number;
  playerName: string;
  hasSubmitted: boolean;
  allSubmitted: boolean;
  playersCount: number;
  submittedCount: number;
  submittedPlayerIds: string[];
  pendingPlayerNames: string[];
  playerNames: string[];
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
  pendingPlayerNames,
  playerNames,
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
        mimeType: selectedMimeType || undefined,
      });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);

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
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!recordedBlob) return;
    const success = await onSubmit(recordedBlob);
    if (success) {
      setRecordedBlob(null);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const renderRoster = () => (
    <div className="grid gap-2 text-left">
      {playerNames.map((name, index) => {
        const isPending = pendingPlayerNames.includes(name);
        return (
          <div key={`${name}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span className="text-foreground">{name}</span>
            <span className={cn('font-semibold', isPending ? 'text-amber-300' : 'text-emerald-300')}>
              {isPending ? 'En attente' : 'Pret'}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-500/30 backdrop-blur-xl">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                Phrase enregistree
              </h2>
              <p className="text-muted-foreground">
                La manche attend maintenant les derniers micros.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 text-lg">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-foreground font-medium">
                {submittedCount} / {playersCount} joueurs
              </span>
            </div>

            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${(submittedCount / playersCount) * 100}%` }}
              />
            </div>

            {renderRoster()}

            {pendingPlayerNames.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Manque encore : <span className="text-foreground">{pendingPlayerNames.join(', ')}</span>
              </p>
            )}

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
      <Card className="w-full max-w-xl p-8 bg-gradient-to-br from-violet-950/80 to-purple-950/80 border-violet-500/30 backdrop-blur-xl">
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-violet-300 mb-2">
              {playerName}, enregistre ta phrase
            </h2>
            <p className="text-muted-foreground">
              Dis une phrase originale (max {maxSeconds} secondes)
            </p>
            <p className="mt-2 text-sm text-violet-200/80">
              Les meilleures phrases sont courtes, rythmiques et faciles a rejouer a l envers.
            </p>
          </div>

          <div className="relative">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting}
              className={cn(
                'w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300',
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
              )}
              style={{
                boxShadow: isRecording
                  ? `0 0 ${40 + audioLevel * 60}px ${audioLevel * 30}px rgba(239, 68, 68, 0.4)`
                  : '0 0 30px rgba(139, 92, 246, 0.3)',
              }}
            >
              {isRecording ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>

            {isRecording && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="absolute inset-0 rounded-full border-2 border-red-400/50"
                    style={{
                      transform: `scale(${1 + audioLevel * (index + 1) * 0.3})`,
                      opacity: 1 - audioLevel * 0.3 * index,
                      transition: 'transform 0.1s, opacity 0.1s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {isRecording && (
            <div className="text-3xl font-mono font-bold text-red-400">
              {recordingTime.toFixed(1)}s / {maxSeconds}s
            </div>
          )}

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
                  Reenregistrer
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

          <div className="pt-4 border-t border-violet-500/20 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{submittedCount} / {playersCount} phrases enregistrees</span>
            </div>
            {renderRoster()}
          </div>
        </div>
      </Card>
    </div>
  );
};
