import { useEffect } from "react";

/**
 * Globally rescales the whole UI so the design fits the user's viewport
 * regardless of browser zoom level or window size.
 *
 * Strategy: we measure the layout viewport (which already accounts for
 * browser zoom) against a fixed design width and apply CSS `zoom` to <html>.
 * Browser zoom multiplies on top, so the perceived size stays consistent.
 */
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.35;

export const UiScaler = () => {
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT))
      );
      // `zoom` is supported by all modern browsers (Chromium, WebKit, FF 126+)
      // and, unlike CSS transform: scale, it preserves layout flow + fixed
      // positioning + click hit-testing correctly.
      (document.documentElement.style as any).zoom = String(scale);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      (document.documentElement.style as any).zoom = "";
    };
  }, []);
  return null;
};
