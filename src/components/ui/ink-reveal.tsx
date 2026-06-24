"use client";

import { useEffect, useRef, useState } from "react";

interface InkRevealProps {
  /** total animation duration in ms */
  durationMs?: number;
  /** play the cover animation instead of reveal */
  reverse?: boolean;
  /** ink color */
  color?: string;
  /** fired once the animation finishes */
  onComplete?: () => void;
}

const BLOBS = [
  { cx: 50, cy: 50, mr: 95 },
  { cx: 24, cy: 30, mr: 60 },
  { cx: 78, cy: 34, mr: 60 },
  { cx: 30, cy: 74, mr: 60 },
  { cx: 72, cy: 70, mr: 62 },
  { cx: 50, cy: 22, mr: 45 },
];

/**
 * Animated ink layer that sits over an image (the parent must be
 * position: relative). On mount it dissolves away from several organic ink
 * blobs to reveal the image beneath. Pass `reverse` to play the cover-back.
 */
export default function InkReveal({
  durationMs = 2200,
  reverse = false,
  color = "#0a0810",
  onComplete,
}: InkRevealProps) {
  const [p, setP] = useState(reverse ? 1 : 0); // 0 = fully covered, 1 = fully revealed
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    startRef.current = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      setP(reverse ? 1 - ease(t) : ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else onComplete?.();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, reverse]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      aria-hidden
    >
      <defs>
        <filter id="ink-reveal-turb">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <mask id="ink-reveal-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <g filter="url(#ink-reveal-turb)">
            {BLOBS.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={Math.max(0, b.mr * p)} fill="black" />
            ))}
          </g>
        </mask>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill={color} mask="url(#ink-reveal-mask)" />
    </svg>
  );
}
