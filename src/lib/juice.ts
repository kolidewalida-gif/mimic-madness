/**
 * Juice / dopamine effect emitter.
 * Fire-and-forget global events that the <JuiceFxHost /> mounted once at the
 * root listens to. Any component can trigger juicy feedback without coupling.
 *
 * Usage:
 *   import { juice } from "@/lib/juice";
 *   juice.confetti();              // celebration burst at screen center
 *   juice.burst({ x, y, color });  // small radial burst at coordinates
 *   juice.shake(220);              // global screen shake (ms)
 *   juice.pop(el);                 // bounce-pop a specific element
 *   juice.flash("success");        // brief full-screen tinted flash
 */

export type BurstOpts = {
  x: number;
  y: number;
  color?: string;
  count?: number;
  intensity?: number; // 0.5 .. 2
};

export type ConfettiOpts = {
  count?: number;
  colors?: string[];
  origin?: { x: number; y: number };
};

export type FlashTone = "success" | "danger" | "info" | "primary";

const emit = (name: string, detail?: unknown) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

export const juice = {
  burst: (opts: BurstOpts) => emit("fx:burst", opts),
  confetti: (opts?: ConfettiOpts) => emit("fx:confetti", opts ?? {}),
  shake: (durationMs = 220, intensity = 1) =>
    emit("fx:shake", { durationMs, intensity }),
  flash: (tone: FlashTone = "primary", durationMs = 280) =>
    emit("fx:flash", { tone, durationMs }),
  pop: (el: HTMLElement | null, scale = 1.18) => {
    if (!el) return;
    el.style.willChange = "transform";
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: `scale(${scale})` },
        { transform: "scale(1)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
  },
};

/** Helper: get center coords of an event target element for burst origin. */
export const centerOf = (target: EventTarget | null): { x: number; y: number } | null => {
  if (!(target instanceof Element)) return null;
  const r = target.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};