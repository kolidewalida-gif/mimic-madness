import { useEffect, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface AutoAdvanceBarProps {
  /** Duration in ms — should match the host auto-advance delay. */
  durationMs: number;
  /** Label of the next phase, e.g. "Classement" or "Question suivante". */
  label: string;
  /** Whether the current viewer can skip ahead (host only). */
  canSkip?: boolean;
  onSkip?: () => void;
  className?: string;
}

/**
 * Universal "auto-advance" indicator displayed to every player.
 * The host stays in control via an optional skip button, but progression
 * is purely time-driven so the round flows on its own.
 */
export const AutoAdvanceBar = ({
  durationMs,
  label,
  canSkip = false,
  onSkip,
  className,
}: AutoAdvanceBarProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setElapsed(Math.min(durationMs, now - start));
      if (now - start < durationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  const pct = (elapsed / durationMs) * 100;
  const secondsLeft = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

  return (
    <div className={cn("relative z-10 w-full max-w-md mx-auto animate-fadeInUp", className)}>
      <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-wider text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {label} dans <span className="font-mono font-bold text-foreground">{secondsLeft}s</span>
        </span>
        {canSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="h-7 gap-1 text-xs"
          >
            Passer <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};