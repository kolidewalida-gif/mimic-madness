import { useState, memo, useCallback } from "react";
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
  Disc3,
  Sparkles
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const TrackItem = memo(({ 
  track, 
  isCurrentTrack, 
  isPlaying, 
  onSelect 
}: { 
  track: { id: number; name: string }; 
  isCurrentTrack: boolean; 
  isPlaying: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={cn(
      "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
      isCurrentTrack
        ? "bg-gradient-to-r from-primary/30 to-secondary/20 border border-primary/50"
        : "bg-background-secondary/40 hover:bg-background-secondary/60 border border-transparent"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center",
      isCurrentTrack ? "bg-primary/30" : "bg-background-secondary"
    )}>
      {isCurrentTrack && isPlaying ? (
        <Disc3 className="h-5 w-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
      ) : (
        <Music className="h-5 w-5 text-foreground-muted" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn(
        "font-semibold truncate",
        isCurrentTrack ? "text-primary" : "text-foreground"
      )}>
        {track.name}
      </p>
      <p className="text-xs text-foreground-muted">Piste {track.id}</p>
    </div>
    {isCurrentTrack && (
      <div className="flex gap-1">
        <span className="w-1 h-4 bg-primary rounded-full animate-pulse" />
        <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    )}
  </button>
));

TrackItem.displayName = 'TrackItem';

const MusicPlayerBarComponent = () => {
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
    seek,
    autoMode,
    setAutoMode,
    situation,
  } = useBackgroundMusic();

  const { volume: sfxVolume, setVolume: setSfxVolume } = useSoundEffectsVolume();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  }, [seek, duration]);

  const handleTrackSelect = useCallback((trackId: number) => {
    selectTrack(trackId);
    if (!isPlaying) play();
  }, [selectTrack, isPlaying, play]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

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
                <TrackItem
                  key={track.id}
                  track={track}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onSelect={() => handleTrackSelect(track.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className={cn(
        "bg-[#0a0810]/95 backdrop-blur-xl border-t-2 border-white/15 transition-all duration-300",
        isExpanded ? "pb-4" : ""
      )}>
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar - cartoon */}
          <div 
            className="h-1.5 bg-white/8 cursor-pointer group relative"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full transition-all group-hover:h-2.5 rounded-r-full"
              style={{
                width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #f87171, #fbbf24, #34d399, #38bdf8, #c084fc)',
                boxShadow: '0 0 8px rgba(248, 113, 113, 0.5)',
              }}
            />
          </div>

          <div className="p-3">
            <div className="flex items-center gap-4">
              {/* Track Info */}
              <button 
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="flex items-center gap-3 flex-1 min-w-0 group"
              >
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 transition-all",
                  isPlaying 
                    ? "border-amber-300 bg-amber-300/20" 
                    : "border-white/20 bg-white/5 group-hover:border-white/40"
                )}
                style={isPlaying ? { boxShadow: '0 0 14px rgba(251, 191, 36, 0.5)' } : undefined}
                >
                  <Disc3 className={cn(
                    "h-5 w-5",
                    isPlaying ? "text-amber-300 animate-spin" : "text-white/50"
                  )} style={{ animationDuration: '3s' }} />
                </div>
                <div className="min-w-0 text-left">
                  <p 
                    className="font-black text-base truncate text-white group-hover:text-amber-300 transition-colors"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {currentTrack?.name || "Aucune piste"}
                  </p>
                  <p className="text-[10px] text-white/40 font-mono">
                    {formatTime(progress)} / {formatTime(duration)}
                  </p>
                </div>
                <ChevronUp className={cn(
                  "h-4 w-4 text-white/40 transition-transform",
                  showPlaylist && "rotate-180"
                )} />
              </button>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoMode(!autoMode)}
                  title={autoMode ? `Auto ON · ${situation}` : "Auto OFF"}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1 transition-all border-2",
                    autoMode
                      ? "bg-amber-300/20 text-amber-300 border-amber-300/60"
                      : "bg-white/5 text-white/50 border-white/15 hover:text-white/80 hover:border-white/30"
                  )}
                  style={
                    autoMode 
                      ? { boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)', fontFamily: "'Caveat', cursive" }
                      : { fontFamily: "'Caveat', cursive" }
                  }
                >
                  <Sparkles className="h-3 w-3" />
                  AUTO
                </button>
                <button 
                  onClick={previousTrack}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f87171, #ef4444)',
                    borderColor: '#f87171',
                    boxShadow: '0 4px 16px rgba(248, 113, 113, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 text-white" fill="white" />
                  ) : (
                    <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                  )}
                </button>
                
                <button 
                  onClick={nextTrack}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Volume Toggle */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:flex w-9 h-9 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 items-center justify-center text-white/70 hover:text-white transition-all"
              >
                {musicVolume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Expanded Volume Controls */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-white/10 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
                      <Music className="h-4 w-4 text-amber-300" />
                      Musique
                    </label>
                    <span className="text-xs text-white/40 font-mono">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[musicVolume * 100]}
                    onValueChange={(value) => setMusicVolume(value[0] / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
                      <Volume2 className="h-4 w-4 text-cyan-300" />
                      Effets sonores
                    </label>
                    <span className="text-xs text-white/40 font-mono">{Math.round(sfxVolume * 100)}%</span>
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

export const MusicPlayerBar = memo(MusicPlayerBarComponent);
