import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
  Sequence,
  Easing,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadInter } from "@remotion/google-fonts/InterTight";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "700", "900"] });

/* =====================================================================
   INK STRIKE — cinematic dark ink intro
   Palette: jet black, ink red, bone white, blood deep
   Vibe: brutal cinematic minimal · kinetic typography · ink splash
   ===================================================================== */

const BLACK = "#07070a";
const NEAR_BLACK = "#101015";
const RED = "#ff1f3a";
const RED_DEEP = "#7a0010";
const BONE = "#f4ede1";
const WHITE = "#ffffff";

// ---------------------------------------------------------------------
// Shared seeded particles (memoized once)
// ---------------------------------------------------------------------
const useGrain = (count: number, seed: string) =>
  React.useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        x: random(`${seed}x${i}`),
        y: random(`${seed}y${i}`),
        r: random(`${seed}r${i}`),
        a: random(`${seed}a${i}`),
      })),
    [count, seed]
  );

// ---------------------------------------------------------------------
// Persistent backdrop — slow dark gradient + film grain + halftone parallax
// ---------------------------------------------------------------------
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const px = Math.sin(frame / 90) * 22;
  const py = Math.cos(frame / 110) * 16;
  const grain = useGrain(80, "g");
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 58%, ${NEAR_BLACK} 0%, ${BLACK} 60%, #000 100%)`,
        }}
      />
      {/* halftone dot field */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${RED_DEEP}22 1.3px, transparent 1.6px)`,
          backgroundSize: "30px 30px",
          backgroundPosition: `${px}px ${py}px`,
          opacity: 0.5,
          mixBlendMode: "screen",
        }}
      />
      {/* film grain */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
        {grain.map((g, i) => (
          <circle
            key={i}
            cx={g.x * 1920}
            cy={g.y * 1080}
            r={0.4 + g.r * 1.1}
            fill={WHITE}
            opacity={0.3 + g.a * 0.7}
          />
        ))}
      </svg>
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

// ---------------------------------------------------------------------
// SCENE 1 — Drop falls + ink strike
// ---------------------------------------------------------------------
const DropAndStrike: React.FC = () => {
  const frame = useCurrentFrame();

  // drop falls from -40 to 540 (impact at frame 28)
  const drop = interpolate(frame, [0, 28], [-60, 540], {
    easing: Easing.bezier(0.55, 0.05, 0.95, 0.5),
    extrapolateRight: "clamp",
  });
  const dropOpacity = interpolate(frame, [0, 6, 27, 29], [0, 1, 1, 0]);
  const dropStretch = interpolate(frame, [0, 22, 27], [1, 1.8, 0.6]);

  // shockwave ring
  const ringT = (frame - 28) / 30;
  const ringR = interpolate(ringT, [0, 1], [10, 900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringOp = interpolate(ringT, [0, 0.1, 1], [0, 0.85, 0]);

  // splash scale
  const splash = interpolate(frame, [28, 36, 60], [0, 1.05, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* shockwave */}
      {ringT > 0 && ringT < 1 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <circle
            cx={960}
            cy={540}
            r={ringR}
            fill="none"
            stroke={RED}
            strokeWidth={interpolate(ringT, [0, 1], [10, 1])}
            opacity={ringOp}
          />
        </svg>
      )}

      {/* drop */}
      <svg
        width={60}
        height={120}
        viewBox="-30 -60 60 120"
        style={{
          position: "absolute",
          left: 960 - 30,
          top: drop - 60,
          opacity: dropOpacity,
          transform: `scaleY(${dropStretch})`,
          transformOrigin: "50% 100%",
        }}
      >
        <path d="M0,-50 C20,-10 26,10 26,28 A26,26 0 1 1 -26,28 C-26,10 -20,-10 0,-50 Z" fill={RED} />
      </svg>

      {/* central splash (organic blob with offshoot droplets) */}
      <svg
        width={1200}
        height={1200}
        viewBox="-600 -600 1200 1200"
        style={{
          position: "absolute",
          left: 960 - 600,
          top: 540 - 600,
          transform: `scale(${splash})`,
          transformOrigin: "center",
        }}
      >
        <g fill={RED}>
          <path d="M-180,-60 C-260,-220 -80,-300 60,-260 C220,-320 360,-180 320,-40 C420,40 380,220 240,260 C140,400 -80,380 -180,260 C-340,240 -420,60 -300,-20 C-340,-80 -280,-120 -180,-60 Z" />
          <circle cx={-360} cy={-220} r={28} />
          <circle cx={400} cy={-260} r={22} />
          <circle cx={-440} cy={120} r={18} />
          <circle cx={460} cy={140} r={26} />
          <circle cx={-300} cy={340} r={20} />
          <circle cx={280} cy={380} r={16} />
          <circle cx={-500} cy={-40} r={10} />
          <circle cx={520} cy={20} r={12} />
          <circle cx={120} cy={-380} r={14} />
          <circle cx={-120} cy={420} r={11} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// SCENE 2 — White flash + camera "pull back" + kinetic word "INK"
// ---------------------------------------------------------------------
const Flash: React.FC<{ at: number; dur?: number; intensity?: number }> = ({
  at,
  dur = 12,
  intensity = 0.95,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > dur) return null;
  const op = interpolate(t, [0, 2, dur], [0, intensity, 0]);
  return <AbsoluteFill style={{ background: WHITE, opacity: op }} />;
};

const KineticInk: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;

  const letters = ["I", "N", "K"];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 24 }}>
        {letters.map((ch, i) => {
          const delay = i * 5;
          const sp = spring({
            frame: local - delay,
            fps,
            config: { damping: 12, stiffness: 140, mass: 0.8 },
          });
          const y = interpolate(sp, [0, 1], [180, 0]);
          const op = interpolate(sp, [0, 1], [0, 1]);
          const skew = interpolate(sp, [0, 1], [-18, 0]);
          const blur = interpolate(sp, [0, 1], [10, 0]);
          return (
            <span
              key={i}
              style={{
                fontFamily: bangers,
                fontSize: 520,
                color: BONE,
                letterSpacing: "0.02em",
                lineHeight: 0.9,
                transform: `translateY(${y}px) skewY(${skew}deg)`,
                opacity: op,
                filter: `blur(${blur}px)`,
                WebkitTextStroke: `4px ${RED}`,
                textShadow: `0 0 30px rgba(255,31,58,0.45), 6px 8px 0 ${RED_DEEP}`,
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

// Splatters anchored under the INK word
const SideSplats: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;
  const splats = [
    { x: 260, y: 760, s: 280, d: 0, color: RED },
    { x: 1620, y: 240, s: 320, d: 4, color: RED_DEEP },
    { x: 1700, y: 820, s: 260, d: 8, color: RED },
    { x: 220, y: 220, s: 240, d: 12, color: RED_DEEP },
  ];
  return (
    <>
      {splats.map((s, i) => {
        const sp = spring({
          frame: local - s.d,
          fps,
          config: { damping: 10, stiffness: 150, mass: 0.7 },
        });
        const scale = interpolate(sp, [0, 1], [0, 1]);
        const rot = interpolate(sp, [0, 1], [-30, 0]);
        return (
          <svg
            key={i}
            width={s.s}
            height={s.s}
            viewBox="-50 -50 100 100"
            style={{
              position: "absolute",
              left: s.x - s.s / 2,
              top: s.y - s.s / 2,
              transform: `scale(${scale}) rotate(${rot}deg)`,
            }}
          >
            <g fill={s.color}>
              <circle cx={0} cy={0} r={30} />
              <circle cx={28} cy={-10} r={8} />
              <circle cx={-26} cy={-18} r={10} />
              <circle cx={-32} cy={14} r={6} />
              <circle cx={22} cy={22} r={7} />
              <circle cx={-12} cy={36} r={5} />
            </g>
          </svg>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------
// SCENE 3 — Logo reveal "MIMIC MASTER" with clip-path + "INK MODE" plate
// ---------------------------------------------------------------------
const LogoReveal: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0) return null;

  // clip-path wipe from top to bottom
  const wipeT = interpolate(local, [0, 28], [0, 100], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const scale = interpolate(local, [0, 60], [1.04, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });
  // gentle breathing forever
  const breathe = 1 + Math.sin(local / 22) * 0.008;

  // subtitle slam
  const subSp = spring({ frame: local - 30, fps, config: { damping: 10, stiffness: 130 } });
  const subScale = interpolate(subSp, [0, 1], [0, 1]);
  const subRot = interpolate(local - 30, [0, 12, 24, 36], [-6, 3, -1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // underline draw
  const underline = interpolate(local, [44, 70], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${scale * breathe})`,
          transformOrigin: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: inter,
            fontWeight: 900,
            fontSize: 220,
            color: BONE,
            letterSpacing: "-0.04em",
            lineHeight: 0.92,
            clipPath: `inset(0 0 ${100 - wipeT}% 0)`,
            textShadow: `0 6px 0 ${RED_DEEP}, 0 0 60px rgba(255,31,58,0.25)`,
          }}
        >
          MIMIC<br />MASTER
        </div>

        {/* underline */}
        <svg width={620} height={20} style={{ display: "block", margin: "18px auto 0" }}>
          <line
            x1={10}
            y1={10}
            x2={10 + 600 * underline}
            y2={10}
            stroke={RED}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            marginTop: 28,
            display: "inline-block",
            transform: `scale(${subScale}) rotate(${subRot}deg)`,
            fontFamily: inter,
            fontWeight: 700,
            fontSize: 32,
            color: BLACK,
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            padding: "12px 30px 10px 36px",
            background: RED,
            borderRadius: 2,
            boxShadow: `6px 6px 0 ${BONE}`,
          }}
        >
          INK MODE
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------
// Drifting ink particles — ambient layer, runs the whole video
// ---------------------------------------------------------------------
const DriftingInk: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = React.useMemo(
    () =>
      new Array(34).fill(0).map((_, i) => ({
        x: random(`dx${i}`) * 1920,
        y: random(`dy${i}`) * 1080,
        r: 1.5 + random(`dr${i}`) * 4,
        sp: 0.25 + random(`ds${i}`) * 0.55,
        ph: random(`dp${i}`) * Math.PI * 2,
      })),
    []
  );
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {dots.map((d, i) => {
        const y = (d.y - frame * d.sp + 1080) % 1080;
        const op = 0.18 + 0.22 * Math.sin(frame / 22 + d.ph);
        return <circle key={i} cx={d.x} cy={y} r={d.r} fill={RED} opacity={op} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------
// MAIN
// Timeline (30fps, 240f = 8s):
//   0–60   : SCENE 1 — drop + ink strike
//   55     : white flash
//   60–130 : SCENE 2 — kinetic "INK" + side splats
//   135    : white flash punch
//   140–240: SCENE 3 — logo reveal + breathing hold
// ---------------------------------------------------------------------
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Backdrop />
      <DriftingInk />

      {/* SCENE 1 */}
      <Sequence from={0} durationInFrames={70}>
        <DropAndStrike />
      </Sequence>

      <Flash at={55} dur={10} />

      {/* SCENE 2 */}
      <Sequence from={60} durationInFrames={80}>
        <KineticInk from={0} />
        <SideSplats from={6} />
      </Sequence>

      <Flash at={135} dur={10} intensity={0.85} />

      {/* SCENE 3 */}
      <Sequence from={140}>
        <LogoReveal from={0} />
      </Sequence>
    </AbsoluteFill>
  );
};