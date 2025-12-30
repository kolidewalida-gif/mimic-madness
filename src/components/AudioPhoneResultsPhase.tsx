import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  Pause,
  RotateCcw,
  Home,
  RefreshCw,
  Trophy,
  Sparkles,
  Volume2,
  MessageSquare,
  ArrowDown,
  Music,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

interface RecordingWithUrls {
  id: string;
  player_id: string;
  player_name: string;
  player_order_index: number;
  originalUrl: string;
  reversedUrl: string | null;
  transcribed_text: string | null;
  duration_seconds: number;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneResultsPhaseProps {
  recordings: RecordingWithUrls[];
  originalPhrase: string | null;
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
  onEndGame: () => void;
}

export const AudioPhoneResultsPhase = memo(({
  recordings,
  originalPhrase,
  players,
  isHost,
  onPlayAgain,
  onEndGame,
}: AudioPhoneResultsPhaseProps) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reveal animations
  useEffect(() => {
    if (revealedCount < recordings.length + 1) {
      timeoutRef.current = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
        playSoundEffect('pop', 0.3);
      }, 500);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [revealedCount, recordings.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Play single recording
  const playRecording = useCallback((index: number, url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingIndex(null);
      if (isPlayingAll && index < recordings.length - 1) {
        // Play next in sequence
        setTimeout(() => {
          playRecording(index + 1, recordings[index + 1].originalUrl);
        }, 1000);
      } else {
        setIsPlayingAll(false);
      }
    };

    audio.play();
    setPlayingIndex(index);
  }, [recordings, isPlayingAll]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingIndex(null);
    setIsPlayingAll(false);
  }, []);

  // Play all in sequence
  const playAllSequence = useCallback(() => {
    setIsPlayingAll(true);
    if (recordings.length > 0) {
      playRecording(0, recordings[0].originalUrl);
    }
  }, [recordings, playRecording]);

  // Get player color
  const getPlayerColor = (index: number) => {
    const colors = [
      'from-emerald-500 to-teal-500',
      'from-blue-500 to-cyan-500',
      'from-violet-500 to-purple-500',
      'from-orange-500 to-amber-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">Révélation finale</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
          Et voilà le résultat !
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto">
          Découvrez comment le message s'est transformé au fil des interprétations
        </p>
      </div>

      {/* Play all button */}
      <div className="flex justify-center mb-8">
        {isPlayingAll ? (
          <Button
            variant="destructive"
            size="lg"
            onClick={stopPlayback}
            className="gap-2"
          >
            <Pause className="h-5 w-5" />
            Arrêter la lecture
          </Button>
        ) : (
          <Button
            variant="hero"
            size="lg"
            onClick={playAllSequence}
            className="gap-2"
          >
            <Music className="h-5 w-5" />
            Écouter toute la chaîne
          </Button>
        )}
      </div>

      {/* Chain visualization */}
      <div className="max-w-3xl mx-auto space-y-4 mb-8">
        {/* Original phrase */}
        {originalPhrase && (
          <Card 
            className={cn(
              "p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 transition-all duration-500",
              revealedCount >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  Phrase originale
                </p>
                <p className="text-xl font-bold text-foreground">
                  "{originalPhrase}"
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Arrow */}
        {originalPhrase && (
          <div className={cn(
            "flex justify-center transition-all duration-500",
            revealedCount >= 1 ? "opacity-100" : "opacity-0"
          )}>
            <ArrowDown className="h-6 w-6 text-foreground-muted" />
          </div>
        )}

        {/* Recordings chain */}
        {recordings.map((recording, index) => {
          const isPlaying = playingIndex === index;
          const isRevealed = revealedCount >= index + 2;
          const isFirstPlayer = index === 0;
          const isLastPlayer = index === recordings.length - 1;

          return (
            <div key={recording.id}>
              <Card 
                className={cn(
                  "p-6 transition-all duration-500 overflow-hidden",
                  isPlaying 
                    ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/50 scale-[1.02]"
                    : "bg-card/60 backdrop-blur-sm border-border/30",
                  isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Player avatar */}
                  <div className="relative">
                    <div className={cn(
                      "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center",
                      getPlayerColor(index)
                    )}>
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground truncate">
                        {recording.player_name}
                      </p>
                      {isFirstPlayer && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                          Premier
                        </span>
                      )}
                      {isLastPlayer && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          Dernier
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted">
                      Durée: {recording.duration_seconds.toFixed(1)}s
                    </p>
                  </div>

                  {/* Play button */}
                  <Button
                    variant={isPlaying ? "destructive" : "outline"}
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => {
                      if (isPlaying) {
                        stopPlayback();
                      } else {
                        playRecording(index, recording.originalUrl);
                      }
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                </div>

                {/* Audio visualization when playing */}
                {isPlaying && (
                  <div className="mt-4 flex items-center justify-center gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-primary to-secondary rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 30 + 10}px`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Transcribed text if available */}
                {recording.transcribed_text && (
                  <div className="mt-4 p-3 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-foreground-muted" />
                      <span className="text-xs font-medium text-foreground-muted">Transcription</span>
                    </div>
                    <p className="text-sm text-foreground">"{recording.transcribed_text}"</p>
                  </div>
                )}
              </Card>

              {/* Arrow between recordings */}
              {index < recordings.length - 1 && (
                <div className={cn(
                  "flex justify-center py-2 transition-all duration-500",
                  isRevealed ? "opacity-100" : "opacity-0"
                )}>
                  <div className="flex flex-col items-center gap-1">
                    <ArrowDown className="h-5 w-5 text-foreground-muted" />
                    <span className="text-xs text-foreground-muted">inversé</span>
                    <RotateCcw className="h-3 w-3 text-purple-400" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {isHost && (
          <>
            <Button
              variant="hero"
              size="lg"
              onClick={onPlayAgain}
              className="gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Nouvelle partie
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onEndGame}
              className="gap-2"
            >
              <Home className="h-5 w-5" />
              Retour à l'accueil
            </Button>
          </>
        )}
        
        {!isHost && (
          <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/30">
            <p className="text-foreground-secondary text-center">
              En attente de l'hôte...
            </p>
          </Card>
        )}
      </div>
    </div>
  );
});

AudioPhoneResultsPhase.displayName = "AudioPhoneResultsPhase";
