import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  random,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: fredoka } = loadFredoka("normal", { weights: ["600", "700"] });
const { fontFamily: caveat } = loadCaveat("normal", { weights: ["700"] });

/* ---------- Palette (Ink theme: black / red / cream) ---------- */
const BG = "#0a0a0a";
const BG_DEEP = "#050505";
const RED = "#ee3434";
const RED_DEEP = "#a81818";
const CREAM = "#f4ead5";
const OUTLINE = "#0a0a0a";
const WHITE = "#ffffff";

/* ---------- Comic helpers ---------- */
const outline = (size: number, color = OUTLINE) =>
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

const halftone = (color: string, size = 14) =>
  `radial-gradient(circle, ${color} 22%, transparent 23%) 0 0 / ${size}px ${size}px`;

/* ---------- Comic burst (star shape) ---------- */
const ComicBurst: React.FC<{ points?: number; fill: string; stroke?: string; jitter?: number }> = ({
  points = 14,
  fill,
  stroke = OUTLINE,
  jitter = 0.18,
}) => {
  const path: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 220 : 130;
    const wob = 1 + Math.sin(i * 3.7) * jitter;
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

/* ---------- Speed lines ---------- */
const SpeedLines: React.FC<{ count?: number; color?: string; rotation?: number; opacity?: number }> = ({
  count = 28,
  color = OUTLINE,
  rotation = 0,
  opacity = 1,
}) => (
  <svg viewBox="-500 -500 1000 1000" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity }}>
    <g transform={`rotate(${rotation})`}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r1 = 200;
        const r2 = 750;
        const w = 2 + (i % 3) * 3;
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

/* ---------- Persistent halftone paper background ---------- */
const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 30) * 6;
  const pulse = 0.1 + Math.sin(frame / 8) * 0.04;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, ${BG} 0%, ${BG_DEEP} 100%)` }}>
      <AbsoluteFill
        style={{
          background: halftone(RED, 22),
          opacity: pulse,
          transform: `translate(${drift}px, ${-drift}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: halftone(CREAM, 9),
          opacity: 0.06,
          transform: `translate(${-drift}px, ${drift}px)`,
        }}
      />
      {/* corner vignettes (comic page edges) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, ${BG_DEEP} 100%)`,
          mixBlendMode: "multiply",
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- Ink drips falling (persistent atmosphere) ---------- */
const InkDrips: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const x = random(`x${i}`) * width;
        const delay = random(`d${i}`) * 60;
        const speed = 1.6 + random(`s${i}`) * 1.2;
        const size = 12 + random(`sz${i}`) * 18;
        const y = ((frame * speed + delay * 3) % (height + 200)) - 100;
        const stretch = 1 + Math.sin((frame + i * 7) / 6) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size * 1.6 * stretch,
              background: i % 3 === 0 ? CREAM : RED,
              border: `3px solid ${OUTLINE}`,
              borderRadius: "50% 50% 50% 50% / 30% 30% 70% 70%",
              opacity: 0.55,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ============================================================
   SCENE 1 — INK DROP + SPLAT  (0-40)
   ============================================================ */
const SceneSplat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dropY = interpolate(frame, [0, 12], [-300, 540], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.9, 0.3),
  });
  const dropStretch = interpolate(frame, [0, 10, 12], [1, 1.9, 0.3], { extrapolateRight: "clamp" });
  const dropOpacity = interpolate(frame, [11, 14], [1, 0], { extrapolateRight: "clamp" });

  const burst = spring({ frame: frame - 12, fps, config: { damping: 8, stiffness: 220, mass: 0.6 } });
  const burstScale = interpolate(burst, [0, 1], [0, 1.1]);
  const burstRot = interpolate(frame, [12, 40], [0, 18], { extrapolateRight: "clamp" });

  const linesOpacity = interpolate(frame, [12, 20, 40], [0, 1, 0.5], { extrapolateRight: "clamp" });
  const linesRot = interpolate(frame, [12, 40], [0, 35]);

  const wordPop = spring({ frame: frame - 16, fps, config: { damping: 8, stiffness: 260 } });
  const wordScale = interpolate(wordPop, [0, 1], [0, 1]);
  const wordRot = interpolate(frame, [16, 40], [-15, -8], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* falling drop */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 56,
          height: 80,
          marginLeft: -28,
          transform: `translateY(${dropY}px) scaleY(${dropStretch})`,
          opacity: dropOpacity,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: RED,
            border: `5px solid ${OUTLINE}`,
            borderRadius: "50% 50% 50% 50% / 30% 30% 70% 70%",
            boxShadow: `inset -8px -10px 0 ${RED_DEEP}`,
          }}
        />
      </div>

      <div style={{ position: "absolute", width: 1500, height: 1500, opacity: linesOpacity }}>
        <SpeedLines count={30} color={OUTLINE} rotation={linesRot} />
      </div>

      <div
        style={{
          position: "absolute",
          width: 950,
          height: 950,
          transform: `scale(${burstScale}) rotate(${burstRot}deg)`,
          filter: `drop-shadow(12px 12px 0 ${OUTLINE})`,
        }}
      >
        <ComicBurst points={16} fill={RED} stroke={OUTLINE} />
      </div>

      <div
        style={{
          position: "absolute",
          fontFamily: bangers,
          fontSize: 240,
          color: CREAM,
          letterSpacing: "0.04em",
          transform: `scale(${wordScale}) rotate(${wordRot}deg)`,
          textShadow: `${outline(7)}, 14px 14px 0 ${OUTLINE}`,
          WebkitTextStroke: `2px ${OUTLINE}`,
        }}
      >
        SPLAT!
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   SCENE 2 — MASK REVEAL (the mimic concept)  (40-95)
   Two cartoon masks slide in, swap faces
   ============================================================ */
