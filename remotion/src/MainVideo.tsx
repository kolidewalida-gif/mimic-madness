import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  random,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadCreepster } from "@remotion/google-fonts/Creepster";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: creepster } = loadCreepster("normal", { weights: ["400"] });

/* ---------- Stormy Violet Palette ---------- */
const BG_DEEP = "#05010f";
const BG = "#0c0420";
const CLOUD_DARK = "#1a0a3a";
const CLOUD_MID = "#2d1465";
const CLOUD_HIGH = "#5b2db8";
const CLOUD_RIM = "#9b6dff";
const LIGHTNING = "#f0e7ff";
const LIGHTNING_GLOW = "#c4b1ff";
const VIOLET_GLOW = "#a855f7";
const PINK_FLASH = "#ff4fd8";

/* ---------- Helpers ---------- */

// Soft cloud blob — radial gradient ellipse
const Cloud: React.FC<{
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  opacity?: number;
  blur?: number;
}> = ({ x, y, rx, ry, color, opacity = 1, blur = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x - rx,
      top: y - ry,
      width: rx * 2,
      height: ry * 2,
      borderRadius: "50%",
      background: `radial-gradient(ellipse at 50% 45%, ${color} 0%, ${color} 30%, transparent 70%)`,
      opacity,
      filter: blur ? `blur(${blur}px)` : undefined,
      pointerEvents: "none",
    }}
  />
);

/* ---------- Persistent stormy sky ---------- */

