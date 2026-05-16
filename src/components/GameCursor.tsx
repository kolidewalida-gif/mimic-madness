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
        {/* Mimic Master mask cursor — theatre mask with a red smile */}
        <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
          <defs>
            <radialGradient id="mm-mask-body" cx="40%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="55%" stopColor="#0d0d0d" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <linearGradient id="mm-mask-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Drop shadow */}
          <path
            d="M14 8 C 28 4, 44 4, 54 12 C 58 24, 50 44, 36 54 C 22 60, 12 50, 8 36 C 6 22, 8 12, 14 8 Z"
            fill="rgba(0,0,0,0.4)"
            transform="translate(2,3)"
          />
          {/* Mask body */}
          <path
            d="M14 8 C 28 4, 44 4, 54 12 C 58 24, 50 44, 36 54 C 22 60, 12 50, 8 36 C 6 22, 8 12, 14 8 Z"
            fill="url(#mm-mask-body)"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Eye holes */}
          <ellipse cx="22" cy="26" rx="4.2" ry="5.4" fill="#000" stroke="#ffffff" strokeWidth="1" />
          <ellipse cx="40" cy="24" rx="4.2" ry="5.4" fill="#000" stroke="#ffffff" strokeWidth="1" />
          {/* Eye glints */}
          <circle cx="23.5" cy="24.5" r="1" fill="#ffffff" />
          <circle cx="41.5" cy="22.5" r="1" fill="#ffffff" />
          {/* Red smirk */}
          <path
            d="M22 42 Q 32 50, 44 40"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Forehead highlight */}
          <path
            d="M16 12 Q 26 8, 38 10 L 36 16 Q 26 14, 18 18 Z"
            fill="url(#mm-mask-shine)"
            opacity="0.45"
          />
        </svg>
      </div>
    </>
  );
};
