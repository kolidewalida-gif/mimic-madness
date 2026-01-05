import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  isActive?: boolean;
  audioLevel?: number;
  barCount?: number;
  variant?: "default" | "recording" | "playing";
  className?: string;
}

export const WaveformVisualizer = memo(({
  isActive = false,
  audioLevel = 0,
  barCount = 40,
  variant = "default",
  className,
}: WaveformVisualizerProps) => {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      // Idle animation
      const interval = setInterval(() => {
        setBars(Array.from({ length: barCount }, () => 
          0.1 + Math.random() * 0.2
        ));
      }, 100);
      return () => clearInterval(interval);
    }

    // Active animation based on audio level
    const interval = setInterval(() => {
      const baseLevel = audioLevel || 0.3;
      setBars(Array.from({ length: barCount }, (_, i) => {
        const centerOffset = Math.abs(i - barCount / 2) / (barCount / 2);
        const variation = Math.random() * 0.4;
        return Math.max(0.1, Math.min(1, baseLevel * (1 - centerOffset * 0.5) + variation));
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, audioLevel, barCount]);

  const getBarColor = () => {
    switch (variant) {
      case "recording":
        return "from-rose-400 via-red-500 to-orange-400";
      case "playing":
        return "from-cyan-400 via-blue-500 to-teal-400";
      default:
        return "from-primary via-primary-light to-accent";
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-center gap-[2px] h-16",
      className
    )}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            "bg-gradient-to-t",
            getBarColor(),
            isActive ? "opacity-100" : "opacity-40"
          )}
          style={{
            height: `${height * 100}%`,
            transform: `scaleY(${height})`,
          }}
        />
      ))}
    </div>
  );
});

WaveformVisualizer.displayName = "WaveformVisualizer";