const StormySky: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Parallax drift — slow background, faster foreground
  const drift = (speed: number) => (frame * speed) % (width + 600);

  // Slow vertical breathing
  const breathe = Math.sin(frame * 0.04) * 8;

  // Lightning flash schedule (4 flashes total)
  const flashes = [22, 70, 118, 170];
  const flash = flashes.reduce((acc, f) => {
    const local = frame - f;
    if (local < 0 || local > 14) return acc;
    // Quick flash envelope: peak fast, decay
    const v =
      local < 2
        ? local / 2
        : Math.max(0, 1 - (local - 2) / 12);
    return Math.max(acc, v);
  }, 0);

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: BG_DEEP }}>
      {/* Deep vignette gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${BG} 0%, ${BG_DEEP} 65%, #000 100%)`,
        }}
      />

      {/* Background cloud layer (deepest, slowest) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-drift(0.3)}px)`,
          opacity: 0.85,
        }}
      >
        {[0, 1, 2].map((rep) =>
          [
            { x: 200, y: 280, rx: 380, ry: 180 },
            { x: 700, y: 220, rx: 460, ry: 200 },
            { x: 1250, y: 320, rx: 420, ry: 190 },
            { x: 1750, y: 240, rx: 500, ry: 220 },
          ].map((c, i) => (
            <Cloud
              key={`bg-${rep}-${i}`}
              x={c.x + rep * (width + 400) + breathe}
              y={c.y + Math.sin(frame * 0.03 + i) * 6}
              rx={c.rx}
              ry={c.ry}
              color={CLOUD_DARK}
              opacity={0.9}
              blur={28}
            />
          )),
        )}
      </div>

      {/* Mid cloud layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-drift(0.7)}px)`,
        }}
      >
        {[0, 1, 2].map((rep) =>
          [
            { x: 100, y: 740, rx: 420, ry: 200 },
            { x: 600, y: 800, rx: 500, ry: 240 },
            { x: 1200, y: 760, rx: 460, ry: 220 },
            { x: 1700, y: 820, rx: 480, ry: 230 },
          ].map((c, i) => (
            <Cloud
              key={`mid-${rep}-${i}`}
              x={c.x + rep * (width + 400)}
              y={c.y + Math.sin(frame * 0.05 + i * 1.7) * 10}
              rx={c.rx}
              ry={c.ry}
              color={CLOUD_MID}
              opacity={0.95}
              blur={18}
            />
          )),
        )}
      </div>

      {/* Foreground cloud layer (fastest, sharpest) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-drift(1.2)}px)`,
        }}
      >
        {[0, 1].map((rep) =>
          [
            { x: 150, y: 150, rx: 280, ry: 120 },
            { x: 800, y: 90, rx: 340, ry: 130 },
            { x: 1500, y: 130, rx: 300, ry: 120 },
            { x: 300, y: 960, rx: 320, ry: 130 },
            { x: 1100, y: 990, rx: 380, ry: 150 },
            { x: 1850, y: 940, rx: 340, ry: 140 },
          ].map((c, i) => (
            <Cloud
              key={`fg-${rep}-${i}`}
              x={c.x + rep * (width + 400)}
              y={c.y + Math.sin(frame * 0.07 + i * 0.9) * 8}
              rx={c.rx}
              ry={c.ry}
              color={CLOUD_HIGH}
              opacity={0.55}
              blur={10}
            />
          )),
        )}
      </div>

      {/* Rim glow on top of mid clouds (subtle violet sheen) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 55%, ${CLOUD_RIM}22 0%, transparent 55%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Atmospheric fog at bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 320,
          background: `linear-gradient(to top, ${BG_DEEP} 0%, ${CLOUD_DARK}aa 50%, transparent 100%)`,
        }}
      />

      {/* Lightning flash overlay (full-screen) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 35%, ${LIGHTNING}cc 0%, ${LIGHTNING_GLOW}66 30%, transparent 65%)`,
          opacity: flash * 0.85,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      {/* Lightning tint */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: PINK_FLASH,
          opacity: flash * 0.08,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- Animated lightning bolts ---------- */

type Bolt = {
  startFrame: number;
  duration: number;
  d: string;
  strokeWidth: number;
  x: number;
  y: number;
  scale: number;
};

const BOLTS: Bolt[] = [
  // Quick zap at first flash
  {
    startFrame: 20,
    duration: 14,
    d: "M0 0 L-25 90 L15 100 L-20 220 L25 240 L-35 380",
    strokeWidth: 8,
    x: 480,
    y: 80,
    scale: 1,
  },
  // Right side flash
  {
    startFrame: 68,
    duration: 14,
    d: "M0 0 L30 110 L-20 140 L35 260 L-15 290 L40 420",
    strokeWidth: 9,
    x: 1500,
    y: 60,
    scale: 1.05,
  },
  // Center mega bolt (when text reveals)
  {
    startFrame: 116,
    duration: 18,
    d: "M0 0 L-40 160 L25 180 L-35 350 L30 380 L-20 540 L20 580",
    strokeWidth: 12,
    x: 960,
    y: 30,
    scale: 1.15,
  },
  // Final dramatic bolt at climax
  {
    startFrame: 168,
    duration: 22,
    d: "M0 0 L-50 140 L40 170 L-45 320 L50 360 L-30 520 L40 560 L-20 720",
    strokeWidth: 14,
    x: 960,
    y: 0,
    scale: 1.25,
  },
];

const LightningBolt: React.FC<{ bolt: Bolt }> = ({ bolt }) => {
  const frame = useCurrentFrame();
  const local = frame - bolt.startFrame;
  if (local < 0 || local > bolt.duration) return null;

  // Trace progress
  const trace = interpolate(local, [0, 3], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Hold then fade
  const opacity =
    local < 4
      ? trace
      : interpolate(local, [4, bolt.duration], [1, 0], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });

  // Subtle jitter on the bolt
  const jitter = local < 6 ? Math.sin(local * 9) * 2 : 0;

  return (
    <svg
      style={{
        position: "absolute",
        left: bolt.x - 200,
        top: bolt.y,
        width: 400,
        height: 800,
        overflow: "visible",
        opacity,
        pointerEvents: "none",
        transform: `translateX(${jitter}px) scale(${bolt.scale})`,
        transformOrigin: "200px 0",
      }}
    >
      <defs>
        <filter id={`glow-${bolt.startFrame}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(200, 0)" filter={`url(#glow-${bolt.startFrame})`}>
        {/* Outer glow */}
        <path
          d={bolt.d}
          stroke={VIOLET_GLOW}
          strokeWidth={bolt.strokeWidth + 12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.45}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - trace}
        />
        {/* Mid glow */}
        <path
          d={bolt.d}
          stroke={LIGHTNING_GLOW}
          strokeWidth={bolt.strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.85}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - trace}
        />
        {/* Core */}
        <path
          d={bolt.d}
          stroke={LIGHTNING}
          strokeWidth={bolt.strokeWidth - 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - trace}
        />
      </g>
    </svg>
  );
};

const LightningStorm: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {BOLTS.map((b) => (
      <LightningBolt key={b.startFrame} bolt={b} />
    ))}
  </AbsoluteFill>
);

/* ---------- Floating embers / dust particles ---------- */

const Embers: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const count = 40;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i * 7.13;
        const baseX = random(`x${i}`) * width;
        const baseY = random(`y${i}`) * height;
        const drift = Math.sin(frame * 0.02 + seed) * 30;
        const rise = -(frame * (0.3 + random(`s${i}`) * 0.6)) % height;
        const y = (baseY + rise + height) % height;
        const size = 1.5 + random(`r${i}`) * 3;
        const opacity = 0.3 + Math.sin(frame * 0.06 + seed) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: baseX + drift,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: CLOUD_RIM,
              boxShadow: `0 0 ${size * 4}px ${VIOLET_GLOW}`,
              opacity: Math.max(0, opacity),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- "MIMIC MASTER" Title — letter-by-letter reveal ---------- */

