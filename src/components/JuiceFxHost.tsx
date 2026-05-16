import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BurstOpts, ConfettiOpts, FlashTone } from "@/lib/juice";

/**
 * JuiceFxHost — mount ONCE near the root of the app.
 * Listens for window CustomEvents fired by `juice.*` and renders the FX.
 *
 * Lightweight: confetti & bursts use a single shared canvas. Shake & flash
 * use class toggles / motion divs. No deps beyond framer-motion already used.
 */

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "rect";
}

const DEFAULT_COLORS = [
  "hsl(0 84% 60%)",   // primary red
  "hsl(45 100% 60%)", // gold
  "hsl(0 0% 100%)",   // white
  "hsl(0 84% 45%)",   // dark red
  "hsl(20 95% 60%)",  // orange
];

export const JuiceFxHost = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<BurstParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [shake, setShake] = useState<{ id: number; intensity: number; duration: number } | null>(null);
  const [flash, setFlash] = useState<{ id: number; tone: FlashTone; duration: number } | null>(null);

  /* ---------------- Canvas setup ---------------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight, dpr };
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      cv.style.width = window.innerWidth + "px";
      cv.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); // clamp dt to avoid jumps
      last = now;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          ps.splice(i, 1);
          continue;
        }
        p.vy += 0.018 * dt; // gravity
        p.vx *= 0.995;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rotation += p.rotationSpeed * (dt / 16);

        const lifeRatio = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, lifeRatio);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ---------------- Spawners ---------------- */
  const spawnBurst = useCallback((opts: BurstOpts) => {
    const intensity = opts.intensity ?? 1;
    const count = opts.count ?? Math.round(16 * intensity);
    const baseColor = opts.color ?? DEFAULT_COLORS[0];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (2 + Math.random() * 4) * intensity;
      particlesRef.current.push({
        x: opts.x,
        y: opts.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0,
        maxLife: 600 + Math.random() * 400,
        size: 4 + Math.random() * 5,
        color: Math.random() > 0.4 ? baseColor : DEFAULT_COLORS[(i + 2) % DEFAULT_COLORS.length],
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        shape: Math.random() > 0.5 ? "circle" : "rect",
      });
    }
  }, []);

  const spawnConfetti = useCallback((opts: ConfettiOpts) => {
    const { w, h } = sizeRef.current;
    const count = opts.count ?? 110;
    const colors = opts.colors ?? DEFAULT_COLORS;
    const origin = opts.origin ?? { x: w / 2, y: h / 2.6 };
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 6 + Math.random() * 8;
      particlesRef.current.push({
        x: origin.x + (Math.random() - 0.5) * 80,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1800 + Math.random() * 1400,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.6,
        shape: Math.random() > 0.3 ? "rect" : "circle",
      });
    }
  }, []);

  /* ---------------- Event listeners ---------------- */
  useEffect(() => {
    const onBurst = (e: Event) => spawnBurst((e as CustomEvent<BurstOpts>).detail);
    const onConfetti = (e: Event) => spawnConfetti((e as CustomEvent<ConfettiOpts>).detail ?? {});
    const onShake = (e: Event) => {
      const d = (e as CustomEvent<{ durationMs: number; intensity: number }>).detail;
      setShake({ id: Date.now(), intensity: d?.intensity ?? 1, duration: d?.durationMs ?? 220 });
    };
    const onFlash = (e: Event) => {
      const d = (e as CustomEvent<{ tone: FlashTone; durationMs: number }>).detail;
      setFlash({ id: Date.now(), tone: d?.tone ?? "primary", duration: d?.durationMs ?? 280 });
    };

    window.addEventListener("fx:burst", onBurst);
    window.addEventListener("fx:confetti", onConfetti);
    window.addEventListener("fx:shake", onShake);
    window.addEventListener("fx:flash", onFlash);

    return () => {
      window.removeEventListener("fx:burst", onBurst);
      window.removeEventListener("fx:confetti", onConfetti);
      window.removeEventListener("fx:shake", onShake);
      window.removeEventListener("fx:flash", onFlash);
    };
  }, [spawnBurst, spawnConfetti]);

  /* ---------------- Shake host (wraps body via class) ---------------- */
  useEffect(() => {
    if (!shake) return;
    const root = document.getElementById("root");
    if (!root) return;
    root.style.setProperty("--juice-shake-intensity", `${shake.intensity}`);
    root.classList.add("juice-shake");
    const t = setTimeout(() => root.classList.remove("juice-shake"), shake.duration);
    return () => clearTimeout(t);
  }, [shake]);

  const flashColor = (tone: FlashTone) => {
    switch (tone) {
      case "success": return "hsl(140 70% 50% / 0.18)";
      case "danger":  return "hsl(0 84% 55% / 0.22)";
      case "info":    return "hsl(210 90% 60% / 0.16)";
      default:        return "hsl(var(--primary) / 0.22)";
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9998]"
        aria-hidden
      />
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            className="pointer-events-none fixed inset-0 z-[9997]"
            style={{ background: flashColor(flash.tone) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: flash.duration / 1000 }}
            onAnimationComplete={() => setFlash(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};