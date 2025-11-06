import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Scissors, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoTrimEditorProps {
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export const VideoTrimEditor = ({ duration, start, end, onChange, videoRef }: VideoTrimEditorProps) => {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const safeStart = Math.max(0, Math.min(start, safeDuration));
  const safeEnd = Math.max(safeStart, Math.min(end, safeDuration));

  const handlePreviewTrim = () => {
    if (videoRef?.current) {
      videoRef.current.currentTime = safeStart;
      videoRef.current.play();
    }
  };

  return (
    <Card className="p-4 bg-background-secondary/50 border-glass-border space-y-3">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium">Découper la vidéo</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviewTrim}
          className="h-7 px-2"
        >
          <Play className="h-3 w-3 mr-1" />
          Tester
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-foreground-secondary">
        <span>Début: {formatTime(safeStart)}</span>
        <span className="font-semibold text-secondary">Durée: {formatTime(Math.max(0, safeEnd - safeStart))}</span>
        <span>Fin: {formatTime(safeEnd)}</span>
      </div>

      <div className="px-1">
        <Slider
          value={[safeStart, safeEnd]}
          min={0}
          max={safeDuration}
          step={0.1}
          minStepsBetweenThumbs={1}
          onValueChange={(v) => {
            const [s, e] = v as number[];
            onChange(
              Math.max(0, Math.min(s, safeDuration)),
              Math.max(s, Math.min(e, safeDuration))
            );
          }}
        />
      </div>

      <p className="text-xs text-foreground-secondary text-center">
        💡 Glissez les poignées pour définir le début et la fin de votre extrait
      </p>
    </Card>
  );
};
