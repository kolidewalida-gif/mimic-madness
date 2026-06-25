import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: BANGERS } = loadBangers("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: ANTON } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: INTER } = loadInter("normal", { weights: ["700"], subsets: ["latin"] });

const BG = "#070707";
const INK = "#0a0a0a";
const RED = "#e10b1d";
const RED_DEEP = "#8a0612";
const CREAM = "#f4ecdf";

// ───────────────────────────── Persistent layers ─────────────────────────────
const Halftone: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  const tx = interpolate(frame, [0, 195], [0, -120]);
  const ty = interpolate(frame, [0, 195], [0, 60]);
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.5px)",
        backgroundSize: "14px 14px",
        backgroundPosition: `${tx}px ${ty}px`,
        mixBlendMode: "screen",
      }}
    />
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill
      style={{
        opacity: 0.18,
        mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='${seed}'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>")`,
      }}
    />
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

// ───────────────────────────── Scene 1 — Ink drop & impact ─────────────────────────────
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // drop falls from top
  const dropY = interpolate(frame, [0, 22], [-400, 540], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.55, 0, 0.78, 0.2),
  });
  const dropStretch = interpolate(frame, [0, 20], [1, 1.6], { extrapolateRight: "clamp" });
  const dropOpacity = frame < 23 ? 1 : 0;

  // shockwave ring
  const ringScale = spring({ frame: frame - 22, fps, config: { damping: 18, stiffness: 80 } });
  const ringOpacity = interpolate(frame, [22, 55], [0.9, 0], { extrapolateRight: "clamp" });

  // splat splats (custom blobby splash)
  const splatScale = spring({ frame: frame - 22, fps, config: { damping: 12, stiffness: 140 } });
  const splatPath = useMemo(
    () =>
      "M512,140 C620,140 720,180 770,260 C840,250 900,310 880,380 C940,420 940,520 870,560 C880,640 800,700 720,680 C700,760 560,790 480,720 C390,790 260,740 270,640 C180,620 160,510 230,460 C190,380 260,300 350,310 C390,220 470,140 512,140 Z",
    []
  );

  // flash on impact
  const flash = interpolate(frame, [22, 26, 34], [0, 0.85, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flash }} />
      <Halftone />

      {/* falling drop */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          transform: `translate(-50%, ${dropY}px) scaleY(${dropStretch}) scaleX(${1 / dropStretch})`,
          width: 60,
          height: 90,
          background: RED,
          borderRadius: "50% 50% 50% 50% / 35% 35% 65% 65%",
          boxShadow: `0 0 60px ${RED}aa`,
          opacity: dropOpacity,
        }}
      />

      {/* shockwave */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          borderRadius: "50%",
          border: `6px solid ${RED}`,
          transform: `scale(${ringScale * 28})`,
          opacity: ringOpacity,
        }}
      />

      {/* SPLAT */}
      <svg
        viewBox="0 0 1024 900"
        width={1100}
        height={950}
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          transform: `translate(-50%, -50%) scale(${splatScale})`,
          transformOrigin: "center",
        }}
      >
        <path d={splatPath} fill={RED} />
        {/* outer droplets */}
        {[0, 60, 120, 180, 240, 300].map((a, i) => {
          const r = 380 + (i % 3) * 40;
          const x = 512 + Math.cos((a * Math.PI) / 180) * r;
          const y = 460 + Math.sin((a * Math.PI) / 180) * r;
          return <circle key={i} cx={x} cy={y} r={28 + (i % 2) * 14} fill={RED} />;
        })}
        {/* inner highlight */}
        <ellipse cx={470} cy={380} rx={70} ry={28} fill={CREAM} opacity={0.25} />
      </svg>
    </AbsoluteFill>
  );
};

// ───────────────────────────── Scene 2 — Cartoon mask flip-in ─────────────────────────────
const Mask: React.FC<{ delay: number; x: number; rot: number; emoji: string }> = ({
  delay,
  x,
  rot,
  emoji,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 180 } });
  const bob = Math.sin((frame - delay) / 6) * 8;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: "50%",
        transform: `translate(-50%, calc(-50% + ${bob}px)) scale(${s}) rotate(${rot * s}deg)`,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          width: 260,
          height: 320,
          borderRadius: "50% 50% 45% 45% / 60% 60% 40% 40%",
          background: CREAM,
          border: `10px solid ${INK}`,
          boxShadow: `12px 12px 0 ${RED}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 140,
        }}
      >
        {emoji}
      </div>
    </div>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Halftone opacity={0.06} />
      {/* big diagonal red brush */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(115deg, transparent 30%, ${RED_DEEP} 30%, ${RED} 55%, transparent 55%)`,
          opacity: interpolate(frame, [0, 12], [0, 0.95], { extrapolateRight: "clamp" }),
          clipPath: `inset(0 ${interpolate(frame, [0, 18], [100, 0], { extrapolateRight: "clamp" })}% 0 0)`,
        }}
      />
      <Mask delay={4} x={28} rot={-12} emoji="😎" />
      <Mask delay={10} x={50} rot={6} emoji="🤡" />
      <Mask delay={16} x={72} rot={-8} emoji="😈" />
    </AbsoluteFill>
  );
};

