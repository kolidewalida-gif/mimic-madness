import { useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { juice } from "@/lib/juice";

interface VictoryAnimationProps {
  winnerName: string;
  isTeam?: boolean;
  teamPlayers?: string[];
}

/**
 * Real, cinematic victory moment.
 * - Radial ink burst + golden rays
 * - Zoom-in trophy with crown halo
 * - Confetti waves via juice system
 * - Ink DA: black background, red primary, gold accent
 */
export const VictoryAnimation = ({ winnerName, isTeam, teamPlayers }: VictoryAnimationProps) => {
  const [stage, setStage] = useState<"flash" | "trophy" | "name">("flash");

  // Animated background rays
  const rays = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ id: i, rot: (360 / 14) * i })),
    [],
  );

  // Floating sparkles in front layer
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 70,
        size: 10 + Math.random() * 18,
        delay: Math.random() * 1.8,
        dur: 1.6 + Math.random() * 1.6,
      })),
    [],
  );

  useEffect(() => {
    // Multi-wave dopamine on mount
    juice.flash("primary", 380);
    juice.shake(320, 1.1);
    juice.confetti({ count: 180 });
    const w1 = setTimeout(() => juice.confetti({ count: 120 }), 500);
    const w2 = setTimeout(() => juice.confetti({ count: 90 }), 1100);

    const t1 = setTimeout(() => setStage("trophy"), 220);
    const t2 = setTimeout(() => setStage("name"), 800);
    return () => {
      clearTimeout(w1);
      clearTimeout(w2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const displayName = isTeam && teamPlayers ? teamPlayers.join(" & ") : winnerName;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/92 backdrop-blur-sm animate-fade-in" />

      {/* Golden rays sweep */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          stage === "flash" ? "opacity-0" : "opacity-100",
        )}
      >
        <div className="relative w-[140vmin] h-[140vmin] animate-victory-spin">
          {rays.map((r) => (
            <div
              key={r.id}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${r.rot}deg)`,
                width: "8vmin",
                height: "70vmin",
                background:
                  "linear-gradient(to top, transparent, hsl(var(--primary) / 0.35) 40%, hsl(45 95% 60% / 0.55) 100%)",
                filter: "blur(2px)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Vignette pulse */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, hsl(var(--background) / 0.85) 85%)",
        }}
      />

      {/* Floating sparkles */}
      {stage !== "flash" && sparkles.map((s) => (
        <Sparkles
          key={s.id}
          className="absolute text-[hsl(45_95%_60%)] animate-victory-spark"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            filter: "drop-shadow(0 0 10px hsl(45 95% 60% / 0.7))",
          }}
        />
      ))}

      {/* Main stack */}
      <div className="relative flex flex-col items-center gap-6 px-6">
        {/* Trophy */}
        <div
          className={cn(
            "relative transition-all duration-700",
            stage === "flash" ? "opacity-0 scale-50" : "opacity-100 scale-100",
          )}
        >
          {/* Halo */}
          <div className="absolute inset-0 -m-12 rounded-full bg-primary/30 blur-3xl animate-pulse" />
          <div className="absolute inset-0 -m-6 rounded-full bg-[hsl(45_95%_60%/0.35)] blur-2xl animate-pulse"
            style={{ animationDelay: "0.3s" }}
          />

          {/* Crown above */}
          <Crown
            className="absolute left-1/2 -top-12 -translate-x-1/2 h-12 w-12 text-[hsl(45_95%_60%)] animate-victory-crown"
            style={{ filter: "drop-shadow(0 0 14px hsl(45 95% 60% / 0.8))" }}
          />

          <div className="relative animate-victory-trophy">
            <Trophy
              className="h-40 w-40 md:h-48 md:w-48 text-primary"
              style={{ filter: "drop-shadow(0 0 24px hsl(var(--primary) / 0.65))" }}
              strokeWidth={1.6}
            />
          </div>
        </div>

        {/* VICTOIRE title */}
        <h1
          className={cn(
            "text-6xl md:text-8xl font-display font-black tracking-[0.15em] text-foreground transition-all duration-500",
            stage === "name" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
          style={{
            textShadow:
              "0 0 30px hsl(var(--primary) / 0.6), 0 0 60px hsl(45 95% 60% / 0.25)",
          }}
        >
          VICTOIRE
        </h1>

        {/* Winner name card */}
        <div
          className={cn(
            "relative px-8 py-4 rounded-2xl border-2 border-primary/60 bg-background/70 backdrop-blur transition-all duration-500 max-w-[90vw]",
            stage === "name" ? "opacity-100 scale-100" : "opacity-0 scale-90",
          )}
          style={{
            boxShadow:
              "0 0 0 1px hsl(45 95% 60% / 0.35), 0 20px 60px -10px hsl(var(--primary) / 0.6)",
          }}
        >
          <p className="text-center text-3xl md:text-4xl font-display font-bold text-primary truncate">
            {displayName}
          </p>
          <p className="text-center text-sm md:text-base text-foreground-secondary mt-1 uppercase tracking-widest">
            remporte la manche
          </p>
        </div>
      </div>
    </div>
  );
};