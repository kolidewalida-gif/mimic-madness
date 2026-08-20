import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerLoadout } from "@/hooks/usePlayerLoadout";
import { useInkMode } from "@/hooks/useInkMode";

const TRAIL_LENGTH = 6;

export const GameCursor = () => {
  const { user } = useAuth();
  const loadout = usePlayerLoadout(user?.id);
  const { isInkMode } = useInkMode();
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
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      mediaQuery.removeEventListener("change", syncEnabled);
      reduceMotion.removeEventListener("change", syncEnabled);
    };
  }, []);

  /**
   * Le curseur natif n'est masqué que si le curseur dessiné le remplace vraiment.
   *
   * La classe était posée dès que le pointeur était fin, avant même de savoir si
   * ce composant allait s'afficher. En mode Ink — l'expérience par défaut — il
   * renvoie `null` : le curseur natif restait donc masqué sans remplacement, et
   * la souris devenait invisible dans toute l'application.
   */
  const cursorVisible = enabled && !isInkMode;

  useEffect(() => {
    document.body.classList.toggle("game-cursor-enabled", cursorVisible);
    return () => document.body.classList.remove("game-cursor-enabled");
  }, [cursorVisible]);

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

  if (!cursorVisible) return null;

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
        {/*
          AAA Fountain-pen pointer cursor.
          Pen is laid diagonally with the nib tip anchored at SVG (4,4) so
          the CSS margin places that exact point under the pointer.
        */}
        <svg viewBox="0 0 80 80" width="56" height="56" aria-hidden="true" className="game-cursor-pen-svg">
          <defs>
            {/* Polished black lacquer barrel */}
            <linearGradient id="mm-pen-barrel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4a4a4a" />
              <stop offset="25%" stopColor="#0d0d0d" />
              <stop offset="55%" stopColor="#1c1c1c" />
              <stop offset="80%" stopColor="#050505" />
              <stop offset="100%" stopColor="#222222" />
            </linearGradient>
            {/* Deep red lacquer accents */}
            <linearGradient id="mm-pen-red" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary) / 1)" />
              <stop offset="55%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#5b0a10" />
            </linearGradient>
            {/* Nib: two-tone black with subtle red veining */}
            <linearGradient id="mm-pen-nib" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="50%" stopColor="#000000" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
            {/* Chrome / silver ring */}
            <linearGradient id="mm-pen-chrome" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5f5f5" />
              <stop offset="45%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>
            {/* Specular highlight strip */}
            <linearGradient id="mm-pen-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {/* Moving glint that sweeps along the barrel on hover */}
            <linearGradient id="mm-pen-glint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            {/* Clip mask for the glint sweep */}
            <clipPath id="mm-pen-barrel-clip">
              <path d="M18 22 L60 64 L66 58 L24 16 Z" />
            </clipPath>
          </defs>

          {/* Drop shadow under the entire pen */}
          <g transform="translate(2.5,3.5)" opacity="0.5" filter="blur(0.2px)">
            <path d="M4 4 L20 14 L66 60 L60 66 L14 20 Z" fill="#000" />
          </g>

          {/* ===== NIB ===== */}
          {/* Red ink already loaded at the tip */}
          <path d="M4 4 L14 11 L10 15 Z" fill="url(#mm-pen-red)" />
          {/* Nib body — pointed shield shape */}
          <path
            d="M4 4 L22 16 L18 22 L7 12 Z"
            fill="url(#mm-pen-nib)"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          {/* Breather hole */}
          <circle cx="15.5" cy="15.5" r="1.4" fill="#000" stroke="#ffffff" strokeWidth="0.5" />
          {/* Central slit */}
          <line x1="6.5" y1="6.5" x2="15.5" y2="15.5" stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
          {/* Engraved hairline pattern */}
          <path d="M9 6 L17 14 M11 5 L18 12 M7 8 L14 15" stroke="#ffffff" strokeWidth="0.25" opacity="0.35" />
          {/* Tiny red glint on the nib edge */}
          <circle cx="5" cy="5" r="0.9" fill="hsl(var(--primary))" opacity="0.95" />

          {/* ===== GRIP SECTION (chrome ring + red lacquer) ===== */}
          <path
            d="M18 22 L26 30 L23 33 L15 25 Z"
            fill="url(#mm-pen-chrome)"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path
            d="M22 26 L30 34 L27 37 L19 29 Z"
            fill="url(#mm-pen-red)"
            stroke="#ffffff"
            strokeWidth="0.7"
          />
          {/* Chrome ring after the grip */}
          <path
            d="M27 31 L33 37 L31 39 L25 33 Z"
            fill="url(#mm-pen-chrome)"
            stroke="#ffffff"
            strokeWidth="0.6"
          />

          {/* ===== BARREL ===== */}
          <path
            d="M30 34 L60 64 L66 58 L36 28 Z"
            fill="url(#mm-pen-barrel)"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Top specular highlight strip on the barrel */}
          <path
            d="M32 32 L62 62 L60 64 L30 34 Z"
            fill="url(#mm-pen-shine)"
            opacity="0.55"
          />
          {/* Hairline second highlight */}
          <path d="M34 30 L64 60" stroke="#ffffff" strokeWidth="0.45" opacity="0.4" />
          {/* Engraved logo dot */}
          <circle cx="45" cy="47" r="1" fill="hsl(var(--primary))" opacity="0.9" />

          {/* Animated glint sweep — clipped to the barrel */}
          <g clipPath="url(#mm-pen-barrel-clip)" className="game-cursor-pen-glint">
            <rect x="-30" y="0" width="20" height="80" fill="url(#mm-pen-glint)" transform="rotate(45 40 40)" />
          </g>

          {/* ===== CAP END ===== */}
          <path
            d="M60 64 L66 58 L70 62 L64 68 Z"
            fill="url(#mm-pen-red)"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          {/* Chrome cap finial */}
          <circle cx="67" cy="65" r="1.6" fill="url(#mm-pen-chrome)" stroke="#ffffff" strokeWidth="0.5" />

          {/* Floating ink droplet (idle bob) */}
          <g className="game-cursor-pen-droplet">
            <circle cx="9" cy="16" r="1.7" fill="hsl(var(--primary))" />
            <circle cx="9" cy="16" r="0.6" fill="#ffffff" opacity="0.7" />
          </g>
        </svg>
      </div>
    </>
  );
};
