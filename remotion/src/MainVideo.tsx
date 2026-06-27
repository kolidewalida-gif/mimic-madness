import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  random,
} from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { NebulaShader, ChromaShader } from "./ShaderLayer";

const { fontFamily: CINZEL } = loadCinzel("normal", { weights: ["900"], subsets: ["latin"] });
const { fontFamily: ANTON } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: BANGERS } = loadBangers("normal", { weights: ["400"], subsets: ["latin"] });

// ─────────── Palette — Ink Mode: VIOLET / NOIR édition premium ───────────
const VOID    = "#05010d"; // near-black with a violet undertone
const NIGHT   = "#0c0518"; // deep night violet
const PURPLE  = "#6b21a8"; // royal violet
const NEON    = "#a855f7"; // electric violet
const MAGENTA = "#d946ef"; // hot accent
const BONE    = "#f4ecff"; // moonlit bone
const INK     = "#0a0612";

// Legacy aliases kept so existing Scene2/3 code still compiles unchanged
const BG = VOID;
const RED = NEON;
const RED_DEEP = PURPLE;
const CREAM = BONE;

// ────────────────────────── Persistent layers ──────────────────────────
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.92) 100%)",
      pointerEvents: "none",
    }}
  />
);

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill
      style={{
        opacity: 0.22,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='${seed}'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>")`,
      }}
    />
  );
};

const Halftone: React.FC<{ opacity?: number; speed?: number }> = ({
  opacity = 0.07,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const tx = interpolate(frame, [0, 240], [0, -180 * speed]);
  const ty = interpolate(frame, [0, 240], [0, 90 * speed]);
  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: "none",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.9) 1.1px, transparent 1.4px)",
        backgroundSize: "16px 16px",
        backgroundPosition: `${tx}px ${ty}px`,
        mixBlendMode: "screen",
      }}
    />
  );
};