// ───────────────────────────── Scene 3 — Title slam "MIMIC MASTER" ─────────────────────────────
const Letter: React.FC<{ char: string; delay: number; color: string }> = ({
  char,
  delay,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 8, stiffness: 160, mass: 0.9 } });
  const drop = interpolate(s, [0, 1], [-220, 0]);
  const rot = interpolate(s, [0, 1], [-30, 0]);
  const scale = interpolate(s, [0, 0.6, 1], [1.6, 0.92, 1]);
  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${drop}px) rotate(${rot}deg) scale(${scale})`,
        color,
        WebkitTextStroke: `4px ${INK}`,
        textShadow: `6px 8px 0 ${INK}`,
        margin: "0 2px",
      }}
    >
      {char}
    </span>
  );
};

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slamFlash = interpolate(frame, [0, 4, 14], [0, 0.7, 0], { extrapolateRight: "clamp" });
  const ribbon = spring({ frame: frame - 22, fps, config: { damping: 14, stiffness: 140 } });
  const subtitleY = interpolate(ribbon, [0, 1], [80, 0]);
  const shakeX = Math.sin(frame / 1.5) * (frame < 18 ? 6 : 1);

  const word1 = "MIMIC";
  const word2 = "MASTER";

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Halftone opacity={0.05} />
      <AbsoluteFill style={{ backgroundColor: CREAM, opacity: slamFlash }} />

      {/* radial burst */}
      <svg
        viewBox="-200 -200 400 400"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: interpolate(frame, [2, 10, 60], [0, 0.4, 0.15]),
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 60;
          const r2 = 380;
          const x1 = Math.cos(a) * r1;
          const y1 = Math.sin(a) * r1;
          const x2 = Math.cos(a) * r2;
          const y2 = Math.sin(a) * r2;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={RED} strokeWidth={10} />
          );
        })}
      </svg>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transform: `translateX(${shakeX}px)`,
        }}
      >
        <div
          style={{
            fontFamily: BANGERS,
            fontSize: 230,
            lineHeight: 1,
            color: CREAM,
            letterSpacing: 4,
          }}
        >
          {word1.split("").map((c, i) => (
            <Letter key={`a${i}`} char={c} delay={i * 2} color={CREAM} />
          ))}
        </div>
        <div
          style={{
            fontFamily: BANGERS,
            fontSize: 230,
            lineHeight: 1,
            color: RED,
            letterSpacing: 4,
          }}
        >
          {word2.split("").map((c, i) => (
            <Letter key={`b${i}`} char={c} delay={10 + i * 2} color={RED} />
          ))}
        </div>

        {/* subtitle ribbon */}
        <div
          style={{
            marginTop: 30,
            transform: `translateY(${subtitleY}px) rotate(-2deg)`,
            opacity: ribbon,
            background: RED,
            color: CREAM,
            fontFamily: ANTON,
            fontSize: 44,
            letterSpacing: 8,
            padding: "12px 40px",
            border: `4px solid ${INK}`,
            boxShadow: `8px 8px 0 ${INK}`,
          }}
        >
          INK MODE · MIMIC MASTER
        </div>
      </AbsoluteFill>

      {/* corner POW */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 120,
          transform: `rotate(${-15 + Math.sin(frame / 4) * 4}deg) scale(${spring({
            frame: frame - 18,
            fps,
            config: { damping: 10, stiffness: 200 },
          })})`,
          fontFamily: BANGERS,
          fontSize: 110,
          color: CREAM,
          WebkitTextStroke: `5px ${INK}`,
          textShadow: `6px 6px 0 ${RED}`,
        }}
      >
        POW!
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── Main ─────────────────────────────
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: INTER }}>
      <Sequence durationInFrames={55}>
        <Scene1 />
      </Sequence>
      <Sequence from={55} durationInFrames={50}>
        <Scene2 />
      </Sequence>
      <Sequence from={105} durationInFrames={90}>
        <Scene3 />
      </Sequence>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
