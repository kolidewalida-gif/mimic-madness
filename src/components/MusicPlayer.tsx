import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, Music, Volume2 } from "lucide-react";

export const MusicPlayer = () => {
  const { 
    isPlaying, 
    play, 
    pause, 
    skip, 
    currentTrackIndex, 
    trackNames,
    volume,
    setVolume 
  } = useBackgroundMusic();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background-secondary/90 backdrop-blur-xl border-t border-primary/20">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center shrink-0">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {trackNames[currentTrackIndex]}
                </p>
                <p className="text-xs text-foreground-secondary">
                  Piste {currentTrackIndex + 1} / {trackNames.length}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={isPlaying ? pause : play}
                className="h-10 w-10 rounded-full bg-primary/20 hover:bg-primary/30 text-primary"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={skip}
                className="h-9 w-9 rounded-full hover:bg-primary/20 text-foreground-secondary hover:text-primary"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 w-32">
              <Volume2 className="h-4 w-4 text-foreground-secondary shrink-0" />
              <Slider
                value={[volume * 100]}
                onValueChange={(value) => setVolume(value[0] / 100)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
