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
import { loadFont as loadLuckiest } from "@remotion/google-fonts/LuckiestGuy";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: luckiest } = loadLuckiest("normal", { weights: ["400"] });

// === PALETTE ===
const INK = "#0d0a14";
const CREAM = "#fff4d6";
const PINK = "#ff2e7e";
const YELLOW = "#ffce2b";
const VIOLET = "#6b2bd6";
const VIOLET_LIGHT = "#a162ff";
const SKY = "#7ad7ff";

// === HELPERS ===
const HalftoneBG: React.FC<{ color?: string; opacity?: number }> = ({ color = INK, opacity = 0.18 }) => (
  <div
    style={{
      position: "absolute",
      inset: -40,
      backgroundImage: `radial-gradient(${color} 2px, transparent 2.5px)`,
      backgroundSize: "20px 20px",
      opacity,
      pointerEvents: "none",
    }}
  />
);

const SpeedLines: React.FC<{ color?: string; opacity?: number; rotate?: number }> = ({
  color = INK,
  opacity = 0.5,
  rotate = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: -200,
        backgroundImage: `repeating-linear-gradient(${rotate}deg, ${color} 0 6px, transparent 6px 80px)`,
        opacity,
        transform: `translateX(${(frame * 6) % 80}px)`,
        pointerEvents: "none",
      }}
    />
  );
};

const SunBurst: React.FC<{ cx: number; cy: number; r: number; color: string; spin?: number }> = ({
  cx,
  cy,
  r,
  color,
  spin = 0.4,
}) => {
  const frame = useCurrentFrame();
  const rays = 24;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        transform: `rotate(${frame * spin}deg)`,
        background: `conic-gradient(${Array.from({ length: rays })
          .map((_, i) => {
            const start = (i * 360) / rays;
            const mid = start + 360 / rays / 2;
            return `${color} ${start}deg, ${color} ${mid}deg, transparent ${mid}deg, transparent ${
              start + 360 / rays
            }deg`;
          })
          .join(", ")})`,
        borderRadius: "50%",
        pointerEvents: "none",
      }}
    />
  );
};

// === COMIC BURST (star-shape) ===
const ComicBurst: React.FC<{
  cx: number;
  cy: number;
  size: number;
  fill: string;
  stroke?: string;
  rotation?: number;
  spikes?: number;
}> = ({ cx, cy, size, fill, stroke = INK, rotation = 0, spikes = 18 }) => {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.78;
    pts.push(`${Math.cos(a) * r * size + cx},${Math.sin(a) * r * size + cy}`);
  }
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        <polygon
          points={pts.join(" ")}
          fill={fill}
          stroke={stroke}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

// === COMIC WORD (POW!, BAM!) ===
const ComicWord: React.FC<{
  text: string;
  cx: number;
  cy: number;
  fill: string;
  textColor?: string;
  rotation?: number;
  size?: number;
}> = ({ text, cx, cy, fill, textColor = INK, rotation = -8, size = 160 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 7, stiffness: 220, mass: 0.6 } });
  const out = interpolate(frame, [28, 36], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(s, [0, 1], [0, 1.1]) * out;
  const wob = Math.sin(frame * 0.5) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - 250,
        top: cy - 160,
        width: 500,
        height: 320,
        transform: `scale(${scale}) rotate(${rotation + wob}deg)`,
        transformOrigin: "center",
      }}
    >
      <ComicBurst cx={250} cy={160} size={235} fill={fill} spikes={16} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: luckiest,
          fontSize: size,
          color: textColor,
          letterSpacing: "0.02em",
          textShadow: `4px 5px 0 #fff8`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// === INK SPLAT ===
const Splat: React.FC<{ cx: number; cy: number; size: number; color: string; rot?: number }> = ({
  cx,
  cy,
  size,
  color,
  rot = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 9, stiffness: 180 } });
  const scale = interpolate(s, [0, 1], [0, 1]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        transform: `scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: "center",
      }}
    >
      <path
        d="M100,12 C145,4 178,38 178,75 C204,80 200,128 168,140 C176,176 132,200 96,182 C70,212 22,196 18,160 C-12,148 -6,98 26,86 C12,52 56,18 100,12 Z"
        fill={color}
        stroke={INK}
        strokeWidth={8}
        strokeLinejoin="round"
      />
    </svg>
  );
};

// === MASK CHARACTER ===
const Mask: React.FC<{ cx: number; cy: number; size: number; color: string; rot?: number; eye?: "happy" | "wow" }> = ({
  cx,
  cy,
  size,
  color,
  rot = 0,
  eye = "happy",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 8, stiffness: 160 } });
  const sc = interpolate(s, [0, 1], [0, 1]);
  const bob = Math.sin(frame * 0.2) * 8;
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
      <ellipse cx={100} cy={110} rx={82} ry={72} fill={color} stroke={INK} strokeWidth={9} />
      <ellipse cx={72} cy={95} rx={20} ry={24} fill={CREAM} stroke={INK} strokeWidth={6} />
      <ellipse cx={128} cy={95} rx={20} ry={24} fill={CREAM} stroke={INK} strokeWidth={6} />
      {eye === "happy" ? (
        <>
          <circle cx={76} cy={102} r={8} fill={INK} />
          <circle cx={132} cy={102} r={8} fill={INK} />
        </>
      ) : (
        <>
          <circle cx={72} cy={95} r={5} fill={INK} />
          <circle cx={128} cy={95} r={5} fill={INK} />
        </>
      )}
      <path d="M58 138 Q100 178 142 138" stroke={INK} strokeWidth={8} fill={CREAM} strokeLinejoin="round" />
      <path d="M66 142 L134 142" stroke={INK} strokeWidth={4} />
    </svg>
  );
};

// === FLASH ===
const Flash: React.FC<{ at: number; color?: string; intensity?: number }> = ({
  at,
  color = CREAM,
  intensity = 0.9,
}) => {
  const frame = useCurrentFrame();
  const f = interpolate(frame, [at, at + 2, at + 10], [0, 1, 0], {
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

// === SHAKE WRAPPER ===
const Shake: React.FC<{ at: number; amp?: number; dur?: number; children: React.ReactNode }> = ({
  at,
  amp = 18,
  dur = 16,
  children,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  const k = local >= 0 && local < dur ? (1 - local / dur) * amp : 0;
  const dx = Math.sin(local * 3.2) * k;
  const dy = Math.cos(local * 3.6) * k;
  return <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy}px)` }}>{children}</div>;
};

