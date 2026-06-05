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
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "700"] });

// === NETFLIX PALETTE ===
const BLACK = "#000000";
const RED = "#E50914";
const RED_DEEP = "#8B0000";
const RED_GLOW = "#ff1a1a";
const WHITE = "#ffffff";

// === BACKGROUND (deep black with faint vignette) ===
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: BLACK }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(60,0,0,0.35) 0%, rgba(0,0,0,1) 70%)`,
      }}
    />
  </AbsoluteFill>
);

// === LIGHT STRAND ===
// A thin curved red light streak that sweeps from off-screen edge into center.
const Strand: React.FC<{
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  thickness?: number;
  curve?: number;
}> = ({ startX, startY, delay, duration, thickness = 3, curve = 0 }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0) return null;

  const t = interpolate(local, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Ease-out cubic
  const e = 1 - Math.pow(1 - t, 3);

  const cx = 960;
  const cy = 540;
  const x = interpolate(e, [0, 1], [startX, cx]);
  const y = interpolate(e, [0, 1], [startY, cy]);

  // Direction vector toward center
  const dx = cx - startX;
  const dy = cy - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular for curve offset
  const px = -uy;
  const py = ux;

  // Tail length grows then shrinks as it converges
  const tailLen = interpolate(e, [0, 0.6, 1], [0, 520, 60]);
  const tailX = x - ux * tailLen + px * curve * Math.sin(e * Math.PI);
  const tailY = y - uy * tailLen + py * curve * Math.sin(e * Math.PI);

  // Opacity fade in/out
  const op = interpolate(e, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);

  // Bright head glow
  const headR = interpolate(e, [0, 0.7, 1], [thickness * 2, thickness * 8, 4]);

  const gradId = `g${delay}-${startX}-${startY}`;

  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1={tailX} y1={tailY} x2={x} y2={y} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={RED} stopOpacity={0} />
          <stop offset="60%" stopColor={RED} stopOpacity={0.8} />
          <stop offset="100%" stopColor={WHITE} stopOpacity={1} />
        </linearGradient>
        <filter id={`f${gradId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <line
        x1={tailX}
        y1={tailY}
        x2={x}
        y2={y}
        stroke={`url(#${gradId})`}
        strokeWidth={thickness}
        strokeLinecap="round"
        opacity={op}
        filter={`url(#f${gradId})`}
      />
      {/* Head glow */}
      <circle cx={x} cy={y} r={headR} fill={WHITE} opacity={op} />
      <circle cx={x} cy={y} r={headR * 3} fill={RED_GLOW} opacity={op * 0.6} filter={`url(#f${gradId})`} />
    </svg>
  );
};

// === CONVERGENCE FLASH ===
const Flash: React.FC<{ at: number; color?: string; intensity?: number; dur?: number }> = ({
  at,
  color = WHITE,
  intensity = 1,
  dur = 14,
}) => {
  const frame = useCurrentFrame();
  const f = interpolate(frame, [at, at + 2, at + dur], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: color,
        opacity: f * intensity,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
};

// === RED ENERGY ORB (forms at center after strands converge) ===
const Orb: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0) return null;
  const s = spring({ frame: local, fps: 30, config: { damping: 14, stiffness: 90 } });
  const r = interpolate(s, [0, 1], [0, 800]);
  const op = interpolate(local, [0, 6, 30, 60], [0, 1, 0.7, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - r / 2,
        top: 540 - r / 2,
        width: r,
        height: r,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${WHITE} 0%, ${RED_GLOW} 25%, ${RED} 45%, transparent 75%)`,
        opacity: op,
        filter: "blur(2px)",
        mixBlendMode: "screen",
      }}
    />
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

  const op = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const breathe = local > 14 ? Math.sin((local - 14) * 0.08) * 0.015 : 0;
  const baseScale = spring({ frame: local, fps, config: { damping: 18, stiffness: 110 } });
  const scale = interpolate(baseScale, [0, 1], [1.15, 1]) + breathe;

  // Subtle horizontal shine sweep
  const shine = interpolate(local, [18, 60], [-100, 200], { extrapolateRight: "clamp" });

  const subSpring = spring({ frame: Math.max(0, local - 18), fps, config: { damping: 16 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [20, 0]);

  // Letter spacing breathing
  const letterSpacing = interpolate(local, [0, 25], [0.5, 0.18], {
    extrapolateRight: "clamp",
  });

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
          position: "relative",
          transform: `scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            fontFamily: bebas,
            fontSize: 260,
            color: RED,
            letterSpacing: `${letterSpacing}em`,
            lineHeight: 1,
            textShadow: `0 0 30px ${RED_GLOW}, 0 0 80px ${RED_DEEP}, 0 0 160px ${RED_DEEP}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {TITLE}
          {/* Shine overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(105deg, transparent ${shine - 15}%, rgba(255,255,255,0.55) ${shine}%, transparent ${shine + 15}%)`,
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 30,
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontFamily: inter,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "0.55em",
          color: WHITE,
          textTransform: "uppercase",
        }}
      >
        {SUB}
      </div>
    </AbsoluteFill>
  );
};

