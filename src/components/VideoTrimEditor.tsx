import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface VideoTrimEditorProps {
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export const VideoTrimEditor = ({ duration, start, end, onChange }: VideoTrimEditorProps) => {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const safeStart = Math.max(0, Math.min(start, safeDuration));
  const safeEnd = Math.max(safeStart, Math.min(end, safeDuration));

  return (
    <Card className="p-4 bg-background-secondary/50 border-glass-border">
      <div className="flex items-center justify-between text-xs text-foreground-secondary mb-2">
        <span>Début: {formatTime(safeStart)}</span>
        <span>Fin: {formatTime(safeEnd)}</span>
        <span>Durée: {formatTime(Math.max(0, safeEnd - safeStart))}</span>
      </div>
      <Slider
        value={[safeStart, safeEnd]}
        min={0}
        max={safeDuration || 0}
        step={0.1}
        onValueChange={(v) => {
          const [s, e] = v as number[];
          onChange(Math.max(0, Math.min(s, safeDuration)), Math.max(s, Math.min(e, safeDuration)));
        }}
      />
    </Card>
  );
};
