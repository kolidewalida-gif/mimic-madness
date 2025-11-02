import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

export const VolumeControl = () => {
  const { volume, setVolume } = useBackgroundMusic();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {volume === 0 ? (
          <VolumeX className="h-5 w-5 text-foreground-secondary" />
        ) : (
          <Volume2 className="h-5 w-5 text-foreground-secondary" />
        )}
        <span className="text-sm font-medium">Volume de la musique</span>
      </div>
      <Slider
        value={[volume * 100]}
        onValueChange={(value) => setVolume(value[0] / 100)}
        max={100}
        step={1}
        className="w-full"
      />
      <p className="text-xs text-foreground-secondary">
        Volume: {Math.round(volume * 100)}%
      </p>
    </div>
  );
};
