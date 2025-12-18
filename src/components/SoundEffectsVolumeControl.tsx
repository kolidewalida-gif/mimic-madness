import { Volume2, VolumeX, Bell } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useSoundEffectsVolume } from "@/hooks/useSoundEffectsVolume";
import { playSoundEffect } from "@/hooks/useSoundEffects";

export const SoundEffectsVolumeControl = () => {
  const { volume, setVolume } = useSoundEffectsVolume();

  const handleValueChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const handleValueCommit = () => {
    // Play a test sound when user finishes adjusting
    playSoundEffect('click', volume);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {volume === 0 ? (
          <VolumeX className="h-4 w-4 text-foreground-muted" />
        ) : (
          <Bell className="h-4 w-4 text-foreground-muted" />
        )}
        <span className="text-sm text-foreground-secondary">Effets sonores</span>
        <span className="text-xs text-foreground-muted ml-auto">{Math.round(volume * 100)}%</span>
      </div>
      <Slider
        value={[volume * 100]}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        max={100}
        step={1}
        className="w-full"
      />
    </div>
  );
};
