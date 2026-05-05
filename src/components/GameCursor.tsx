import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerLoadout } from "@/hooks/usePlayerLoadout";

export const GameCursor = () => {
  const { user } = useAuth();
  const loadout = usePlayerLoadout(user?.id);
  const [enabled, setEnabled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      setEnabled(mediaQuery.matches && !reduceMotion.matches);
      document.body.classList.toggle("game-cursor-enabled", mediaQuery.matches && !reduceMotion.matches);
    };

    const onMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
      const target = event.target as HTMLElement | null;
      const interactive = !!target?.closest("button, a, input, textarea, select, [role='button'], summary");
      setHovering(interactive);
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    syncEnabled();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    mediaQuery.addEventListener("change", syncEnabled);
    reduceMotion.addEventListener("change", syncEnabled);

    return () => {
      document.body.classList.remove("game-cursor-enabled");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      mediaQuery.removeEventListener("change", syncEnabled);
      reduceMotion.removeEventListener("change", syncEnabled);
    };
  }, []);

  useEffect(() => {
    const classNames = [
      "game-cursor-tier-bronze",
      "game-cursor-tier-silver",
      "game-cursor-tier-gold",
      "game-cursor-effect-sparkle",
      "game-cursor-effect-glow",
    ];

    document.body.classList.remove(...classNames);

    if (loadout.frameTier !== "none") {
      document.body.classList.add(`game-cursor-tier-${loadout.frameTier}`);
    }

    if (loadout.effectTier !== "none") {
      document.body.classList.add(`game-cursor-effect-${loadout.effectTier}`);
    }

    return () => {
      document.body.classList.remove(...classNames);
    };
  }, [loadout.effectTier, loadout.frameTier]);

  if (!enabled) return null;

  return (
    <>
      <div
        className={cn(
          "game-cursor-dot",
          pressed && "game-cursor-dot-pressed",
          hovering && "game-cursor-dot-hover"
        )}
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      />
      <div
        className={cn(
          "game-cursor-ring",
          pressed && "game-cursor-ring-pressed",
          hovering && "game-cursor-ring-hover"
        )}
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      />
    </>
  );
};
