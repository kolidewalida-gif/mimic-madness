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
const WHITE = "#ffffff";

// === BACKGROUND ===
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: BLACK }} />
);

// === LIGHT STRAND ===
// A thin curved red light streak that sweeps from off-screen edge into center.
const Strand: React.FC<{
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  thickness?: number;
}> = ({ startX, startY, delay, duration, thickness = 3 }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0) return null;

  const t = interpolate(local, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
  });
  const e = 1 - Math.pow(1 - t, 3);

  const cx = 960;
  const cy = 540;
  const x = interpolate(e, [0, 1], [startX, cx]);
  const y = interpolate(e, [0, 1], [startY, cy]);

  const dx = cx - startX;
  const dy = cy - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;

  const tailLen = interpolate(e, [0, 0.6, 1], [0, 480, 80]);
  const tailX = x - ux * tailLen;
  const tailY = y - uy * tailLen;

  const op = interpolate(e, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);

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
          <stop offset="100%" stopColor={RED} stopOpacity={1} />
        </linearGradient>
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
      />
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

  const op = interpolate(local, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const baseScale = spring({ frame: local, fps, config: { damping: 22, stiffness: 90 } });
  const scale = interpolate(baseScale, [0, 1], [1.08, 1]);

  const subSpring = spring({ frame: Math.max(0, local - 18), fps, config: { damping: 16 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [20, 0]);

  const letterSpacing = interpolate(local, [0, 25], [0.4, 0.18], {
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
          transform: `scale(${scale})`,
          transformOrigin: "center",
          fontFamily: bebas,
          fontSize: 260,
          color: RED,
          letterSpacing: `${letterSpacing}em`,
          lineHeight: 1,
        }}
      >
        {TITLE}
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

// =================================================================
// MAIN — Netflix-style intro for MIMIC MASTER (no VFX)
// Pure strands → logo reveal. No flashes, orbs, glows, embers.
// =================================================================
export const MainVideo: React.FC = () => {
  const strands = React.useMemo(() => {
    const arr: { x: number; y: number; delay: number; dur: number; thick: number }[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random(`a${i}`) * 0.3;
      const dist = 1300 + random(`d${i}`) * 200;
      const x = 960 + Math.cos(angle) * dist;
      const y = 540 + Math.sin(angle) * dist;
      const delay = 10 + Math.floor(random(`de${i}`) * 30);
      const dur = 38 + Math.floor(random(`du${i}`) * 18);
      const thick = 2 + random(`t${i}`) * 4;
      arr.push({ x, y, delay, dur, thick });
    }
    return arr;
  }, []);

  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Backdrop />

      {strands.map((s, i) => (
        <Strand
          key={i}
          startX={s.x}
          startY={s.y}
          delay={s.delay}
          duration={s.dur}
          thickness={s.thick}
        />
      ))}

      <Sequence from={78}>
        <Logo from={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