// === LINGERING EMBERS ===
const Embers: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 30 }).map((_, i) => {
        const seed = i;
        const baseX = 200 + random(`ex${seed}`) * 1520;
        const baseY = 200 + random(`ey${seed}`) * 680;
        const drift = (frame - from) * (0.3 + random(`ed${seed}`) * 0.8);
        const x = baseX + Math.sin((frame + seed * 30) * 0.02) * 20;
        const y = baseY - drift;
        const size = 2 + random(`es${seed}`) * 4;
        const op = interpolate(frame - from, [0, 10, 60, 100], [0, 0.7, 0.7, 0], {
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: RED_GLOW,
              boxShadow: `0 0 ${size * 4}px ${RED}`,
              opacity: op,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// =================================================================
// MAIN — Netflix-style intro for MIMIC MASTER
// Beats:
//  0-20   : Black + faint vignette breathing
//  10-75  : Red light strands sweep in from all edges toward center
//  70-78  : Bright flash + orb burst
//  78-180 : Logo "MIMIC MASTER" reveals in red with glow, shine sweep,
//           subtitle "A MIMIC ORIGINAL", embers float up
// =================================================================
export const MainVideo: React.FC = () => {
  // Generate strand positions deterministically
  const strands = React.useMemo(() => {
    const arr: { x: number; y: number; delay: number; dur: number; thick: number; curve: number }[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random(`a${i}`) * 0.3;
      const dist = 1300 + random(`d${i}`) * 200;
      const x = 960 + Math.cos(angle) * dist;
      const y = 540 + Math.sin(angle) * dist;
      const delay = 10 + Math.floor(random(`de${i}`) * 30);
      const dur = 38 + Math.floor(random(`du${i}`) * 18);
      const thick = 2 + random(`t${i}`) * 4;
      const curve = (random(`c${i}`) - 0.5) * 180;
      arr.push({ x, y, delay, dur, thick, curve });
    }
    return arr;
  }, []);

  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Backdrop />

      {/* Strands sweep in */}
      {strands.map((s, i) => (
        <Strand
          key={i}
          startX={s.x}
          startY={s.y}
          delay={s.delay}
          duration={s.dur}
          thickness={s.thick}
          curve={s.curve}
        />
      ))}

      {/* Convergence orb */}
      <Orb from={68} />

      {/* Bright flash on convergence */}
      <Flash at={72} color={WHITE} intensity={0.95} dur={16} />
      <Flash at={72} color={RED_GLOW} intensity={0.6} dur={28} />

      {/* Logo */}
      <Sequence from={78}>
        <Logo from={0} />
      </Sequence>

      {/* Embers floating up after logo */}
      <Embers from={82} />

      {/* Final vignette on top */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
