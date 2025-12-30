import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Headphones, 
  Play, 
  Pause,
  RotateCcw,
  ArrowRight,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";

interface AudioPhoneListeningPhaseProps {
  audioUrl: string | null;
  playerName: string;
  previousPlayerName: string;
  playCount: number;
  maxPlays: number;
  onConfirmListened: () => void;
  isLoading: boolean;
}

export const AudioPhoneListeningPhase = memo(({
  audioUrl,
  playerName,
  previousPlayerName,
  playCount: initialPlayCount = 0,
  maxPlays = 3,
  onConfirmListened,
  isLoading,
}: AudioPhoneListeningPhaseProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(initialPlayCount);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasListened, setHasListened] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Setup audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setHasListened(true);
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  // Play audio
  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    if (playCount >= maxPlays) {
      playSoundEffect('error', 0.3);
      return;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
    setPlayCount(prev => prev + 1);
    playSoundEffect('whoosh', 0.2);
  }, [playCount, maxPlays]);

  // Pause audio
  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingPlays = maxPlays - playCount;
  const canPlay = remainingPlays > 0;

  if (isLoading || !audioUrl) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full p-8 bg-card/60 backdrop-blur-sm border-border/30">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Headphones className="h-8 w-8 text-primary" />
            </div>
            <p className="text-foreground-secondary">Chargement de l'audio...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/15 to-primary/10 border border-accent/30 mb-4">
           <Headphones className="h-4 w-4 text-accent" />
           <span className="text-sm font-medium text-accent">Phase d'écoute</span>
         </div>
        
        <h1 className="text-3xl md:text-4xl font-black mb-2 text-foreground">
          Écoutez attentivement, <span className="text-primary">{playerName}</span> !
        </h1>
        
        <p className="text-foreground-secondary max-w-md mx-auto">
          L'audio de <span className="font-semibold text-foreground">{previousPlayerName}</span> a été inversé.
          Essayez de deviner ce qu'il a dit !
        </p>
      </div>

      {/* Audio Player Card */}
      <Card className="max-w-xl w-full p-6 md:p-8 bg-card/60 backdrop-blur-sm border-border/30 mb-6">
        {/* Warning banner */}
         <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 mb-6">
           <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
           <p className="text-sm text-foreground-secondary">
             <strong className="text-warning">Attention :</strong> L'audio est inversé ! Ce que vous entendez est lu à l'envers.
           </p>
         </div>

        {/* Player visualization */}
        <div className="relative h-40 bg-background/50 rounded-2xl border border-border/50 mb-6 overflow-hidden">
          {/* Animated background */}
           <div className={cn(
             "absolute inset-0 bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10",
             isPlaying && "animate-pulse"
           )} />

           {/* Waveform */}
           <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-6">
             {Array.from({ length: 60 }).map((_, i) => (
               <div
                 key={i}
                 className={cn(
                   "w-1 rounded-full transition-all",
                   isPlaying
                     ? "bg-gradient-to-t from-primary to-accent"
                     : "bg-foreground-muted/30"
                 )}
                 style={{
                   height: isPlaying
                     ? `${Math.sin(i * 0.3 + currentTime * 10) * 30 + 40}%`
                     : "20%",
                   animationDelay: `${i * 20}ms`,
                 }}
               />
             ))}
           </div>

          {/* Center play button overlay */}
          {!isPlaying && canPlay && (
            <button
              onClick={playAudio}
              className="absolute inset-0 flex items-center justify-center group"
            >
               <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                 <Play className="h-10 w-10 text-primary-foreground ml-1" />
               </div>
            </button>
          )}

          {/* Reversed indicator */}
           <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50">
             <RotateCcw className="h-3.5 w-3.5 text-primary" />
             <span className="text-xs font-medium text-primary">Audio inversé</span>
           </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div 
            ref={progressRef}
            className="h-2 bg-background/50 rounded-full overflow-hidden"
          >
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-foreground-muted font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className="h-10 w-10"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {isPlaying ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pauseAudio}
              >
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                variant={canPlay ? "default" : "outline"}
                size="lg"
                onClick={playAudio}
                disabled={!canPlay}
              >
                <Play className="h-5 w-5 mr-2" />
                {canPlay ? "Rejouer" : "Plus d'écoutes"}
              </Button>
            )}
          </div>

          {/* Plays remaining */}
          <div className="flex items-center gap-2">
             <div className={cn(
               "px-3 py-1.5 rounded-full text-sm font-medium",
               remainingPlays > 1 
                 ? "bg-success/15 text-success"
                 : remainingPlays === 1
                 ? "bg-warning/15 text-warning"
                 : "bg-destructive/15 text-destructive"
             )}>
              {remainingPlays} écoute{remainingPlays !== 1 ? 's' : ''} restante{remainingPlays !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </Card>

      {/* Confirm and record */}
      <Card className="max-w-xl w-full p-6 bg-card/60 backdrop-blur-sm border-border/30">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-1">Prêt à enregistrer ?</h3>
            <p className="text-sm text-foreground-secondary">
              Une fois que vous avez bien écouté l'audio inversé, 
              enregistrez votre interprétation de ce que vous avez entendu !
            </p>
          </div>
        </div>

        <Button
          variant="hero"
          size="lg"
          onClick={onConfirmListened}
          disabled={!hasListened && playCount === 0}
          className="w-full"
        >
          <ArrowRight className="h-5 w-5 mr-2" />
          J'ai compris, je passe à l'enregistrement !
        </Button>

        {!hasListened && playCount === 0 && (
          <p className="text-center text-sm text-foreground-muted mt-3">
            Vous devez écouter au moins une fois avant de continuer
          </p>
        )}
      </Card>
    </div>
  );
});

AudioPhoneListeningPhase.displayName = "AudioPhoneListeningPhase";