// Drifting ink particles
const InkParticles: React.FC<{ count?: number }> = ({ count = 26 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1;
        const x = random(`x-${seed}`) * 1920;
        const yStart = random(`y-${seed}`) * 1080;
        const size = 2 + random(`s-${seed}`) * 6;
        const drift = interpolate(frame, [0, 240], [0, 80 + random(`d-${seed}`) * 120]);
        const y = (yStart + drift) % 1080;
        const op = 0.15 + random(`o-${seed}`) * 0.35;
        const isRed = random(`c-${seed}`) > 0.65;
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
              background: isRed ? RED : CREAM,
              opacity: op,
              filter: "blur(0.5px)",
              boxShadow: isRed ? `0 0 8px ${RED}` : "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ────────────────────────── Scene 1 — Cinematic ink fall ──────────────────────────
// A single ink drop falls in slow-mo, hits a surface, ripples outward, splashes red.
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow build → impact at frame 32
  const dropY = interpolate(frame, [0, 32], [-500, 620], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.85, 0.15),
  });
  const dropStretch = interpolate(frame, [0, 30], [1, 1.8], { extrapolateRight: "clamp" });
  const dropOpacity = frame < 33 ? 1 : 0;

  // Impact flash
  const flash = interpolate(frame, [32, 36, 50], [0, 1, 0], { extrapolateRight: "clamp" });

  // Shockwave (multi-ring)
  const ring = (delay: number, color: string) => {
    const s = spring({ frame: frame - 32 - delay, fps, config: { damping: 22, stiffness: 60 } });
    const op = interpolate(frame, [32 + delay, 70 + delay], [0.9, 0], { extrapolateRight: "clamp" });
    return { scale: s * 40, opacity: op, color };
  };
  const r1 = ring(0, RED);
  const r2 = ring(4, CREAM);
  const r3 = ring(8, RED_DEEP);

  // Splat splash
  const splat = spring({ frame: frame - 32, fps, config: { damping: 14, stiffness: 120 } });

  // Camera zoom-in at the very end as we cut
  const zoom = interpolate(frame, [40, 70], [1, 1.25], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 70%, ${PURPLE} 0%, ${NIGHT} 45%, ${VOID} 100%)`,
      }}
    >
      <Halftone opacity={0.05} />
      <InkParticles count={20} />

      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 60%" }}>
        {/* Flash */}
        <AbsoluteFill style={{ backgroundColor: CREAM, opacity: flash * 0.6, mixBlendMode: "screen" }} />

        {/* Falling drop with motion blur tail */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: `translate(-50%, ${dropY}px) scaleY(${dropStretch}) scaleX(${1 / Math.sqrt(dropStretch)})`,
            width: 56,
            height: 96,
            background: `linear-gradient(180deg, ${RED} 0%, ${RED_DEEP} 100%)`,
            borderRadius: "50% 50% 50% 50% / 30% 30% 70% 70%",
            boxShadow: `0 0 80px ${RED}cc, 0 0 30px ${RED}`,
            opacity: dropOpacity,
          }}
        />

        {/* Shock rings */}
        {[r1, r2, r3].map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "62%",
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              borderRadius: "50%",
              border: `4px solid ${r.color}`,
              transform: `scale(${r.scale})`,
              opacity: r.opacity,
            }}
          />
        ))}

        {/* Splat */}
        <svg
          viewBox="0 0 1024 900"
          width={1300}
          height={1100}
          style={{
            position: "absolute",
            left: "50%",
            top: "62%",
            transform: `translate(-50%, -50%) scale(${splat})`,
            transformOrigin: "center",
          }}
        >
          <defs>
            <radialGradient id="splatG" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor={RED} />
              <stop offset="70%" stopColor={RED} />
              <stop offset="100%" stopColor={RED_DEEP} />
            </radialGradient>
          </defs>
          <path
            d="M512,160 C620,160 720,200 770,280 C840,270 900,330 880,400 C940,440 940,540 870,580 C880,660 800,720 720,700 C700,780 560,810 480,740 C390,810 260,760 270,660 C180,640 160,530 230,480 C190,400 260,320 350,330 C390,240 470,160 512,160 Z"
            fill="url(#splatG)"
          />
          {/* outer droplets */}
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2 + 0.3;
            const r = 380 + (i % 4) * 50;
            const x = 512 + Math.cos(a) * r;
            const y = 460 + Math.sin(a) * r;
            return <circle key={i} cx={x} cy={y} r={18 + (i % 3) * 14} fill={RED} />;
          })}
          {/* glossy highlight */}
          <ellipse cx={460} cy={360} rx={90} ry={32} fill={CREAM} opacity={0.22} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ────────────────────────── Scene 2 — Ink wipes & secret-society glyphs ──────────────────────────
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Three brush strokes wipe across screen
  const stroke = (idx: number, rot: number, color: string, y: string) => {
    const start = idx * 5;
    const wipe = interpolate(frame, [start, start + 18], [-110, 110], {
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
    });
    return (
      <div
        key={idx}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 180,
          transform: `rotate(${rot}deg)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${color} 15%, ${color} 85%, transparent 100%)`,
            transform: `translateX(${wipe}%)`,
            filter: "url(#roughen)",
          }}
        />
      </div>
    );
  };

  // Glyph reveal
  const glyphScale = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 120 } });
  const glyphRot = interpolate(frame, [20, 60], [-15, 6]);

  // Word "MIMIC" sliding in
  const wordX = spring({ frame: frame - 28, fps, config: { damping: 16, stiffness: 100 } });
  const wordOpacity = interpolate(frame, [28, 38], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="roughen">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.6" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="14" />
          </filter>
        </defs>
      </svg>

      <Halftone opacity={0.06} speed={1.5} />
      <InkParticles count={18} />

      {stroke(0, -8, RED_DEEP, "18%")}
      {stroke(1, 4, RED, "44%")}
      {stroke(2, -3, CREAM, "70%")}

      {/* Central glyph — a stylized mask */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${glyphScale}) rotate(${glyphRot}deg)`,
        }}
      >
        <svg viewBox="0 0 200 240" width={420} height={500}>
          {/* mask outline */}
          <path
            d="M100,20 C150,20 180,60 180,120 C180,180 150,220 100,220 C50,220 20,180 20,120 C20,60 50,20 100,20 Z"
            fill={CREAM}
            stroke={INK}
            strokeWidth={6}
          />
          {/* eyes */}
          <path d="M55,100 Q72,82 90,100 Q72,118 55,100 Z" fill={INK} />
          <path d="M110,100 Q128,82 145,100 Q128,118 110,100 Z" fill={INK} />
          <circle cx="73" cy="100" r="6" fill={RED} />
          <circle cx="128" cy="100" r="6" fill={RED} />
          {/* mouth — a crack */}
          <path d="M70,170 L100,160 L130,170 L115,180 L100,172 L85,180 Z" fill={INK} />
          {/* red mark across forehead */}
          <rect x="40" y="55" width="120" height="10" fill={RED} transform="rotate(-4 100 60)" />
        </svg>
      </div>

      {/* MIMIC word in corner */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          bottom: "12%",
          fontFamily: ANTON,
          fontSize: 90,
          color: CREAM,
          letterSpacing: 6,
          transform: `translateX(${interpolate(wordX, [0, 1], [-200, 0])}px)`,
          opacity: wordOpacity,
        }}
      >
        WHO IS THE
        <div style={{ color: RED, fontSize: 140, lineHeight: 0.9, marginTop: 6 }}>MIMIC?</div>
      </div>
    </AbsoluteFill>
  );
};