// === BACKGROUND ===
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const colorShift = interpolate(frame, [0, 80, 160], [0, 1, 2], { extrapolateRight: "clamp" });
  const top = colorShift < 1 ? CREAM : colorShift < 2 ? "#ffe3a8" : "#ffb8d8";
  const bot = colorShift < 1 ? "#ffd9b0" : colorShift < 2 ? "#ffb8d8" : "#c9a8ff";
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${top} 0%, ${bot} 100%)` }} />
      <SunBurst cx={960} cy={540} r={1400} color={"#ffffff22"} spin={0.25} />
      <HalftoneBG color={INK} opacity={0.12} />
    </AbsoluteFill>
  );
};

// === FLOATING CONFETTI ===
const Confetti: React.FC<{ count?: number }> = ({ count = 26 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i * 7.13;
        const x = (random(`x${i}`) * 1920 + Math.sin(frame * 0.05 + seed) * 60) % 1920;
        const y = (random(`y${i}`) * 1080 + frame * (1.2 + random(`s${i}`) * 1.4)) % 1200;
        const r = 8 + random(`r${i}`) * 14;
        const c = i % 4 === 0 ? PINK : i % 4 === 1 ? YELLOW : i % 4 === 2 ? VIOLET_LIGHT : SKY;
        const rot = frame * (2 + random(`q${i}`) * 3) + seed * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y - 100,
              width: r,
              height: r * 1.5,
              background: c,
              border: `2px solid ${INK}`,
              transform: `rotate(${rot}deg)`,
              borderRadius: i % 2 === 0 ? "2px" : "50%",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// =================================================================
// SCENE 1 — INK DROP + SPLAT  (frames 0-48)
// =================================================================
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame > 50) return null;
  const dropY = interpolate(frame, [0, 20], [-500, 540], { extrapolateRight: "clamp" });
  const dropStretch = interpolate(frame, [0, 20], [1, 1.6]);
  const dropOp = interpolate(frame, [20, 22], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <svg
        width={120}
        height={180}
        viewBox="0 0 50 64"
        style={{
          position: "absolute",
          left: 960 - 60,
          top: dropY,
          transform: `scaleY(${dropStretch})`,
          opacity: dropOp,
        }}
      >
        <path
          d="M25 2 C40 22 46 36 46 46 C46 56 36 62 25 62 C14 62 4 56 4 46 C4 36 10 22 25 2 Z"
          fill={VIOLET}
          stroke={INK}
          strokeWidth={3}
        />
      </svg>
      <Sequence from={20}>
        <Splat cx={960} cy={540} size={950} color={VIOLET} />
      </Sequence>
      <Sequence from={24}>
        <Splat cx={960} cy={540} size={680} color={PINK} rot={28} />
      </Sequence>
      <Sequence from={26}>
        <Splat cx={960} cy={540} size={420} color={YELLOW} rot={-15} />
      </Sequence>
      <Sequence from={22}>
        <ComicWord text="SPLAT!" cx={960} cy={540} fill={CREAM} rotation={-6} size={150} />
      </Sequence>
    </AbsoluteFill>
  );
};

// =================================================================
// SCENE 2 — MASK TRIO + POW (frames 48-110)
// =================================================================
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 48 || frame > 112) return null;
  const local = frame - 48;
  const leftX = interpolate(local, [0, 14], [-700, 0], { extrapolateRight: "clamp" });
  const rightX = interpolate(local, [4, 18], [700, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <SpeedLines color={INK} opacity={0.12} rotate={20} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${leftX}px)` }}>
        <Sequence from={48}>
          <Mask cx={440} cy={560} size={400} color={PINK} rot={-10} eye="happy" />
        </Sequence>
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${rightX}px)` }}>
        <Sequence from={52}>
          <Mask cx={1480} cy={560} size={400} color={YELLOW} rot={10} eye="wow" />
        </Sequence>
      </div>
      <Sequence from={62}>
        <Mask cx={960} cy={560} size={500} color={VIOLET_LIGHT} rot={0} eye="happy" />
      </Sequence>
      <Sequence from={78}>
        <ComicWord text="POW!" cx={1320} cy={260} fill={YELLOW} rotation={14} size={170} />
      </Sequence>
      <Sequence from={86}>
        <ComicWord text="ZAP!" cx={620} cy={820} fill={PINK} textColor={CREAM} rotation={-12} size={150} />
      </Sequence>
    </AbsoluteFill>
  );
};

// =================================================================
// SCENE 3 — TITLE SLAM (frames 108-end)
// =================================================================
const TITLE = "MIMIC MASTER";
const SUBTITLE = "ENTER THE INK";

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - 108;
  if (local < 0) return null;

  const slamSpring = spring({ frame: local, fps, config: { damping: 9, stiffness: 110, mass: 1.05 } });
  const burstScale = interpolate(slamSpring, [0, 1], [2.8, 1]);
  const op = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const breathe = local > 18 ? Math.sin((local - 18) * 0.13) * 4 : 0;

  const subSpring = spring({
    frame: Math.max(0, local - 22),
    fps,
    config: { damping: 12, stiffness: 160 },
  });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [40, 0]);

  return (
    <AbsoluteFill>
      <Sequence from={108}>
        <SunBurst cx={960} cy={540} r={1200} color={`${YELLOW}55`} spin={0.6} />
      </Sequence>

      {/* Big yellow comic burst behind title */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: op,
          transform: `translateY(${breathe}px)`,
        }}
      >
        <div style={{ transform: `scale(${burstScale})`, transformOrigin: "960px 540px" }}>
          <ComicBurst cx={960} cy={540} size={760} fill={YELLOW} spikes={22} rotation={-4} />
        </div>
      </div>

      {/* Title letters */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: op,
          transform: `translateY(${breathe}px)`,
        }}
      >
        <div
          style={{
            fontFamily: bangers,
            fontSize: 260,
            lineHeight: 0.95,
            color: CREAM,
            WebkitTextStroke: `10px ${INK}`,
            letterSpacing: "0.04em",
            textShadow: `8px 10px 0 ${INK}, 12px 14px 0 ${PINK}, 16px 18px 0 ${VIOLET}`,
            transform: "rotate(-3deg)",
            whiteSpace: "nowrap",
            display: "flex",
            justifyContent: "center",
            padding: "0 60px",
          }}
        >
          {TITLE.split("").map((ch, i) => {
            const t = local - 4 - i * 1.6;
            const s = spring({ frame: Math.max(0, t), fps, config: { damping: 6, stiffness: 230, mass: 0.55 } });
            const sc = interpolate(s, [0, 1], [0, 1]);
            const tilt = (i % 2 === 0 ? -1 : 1) * 5;
            const bob = t > 0 ? Math.sin(t * 0.22 + i) * 4 : 0;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `scale(${sc}) rotate(${tilt}deg) translateY(${bob}px)`,
                  transformOrigin: "center bottom",
                  width: ch === " " ? "0.4em" : undefined,
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            );
          })}
        </div>
      </div>

      {/* Subtitle ribbon */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 760,
          display: "flex",
          justifyContent: "center",
          opacity: subOp,
          transform: `translateY(${subY}px)`,
        }}
      >
        <div
          style={{
            background: INK,
            color: CREAM,
            fontFamily: luckiest,
            fontSize: 70,
            letterSpacing: "0.16em",
            padding: "14px 60px",
            transform: "rotate(-2deg)",
            border: `6px solid ${CREAM}`,
            boxShadow: `10px 12px 0 ${PINK}`,
          }}
        >
          {SUBTITLE}
        </div>
      </div>

      {/* Sparkles */}
      {local > 18 &&
        Array.from({ length: 16 }).map((_, i) => {
          const t = local - 18 - (i % 8) * 2.5;
          if (t < 0 || t > 40) return null;
          const x = 200 + random(`sx${i}`) * 1520;
          const y = 100 + random(`sy${i}`) * 760;
          const s = interpolate(t, [0, 6, 30, 40], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const size = 26 + random(`ss${i}`) * 36;
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
                transform: `scale(${s}) rotate(${t * 6}deg)`,
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

// =================================================================
// MAIN
// =================================================================
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK, fontFamily: bangers }}>
      <Backdrop />
      <Confetti count={22} />

      <Shake at={20} amp={20} dur={14}>
        <Scene1 />
      </Shake>

      <Scene2 />

      <Shake at={108} amp={26} dur={18}>
        <Scene3 />
      </Shake>

      <Flash at={20} color={CREAM} intensity={0.95} />
      <Flash at={62} color={CREAM} intensity={0.5} />
      <Flash at={108} color={YELLOW} intensity={0.85} />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
