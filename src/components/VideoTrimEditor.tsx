import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Scissors, Play, SkipBack, SkipForward, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!videoRef?.current) return;
    
    const video = videoRef.current;
    const updateTime = () => setCurrentTime(video.currentTime);
    
    video.addEventListener('timeupdate', updateTime);
    return () => video.removeEventListener('timeupdate', updateTime);
  }, [videoRef]);

  const handlePreviewTrim = () => {
    if (videoRef?.current) {
      videoRef.current.currentTime = safeStart;
      videoRef.current.play();
    }
  };

  const handleSetStartToCurrent = () => {
    if (videoRef?.current) {
      const newStart = Math.min(videoRef.current.currentTime, safeEnd - 0.5);
      onChange(newStart, safeEnd);
    }
  };

  const handleSetEndToCurrent = () => {
    if (videoRef?.current) {
      const newEnd = Math.max(videoRef.current.currentTime, safeStart + 0.5);
      onChange(safeStart, newEnd);
    }
  };

  const handleJumpToStart = () => {
    if (videoRef?.current) {
      videoRef.current.currentTime = safeStart;
    }
  };

  const handleJumpToEnd = () => {
    if (videoRef?.current) {
      videoRef.current.currentTime = safeEnd;
    }
  };

  const handleUseFullVideo = () => {
    onChange(0, safeDuration);
  };

  return (
    <Card className="p-4 bg-background-secondary/50 border-glass-border space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-secondary" />
          <span className="text-sm font-medium">Éditeur de Rush</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUseFullVideo}
          className="h-7 px-2 text-xs"
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Vidéo complète
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground-secondary">Début: {formatTime(safeStart)}</span>
        <span className="font-semibold text-secondary">Durée: {formatTime(Math.max(0, safeEnd - safeStart))}</span>
        <span className="text-foreground-secondary">Fin: {formatTime(safeEnd)}</span>
      </div>

      <div className="space-y-2">
        <div className="px-1 relative">
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
          <div 
            className="absolute top-1/2 w-0.5 h-6 bg-accent/80 pointer-events-none"
            style={{ 
              left: `${(currentTime / safeDuration) * 100}%`,
              transform: 'translateY(-50%)'
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>Position: {formatTime(currentTime)}</span>
          <span>Total: {formatTime(safeDuration)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSetStartToCurrent}
          className="h-8 text-xs"
        >
          <SkipBack className="h-3 w-3 mr-1" />
          Début ici
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSetEndToCurrent}
          className="h-8 text-xs"
        >
          <SkipForward className="h-3 w-3 mr-1" />
          Fin ici
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleJumpToStart}
          className="h-8 text-xs"
        >
          Aller au début
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleJumpToEnd}
          className="h-8 text-xs"
        >
          Aller à la fin
        </Button>
      </div>

      <Button
        variant="hero"
        size="sm"
        onClick={handlePreviewTrim}
        className="w-full h-9"
      >
        <Play className="h-4 w-4 mr-2" />
        Prévisualiser l'extrait
      </Button>

      <p className="text-xs text-foreground-secondary text-center leading-relaxed">
        💡 Utilisez les poignées du slider, les boutons de position actuelle, ou naviguez directement aux points de découpe
      </p>
    </Card>
  );
};