const TITLE_LINE1 = "MIMIC";
const TITLE_LINE2 = "MASTER";
const TITLE_START = 50; // when reveal begins
const PER_LETTER = 5;   // frames between each letter

const TitleLetter: React.FC<{
  char: string;
  index: number;
  totalIndex: number;
  fontSize: number;
}> = ({ char, index, totalIndex, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - (TITLE_START + totalIndex * PER_LETTER);

  // Spring drop-in
  const drop = spring({
    frame: local,
    fps,
    config: { damping: 11, stiffness: 180, mass: 0.9 },
  });

  // Initial values
  const y = interpolate(drop, [0, 1], [-180, 0]);
  const scale = interpolate(drop, [0, 1], [0.3, 1]);
  const opacity = interpolate(local, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotate = interpolate(drop, [0, 1], [-25 + (index % 2) * 50, 0]);

  // Subtle continuous wobble after settled
  const wobble = local > 30 ? Math.sin((local - 30) * 0.12 + totalIndex) * 1.5 : 0;

  // Big lightning flash boost at frame 116 (mega bolt)
  const flashBoost = interpolate(
    frame,
    [116, 122, 132],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const flashScale = 1 + flashBoost * 0.06;

  if (local < 0) return null;

  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${y}px) scale(${scale * flashScale}) rotate(${rotate + wobble}deg)`,
        opacity,
        color: LIGHTNING,
        WebkitTextStroke: `4px ${BG_DEEP}`,
        textShadow: `
          0 0 ${20 + flashBoost * 40}px ${VIOLET_GLOW},
          0 0 ${40 + flashBoost * 60}px ${VIOLET_GLOW},
          0 0 ${80 + flashBoost * 80}px ${PINK_FLASH}aa,
          6px 8px 0 ${BG_DEEP},
          0 14px 24px rgba(0,0,0,0.7)
        `,
        fontSize,
        fontFamily: bangers,
        letterSpacing: "0.04em",
        lineHeight: 1,
        marginInline: char === " " ? "0.35em" : 0,
      }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Subtle camera-style breathing
  const settleFrame = TITLE_START + (TITLE_LINE1.length + TITLE_LINE2.length) * PER_LETTER + 10;
  const breathe = Math.sin(frame * 0.05) * 6;

  // Final climactic zoom on last bolt
  const climax = spring({
    frame: frame - 165,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const climaxScale = interpolate(climax, [0, 1], [1, 1.08]);

  // Underline ink stroke reveal
  const underlineProgress = interpolate(
    frame,
    [settleFrame, settleFrame + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${breathe}px) scale(${climaxScale})`,
      }}
    >
      {/* Behind-text radial halo */}
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${VIOLET_GLOW}55 0%, ${PINK_FLASH}22 35%, transparent 65%)`,
          filter: "blur(20px)",
          opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" }),
          mixBlendMode: "screen",
        }}
      />

      {/* Line 1 — MIMIC */}
      <div style={{ display: "flex", justifyContent: "center", whiteSpace: "nowrap" }}>
        {TITLE_LINE1.split("").map((c, i) => (
          <TitleLetter
            key={`l1-${i}`}
            char={c}
            index={i}
            totalIndex={i}
            fontSize={260}
          />
        ))}
      </div>

      {/* Line 2 — MASTER */}
      <div style={{ display: "flex", justifyContent: "center", whiteSpace: "nowrap", marginTop: 20 }}>
        {TITLE_LINE2.split("").map((c, i) => (
          <TitleLetter
            key={`l2-${i}`}
            char={c}
            index={i}
            totalIndex={TITLE_LINE1.length + i}
            fontSize={260}
          />
        ))}
      </div>

      {/* Ink underline stroke */}
      <svg
        width={900}
        height={40}
        style={{ marginTop: 30, overflow: "visible" }}
      >
        <path
          d="M30 20 Q 230 5, 450 22 T 870 18"
          stroke={VIOLET_GLOW}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - underlineProgress}
          style={{
            filter: `drop-shadow(0 0 14px ${VIOLET_GLOW}) drop-shadow(0 0 30px ${PINK_FLASH})`,
          }}
        />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Vignette + final whiteout flash ---------- */

const FinalFlash: React.FC = () => {
  const frame = useCurrentFrame();
  // big flash at climax bolt
  const flash = interpolate(
    frame,
    [168, 173, 188],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${LIGHTNING} 0%, ${LIGHTNING_GLOW} 40%, transparent 75%)`,
        opacity: flash * 0.55,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
    }}
  />
);

/* ---------- Root composition ---------- */

export const MainVideo: React.FC = () => {
  // unused vars suppressed
  void creepster;
  return (
    <AbsoluteFill style={{ background: BG_DEEP }}>
      <StormySky />
      <Embers />
      <LightningStorm />
      <Title />
      <FinalFlash />
      <Vignette />
    </AbsoluteFill>
  );
};
