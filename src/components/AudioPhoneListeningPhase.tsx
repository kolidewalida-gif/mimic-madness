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
  Sparkles,
  Radio,
  Waves,
  Mic
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
  const [showReady, setShowReady] = useState(false);
  const [visualizerBars, setVisualizerBars] = useState<number[]>(Array(30).fill(20));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setShowReady(true);
  }, []);

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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setVisualizerBars(Array(30).fill(20));
    };

    return () => {
      audio.pause();
      audio.src = '';
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  // Animate visualizer when playing
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setVisualizerBars(prev => 
          prev.map(() => Math.random() * 80 + 20)
        );
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying]);

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
        <Card className="max-w-md w-full p-10 bg-card/60 backdrop-blur-md border-border/30">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                <Headphones className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/20 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground mb-1">Chargement de l'audio...</p>
              <p className="text-sm text-foreground-muted">Veuillez patienter</p>
            </div>
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
          "absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-500",
          isPlaying 
            ? "bg-gradient-to-br from-[var(--ink-surface-2)]/40 to-blue-500/30 scale-110" 
            : "bg-gradient-to-br from-accent/20 to-primary/15"
        )} />
        <div className={cn(
          "absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl transition-all duration-500 delay-75",
          isPlaying 
            ? "bg-gradient-to-br from-[var(--ink-accent)]/40 to-[var(--ink-accent-strong)]/30 scale-110" 
            : "bg-gradient-to-br from-secondary/20 to-accent/15"
        )} />
      </div>

      {/* Header */}
      <div className={cn(
        "text-center mb-8 relative z-10 transition-all duration-700",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--ink-surface-2)]/15 to-blue-500/10 border border-[var(--ink-line)]/30 mb-5 backdrop-blur-sm">
          <Headphones className="h-4 w-4 text-[var(--ink-text-dim)]" />
          <span className="text-sm font-semibold text-[var(--ink-text-dim)]">Phase d'écoute</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground">
          Écoutez attentivement, <span className="bg-gradient-to-r from-[var(--ink-surface-2)] to-blue-500 bg-clip-text text-transparent">{playerName}</span> !
        </h1>
        
        <p className="text-foreground-secondary max-w-lg mx-auto text-lg">
          L'audio de <span className="font-semibold text-foreground">{previousPlayerName}</span> a été inversé.
          <span className="text-[var(--ink-text-dim)] font-medium"> Essayez de deviner ce qu'il a dit !</span>
        </p>
      </div>

      {/* Audio Player Card */}
      <Card className={cn(
        "max-w-xl w-full p-6 md:p-8 relative z-10 overflow-hidden transition-all duration-500 mb-6",
        "bg-card/60 backdrop-blur-md",
        isPlaying 
          ? "border-[var(--ink-line)]/50 shadow-lg shadow-cyan-500/20" 
          : "border-border/30"
      )}>
        {/* Playing glow effect */}
        {isPlaying && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ink-surface-2)]/10 to-blue-500/10 animate-pulse" />
        )}

        {/* Warning banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-amber-400 mb-0.5">⚠️ Audio inversé</p>
            <p className="text-sm text-foreground-secondary">
              Ce que vous entendez est lu à l'envers !
            </p>
          </div>
        </div>

        {/* Visualizer */}
        <div className={cn(
          "relative h-44 rounded-2xl border overflow-hidden mb-6 transition-all duration-300",
          isPlaying 
            ? "bg-gradient-to-br from-[var(--ink-surface-2)]/10 via-background/50 to-blue-500/10 border-[var(--ink-line)]/30" 
            : "bg-background/50 border-border/50"
        )}>
          {/* Waveform */}
          <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-8">
            {visualizerBars.map((height, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 rounded-full transition-all",
                  isPlaying
                    ? "bg-gradient-to-t from-[var(--ink-surface-2)] via-blue-500 to-[var(--ink-accent-strong)]"
                    : "bg-foreground-muted/30"
                )}
                style={{
                  height: `${height}%`,
                  transitionDuration: isPlaying ? '50ms' : '300ms',
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
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--ink-surface-2)] to-blue-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <Play className="h-12 w-12 text-white ml-1" />
                </div>
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-[var(--ink-surface-3)]/30 animate-ping" />
              </div>
            </button>
          )}

          {/* Reversed indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-[var(--ink-accent)]/20 to-[var(--ink-accent-strong)]/20 border border-[var(--ink-accent-line)]/30 backdrop-blur-sm">
            <RotateCcw className="h-4 w-4 text-[var(--ink-accent-text)] animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs font-semibold text-[var(--ink-accent-text)]">Inversé</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5 relative z-10">
          <div className="h-2 bg-background/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--ink-surface-2)] via-blue-500 to-[var(--ink-accent-strong)] transition-all duration-100 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-foreground-muted font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Mute button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="h-12 w-12"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>

          {/* Play/Pause */}
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pauseAudio}
                className="h-12 px-6"
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
                className={cn(
                  "h-12 px-6",
                  canPlay && "bg-gradient-to-r from-[var(--ink-surface-2)] to-blue-600 hover:from-[var(--ink-surface-2)] hover:to-blue-700"
                )}
              >
                <Play className="h-5 w-5 mr-2" />
                {canPlay ? "Écouter" : "Plus d'écoutes"}
              </Button>
            )}
          </div>

          {/* Plays remaining */}
          <div className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold border",
            remainingPlays > 1 
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : remainingPlays === 1
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-destructive/15 text-destructive border-destructive/30"
          )}>
            {remainingPlays} / {maxPlays}
          </div>
        </div>
      </Card>

      {/* Confirm and record */}
      <Card className={cn(
        "max-w-xl w-full p-6 relative z-10 overflow-hidden transition-all duration-700 delay-200",
        "bg-card/60 backdrop-blur-md border-border/30",
        showReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="flex items-start gap-4 mb-5">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Mic className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-1">🎤 Prêt à enregistrer ?</h3>
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
          className="w-full h-14 text-lg"
        >
          <ArrowRight className="h-5 w-5 mr-2" />
          J'ai compris, je passe à l'enregistrement !
        </Button>

        {!hasListened && playCount === 0 && (
          <p className="text-center text-sm text-foreground-muted mt-4">
            Vous devez écouter au moins une fois avant de continuer
          </p>
        )}
      </Card>
    </div>
  );
});

AudioPhoneListeningPhase.displayName = "AudioPhoneListeningPhase";
