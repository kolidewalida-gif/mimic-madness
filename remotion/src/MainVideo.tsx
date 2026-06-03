import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadLuckiest } from "@remotion/google-fonts/LuckiestGuy";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: luckiest } = loadLuckiest("normal", { weights: ["400"] });

/* Cartoon Ink Palette */
const INK = "#0a0418";
const PURPLE_DEEP = "#2a0d52";
const PURPLE = "#7c2bd6";
const PURPLE_BRIGHT = "#a855f7";
const PINK = "#ff3ea5";
const YELLOW = "#ffd93d";
const CREAM = "#fff6d6";
const WHITE = "#ffffff";

const Halftone: React.FC<{ color?: string; opacity?: number }> = ({
  color = INK,
  opacity = 0.18,
}) => (
  <div
    style={{
      position: "absolute",
      inset: -40,
      backgroundImage: `radial-gradient(${color} 2px, transparent 2.5px)`,
      backgroundSize: "18px 18px",
      opacity,
      pointerEvents: "none",
    }}
  />
);

const SpeedStripes: React.FC<{ from: number; to: number; color?: string }> = ({
  from,
  to,
  color = PINK,
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const dur = to - from;
  if (local < 0 || local > dur) return null;
  const slide = interpolate(local, [0, dur], [0, -200]);
  const op = interpolate(local, [0, 4, dur - 6, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: -100,
        backgroundImage: `repeating-linear-gradient(115deg, ${color} 0 24px, transparent 24px 110px)`,
        transform: `translateX(${slide}px)`,
        opacity: op * 0.55,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

const RadialBurst: React.FC<{ from: number; cx: number; cy: number; color?: string }> = ({
  from,
  cx,
  cy,
  color = YELLOW,
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0 || local > 30) return null;
  const scale = interpolate(local, [0, 12], [0.2, 1.4], { extrapolateRight: "clamp" });
  const op = interpolate(local, [0, 4, 20, 30], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rot = local * 2;
  const rays = 28;
  return (
    <svg
      width={1600}
      height={1600}
      style={{
        position: "absolute",
        left: cx - 800,
        top: cy - 800,
        transform: `scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: "800px 800px",
        opacity: op,
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const r1 = 180;
        const r2 = 780;
        const w = 0.09;
        const x1 = 800 + Math.cos(a - w) * r1;
        const y1 = 800 + Math.sin(a - w) * r1;
        const x2 = 800 + Math.cos(a + w) * r1;
        const y2 = 800 + Math.sin(a + w) * r1;
        const x3 = 800 + Math.cos(a) * r2;
        const y3 = 800 + Math.sin(a) * r2;
        return (
          <polygon
            key={i}
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill={color}
          />
        );
      })}
    </svg>
  );
};

const InkSplat: React.FC<{
  from: number;
  cx: number;
  cy: number;
  size: number;
  color: string;
  rot?: number;
}> = ({ from, cx, cy, size, color, rot = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;
  const s = spring({ frame: local, fps, config: { damping: 9, stiffness: 180 } });
  const scale = interpolate(s, [0, 1], [0, 1]);
  const path =
    "M100,15 C140,5 175,30 180,70 C200,80 195,130 165,140 C170,175 130,200 95,180 C70,210 25,195 20,160 C-10,150 -5,105 25,90 C15,55 55,25 100,15 Z";
  return (
    <svg
      width={size}
      height={size * 1.05}
      viewBox="0 0 200 210"
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - (size * 1.05) / 2,
        transform: `scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: "center",
      }}
    >
      <path d={path} fill={color} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    </svg>
  );
};

const ComicWord: React.FC<{
  from: number;
  duration: number;
  text: string;
  cx: number;
  cy: number;
  size?: number;
  fill?: string;
  rot?: number;
}> = ({ from, duration, text, cx, cy, size = 150, fill = YELLOW, rot = -8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > duration) return null;
  const s = spring({ frame: local, fps, config: { damping: 7, stiffness: 220, mass: 0.7 } });
  const out = interpolate(local, [duration - 8, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(s, [0, 1], [0, 1.05]) * out;
  const wobble = Math.sin(local * 0.5) * 2;
  const spikes = 16;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.78;
    pts.push(`${Math.cos(a) * r * 240 + 250},${Math.sin(a) * r * 140 + 160}`);
  }
  return (
    <div
      style={{
        position: "absolute",
        left: cx - 250,
        top: cy - 160,
        transform: `scale(${scale}) rotate(${rot + wobble}deg)`,
        transformOrigin: "center",
      }}
    >
      <svg width={500} height={320} viewBox="0 0 500 320" style={{ overflow: "visible" }}>
        <polygon
          points={pts.join(" ")}
          fill={fill}
          stroke={INK}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: luckiest,
          fontSize: size,
          color: INK,
          letterSpacing: "0.02em",
          textShadow: `4px 5px 0 ${WHITE}`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const CartoonMask: React.FC<{
  from: number;
  cx: number;
  cy: number;
  size: number;
  color: string;
  rot?: number;
}> = ({ from, cx, cy, size, color, rot = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;
  const s = spring({ frame: local, fps, config: { damping: 8, stiffness: 160 } });
  const sc = interpolate(s, [0, 1], [0, 1]);
  const bob = Math.sin(local * 0.18) * 6;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2 + bob,
        transform: `scale(${sc}) rotate(${rot}deg)`,
        transformOrigin: "center",
      }}
    >
      <ellipse cx={100} cy={110} rx={80} ry={70} fill={color} stroke={INK} strokeWidth={9} />
      <ellipse cx={72} cy={95} rx={18} ry={22} fill={WHITE} stroke={INK} strokeWidth={6} />
      <ellipse cx={128} cy={95} rx={18} ry={22} fill={WHITE} stroke={INK} strokeWidth={6} />
      <circle cx={75} cy={100} r={7} fill={INK} />
      <circle cx={131} cy={100} r={7} fill={INK} />
      <path d="M60 135 Q100 175 140 135" stroke={INK} strokeWidth={8} fill={WHITE} strokeLinejoin="round" />
      <path d="M68 138 L132 138" stroke={INK} strokeWidth={4} />
    </svg>
  );
};

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${PURPLE} 0%, ${PURPLE_DEEP} 55%, ${INK} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 3200,
          height: 3200,
          marginLeft: -1600,
          marginTop: -1600,
          background: `repeating-conic-gradient(from 0deg, ${PURPLE_BRIGHT}22 0deg 8deg, transparent 8deg 16deg)`,
          transform: `rotate(${frame * 0.4}deg)`,
          mixBlendMode: "screen",
        }}
      />
      <Halftone color={INK} opacity={0.25} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const FloatingDrops: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 18 }).map((_, i) => {
        const seed = i * 9.13;
        const x = (random(`x${i}`) * width + frame * (0.4 + random(`s${i}`))) % width;
        const y =
          (random(`y${i}`) * height - frame * (0.6 + random(`t${i}`) * 0.6) + height * 2) %
          height;
        const r = 6 + random(`r${i}`) * 14;
        const color = i % 3 === 0 ? PINK : i % 3 === 1 ? YELLOW : PURPLE_BRIGHT;
        const wob = Math.sin(frame * 0.05 + seed) * 18;
        return (
          <svg
            key={i}
            width={r * 2.5}
            height={r * 3.2}
            viewBox="0 0 50 64"
            style={{ position: "absolute", left: x + wob, top: y, opacity: 0.85 }}
          >
            <path
              d="M25 2 C40 22 46 36 46 46 C46 56 36 62 25 62 C14 62 4 56 4 46 C4 36 10 22 25 2 Z"
              fill={color}
              stroke={INK}
              strokeWidth={3}
            />
            <ellipse cx={18} cy={36} rx={5} ry={9} fill={WHITE} opacity={0.6} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/* SCENE 1: ink drop -> SPLAT (0-50) */
const Scene1Drop: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > 55) return null;
  const dropY = interpolate(frame, [0, 22], [-400, 540], { extrapolateRight: "clamp" });
  const dropOp = interpolate(frame, [22, 24], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stretch = interpolate(frame, [0, 22], [1, 1.6]);

  return (
    <AbsoluteFill>
      <SpeedStripes from={0} to={26} color={YELLOW} />
      <svg
        width={120}
        height={180}
        viewBox="0 0 50 64"
        style={{
          position: "absolute",
          left: 960 - 60,
          top: dropY,
          transform: `scaleY(${stretch})`,
          opacity: dropOp,
        }}
      >
        <path
          d="M25 2 C40 22 46 36 46 46 C46 56 36 62 25 62 C14 62 4 56 4 46 C4 36 10 22 25 2 Z"
          fill={PURPLE_BRIGHT}
          stroke={INK}
          strokeWidth={3}
        />
      </svg>
      <RadialBurst from={22} cx={960} cy={540} color={YELLOW} />
      <InkSplat from={22} cx={960} cy={540} size={900} color={PURPLE_BRIGHT} />
      <InkSplat from={26} cx={960} cy={540} size={620} color={PINK} rot={35} />
      <InkSplat from={28} cx={960} cy={540} size={380} color={CREAM} rot={-15} />
      <ComicWord from={24} duration={22} text="SPLAT!" cx={960} cy={540} size={140} fill={YELLOW} rot={-6} />
    </AbsoluteFill>
  );
};

/* SCENE 2: masks parade + POW (50-110) */
const Scene2Masks: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 50 || frame > 115) return null;
  const local = frame - 50;
  const wipe = interpolate(local, [0, 16], [-1200, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <SpeedStripes from={50} to={86} color={PINK} />
      <Halftone color={YELLOW} opacity={0.1} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${wipe}px)` }}>
        <CartoonMask from={50} cx={420} cy={520} size={380} color={PINK} rot={-12} />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-wipe}px)` }}>
        <CartoonMask from={56} cx={1500} cy={520} size={380} color={YELLOW} rot={12} />
      </div>
      <CartoonMask from={64} cx={960} cy={540} size={460} color={PURPLE_BRIGHT} rot={0} />
      <RadialBurst from={78} cx={960} cy={540} color={PINK} />
      <ComicWord from={80} duration={26} text="POW!" cx={1280} cy={300} size={160} fill={YELLOW} rot={12} />
      <ComicWord from={86} duration={22} text="ZAP!" cx={640} cy={780} size={140} fill={PINK} rot={-14} />
    </AbsoluteFill>
  );
};

