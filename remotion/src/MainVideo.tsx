import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
  Img,
  staticFile,
} from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";

const { fontFamily: CINZEL } = loadCinzel("normal", { weights: ["900"], subsets: ["latin"] });

const VOID = "#040404";
const INK = "#ece3cf";
const RED = "#b32525";

const RoughInkDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id="brushRough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="inkBleed" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.8" result="b" />
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="b" in2="n" scale="1.6" />
      </filter>
      <filter id="softBloom" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="halftone" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.1" fill="rgba(255,255,255,0.08)" />
      </pattern>
    </defs>
  </svg>
);

const BlackStage: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 45%, #1a1208 0%, #0a0703 35%, #020202 75%, #000 100%)",
    }}
  />
);

const Halftone: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.35 }}>
    <svg width="100%" height="100%">
      <rect width="100%" height="100%" fill="url(#halftone)" />
    </svg>
  </AbsoluteFill>
);

const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.28 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed={seed} />
          <feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 1.4 -0.6" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

const Flicker: React.FC = () => {
  const frame = useCurrentFrame();
  const f1 = Math.sin(frame * 0.31) * 0.5 + 0.5;
  const f2 = random(`flick-${Math.floor(frame / 3)}`);
  const a = 0.03 + f1 * 0.025 + f2 * 0.04;
  return (
    <AbsoluteFill
      style={{
        background: "rgba(255, 240, 210, 1)",
        mixBlendMode: "overlay",
        opacity: a,
        pointerEvents: "none",
      }}
    />
  );
};

const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  const motes = Array.from({ length: 60 }, (_, i) => {
    const sx = random(`dx-${i}`) * 1920;
    const sy = random(`dy-${i}`) * 1080;
    const drift = Math.sin(frame * 0.012 + i) * 18;
    const fall = (frame * (0.15 + random(`dv-${i}`) * 0.35)) % 1080;
    const size = 1 + random(`ds-${i}`) * 2.4;
    const a = 0.15 + random(`da-${i}`) * 0.35;
    return (
      <circle
        key={i}
        cx={sx + drift}
        cy={(sy + fall) % 1080}
        r={size}
        fill="#fff1cc"
        opacity={a}
      />
    );
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", filter: "blur(0.6px)" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">{motes}</svg>
    </AbsoluteFill>
  );
};

const Chroma: React.FC = () => {
  const frame = useCurrentFrame();
  const o = 0.06 + Math.sin(frame * 0.07) * 0.02;
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 48% 50%, transparent 55%, rgba(255,40,40,0.18) 100%)",
          mixBlendMode: "screen",
          opacity: o,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 52% 50%, transparent 55%, rgba(40,120,255,0.16) 100%)",
          mixBlendMode: "screen",
          opacity: o,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)",
      pointerEvents: "none",
    }}
  />
);

const InkSplatter: React.FC<{ x: number; y: number; scale: number; delay: number; rot?: number }> = ({
  x, y, scale, delay, rot = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80, mass: 1.2 } });
  const a = interpolate(frame - delay, [0, 8, 60, 90], [0, 0.95, 0.85, 0.7], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s * scale})`,
        opacity: a,
        filter: "url(#inkBleed)",
      }}
    >
      <svg width="420" height="420" viewBox="-100 -100 200 200">
        <g fill={INK}>
          <path d="M -55 -10 C -70 -45, -25 -75, 5 -55 C 35 -70, 70 -40, 55 -5 C 75 25, 40 65, 5 50 C -25 75, -65 45, -55 10 Z" />
          <circle cx="-78" cy="20" r="9" />
          <circle cx="72" cy="-30" r="6" />
          <circle cx="40" cy="70" r="8" />
          <circle cx="-40" cy="-72" r="5" />
          <circle cx="85" cy="40" r="3.5" />
          <circle cx="-90" cy="-35" r="3" />
          <ellipse cx="60" cy="-60" rx="4" ry="2" transform="rotate(30 60 -60)" />
        </g>
      </svg>
    </div>
  );
};

const Drift: React.FC<{ children: React.ReactNode; amount?: number }> = ({ children, amount = 1 }) => {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame * 0.018) * 8 * amount;
  const dy = Math.cos(frame * 0.014) * 6 * amount;
  const sc = 1 + Math.sin(frame * 0.009) * 0.008 * amount;
  return (
    <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${sc})` }}>{children}</AbsoluteFill>
  );
};

const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <InkSplatter x={420} y={300} scale={1.4} delay={6} rot={-18} />
      <InkSplatter x={1540} y={780} scale={1.1} delay={18} rot={42} />
      <InkSplatter x={960} y={540} scale={0.55} delay={32} rot={5} />
      <InkSplatter x={260} y={880} scale={0.45} delay={44} rot={120} />
      <InkSplatter x={1720} y={220} scale={0.5} delay={56} rot={-60} />
    </AbsoluteFill>
  );
};