const Mask: React.FC<{ color: string; eyeColor: string; smile: boolean }> = ({ color, eyeColor, smile }) => (
  <svg viewBox="-110 -130 220 260" style={{ width: "100%", height: "100%" }}>
    {/* face */}
    <path
      d="M 0 -120 C 70 -120 100 -60 100 0 C 100 70 60 120 0 120 C -60 120 -100 70 -100 0 C -100 -60 -70 -120 0 -120 Z"
      fill={color}
      stroke={OUTLINE}
      strokeWidth={8}
      strokeLinejoin="round"
    />
    {/* eye holes */}
    <ellipse cx={-38} cy={-15} rx={22} ry={28} fill={OUTLINE} />
    <ellipse cx={38} cy={-15} rx={22} ry={28} fill={OUTLINE} />
    <circle cx={-32} cy={-22} r={7} fill={eyeColor} />
    <circle cx={44} cy={-22} r={7} fill={eyeColor} />
    {/* mouth */}
    {smile ? (
      <path d="M -45 55 Q 0 95 45 55" stroke={OUTLINE} strokeWidth={7} fill="none" strokeLinecap="round" />
    ) : (
      <path d="M -45 70 Q 0 40 45 70" stroke={OUTLINE} strokeWidth={7} fill="none" strokeLinecap="round" />
    )}
    {/* tie strings */}
    <path d="M -100 -10 L -150 -40" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
    <path d="M 100 -10 L 150 -40" stroke={OUTLINE} strokeWidth={5} strokeLinecap="round" />
  </svg>
);

const SceneMasks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Mask A slides from left, B from right
  const sA = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 130 } });
  const sB = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 130 } });
  const xA = interpolate(sA, [0, 1], [-900, -240]);
  const xB = interpolate(sB, [0, 1], [900, 240]);

  // swap: at frame 28 they leap toward center & swap
  const swap = spring({ frame: frame - 28, fps, config: { damping: 10, stiffness: 200 } });
  const shiftA = interpolate(swap, [0, 1], [0, 480]);
  const shiftB = interpolate(swap, [0, 1], [0, -480]);
  const flipScale = interpolate(swap, [0, 0.5, 1], [1, 0.4, 1]);

  const wob = Math.sin(frame / 5) * 4;

  // SWAP! text
  const txtPop = spring({ frame: frame - 32, fps, config: { damping: 9, stiffness: 240 } });
  const txtScale = interpolate(txtPop, [0, 1], [0, 1]);
  const txtFade = interpolate(frame, [32, 38, 50, 55], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* burst backdrop */}
      <div style={{ position: "absolute", width: 1300, height: 1300, opacity: 0.5 }}>
        <ComicBurst points={20} fill={CREAM} stroke={OUTLINE} />
      </div>

      {/* Mask A (cream) */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 400,
          transform: `translate(${xA + shiftA}px, ${wob}px) rotate(-8deg) scaleY(${flipScale})`,
          filter: `drop-shadow(8px 8px 0 ${OUTLINE})`,
        }}
      >
        <Mask color={CREAM} eyeColor={RED} smile={true} />
      </div>

      {/* Mask B (red) */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 400,
          transform: `translate(${xB + shiftB}px, ${-wob}px) rotate(8deg) scaleY(${flipScale})`,
          filter: `drop-shadow(8px 8px 0 ${OUTLINE})`,
        }}
      >
        <Mask color={RED} eyeColor={CREAM} smile={false} />
      </div>

      {/* SWAP! word */}
      <div
        style={{
          position: "absolute",
          top: 110,
          fontFamily: bangers,
          fontSize: 160,
          color: RED,
          transform: `scale(${txtScale}) rotate(-4deg)`,
          opacity: txtFade,
          textShadow: `${outline(6)}, 10px 10px 0 ${OUTLINE}`,
          WebkitTextStroke: `2px ${OUTLINE}`,
        }}
      >
        SWAP!
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   SCENE 3 — SLASH + ZAP!  (95-140)
   ============================================================ */