/* SCENE 3: TITLE SLAM (110-end) */
const TITLE = "MIMIC MASTER";
const Scene3Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - 110;
  if (local < 0) return null;

  const slam = spring({ frame: local, fps, config: { damping: 9, stiffness: 110, mass: 1.1 } });
  const slamScale = interpolate(slam, [0, 1], [3.6, 1]);
  const slamOp = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const shake = local < 14 ? Math.sin(local * 4) * (1 - local / 14) * 14 : 0;
  const breathe = local > 18 ? Math.sin((local - 18) * 0.12) * 4 : 0;
  const ul = interpolate(local, [16, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spikes = 22;
  const burstPts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.82;
    burstPts.push(`${Math.cos(a) * r * 760 + 800},${Math.sin(a) * r * 320 + 350}`);
  }

  return (
    <AbsoluteFill>
      <RadialBurst from={110} cx={960} cy={540} color={YELLOW} />
      <SpeedStripes from={112} to={150} color={CREAM} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${shake}px, ${breathe}px) scale(${slamScale})`,
          opacity: slamOp,
        }}
      >
        <div style={{ position: "relative", textAlign: "center" }}>
          <svg
            width={1600}
            height={700}
            viewBox="0 0 1600 700"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <polygon
              points={burstPts.join(" ")}
              fill={YELLOW}
              stroke={INK}
              strokeWidth={12}
              strokeLinejoin="round"
            />
          </svg>

          <div
            style={{
              position: "relative",
              fontFamily: bangers,
              fontSize: 260,
              lineHeight: 0.95,
              color: WHITE,
              WebkitTextStroke: `10px ${INK}`,
              textShadow: `
                8px 10px 0 ${INK},
                12px 14px 0 ${PINK},
                16px 18px 0 ${PURPLE_DEEP}
              `,
              letterSpacing: "0.04em",
              transform: "rotate(-3deg)",
              whiteSpace: "nowrap",
              padding: "0 60px",
            }}
          >
            {TITLE}
          </div>

          <svg
            width={1100}
            height={60}
            viewBox="0 0 1100 60"
            style={{
              display: "block",
              margin: "10px auto 0",
              overflow: "visible",
              transform: "rotate(-3deg)",
            }}
          >
            <path
              d="M30 30 Q 200 5, 400 32 T 800 28 T 1070 30"
              stroke={PINK}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - ul}
              style={{ filter: `drop-shadow(4px 5px 0 ${INK})` }}
            />
          </svg>
        </div>
      </div>

      {local > 20 &&
        Array.from({ length: 14 }).map((_, i) => {
          const seed = i * 3.7;
          const x = 200 + random(`sx${i}`) * 1520;
          const y = 120 + random(`sy${i}`) * 800;
          const t = local - 20 - (i % 7) * 3;
          if (t < 0 || t > 30) return null;
          const s = interpolate(t, [0, 6, 24, 30], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const size = 24 + random(`ss${i}`) * 36;
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              style={{
                position: "absolute",
                left: x - size / 2,
                top: y - size / 2,
                transform: `scale(${s}) rotate(${t * 6 + seed}deg)`,
              }}
            >
              <path
                d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
                fill={YELLOW}
                stroke={INK}
                strokeWidth={1.5}
              />
            </svg>
          );
        })}
    </AbsoluteFill>
  );
};

const FlashAt: React.FC<{ at: number; intensity?: number }> = ({ at, intensity = 0.7 }) => {
  const frame = useCurrentFrame();
  const f = interpolate(frame, [at, at + 2, at + 10], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: WHITE,
        opacity: f * intensity,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK, fontFamily: bangers }}>
      <Backdrop />
      <FloatingDrops />
      <Scene1Drop />
      <Scene2Masks />
      <Scene3Title />
      <FlashAt at={22} intensity={0.85} />
      <FlashAt at={78} intensity={0.6} />
      <FlashAt at={110} intensity={0.95} />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};