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

// ---------- Persistent halftone paper background ----------
const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 30) * 6;
  const pulse = 0.12 + Math.sin(frame / 8) * 0.04;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${BG} 0%, ${BG_DEEP} 100%)` }}>
      {/* big halftone wash */}
      <AbsoluteFill
        style={{
          background: halftone(RED, 22, pulse),
          opacity: pulse,
          transform: `translate(${drift}px, ${-drift}px)`,
        }}
      />
      {/* secondary cream dots */}
      <AbsoluteFill
        style={{
          background: halftone(CREAM, 9, 0.06),
          opacity: 0.08,
          transform: `translate(${-drift}px, ${drift}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Speed lines (radial comic burst) ----------
const SpeedLines: React.FC<{ count?: number; color?: string; rotation?: number }> = ({
  count = 24,
  color = OUTLINE,
  rotation = 0,
}) => (
  <svg viewBox="-500 -500 1000 1000" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    <g transform={`rotate(${rotation})`}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r1 = 180;
        const r2 = 700;
        const w = 2 + (i % 3) * 2;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r1}
            y1={Math.sin(a) * r1}
            x2={Math.cos(a) * r2}
            y2={Math.sin(a) * r2}
            stroke={color}
            strokeWidth={w}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  </svg>
);

// ---------- Comic burst (star shape) ----------
const ComicBurst: React.FC<{ points?: number; fill: string; stroke?: string }> = ({
  points = 14,
  fill,
  stroke = OUTLINE,
}) => {
  const path: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 220 : 130;
    const wob = 1 + Math.sin(i * 3.7) * 0.18;
    const rr = r * wob;
    path.push(`${i === 0 ? "M" : "L"} ${Math.cos(a) * rr} ${Math.sin(a) * rr}`);
  }
  path.push("Z");
  return (
    <svg viewBox="-260 -260 520 520" style={{ width: "100%", height: "100%" }}>
      <path d={path.join(" ")} fill={fill} stroke={stroke} strokeWidth={10} strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Scene 1: SPLAT! burst with falling drop ----------
const SplatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Drop falls
  const dropY = interpolate(frame, [0, 14], [-300, 540], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.9, 0.3),
  });
  const dropStretch = interpolate(frame, [0, 12, 14], [1, 1.8, 0.4], { extrapolateRight: "clamp" });
  const dropOpacity = interpolate(frame, [13, 16], [1, 0], { extrapolateRight: "clamp" });

  // SPLAT burst appears
  const burst = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const burstScale = interpolate(burst, [0, 1], [0, 1.05]);
  const burstRot = interpolate(frame, [14, 60], [0, 18], { extrapolateRight: "clamp" });

  // SPEED LINES converging
  const linesOpacity = interpolate(frame, [14, 22, 50], [0, 1, 0.4], { extrapolateRight: "clamp" });
  const linesRot = interpolate(frame, [14, 60], [0, 30]);

  // SPLAT word
  const wordPop = spring({ frame: frame - 18, fps, config: { damping: 8, stiffness: 260 } });
  const wordScale = interpolate(wordPop, [0, 1], [0, 1]);
  const wordRot = interpolate(frame, [18, 60], [-15, -8], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* falling drop */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 40,
          height: 60,
          marginLeft: -20,
          transform: `translateY(${dropY}px) scaleY(${dropStretch})`,
          opacity: dropOpacity,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: RED,
            border: `4px solid ${OUTLINE}`,
            borderRadius: "50% 50% 50% 50% / 30% 30% 70% 70%",
          }}
        />
      </div>

      {/* speed lines */}
      <div style={{ position: "absolute", width: 1400, height: 1400, opacity: linesOpacity }}>
        <SpeedLines count={28} color={OUTLINE} rotation={linesRot} />
      </div>

      {/* comic burst SPLAT */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          transform: `scale(${burstScale}) rotate(${burstRot}deg)`,
          filter: `drop-shadow(10px 10px 0 ${OUTLINE})`,
        }}
      >
        <ComicBurst points={16} fill={RED} stroke={OUTLINE} />
      </div>

      {/* SPLAT! word */}
      <div
        style={{
          position: "absolute",
          fontFamily: bangers,
          fontSize: 220,
          color: CREAM,
          letterSpacing: "0.04em",
          transform: `scale(${wordScale}) rotate(${wordRot}deg)`,
          textShadow: `${comicOutline(6)}, 12px 12px 0 ${OUTLINE}`,
          WebkitTextStroke: `2px ${OUTLINE}`,
        }}
      >
        SPLAT!
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 2: MIMIC letter slam ----------
const MimicSlam: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letters = "MIMIC".split("");

  // page shake on slam
  const shake = interpolate(frame, [0, 4, 10, 16, 22], [0, -10, 8, -4, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translate(${shake}px, ${-shake / 2}px)` }}>
      {/* secondary halftone burst behind */}
      <div style={{ position: "absolute", width: 1200, height: 1200, opacity: 0.55 }}>
        <ComicBurst points={20} fill={CREAM} stroke={OUTLINE} />
      </div>

      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - i * 3, fps, config: { damping: 7, stiffness: 220 } });
          const scale = interpolate(s, [0, 1], [3, 1]);
          const opacity = interpolate(s, [0, 0.4, 1], [0, 1, 1]);
          const rot = (i % 2 === 0 ? -1 : 1) * 4 * (1 - s) + (i % 2 === 0 ? -3 : 3);
          const y = interpolate(s, [0, 1], [-300, 0]);
          return (
            <span
              key={i}
              style={{
                fontFamily: bangers,
                fontSize: 320,
                color: CREAM,
                lineHeight: 1,
                transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
                opacity,
                textShadow: `${comicOutline(8)}, 14px 14px 0 ${RED}, 14px 14px 0 ${OUTLINE}`,
                WebkitTextStroke: `3px ${OUTLINE}`,
                display: "inline-block",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 3: SLASH + MADNESS ----------
const SlashMadness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // slash sweep
  const slashProgress = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const slashFade = interpolate(frame, [22, 55], [1, 0.25], { extrapolateRight: "clamp" });

  // MADNESS letters
  const letters = "MADNESS".split("");

  // POW corner stamp
  const powPop = spring({ frame: frame - 26, fps, config: { damping: 8, stiffness: 240 } });
  const powScale = interpolate(powPop, [0, 1], [0, 1]);
  const powWiggle = Math.sin((frame - 26) / 4) * 4;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* slash */}
      <svg width={1800} height={500} viewBox="0 0 1800 500" style={{ position: "absolute", opacity: slashFade }}>
        <defs>
          <filter id="rough3">
            <feTurbulence baseFrequency="0.8" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="8" />
          </filter>
        </defs>
        {/* black underlay (outline) */}
        <path
          d="M 60 260 Q 900 80 1740 260"
          stroke={OUTLINE}
          strokeWidth={50}
          strokeLinecap="round"
          fill="none"
          filter="url(#rough3)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - slashProgress}
        />
        {/* red fill on top */}
        <path
          d="M 60 260 Q 900 80 1740 260"
          stroke={RED}
          strokeWidth={28}
          strokeLinecap="round"
          fill="none"
          filter="url(#rough3)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - slashProgress}
        />
      </svg>

      {/* MADNESS letters bursting up */}
      <div style={{ display: "flex", gap: 4, position: "absolute", marginTop: 120 }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - 14 - i * 2, fps, config: { damping: 8, stiffness: 240 } });
          const scale = interpolate(s, [0, 1], [0.2, 1]);
          const opacity = interpolate(s, [0, 0.5], [0, 1]);
          const rot = (i % 2 === 0 ? -4 : 4);
          const y = interpolate(s, [0, 1], [200, 0]);
          return (
            <span
              key={i}
              style={{
                fontFamily: bangers,
                fontSize: 230,
                color: RED,
                lineHeight: 1,
                transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
                opacity,
                textShadow: `${comicOutline(7)}, 10px 10px 0 ${OUTLINE}`,
                WebkitTextStroke: `3px ${OUTLINE}`,
                display: "inline-block",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* MIMIC sitting above */}
      <div style={{ position: "absolute", marginTop: -240, opacity: 0.85 }}>
        <span
          style={{
            fontFamily: bangers,
            fontSize: 200,
            color: CREAM,
            letterSpacing: "0.02em",
            textShadow: `${comicOutline(6)}, 8px 8px 0 ${OUTLINE}`,
            WebkitTextStroke: `2px ${OUTLINE}`,
          }}
        >
          MIMIC
        </span>
      </div>

      {/* POW corner stamp */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 120,
          width: 320,
          height: 320,
          transform: `scale(${powScale}) rotate(${-15 + powWiggle}deg)`,
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <ComicBurst points={12} fill={CREAM} stroke={OUTLINE} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: bangers,
            fontSize: 100,
            color: RED,
            textShadow: `${comicOutline(4)}`,
            WebkitTextStroke: `2px ${OUTLINE}`,
          }}
        >
          POW!
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 4: Final stamp ----------
const FinalStamp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleBreathe = 1 + Math.sin(frame / 14) * 0.018;
  const badgePop = spring({ frame: frame - 4, fps, config: { damping: 9, stiffness: 200 } });
  const badgeScale = interpolate(badgePop, [0, 1], [0, 1]);
  const badgeWiggle = Math.sin(frame / 6) * 2;

  const sign = interpolate(frame, [10, 36], [0, 100], { extrapolateRight: "clamp" });
  const sparkleOpacity = interpolate(frame, [0, 12, 40, 48], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* radial speed lines fade */}
      <div style={{ position: "absolute", width: 1800, height: 1800, opacity: 0.25 }}>
        <SpeedLines count={36} color={OUTLINE} rotation={frame * 0.3} />
      </div>

      <div style={{ textAlign: "center", transform: `scale(${titleBreathe})` }}>
        <div
          style={{
            fontFamily: bangers,
            fontSize: 240,
            color: CREAM,
            lineHeight: 0.95,
            letterSpacing: "0.02em",
            textShadow: `${comicOutline(8)}, 14px 14px 0 ${RED}, 14px 14px 0 ${OUTLINE}`,
            WebkitTextStroke: `3px ${OUTLINE}`,
          }}
        >
          MIMIC
        </div>
        <div
          style={{
            fontFamily: bangers,
            fontSize: 240,
            color: RED,
            lineHeight: 0.95,
            letterSpacing: "0.02em",
            textShadow: `${comicOutline(8)}, 14px 14px 0 ${OUTLINE}`,
            WebkitTextStroke: `3px ${OUTLINE}`,
          }}
        >
          MADNESS
        </div>

        {/* hand-signed ink mode */}
        <div
          style={{
            marginTop: 28,
            fontFamily: caveat,
            fontWeight: 700,
            fontSize: 96,
            color: CREAM,
            transform: `rotate(-3deg)`,
            textShadow: `${comicOutline(4)}`,
          }}
        >
          <span style={{ display: "inline-block", clipPath: `inset(0 ${100 - sign}% 0 0)` }}>
            ~ ink mode ~
          </span>
        </div>
      </div>

      {/* corner BAM badge */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          right: 120,
          width: 280,
          height: 280,
          transform: `scale(${badgeScale}) rotate(${-12 + badgeWiggle}deg)`,
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <ComicBurst points={14} fill={RED} stroke={OUTLINE} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: bangers,
            fontSize: 110,
            color: CREAM,
            WebkitTextStroke: `3px ${OUTLINE}`,
            textShadow: `${comicOutline(4)}`,
          }}
        >
          BAM!
        </div>
      </div>

      {/* sparkle stars */}
      {Array.from({ length: 10 }).map((_, i) => {
        const ang = (i / 10) * Math.PI * 2;
        const r = 520;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        const bob = Math.sin(frame / 8 + i) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(${x}px, ${y + bob}px) rotate(${i * 36 + frame}deg)`,
              opacity: sparkleOpacity,
            }}
          >
            <svg width="60" height="60" viewBox="-12 -12 24 24">
              <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={i % 2 === 0 ? CREAM : RED} stroke={OUTLINE} strokeWidth={2} />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Quick flash between scenes ----------
const FlashCut: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, 6], [0, 1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: CREAM, opacity }} />;
};

// ---------- Main ----------
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <PaperBackground />

      {/* Scene 1: SPLAT (0-50) */}
      <Sequence from={0} durationInFrames={50}>
        <SplatScene />
      </Sequence>

      {/* Flash cut */}
      <Sequence from={46} durationInFrames={8}>
        <FlashCut />
      </Sequence>

      {/* Scene 2: MIMIC slam (50-100) */}
      <Sequence from={50} durationInFrames={50}>
        <MimicSlam />
      </Sequence>

      {/* Flash cut */}
      <Sequence from={96} durationInFrames={8}>
        <FlashCut />
      </Sequence>

      {/* Scene 3: slash + MADNESS (100-160) */}
      <Sequence from={100} durationInFrames={60}>
        <SlashMadness />
      </Sequence>

      {/* Scene 4: final stamp (160-210) */}
      <Sequence from={160} durationInFrames={50}>
        <FinalStamp />
      </Sequence>
    </AbsoluteFill>
  );
};

