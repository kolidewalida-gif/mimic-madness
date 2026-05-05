import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

export const VolumeControl = () => {
  const { volume, setVolume } = useBackgroundMusic();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {volume === 0 ? (
          <VolumeX className="h-4 w-4 text-foreground-muted" />
        ) : (
          <Volume2 className="h-4 w-4 text-foreground-muted" />
        )}
        <span className="text-sm text-foreground-secondary">Volume musique</span>
        <span className="text-xs text-foreground-muted ml-auto">{Math.round(volume * 100)}%</span>
      </div>
      <Slider
        value={[volume * 100]}
        onValueChange={(value) => setVolume(value[0] / 100)}
        max={100}
        step={1}
        className="w-full"
      />
    </div>
  );
};