const SceneZap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slashProgress = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const slashFade = interpolate(frame, [22, 45], [1, 0.2], { extrapolateRight: "clamp" });

  // lightning bolt
  const boltPop = spring({ frame: frame - 8, fps, config: { damping: 9, stiffness: 280 } });
  const boltScale = interpolate(boltPop, [0, 1], [0, 1]);
  const boltFlash = (Math.floor(frame / 3) % 2 === 0 ? 1 : 0.7);

  const letters = "ZAP!".split("");

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* slash sweep */}
      <svg width={1900} height={500} viewBox="0 0 1900 500" style={{ position: "absolute", opacity: slashFade }}>
        <defs>
          <filter id="rough3">
            <feTurbulence baseFrequency="0.8" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="8" />
          </filter>
        </defs>
        <path
          d="M 60 260 Q 950 80 1840 260"
          stroke={OUTLINE}
          strokeWidth={56}
          strokeLinecap="round"
          fill="none"
          filter="url(#rough3)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - slashProgress}
        />
        <path
          d="M 60 260 Q 950 80 1840 260"
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

      {/* radial speed lines */}
      <div style={{ position: "absolute", width: 1600, height: 1600, opacity: 0.35 }}>
        <SpeedLines count={36} color={OUTLINE} rotation={frame * 0.6} />
      </div>

      {/* lightning bolt */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "20%",
          width: 300,
          height: 380,
          transform: `scale(${boltScale}) rotate(-10deg)`,
          opacity: boltFlash,
          filter: `drop-shadow(8px 8px 0 ${OUTLINE})`,
        }}
      >
        <svg viewBox="-100 -130 200 280">
          <path
            d="M 30 -120 L -60 30 L -10 30 L -40 130 L 70 -20 L 20 -20 L 60 -120 Z"
            fill={CREAM}
            stroke={OUTLINE}
            strokeWidth={8}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ZAP! letters bursting */}
      <div style={{ display: "flex", gap: 6, position: "absolute", marginTop: 40 }}>
        {letters.map((ch, i) => {
          const s = spring({ frame: frame - 12 - i * 2, fps, config: { damping: 8, stiffness: 240 } });
          const scale = interpolate(s, [0, 1], [0.1, 1]);
          const opacity = interpolate(s, [0, 0.4], [0, 1]);
          const rot = i % 2 === 0 ? -6 : 6;
          const y = interpolate(s, [0, 1], [220, 0]);
          return (
            <span
              key={i}
              style={{
                fontFamily: bangers,
                fontSize: 280,
                color: RED,
                lineHeight: 1,
                transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
                opacity,
                textShadow: `${outline(8)}, 12px 12px 0 ${OUTLINE}`,
                WebkitTextStroke: `3px ${OUTLINE}`,
                display: "inline-block",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* POW corner stamp */}
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 140,
          width: 280,
          height: 280,
          transform: `scale(${interpolate(spring({ frame: frame - 24, fps, config: { damping: 8 } }), [0, 1], [0, 1])}) rotate(${-12 + Math.sin(frame / 5) * 3}deg)`,
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
            fontSize: 86,
            color: RED,
            textShadow: outline(4),
            WebkitTextStroke: `2px ${OUTLINE}`,
          }}
        >
          POW!
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   SCENE 4 — FINAL TITLE "MIMIC MASTER" (140-195)
   ============================================================ */
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big page-slam shake at entry
  const shake = interpolate(frame, [0, 3, 7, 12, 18], [0, -14, 10, -5, 0], { extrapolateRight: "clamp" });

  const titleBreathe = 1 + Math.sin(frame / 14) * 0.02;
  const mimicLetters = "MIMIC".split("");
  const masterLetters = "MASTER".split("");

  const badgePop = spring({ frame: frame - 22, fps, config: { damping: 9, stiffness: 200 } });
  const badgeScale = interpolate(badgePop, [0, 1], [0, 1]);
  const badgeWiggle = Math.sin(frame / 6) * 3;

  const sign = interpolate(frame, [30, 54], [0, 100], { extrapolateRight: "clamp" });

  const sparkleOpacity = interpolate(frame, [0, 12, 45, 55], [0, 1, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        transform: `translate(${shake}px, ${-shake / 2}px)`,
      }}
    >
      {/* radial speed lines fade */}
      <div style={{ position: "absolute", width: 2000, height: 2000, opacity: 0.22 }}>
        <SpeedLines count={40} color={OUTLINE} rotation={frame * 0.3} />
      </div>

      {/* big halftone backing */}
      <div style={{ position: "absolute", width: 1500, height: 1500, opacity: 0.55 }}>
        <ComicBurst points={22} fill={RED} stroke={OUTLINE} jitter={0.1} />
      </div>
      <div style={{ position: "absolute", width: 1100, height: 1100, opacity: 0.85 }}>
        <ComicBurst points={18} fill={CREAM} stroke={OUTLINE} jitter={0.14} />
      </div>

      <div style={{ textAlign: "center", transform: `scale(${titleBreathe})`, position: "relative" }}>
        {/* MIMIC */}
        <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
          {mimicLetters.map((ch, i) => {
            const s = spring({ frame: frame - i * 2, fps, config: { damping: 8, stiffness: 240 } });
            const scale = interpolate(s, [0, 1], [2.5, 1]);
            const opacity = interpolate(s, [0, 0.4], [0, 1]);
            const rot = (i % 2 === 0 ? -1 : 1) * 3;
            const y = interpolate(s, [0, 1], [-260, 0]);
            return (
              <span
                key={i}
                style={{
                  fontFamily: bangers,
                  fontSize: 260,
                  color: CREAM,
                  lineHeight: 0.95,
                  transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
                  opacity,
                  textShadow: `${outline(8)}, 14px 14px 0 ${RED}, 14px 14px 0 ${OUTLINE}`,
                  WebkitTextStroke: `3px ${OUTLINE}`,
                  display: "inline-block",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* MASTER */}
        <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: -20 }}>
          {masterLetters.map((ch, i) => {
            const s = spring({ frame: frame - 10 - i * 2, fps, config: { damping: 8, stiffness: 240 } });
            const scale = interpolate(s, [0, 1], [2.5, 1]);
            const opacity = interpolate(s, [0, 0.4], [0, 1]);
            const rot = (i % 2 === 0 ? 1 : -1) * 3;
            const y = interpolate(s, [0, 1], [260, 0]);
            return (
              <span
                key={i}
                style={{
                  fontFamily: bangers,
                  fontSize: 260,
                  color: RED,
                  lineHeight: 0.95,
                  transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
                  opacity,
                  textShadow: `${outline(8)}, 14px 14px 0 ${OUTLINE}`,
                  WebkitTextStroke: `3px ${OUTLINE}`,
                  display: "inline-block",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* hand-signed tagline */}
        <div
          style={{
            marginTop: 28,
            fontFamily: caveat,
            fontWeight: 700,
            fontSize: 92,
            color: CREAM,
            transform: `rotate(-3deg)`,
            textShadow: outline(4),
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
          bottom: 80,
          right: 110,
          width: 300,
          height: 300,
          transform: `scale(${badgeScale}) rotate(${-14 + badgeWiggle}deg)`,
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
            fontSize: 116,
            color: CREAM,
            WebkitTextStroke: `3px ${OUTLINE}`,
            textShadow: outline(4),
          }}
        >
          BAM!
        </div>
      </div>

      {/* sparkle stars */}
      {Array.from({ length: 12 }).map((_, i) => {
        const ang = (i / 12) * Math.PI * 2;
        const r = 560;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r * 0.55;
        const bob = Math.sin(frame / 8 + i) * 10;
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
            <svg width="64" height="64" viewBox="-12 -12 24 24">
              <path
                d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z"
                fill={i % 2 === 0 ? CREAM : RED}
                stroke={OUTLINE}
                strokeWidth={2}
              />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- Quick flash cut ---------- */
const FlashCut: React.FC<{ color?: string }> = ({ color = CREAM }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, 7], [0, 1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: color, opacity }} />;
};

/* ============================================================
   MAIN
   ============================================================ */
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <PaperBackground />
      <InkDrips />

      {/* Scene 1: SPLAT  (0-40) */}
      <Sequence from={0} durationInFrames={40}>
        <SceneSplat />
      </Sequence>
      <Sequence from={36} durationInFrames={8}>
        <FlashCut color={CREAM} />
      </Sequence>

      {/* Scene 2: MASKS  (40-95) */}
      <Sequence from={40} durationInFrames={55}>
        <SceneMasks />
      </Sequence>
      <Sequence from={91} durationInFrames={8}>
        <FlashCut color={RED} />
      </Sequence>

      {/* Scene 3: ZAP  (95-140) */}
      <Sequence from={95} durationInFrames={45}>
        <SceneZap />
      </Sequence>
      <Sequence from={136} durationInFrames={8}>
        <FlashCut color={CREAM} />
      </Sequence>

      {/* Scene 4: TITLE  (140-195) */}
      <Sequence from={140} durationInFrames={55}>
        <SceneTitle />
      </Sequence>
    </AbsoluteFill>
  );
};