import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: fredoka } = loadFredoka("normal", { weights: ["600", "700"] });
const { fontFamily: caveat } = loadCaveat("normal", { weights: ["700"] });

const BG = "#0a0a0a";
const BG_DEEP = "#050505";
const INK = "#f5f5f5";
const RED = "#ee3434";
const RED_DEEP = "#c01818";
const CREAM = "#f4ead5";
const OUTLINE = "#0a0a0a";

// Comic-style thick black outline (text-shadow stack)
const comicOutline = (size: number, color = OUTLINE) =>
  [
    `${size}px 0 0 ${color}`,
    `-${size}px 0 0 ${color}`,
    `0 ${size}px 0 ${color}`,
    `0 -${size}px 0 ${color}`,
    `${size}px ${size}px 0 ${color}`,
    `-${size}px ${size}px 0 ${color}`,
    `${size}px -${size}px 0 ${color}`,
    `-${size}px -${size}px 0 ${color}`,
  ].join(", ");

// Halftone dot pattern (comic newsprint)
const halftone = (color = RED, size = 14, opacity = 0.18) =>
  `radial-gradient(circle, ${color} 22%, transparent 23%) 0 0 / ${size}px ${size}px`;

// ---------- Persistent atmosphere ----------
const InkAtmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = Math.sin(frame / 40) * 8;
  const vignette = interpolate(frame, [0, 30, durationInFrames - 30, durationInFrames], [0.4, 0.7, 0.7, 0.5]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${BG} 0%, ${BG_DEEP} 100%)` }}>
      <AbsoluteFill style={{ background: PAPER_GRAIN, transform: `translateY(${drift}px)` }} />
      {/* subtle ink splatters drifting */}
      {Array.from({ length: 14 }).map((_, i) => {
        const seed = i * 137.5;
        const x = (seed % 100);
        const y = ((seed * 1.7) % 100);
        const size = 2 + ((i * 13) % 7);
        const opacity = 0.04 + ((i % 5) * 0.012);
        const float = Math.sin((frame + i * 20) / 60) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 4 === 0 ? RED : INK,
              opacity,
              transform: `translateY(${float}px)`,
              filter: "blur(1px)",
            }}
          />
        );
      })}
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignette}) 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Scene 1: Ink drop falls and splatters ----------
const InkDropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Drop falls from top
  const dropY = interpolate(frame, [0, 22], [-200, 540], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.9, 0.4),
  });
  const dropStretch = interpolate(frame, [0, 18, 22], [1, 1.6, 0.6], { extrapolateRight: "clamp" });
  const dropOpacity = interpolate(frame, [20, 23], [1, 0], { extrapolateRight: "clamp" });

  // Splatter
  const splatProgress = spring({ frame: frame - 22, fps, config: { damping: 12, stiffness: 120, mass: 1 } });
  const splatScale = interpolate(splatProgress, [0, 1], [0, 1]);
  const ringScale = interpolate(frame, [22, 60], [0, 6], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [22, 60], [0.6, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Falling drop */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 28,
          height: 40,
          marginLeft: -14,
          transform: `translateY(${dropY}px) scaleY(${dropStretch})`,
          opacity: dropOpacity,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: RED,
            borderRadius: "50% 50% 50% 50% / 30% 30% 70% 70%",
            boxShadow: `0 0 20px ${RED}80`,
          }}
        />
      </div>

      {/* Splatter pool */}
      <svg
        width="600"
        height="200"
        viewBox="-300 -100 600 200"
        style={{
          position: "absolute",
          transform: `scale(${splatScale})`,
          transformOrigin: "center",
        }}
      >
        <g fill={RED}>
          <ellipse cx="0" cy="0" rx="120" ry="22" />
          <circle cx="-140" cy="-8" r="8" />
          <circle cx="160" cy="6" r="11" />
          <circle cx="-80" cy="14" r="5" />
          <circle cx="90" cy="-18" r="4" />
          <circle cx="-180" cy="10" r="3" />
          <circle cx="200" cy="-4" r="6" />
          <circle cx="40" cy="22" r="3" />
          <circle cx="-50" cy="-22" r="3" />
          <ellipse cx="-60" cy="0" rx="80" ry="18" opacity="0.9" />
        </g>
      </svg>

      {/* Shockwave ring */}
      <div
        style={{
          position: "absolute",
          width: 100,
          height: 100,
          border: `2px solid ${RED}`,
          borderRadius: "50%",
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Scene 2: "MIMIC" stroke reveal ----------
const MimicReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 35], [0, 100], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const lift = interpolate(frame, [0, 40], [30, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const inkBleed = interpolate(frame, [20, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          transform: `translateY(${lift}px)`,
          opacity,
        }}
      >
        {/* Background ink-bleed shadow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -20,
            background: `radial-gradient(ellipse at center, ${RED}30 0%, transparent 70%)`,
            opacity: inkBleed,
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            fontSize: 280,
            letterSpacing: "-0.04em",
            color: INK,
            lineHeight: 1,
            position: "relative",
            clipPath: `inset(0 ${100 - reveal}% 0 0)`,
          }}
        >
          MIMIC
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 3: Red slash + "MADNESS" ----------
const SlashAndMadness: React.FC = () => {
  const frame = useCurrentFrame();

  // Red ink slash
  const slashProgress = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const slashFade = interpolate(frame, [40, 70], [1, 0.25], { extrapolateRight: "clamp" });

  // MADNESS reveal after slash
  const madnessReveal = interpolate(frame, [16, 50], [0, 100], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const madnessOpacity = interpolate(frame, [16, 24], [0, 1], { extrapolateRight: "clamp" });

  // Sub label
  const subOpacity = interpolate(frame, [44, 60], [0, 1], { extrapolateRight: "clamp" });
  const subLift = interpolate(frame, [44, 60], [12, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* The slash, drawn left to right */}
      <svg
        width={1700}
        height={420}
        viewBox="0 0 1700 420"
        style={{ position: "absolute", opacity: slashFade }}
      >
        <defs>
          <linearGradient id="slashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RED_DEEP} />
            <stop offset="50%" stopColor={RED} />
            <stop offset="100%" stopColor={RED_DEEP} />
          </linearGradient>
          <filter id="rough">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </defs>
        <path
          d="M 40 210 Q 850 70 1660 210"
          stroke="url(#slashGrad)"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
          filter="url(#rough)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - slashProgress}
        />
      </svg>

      {/* MIMIC stays soft in background */}
      <div
        style={{
          position: "absolute",
          fontFamily: grotesk,
          fontWeight: 700,
          fontSize: 280,
          letterSpacing: "-0.04em",
          color: INK,
          lineHeight: 1,
          marginTop: -180,
          opacity: 0.95,
        }}
      >
        MIMIC
      </div>

      {/* MADNESS - red, below */}
      <div
        style={{
          position: "absolute",
          marginTop: 120,
          fontFamily: grotesk,
          fontWeight: 700,
          fontSize: 280,
          letterSpacing: "-0.04em",
          color: RED,
          lineHeight: 1,
          opacity: madnessOpacity,
          clipPath: `inset(0 0 0 ${100 - madnessReveal}%)`,
          textShadow: `0 0 60px ${RED}60`,
        }}
      >
        MADNESS
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: subOpacity,
          transform: `translateY(${subLift}px)`,
        }}
      >
        <span style={{ width: 60, height: 2, background: INK, opacity: 0.6 }} />
        <span
          style={{
            fontFamily: grotesk,
            fontWeight: 500,
            fontSize: 32,
            letterSpacing: "0.5em",
            color: INK,
            textTransform: "uppercase",
          }}
        >
          Ink Mode
        </span>
        <span style={{ width: 60, height: 2, background: INK, opacity: 0.6 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 4: Final stamp ----------
const FinalStamp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stampScale = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });
  const stampOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const sign = interpolate(frame, [10, 45], [0, 100], { extrapolateRight: "clamp" });

  const breathe = 1 + Math.sin(frame / 18) * 0.012;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", transform: `scale(${breathe})` }}>
        <div
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            fontSize: 280,
            letterSpacing: "-0.04em",
            color: INK,
            lineHeight: 1,
          }}
        >
          MIMIC
        </div>
        <div
          style={{
            fontFamily: grotesk,
            fontWeight: 700,
            fontSize: 280,
            letterSpacing: "-0.04em",
            color: RED,
            lineHeight: 1,
            textShadow: `0 0 80px ${RED}50`,
          }}
        >
          MADNESS
        </div>

        {/* Hand-signed ink mode */}
        <div
          style={{
            marginTop: 30,
            fontFamily: caveat,
            fontWeight: 700,
            fontSize: 84,
            color: INK,
            transform: `rotate(-3deg)`,
            opacity: stampOpacity,
          }}
        >
          <span
            style={{
              display: "inline-block",
              clipPath: `inset(0 ${100 - sign}% 0 0)`,
            }}
          >
            ~ ink mode ~
          </span>
        </div>
      </div>

      {/* Corner stamp */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 100,
          width: 140,
          height: 140,
          border: `4px solid ${RED}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${stampScale}) rotate(-12deg)`,
          color: RED,
          fontFamily: grotesk,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.1,
          boxShadow: `0 0 40px ${RED}40`,
        }}
      >
        EST.
        <br />
        2026
      </div>
    </AbsoluteFill>
  );
};

// ---------- Main ----------
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <InkAtmosphere />

      {/* Scene 1: ink drop (0-60) */}
      <Sequence from={0} durationInFrames={60}>
        <InkDropScene />
      </Sequence>

      {/* Scene 2: MIMIC reveal (50-115) */}
      <Sequence from={50} durationInFrames={75}>
        <MimicReveal />
      </Sequence>

      {/* Scene 3: slash + MADNESS (105-175) */}
      <Sequence from={105} durationInFrames={75}>
        <SlashAndMadness />
      </Sequence>

      {/* Scene 4: final stamp (165-210) */}
      <Sequence from={165} durationInFrames={45}>
        <FinalStamp />
      </Sequence>
    </AbsoluteFill>
  );
};