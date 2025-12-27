import { useState } from "react";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Music,
  ChevronUp,
  ChevronDown,
  Disc3
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const MusicPlayerBar = () => {
  const {
    isPlaying,
    play,
    pause,
    currentTrack,
    tracks,
    nextTrack,
    previousTrack,
    selectTrack,
    volume: musicVolume,
    setVolume: setMusicVolume,
    progress,
    duration,
    seek
  } = useBackgroundMusic();

  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Playlist Panel */}
      {showPlaylist && (
        <div className="bg-background/95 backdrop-blur-xl border-t border-glass-border animate-slideInUp">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-gradient flex items-center gap-2">
                <Music className="h-5 w-5" />
                Playlist
              </h3>
              <button 
                onClick={() => setShowPlaylist(false)}
                className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    selectTrack(track.id);
                    if (!isPlaying) play();
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    currentTrack?.id === track.id
                      ? "bg-gradient-to-r from-primary/30 to-secondary/20 border border-primary/50"
                      : "bg-background-secondary/40 hover:bg-background-secondary/60 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    currentTrack?.id === track.id
                      ? "bg-primary/30"
                      : "bg-background-secondary"
                  )}>
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Disc3 className="h-5 w-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                    ) : (
                      <Music className="h-5 w-5 text-foreground-muted" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-semibold",
                      currentTrack?.id === track.id ? "text-primary" : "text-foreground"
                    )}>
                      {track.name}
                    </p>
                    <p className="text-xs text-foreground-muted">Piste {track.id}</p>
                  </div>
                  {currentTrack?.id === track.id && (
                    <div className="flex gap-1">
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className={cn(
        "bg-background/95 backdrop-blur-xl border-t border-glass-border transition-all duration-300",
        isExpanded ? "pb-4" : ""
      )}>
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar (clickable) */}
          <div 
            className="h-1 bg-background-secondary cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              seek(percentage * duration);
            }}
          >
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all group-hover:h-2"
              style={{ width: `${(progress / duration) * 100 || 0}%` }}
            />
          </div>

          <div className="p-3">
            {/* Compact View */}
            <div className="flex items-center gap-4">
              {/* Track Info */}
              <button 
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="flex items-center gap-3 flex-1 min-w-0 group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center flex-shrink-0",
                  isPlaying && "animate-pulse"
                )}>
                  <Disc3 className={cn(
                    "h-5 w-5 text-primary",
                    isPlaying && "animate-spin"
                  )} style={{ animationDuration: '3s' }} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {currentTrack?.name || "Aucune piste"}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {formatTime(progress)} / {formatTime(duration)}
                  </p>
                </div>
                <ChevronUp className={cn(
                  "h-4 w-4 text-foreground-muted transition-transform",
                  showPlaylist && "rotate-180"
                )} />
              </button>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={previousTrack}
                  className="p-2 hover:bg-background-secondary rounded-full transition-colors"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={isPlaying ? pause : play}
                  className="p-3 bg-primary hover:bg-primary/80 rounded-full transition-colors shadow-neon"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                  )}
                </button>
                
                <button 
                  onClick={nextTrack}
                  className="p-2 hover:bg-background-secondary rounded-full transition-colors"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Volume Toggle (expand) */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-background-secondary rounded-full transition-colors hidden sm:flex"
              >
                {musicVolume === 0 ? (
                  <VolumeX className="h-5 w-5 text-foreground-muted" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Expanded Volume Controls */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-glass-border animate-slideInUp grid gap-4 sm:grid-cols-2">
                {/* Music Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      Musique
                    </label>
                    <span className="text-xs text-foreground-muted">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[musicVolume * 100]}
                    onValueChange={(value) => setMusicVolume(value[0] / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* SFX Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-secondary" />
                      Effets sonores
                    </label>
                    <span className="text-xs text-foreground-muted">{Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[sfxVolume * 100]}
                    onValueChange={(value) => setSfxVolume(value[0] / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};