// ────────────────────────── Scene 3 — Title reveal "MIMIC MASTER" ──────────────────────────
const Letter: React.FC<{
  char: string;
  delay: number;
  color: string;
  stroke?: string;
  shadow?: string;
}> = ({ char, delay, color, stroke = INK, shadow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 9, stiffness: 170, mass: 0.9 },
  });
  const drop = interpolate(s, [0, 1], [-240, 0]);
  const rot = interpolate(s, [0, 1], [-22, 0]);
  const scale = interpolate(s, [0, 0.55, 1], [1.5, 0.94, 1]);
  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${drop}px) rotate(${rot}deg) scale(${scale})`,
        color,
        WebkitTextStroke: `3px ${stroke}`,
        textShadow: shadow,
        margin: "0 4px",
      }}
    >
      {char}
    </span>
  );
};

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Impact whitewash on slam
  const slamFlash = interpolate(frame, [0, 4, 16], [0, 0.85, 0], { extrapolateRight: "clamp" });
  // Camera shake first 18 frames
  const shake = frame < 18 ? Math.sin(frame * 1.6) * 8 : Math.sin(frame / 4) * 1.5;

  // Plate (subtitle ribbon) drops in
  const plate = spring({ frame: frame - 26, fps, config: { damping: 14, stiffness: 140 } });
  const plateY = interpolate(plate, [0, 1], [120, 0]);

  // Radial burst
  const burstOp = interpolate(frame, [2, 10, 70], [0, 0.55, 0.18]);

  const word1 = "MIMIC";
  const word2 = "MASTER";

  // Floating embers in red
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 55%, ${PURPLE} 0%, ${NIGHT} 40%, ${VOID} 80%)`,
      }}
    >
      <Halftone opacity={0.05} />
      <InkParticles count={30} />

      {/* Splash backdrop — leftover from scene 2 */}
      <AbsoluteFill style={{ backgroundColor: CREAM, opacity: slamFlash, mixBlendMode: "screen" }} />

      {/* Radial burst */}
      <svg
        viewBox="-200 -200 400 400"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: burstOp }}
      >
        {Array.from({ length: 28 }).map((_, i) => {
          const a = (i / 28) * Math.PI * 2;
          const r1 = 50;
          const r2 = 420;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r1}
              y1={Math.sin(a) * r1}
              x2={Math.cos(a) * r2}
              y2={Math.sin(a) * r2}
              stroke={i % 3 === 0 ? RED : RED_DEEP}
              strokeWidth={i % 2 === 0 ? 8 : 4}
            />
          );
        })}
      </svg>

      {/* Big paint splash behind title */}
      <svg
        viewBox="0 0 1024 600"
        width={1700}
        height={1000}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${spring({
            frame: frame - 2,
            fps,
            config: { damping: 18, stiffness: 90 },
          })})`,
        }}
      >
        <path
          d="M120,300 C180,180 360,140 512,180 C660,140 860,180 920,300 C880,420 700,460 512,420 C320,460 160,420 120,300 Z"
          fill={RED_DEEP}
          opacity={0.85}
        />
      </svg>

      {/* Title block */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${shake}px, ${shake / 2}px)`,
        }}
      >
        <div
          style={{
            fontFamily: CINZEL,
            fontWeight: 900,
            fontSize: 200,
            lineHeight: 0.95,
            color: CREAM,
            letterSpacing: 6,
          }}
        >
          {word1.split("").map((c, i) => (
            <Letter
              key={`a${i}`}
              char={c}
              delay={i * 2}
              color={CREAM}
              shadow={`0 6px 0 ${INK}, 0 0 40px rgba(0,0,0,0.8)`}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: CINZEL,
            fontWeight: 900,
            fontSize: 240,
            lineHeight: 0.95,
            color: RED,
            letterSpacing: 8,
            marginTop: -10,
          }}
        >
          {word2.split("").map((c, i) => (
            <Letter
              key={`b${i}`}
              char={c}
              delay={12 + i * 2}
              color={RED}
              shadow={`0 8px 0 ${INK}, 0 0 60px ${RED}aa`}
            />
          ))}
        </div>

        {/* Subtitle plate */}
        <div
          style={{
            marginTop: 36,
            transform: `translateY(${plateY}px) rotate(-1.5deg)`,
            opacity: plate,
            background: INK,
            color: CREAM,
            fontFamily: ANTON,
            fontSize: 36,
            letterSpacing: 14,
            padding: "14px 56px",
            border: `3px solid ${RED}`,
            boxShadow: `8px 8px 0 ${RED}`,
          }}
        >
          INK&nbsp;MODE&nbsp;·&nbsp;CHAPTER&nbsp;ONE
        </div>
      </AbsoluteFill>

      {/* Corner accent — POW! tag */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 130,
          transform: `rotate(${-12 + Math.sin(frame / 5) * 4}deg) scale(${spring({
            frame: frame - 22,
            fps,
            config: { damping: 10, stiffness: 200 },
          })})`,
          fontFamily: BANGERS,
          fontSize: 130,
          color: CREAM,
          WebkitTextStroke: `5px ${INK}`,
          textShadow: `8px 8px 0 ${RED}`,
        }}
      >
        BOOM!
      </div>

      {/* Bottom signature */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: ANTON,
          fontSize: 22,
          letterSpacing: 18,
          color: `${CREAM}80`,
          opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        A MIMICPOLY ORIGINAL
      </div>
    </AbsoluteFill>
  );
};

// ────────────────────────── Main composition ──────────────────────────
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* WebGL shader backdrop — violet ink nebula across the whole intro */}
      <NebulaShader opacity={0.55} intensity={1} />
      <Sequence durationInFrames={70}>
        <Scene1 />
      </Sequence>
      <Sequence from={70} durationInFrames={60}>
        <Scene2 />
      </Sequence>
      <Sequence from={130} durationInFrames={110}>
        <Scene3 />
      </Sequence>
      {/* WebGL shader overlay — chromatic streaks + grain bloom */}
      <ChromaShader opacity={0.35} />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
