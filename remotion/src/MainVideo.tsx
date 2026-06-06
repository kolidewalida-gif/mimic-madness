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
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: fredoka } = loadFredoka("normal", { weights: ["400", "600", "700"] });

// === DARK CARTOON PALETTE ===
const INK = "#0a0a0d";
const INK_2 = "#15151b";
const RED = "#ff2b3d";
const RED_DEEP = "#b30016";
const YELLOW = "#ffd23f";
const CREAM = "#fff5e1";
const WHITE = "#ffffff";

// =================================================================
// LAYER 1 — Backdrop: dark vignette + slow comic halftone parallax
// =================================================================
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  // gentle parallax pan, no jitter
  const px = Math.sin(frame / 60) * 20;
  const py = Math.cos(frame / 80) * 14;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${INK_2} 0%, ${INK} 70%, #000 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${RED_DEEP}33 1.5px, transparent 1.8px)`,
          backgroundSize: "26px 26px",
          backgroundPosition: `${px}px ${py}px`,
          opacity: 0.55,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
};

// =================================================================
// LAYER 2 — Speed lines bursting outward (classic comic radial)
// =================================================================
const SpeedLines: React.FC<{ from: number; dur: number; color?: string }> = ({
  from,
  dur,
  color = WHITE,
}) => {
  const frame = useCurrentFrame();
  const lines = React.useMemo(
    () =>
      new Array(38).fill(0).map((_, i) => ({
        a: (i / 38) * Math.PI * 2 + random(`sl${i}`) * 0.08,
        len: 380 + random(`sll${i}`) * 360,
        w: 2 + random(`slw${i}`) * 3,
      })),
    []
  );
  const local = frame - from;
  if (local < 0 || local > dur) return null;
  const t = local / dur;
  const op = interpolate(t, [0, 0.15, 0.85, 1], [0, 0.55, 0.55, 0]);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: op }}>
      {lines.map((l, i) => {
        const startR = 220 + t * 80;
        const endR = startR + l.len * interpolate(t, [0, 1], [0.7, 1.1]);
        return (
          <line
            key={i}
            x1={960 + Math.cos(l.a) * startR}
            y1={540 + Math.sin(l.a) * startR}
            x2={960 + Math.cos(l.a) * endR}
            y2={540 + Math.sin(l.a) * endR}
            stroke={color}
            strokeWidth={l.w}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

// =================================================================
// LAYER 3 — Ink splatters bouncing into frame
// =================================================================
const Splatter: React.FC<{ from: number; x: number; y: number; size: number; color: string }> = ({
  from,
  x,
  y,
  size,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;
  const sp = spring({ frame: local, fps, config: { damping: 9, stiffness: 140, mass: 0.7 } });
  const scale = interpolate(sp, [0, 1], [0, 1]);
  const rot = interpolate(sp, [0, 1], [-25, 0]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        transform: `scale(${scale}) rotate(${rot}deg)`,
      }}
    >
      <g fill={color}>
        <circle cx={0} cy={0} r={32} />
        <circle cx={28} cy={-10} r={9} />
        <circle cx={-26} cy={-18} r={11} />
        <circle cx={-32} cy={14} r={7} />
        <circle cx={22} cy={22} r={8} />
        <circle cx={-12} cy={36} r={5} />
        <circle cx={38} cy={6} r={4} />
      </g>
    </svg>
  );
};

// =================================================================
// LAYER 4 — Comic burst (POW shape) behind the logo
// =================================================================
const Burst: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;
  const sp = spring({ frame: local, fps, config: { damping: 12, stiffness: 110, mass: 0.8 } });
  const scale = interpolate(sp, [0, 1], [0, 1]);
  const rot = interpolate(local, [0, 120], [-6, 6]);
  const points: string[] = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = i % 2 === 0 ? 520 : 380;
    points.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
  }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg
        width={1200}
        height={1200}
        viewBox="-600 -600 1200 1200"
        style={{ transform: `scale(${scale}) rotate(${rot}deg)` }}
      >
        <polygon
          points={points.join(" ")}
          fill={RED}
          stroke={INK}
          strokeWidth={14}
          strokeLinejoin="round"
        />
        <polygon
          points={points.map((p) => p.split(",").map((n) => Number(n) * 0.78).join(",")).join(" ")}
          fill={YELLOW}
          stroke={INK}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      </svg>
    </AbsoluteFill>
  );
};

