import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerLoadout } from "@/hooks/usePlayerLoadout";

const TRAIL_LENGTH = 6;

export const GameCursor = () => {
  const { user } = useAuth();
  const loadout = usePlayerLoadout(user?.id);
  const [enabled, setEnabled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const nibRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const splashRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const trail = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 }))
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      setEnabled(mediaQuery.matches && !reduceMotion.matches);
      document.body.classList.toggle("game-cursor-enabled", mediaQuery.matches && !reduceMotion.matches);
    };

    const onMove = (event: MouseEvent) => {
      target.current.x = event.clientX;
      target.current.y = event.clientY;
      if (nibRef.current) {
        nibRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      }
      const t = event.target as HTMLElement | null;
      const interactive = !!t?.closest("button, a, input, textarea, select, [role='button'], summary, label, [data-cursor='hover']");
      setHovering(interactive);
    };

    const onDown = (event: MouseEvent) => {
      setPressed(true);
      const el = splashRef.current;
      if (el) {
        el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        el.classList.remove("game-cursor-splash-burst");
        // force reflow so the animation restarts
        void el.offsetWidth;
        el.classList.add("game-cursor-splash-burst");
      }
    };
    const onUp = () => setPressed(false);

    syncEnabled();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    mediaQuery.addEventListener("change", syncEnabled);
    reduceMotion.addEventListener("change", syncEnabled);

    let raf = 0;
    const tick = () => {
      let prev = target.current;
      for (let i = 0; i < trail.current.length; i++) {
        const node = trail.current[i];
        const ease = 0.32 - i * 0.035;
        node.x += (prev.x - node.x) * ease;
        node.y += (prev.y - node.y) * ease;
        const ref = trailRefs.current[i];
        if (ref) {
          ref.style.transform = `translate3d(${node.x}px, ${node.y}px, 0)`;
        }
        prev = node;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
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
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <div
          key={i}
          ref={(el) => (trailRefs.current[i] = el)}
          className="game-cursor-drop"
          style={{
            opacity: 0.55 - i * 0.08,
            width: `${10 - i * 1.1}px`,
            height: `${10 - i * 1.1}px`,
            marginLeft: `${-(10 - i * 1.1) / 2}px`,
            marginTop: `${-(10 - i * 1.1) / 2}px`,
          }}
        />
      ))}
      <div ref={splashRef} className="game-cursor-splash">
        <span /><span /><span /><span /><span /><span />
      </div>
      <div
        ref={nibRef}
        className={cn(
          "game-cursor-nib",
          pressed && "game-cursor-nib-pressed",
          hovering && "game-cursor-nib-hover"
        )}
      >
        <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
          <defs>
            <linearGradient id="mm-nib-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="55%" stopColor="#000000" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
            <linearGradient id="mm-nib-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Nib shadow */}
          <path
            d="M5 5 L20 5 L40 36 L34 42 Z"
            fill="rgba(0,0,0,0.35)"
            transform="translate(1.5,2)"
          />
          {/* Nib body */}
          <path
            d="M4 4 L19 4 L39 35 L33 41 Z"
            fill="url(#mm-nib-body)"
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          {/* Center slit */}
          <path
            d="M11 7 L33 37"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* Highlight */}
          <path
            d="M6 6 L16 6 L24 18 L18 20 Z"
            fill="url(#mm-nib-shine)"
            opacity="0.55"
          />
          {/* Red ink drop at the writing tip */}
          <circle cx="35" cy="38" r="2.6" fill="hsl(var(--primary))" />
          <circle cx="35" cy="38" r="4.6" fill="hsl(var(--primary))" opacity="0.35" />
        </svg>
      </div>
    </>
  );
};
