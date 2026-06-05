import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
  Sequence,
} from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: cinzel } = loadCinzel("normal", { weights: ["400", "700"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "700"] });

// === DISNEY+ PALETTE ===
const NIGHT = "#01081f";
const DEEP = "#040b2a";
const BLUE = "#1e4fc1";
const CYAN = "#7ed4ff";
const WHITE = "#ffffff";

// === STARFIELD BACKDROP ===
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 0.55 + 0.05 * Math.sin(frame / 30);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, ${BLUE} 0%, ${DEEP} 45%, ${NIGHT} 100%)`,
        opacity: pulse + 0.3,
      }}
    />
  );
};

const Stars: React.FC = () => {
  const frame = useCurrentFrame();
  const stars = React.useMemo(() => {
    return new Array(120).fill(0).map((_, i) => ({
      x: random(`sx${i}`) * 1920,
      y: random(`sy${i}`) * 1080,
      r: 0.6 + random(`sr${i}`) * 1.8,
      phase: random(`sp${i}`) * Math.PI * 2,
    }));
  }, []);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {stars.map((s, i) => {
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 12 + s.phase));
        return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={WHITE} opacity={tw} />;
      })}
    </svg>
  );
};

// === ARC SWOOSH ===
// A bright sparkle travels along an arc, leaving a glowing trail behind it.
// Multiple arcs sweep across before the logo appears.
const Swoosh: React.FC<{
  delay: number;
  duration: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  startAngle: number;
  endAngle: number;
  thickness?: number;
}> = ({ delay, duration, cx, cy, rx, ry, startAngle, endAngle, thickness = 2 }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0) return null;

  const t = interpolate(local, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  const e = 1 - Math.pow(1 - t, 2.5);

  const N = 60;
  const points: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    const trailHead = e;
    const trailTail = Math.max(0, e - 0.55);
    const seg = trailTail + p * (trailHead - trailTail);
    const ang = startAngle + (endAngle - startAngle) * seg;
    const x = cx + Math.cos(ang) * rx;
    const y = cy + Math.sin(ang) * ry;
    const a = Math.pow(p, 2) * interpolate(local, [0, 6, duration - 10, duration], [0, 1, 1, 0], { extrapolateRight: "clamp" });
    points.push({ x, y, a });
  }

  const headAng = startAngle + (endAngle - startAngle) * e;
  const hx = cx + Math.cos(headAng) * rx;
  const hy = cy + Math.sin(headAng) * ry;
  const headOp = interpolate(local, [0, 6, duration - 8, duration], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id={`head-${delay}`}>
          <stop offset="0%" stopColor={WHITE} stopOpacity={1} />
          <stop offset="40%" stopColor={CYAN} stopOpacity={0.8} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </radialGradient>
      </defs>
      {points.slice(0, -1).map((p, i) => {
        const n = points[i + 1];
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={n.x}
            y2={n.y}
            stroke={CYAN}
            strokeWidth={thickness * (0.4 + (i / N) * 0.8)}
            strokeLinecap="round"
            opacity={p.a}
          />
        );
      })}
      <circle cx={hx} cy={hy} r={18} fill={`url(#head-${delay})`} opacity={headOp} />
      <circle cx={hx} cy={hy} r={6} fill={WHITE} opacity={headOp} />
    </svg>
  );
};

// === DUST PARTICLES around logo ===
const Dust: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const parts = React.useMemo(() => {
    return new Array(40).fill(0).map((_, i) => ({
      x: 960 + (random(`dx${i}`) - 0.5) * 1400,
      y: 540 + (random(`dy${i}`) - 0.5) * 500,
      r: 1 + random(`dr${i}`) * 2.5,
      delay: Math.floor(random(`dd${i}`) * 30),
      phase: random(`dp${i}`) * Math.PI * 2,
    }));
  }, []);
  if (local < 0) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {parts.map((p, i) => {
        const t = local - p.delay;
        if (t < 0) return null;
        const op = interpolate(t, [0, 20, 80, 110], [0, 0.9, 0.9, 0], { extrapolateRight: "clamp" });
        const drift = Math.sin(t / 20 + p.phase) * 8;
        return <circle key={i} cx={p.x + drift} cy={p.y - t * 0.3} r={p.r} fill={WHITE} opacity={op} />;
      })}
    </svg>
  );
};