const BrushLetter: React.FC<{ char: string; delay: number; size?: number }> = ({ char, delay, size = 220 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delay;
  const reveal = interpolate(local, [0, 22], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = spring({ frame: local - 18, fps, config: { damping: 18, stiffness: 120 } });
  const settle = 1 + (1 - s) * 0.04;
  const jitterX = Math.sin((local + delay) * 0.18) * 0.6;
  const jitterY = Math.cos((local + delay) * 0.21) * 0.4;
  const bleedAlpha = interpolate(local, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        transform: `translate(${jitterX}px, ${jitterY}px) scale(${settle})`,
        fontFamily: CINZEL,
        fontSize: size,
        fontWeight: 900,
        color: INK,
        letterSpacing: "0.02em",
        WebkitTextStroke: `1px ${INK}`,
        textShadow: `0 0 ${24 * bleedAlpha}px rgba(255,240,210,${0.35 * bleedAlpha})`,
        filter: "url(#brushRough)",
        clipPath: `inset(0 ${reveal}% 0 0)`,
      }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const title = "MIMIC MASTER";
  const letters = title.split("");
  const perLetter = 6;
  const bgAlpha = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 380,
          background: "radial-gradient(ellipse, rgba(255,235,180,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: bgAlpha,
        }}
      />
      <div style={{ display: "flex", whiteSpace: "nowrap", filter: "url(#softBloom)" }}>
        {letters.map((c, i) => (
          <BrushLetter key={i} char={c} delay={i * perLetter} size={220} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const a = interpolate(frame, [0, 12, 60, 80], [0, 1, 1, 0.85], { extrapolateRight: "clamp" });
  const scale = interpolate(s, [0, 1], [1.5, 1]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 230 }}>
      <div
        style={{
          transform: `scale(${scale}) rotate(-1.2deg)`,
          opacity: a,
          padding: "10px 36px",
          border: `3px solid ${RED}`,
          background: "rgba(0,0,0,0.45)",
          color: RED,
          fontFamily: CINZEL,
          fontSize: 36,
          letterSpacing: "0.32em",
          fontWeight: 900,
          filter: "url(#brushRough)",
          boxShadow: "0 0 60px rgba(179,37,37,0.35)",
        }}
      >
        INK MODE · CHAPTER ONE
      </div>
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const outro = interpolate(frame, [195, 210], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Hero image animations
  const imgIn = interpolate(frame, [0, 35], [0, 1], { extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [0, 210], [1.18, 1.04]);
  const pan = Math.sin(frame * 0.012) * 6;

  // Light sweep across the artwork
  const sweep = interpolate(frame, [40, 90], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweepA = interpolate(frame, [40, 65, 90], [0, 0.55, 0]);

  // Title reveal
  const titleSpring = spring({ frame: frame - 95, fps, config: { damping: 14, stiffness: 110 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleA = interpolate(frame, [95, 115], [0, 1], { extrapolateRight: "clamp" });
  const titleClip = interpolate(frame, [100, 140], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Ink splatter accents around title (delayed)
  const splatA = interpolate(frame, [108, 130], [0, 1], { extrapolateRight: "clamp" });

  // Subtitle plate
  const subSpring = spring({ frame: frame - 140, fps, config: { damping: 16, stiffness: 130 } });
  const subScale = interpolate(subSpring, [0, 1], [1.3, 1]);
  const subA = interpolate(frame, [140, 158], [0, 1], { extrapolateRight: "clamp" });

  // Flash on title slam
  const flash = interpolate(frame, [95, 100, 110], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden", opacity: outro }}>
      <RoughInkDefs />

      {/* Hero artwork with Ken Burns */}
      <AbsoluteFill
        style={{
          opacity: imgIn,
          transform: `scale(${zoom}) translate(${pan}px, ${-pan * 0.6}px)`,
        }}
      >
        <Img
          src={staticFile("ink-intro.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Atmospheric cover */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.9) 100%)",
          pointerEvents: "none",
        }}
      />

      <Dust />

      {/* Diagonal light sweep */}
      <AbsoluteFill style={{ pointerEvents: "none", opacity: sweepA, mixBlendMode: "screen" }}>
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: `${sweep}%`,
            width: "30%",
            height: "160%",
            background:
              "linear-gradient(100deg, transparent 35%, rgba(255,235,200,0.85) 50%, transparent 65%)",
            transform: "rotate(12deg)",
            filter: "blur(20px)",
          }}
        />
      </AbsoluteFill>

      {/* Ink splatters flanking the title */}
      <AbsoluteFill style={{ opacity: splatA }}>
        <InkSplatter x={360} y={720} scale={0.65} delay={108} rot={-22} />
        <InkSplatter x={1580} y={760} scale={0.6} delay={114} rot={38} />
      </AbsoluteFill>

      {/* Flash */}
      <AbsoluteFill style={{ background: "rgba(255,240,210,1)", opacity: flash, mixBlendMode: "screen", pointerEvents: "none" }} />

      {/* Title block */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 200 }}>
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleA,
            clipPath: `inset(0 ${titleClip}% 0 0)`,
            fontFamily: CINZEL,
            fontWeight: 900,
            color: INK,
            fontSize: 168,
            letterSpacing: "0.06em",
            textShadow: "0 6px 40px rgba(0,0,0,0.85), 0 0 30px rgba(255,220,180,0.25)",
            filter: "url(#brushRough)",
            lineHeight: 1,
          }}
        >
          MIMIC MASTER
        </div>

        <div
          style={{
            marginTop: 28,
            transform: `scale(${subScale}) rotate(-1deg)`,
            opacity: subA,
            padding: "10px 32px",
            border: `3px solid ${RED}`,
            background: "rgba(0,0,0,0.55)",
            color: RED,
            fontFamily: CINZEL,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "0.42em",
            filter: "url(#brushRough)",
            boxShadow: "0 0 60px rgba(179,37,37,0.4)",
          }}
        >
          INK MODE · CHAPTER ONE
        </div>
      </AbsoluteFill>

      {/* Persistent finishing layers */}
      <Halftone />
      <Chroma />
      <Vignette />
      <Flicker />
      <Grain opacity={0.3} />
    </AbsoluteFill>
  );
};