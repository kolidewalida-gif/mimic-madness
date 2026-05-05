import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Play, Pause, Home, RefreshCw, Trophy, Sparkles, MessageSquare, ArrowDown, Music, User, RotateCcw
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

interface Player { id: string; name: string; isHost: boolean; }

interface AudioPhoneResultsPhaseProps {
  recordings: RecordingWithUrls[];
  originalPhrase: string | null;
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
  onEndGame: () => void;
}

export const AudioPhoneResultsPhase = memo(({
  recordings, originalPhrase, players, isHost, onPlayAgain, onEndGame,
}: AudioPhoneResultsPhaseProps) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (revealedCount < recordings.length + 1) {
      timeoutRef.current = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
        playSoundEffect('pop', 0.3);
      }, 400);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [revealedCount, recordings.length]);

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const playRecording = useCallback((index: number, url: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setPlayingIndex(null);
      if (isPlayingAll && index < recordings.length - 1) {
        setTimeout(() => playRecording(index + 1, recordings[index + 1].originalUrl), 800);
      } else setIsPlayingAll(false);
    };
    audio.play();
    setPlayingIndex(index);
  }, [recordings, isPlayingAll]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setPlayingIndex(null);
    setIsPlayingAll(false);
  }, []);

  const playAllSequence = useCallback(() => {
    setIsPlayingAll(true);
    if (recordings.length > 0) playRecording(0, recordings[0].originalUrl);
  }, [recordings, playRecording]);

  const colors = [
    'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500',
    'from-cyan-500 to-blue-500', 'from-amber-500 to-orange-500',
    'from-pink-500 to-rose-500', 'from-indigo-500 to-blue-500',
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 overflow-auto relative">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-amber-500/20 to-primary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-accent/20 to-secondary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="text-center mb-8 pt-4 relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/30 mb-5">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">🎉 Révélation Finale</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-3 bg-gradient-to-r from-amber-400 via-orange-500 to-primary bg-clip-text text-transparent">
          Et voilà le résultat !
        </h1>
        <p className="text-foreground-secondary max-w-md mx-auto text-lg">
          Découvrez comment le message s'est transformé
        </p>
      </div>

      {/* Play all */}
      <div className="flex justify-center mb-8 relative z-10">
        <Button
          variant={isPlayingAll ? "destructive" : "hero"}
          size="lg"
          onClick={isPlayingAll ? stopPlayback : playAllSequence}
          className="h-14 px-8 text-lg"
        >
          {isPlayingAll ? <><Pause className="h-5 w-5 mr-2" />Arrêter</> : <><Music className="h-5 w-5 mr-2" />Écouter la chaîne</>}
        </Button>
      </div>

      {/* Chain */}
      <div className="max-w-2xl mx-auto space-y-4 mb-10 relative z-10">
        {originalPhrase && (
          <Card className={cn(
            "p-6 bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/40 transition-all duration-500",
            revealedCount >= 1 ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
          )}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Phrase originale</p>
                <p className="text-xl font-bold text-foreground">"{originalPhrase}"</p>
              </div>
            </div>
          </Card>
        )}

        {originalPhrase && (
          <div className={cn("flex justify-center transition-all duration-500", revealedCount >= 1 ? "opacity-100" : "opacity-0")}>
            <div className="flex flex-col items-center">
              <ArrowDown className="h-6 w-6 text-foreground-muted" />
              <RotateCcw className="h-4 w-4 text-violet-400 mt-1" />
            </div>
          </div>
        )}

        {recordings.map((rec, i) => {
          const isPlaying = playingIndex === i;
          const isRevealed = revealedCount >= i + 2;
          return (
            <div key={rec.id}>
              <Card className={cn(
                "p-5 transition-all duration-500",
                isPlaying ? "bg-gradient-to-br from-primary/20 to-accent/15 border-primary/50 scale-[1.02] shadow-lg" : "bg-card/60 backdrop-blur-md border-border/30",
                isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg", colors[i % colors.length])}>
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{rec.player_name}</p>
                    <p className="text-sm text-foreground-muted">{rec.duration_seconds.toFixed(1)}s</p>
                  </div>
                  <Button
                    variant={isPlaying ? "destructive" : "outline"}
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => isPlaying ? stopPlayback() : playRecording(i, rec.originalUrl)}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </Button>
                </div>
                {isPlaying && (
                  <div className="mt-4 flex items-center justify-center gap-1">
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-pulse" style={{ height: `${Math.sin(j * 0.6) * 12 + 16}px`, animationDelay: `${j * 40}ms` }} />
                    ))}
                  </div>
                )}
                {rec.transcribed_text && (
                  <div className="mt-4 p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-foreground-muted" />
                      <span className="text-xs font-semibold text-foreground-muted">Transcription</span>
                    </div>
                    <p className="text-foreground">"{rec.transcribed_text}"</p>
                  </div>
                )}
              </Card>
              {i < recordings.length - 1 && (
                <div className={cn("flex justify-center py-2 transition-all duration-500", isRevealed ? "opacity-100" : "opacity-0")}>
                  <div className="flex flex-col items-center">
                    <ArrowDown className="h-5 w-5 text-foreground-muted" />
                    <RotateCcw className="h-3 w-3 text-violet-400" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-4 relative z-10 pb-8">
        {isHost ? (
          <>
            <Button variant="hero" size="lg" onClick={onPlayAgain} className="h-14 px-8">
              <RefreshCw className="h-5 w-5 mr-2" />Nouvelle partie
            </Button>
            <Button variant="outline" size="lg" onClick={onEndGame} className="h-14 px-8">
              <Home className="h-5 w-5 mr-2" />Accueil
            </Button>
          </>
        ) : (
          <Card className="p-5 bg-card/60 backdrop-blur-md border-border/30">
            <p className="text-foreground-secondary">En attente de l'hôte...</p>
          </Card>
        )}
      </div>
    </div>
  );
});

AudioPhoneResultsPhase.displayName = "AudioPhoneResultsPhase";