// =================================================================
// LAYER 5 — Logo (title) reveal
// =================================================================
const TITLE = "MIMIC MASTER";
const SUB = "INK MODE";

const Logo: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;

  const sp = spring({ frame: local, fps, config: { damping: 10, stiffness: 130, mass: 0.9 } });
  const scale = interpolate(sp, [0, 1], [0.4, 1]);
  const rot = interpolate(local, [0, 12, 24, 36], [-3, 2, -1, 0], { extrapolateRight: "clamp" });

  const subSp = spring({ frame: Math.max(0, local - 14), fps, config: { damping: 14 } });
  const subOp = interpolate(subSp, [0, 1], [0, 1]);
  const subY = interpolate(subSp, [0, 1], [20, 0]);

  // subtle continuous breathing — smooth sin, never causes stutter
  const breathe = 1 + Math.sin(local / 18) * 0.012;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${scale * breathe}) rotate(${rot}deg)`,
          fontFamily: bangers,
          fontSize: 260,
          color: CREAM,
          letterSpacing: "0.06em",
          lineHeight: 0.95,
          WebkitTextStroke: `8px ${INK}`,
          textShadow: `10px 10px 0 ${INK}, 14px 14px 0 ${RED_DEEP}`,
        }}
      >
        {TITLE}
      </div>
      <div
        style={{
          marginTop: 28,
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontFamily: fredoka,
          fontWeight: 700,
          fontSize: 38,
          color: YELLOW,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          padding: "10px 28px",
          background: INK,
          border: `4px solid ${YELLOW}`,
          borderRadius: 6,
          boxShadow: `6px 6px 0 ${RED}`,
        }}
      >
        {SUB}
      </div>
    </AbsoluteFill>
  );
};

// =================================================================
// LAYER 6 — White flash punch
// =================================================================
const Flash: React.FC<{ at: number; dur?: number }> = ({ at, dur = 14 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > dur) return null;
  const op = interpolate(t, [0, 3, dur], [0, 1, 0]);
  return <AbsoluteFill style={{ background: WHITE, opacity: op }} />;
};

// =================================================================
// LAYER 7 — Floating ink dots (ambient continuous motion)
// =================================================================
const FloatingDots: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = React.useMemo(
    () =>
      new Array(28).fill(0).map((_, i) => ({
        x: random(`fx${i}`) * 1920,
        y: random(`fy${i}`) * 1080,
        r: 2 + random(`fr${i}`) * 5,
        sp: 0.3 + random(`fs${i}`) * 0.6,
        ph: random(`fp${i}`) * Math.PI * 2,
      })),
    []
  );
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {dots.map((d, i) => {
        const y = (d.y - frame * d.sp + 1080) % 1080;
        const op = 0.25 + 0.25 * Math.sin(frame / 20 + d.ph);
        return <circle key={i} cx={d.x} cy={y} r={d.r} fill={RED} opacity={op} />;
      })}
    </svg>
  );
};

// =================================================================
// MAIN — dark cartoon dynamic intro
// Timeline (30fps):
//   0–30   : backdrop + floating dots fade in
//   10–40  : ink splatters bouncing in around the edges
//   30–80  : speed lines burst
//   55     : white flash
//   58     : comic burst pops in
//   65     : logo reveal (spring)
//   80     : subtitle plate
//   100–180: hold + subtle breathing + ambient dots
// =================================================================
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Backdrop />
      <FloatingDots />

      {/* Edge ink splatters (bounce in early) */}
      <Splatter from={8}  x={220}  y={200}  size={420} color={RED} />
      <Splatter from={14} x={1720} y={260}  size={360} color={RED_DEEP} />
      <Splatter from={20} x={300}  y={900}  size={400} color={RED_DEEP} />
      <Splatter from={26} x={1680} y={880}  size={440} color={RED} />
      <Splatter from={32} x={960}  y={120}  size={300} color={RED} />
      <Splatter from={38} x={960}  y={980}  size={300} color={RED_DEEP} />

      <SpeedLines from={30} dur={60} color={WHITE} />

      <Flash at={55} dur={14} />

      <Sequence from={58}>
        <Burst from={0} />
      </Sequence>

      <Sequence from={65}>
        <Logo from={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