// === LOGO REVEAL ===
const TITLE = "MIMIC MASTER";
const SUB = "A MIMIC ORIGINAL";

const Logo: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;

  const op = interpolate(local, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const sp = spring({ frame: local, fps, config: { damping: 28, stiffness: 70 } });
  const scale = interpolate(sp, [0, 1], [1.18, 1]);

  const subSp = spring({ frame: Math.max(0, local - 24), fps, config: { damping: 18 } });
  const subOp = interpolate(subSp, [0, 1], [0, 1]);
  const subY = interpolate(subSp, [0, 1], [16, 0]);

  const letterSpacing = interpolate(local, [0, 40], [0.5, 0.22], { extrapolateRight: "clamp" });
  const glow = interpolate(local, [0, 30, 90], [0, 32, 22], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: op,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center",
          fontFamily: cinzel,
          fontWeight: 700,
          fontSize: 170,
          color: WHITE,
          letterSpacing: `${letterSpacing}em`,
          lineHeight: 1,
          textShadow: `0 0 ${glow}px ${CYAN}, 0 0 ${glow * 2}px ${BLUE}`,
        }}
      >
        {TITLE}
      </div>

      <div
        style={{
          marginTop: 40,
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontFamily: inter,
          fontWeight: 400,
          fontSize: 24,
          letterSpacing: "0.7em",
          color: CYAN,
          textTransform: "uppercase",
        }}
      >
        {SUB}
      </div>
    </AbsoluteFill>
  );
};

// === FLASH at logo reveal ===
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 20) return null;
  const op = interpolate(t, [0, 4, 20], [0, 0.9, 0]);
  return <AbsoluteFill style={{ background: WHITE, opacity: op }} />;
};

// =================================================================
// MAIN — Disney+ style intro for MIMIC MASTER
// Starfield → arc swooshes → flash → logo reveal with glow + dust.
// =================================================================
export const MainVideo: React.FC = () => {
  const arcs = React.useMemo(() => {
    // Arcs sweep from sides toward center, forming a luminous halo.
    const baseCx = 960;
    const baseCy = 540;
    return [
      { delay: 12, dur: 70, cx: baseCx, cy: baseCy + 120, rx: 820, ry: 280, sA: Math.PI, eA: 0, t: 3 },
      { delay: 24, dur: 70, cx: baseCx, cy: baseCy - 120, rx: 820, ry: 280, sA: 0, eA: Math.PI, t: 3 },
      { delay: 40, dur: 80, cx: baseCx, cy: baseCy, rx: 700, ry: 340, sA: -Math.PI * 0.7, eA: Math.PI * 0.7, t: 2.5 },
      { delay: 55, dur: 80, cx: baseCx, cy: baseCy, rx: 700, ry: 340, sA: Math.PI * 1.7, eA: Math.PI * 0.3, t: 2.5 },
      { delay: 70, dur: 60, cx: baseCx, cy: baseCy, rx: 500, ry: 500, sA: Math.PI * 1.5, eA: Math.PI * 3.5, t: 2 },
    ];
  }, []);

  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Backdrop />
      <Stars />

      {arcs.map((a, i) => (
        <Swoosh
          key={i}
          delay={a.delay}
          duration={a.dur}
          cx={a.cx}
          cy={a.cy}
          rx={a.rx}
          ry={a.ry}
          startAngle={a.sA}
          endAngle={a.eA}
          thickness={a.t}
        />
      ))}

      <Flash at={130} />

      <Sequence from={132}>
        <Logo from={0} />
        <Dust from={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
