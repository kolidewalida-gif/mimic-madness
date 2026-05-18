import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  RotateCcw,
  Headphones,
  MessageSquare,
  ArrowRight,
  Users,
  Phone,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import { DoodleBorder, DoodleOval, DoodleArrow, DoodleStage } from "@/components/doodle/Doodle";

interface AudioPhoneInstructionsPhaseProps {
  isHost: boolean;
  playerCount: number;
  onStart: () => void;
}

const ACCENT = "#ff5050";

const STEPS = [
  {
    icon: Mic,
    title: "Enregistre",
    desc: "Une phrase claire et fun",
    color: "#10b981",
  },
  {
    icon: RotateCcw,
    title: "Inversion",
    desc: "L'audio est joué à l'envers",
    color: "#a855f7",
  },
  {
    icon: Headphones,
    title: "Écoute",
    desc: "Tente de comprendre",
    color: "#0ea5e9",
  },
  {
    icon: MessageSquare,
    title: "Imite",
    desc: "Reproduis ce que tu entends",
    color: "#f59e0b",
  },
];

export const AudioPhoneInstructionsPhase = memo(({
  isHost,
  playerCount,
  onStart,
}: AudioPhoneInstructionsPhaseProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isStarting, setIsStarting] = useState(false);

  // Cycle through steps for visual interest
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);
    playSoundEffect("start", 0.5);
    onStart();
  };

  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-8 pb-[120px]">
        {/* TITLE BLOCK */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          {/* Mode badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 relative">
            <DoodleBorder color={ACCENT} filled />
            <Phone className="relative w-3.5 h-3.5" style={{ color: ACCENT }} />
            <span
              className="relative text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
            >
              Mode Audio Phone
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-2"
            style={{
              fontFamily: "'Caveat', cursive",
              color: ACCENT,
              textShadow: `0 0 30px ${ACCENT}66, 0 4px 12px rgba(0,0,0,0.6)`,
              WebkitTextStroke: "1px rgba(0,0,0,0.3)",
            }}
          >
            Audio Phone
          </h1>
          <p className="text-sm md:text-base text-white/60 max-w-md mx-auto">
            Téléphone arabe version <span style={{ color: ACCENT }} className="font-black">audio inversé</span>.
            Saurez-vous décoder le chaos ?
          </p>
        </motion.div>

        {/* PLAYER COUNT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mb-8 px-4 py-1.5 relative"
        >
          <DoodleBorder color="rgba(255,255,255,0.3)" />
          <Users className="relative w-3.5 h-3.5 text-white/70" />
          <span
            className="relative text-base font-black"
            style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
          >
            {playerCount} joueur{playerCount > 1 ? "s" : ""} connecté{playerCount > 1 ? "s" : ""}
          </span>
        </motion.div>

        {/* STEPS — relay layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-5xl mb-10"
        >
          <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div key={step.title} className="flex items-center gap-2 md:gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    whileHover={{ y: -3, scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    animate={isActive ? { y: [0, -4, 0] } : { y: 0 }}
                    transition={
                      isActive
                        ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                        : undefined
                    }
                    className={cn(
                      "relative w-[140px] md:w-[160px] aspect-[4/5] flex flex-col items-center justify-center gap-2 px-3 transition-all",
                    )}
                  >
                    <DoodleBorder
                      color={isActive ? step.color : "rgba(255,255,255,0.2)"}
                      filled={isActive}
                      rotation={idx % 2 === 0 ? -1 : 1}
                      thick={isActive}
                    />

                    {/* Step number stamp */}
                    <div
                      className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: isActive ? step.color : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${isActive ? step.color : "rgba(255,255,255,0.2)"}`,
                        transform: `rotate(${idx % 2 === 0 ? -8 : 8}deg)`,
                      }}
                    >
                      <span
                        className="text-base font-black"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: isActive ? "white" : "rgba(255,255,255,0.6)",
                        }}
                      >
                        {idx + 1}
                      </span>
                    </div>

                    {/* Icon in oval */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <DoodleOval color={step.color} filled={isActive} />
                      <Icon
                        className="relative w-6 h-6"
                        style={{ color: step.color }}
                      />
                    </div>

                    <h3
                      className="relative text-xl font-black leading-tight"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        color: isActive ? step.color : "white",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p className="relative text-[11px] text-white/55 text-center leading-tight px-1">
                      {step.desc}
                    </p>
                  </motion.button>

                  {idx < STEPS.length - 1 && (
                    <DoodleArrow
                      color={
                        activeStep === idx || activeStep === idx + 1
                          ? ACCENT
                          : "rgba(255,255,255,0.18)"
                      }
                      className="hidden md:block flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* HOST CTA / WAITING STATE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-md"
        >
          {isHost ? (
            <motion.button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              whileHover={!isStarting ? { scale: 1.03, y: -2 } : undefined}
              whileTap={!isStarting ? { scale: 0.97 } : undefined}
              animate={
                !isStarting
                  ? {
                      boxShadow: [
                        `0 4px 20px ${ACCENT}55`,
                        `0 4px 30px ${ACCENT}88`,
                        `0 4px 20px ${ACCENT}55`,
                      ],
                    }
                  : undefined
              }
              transition={
                !isStarting
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className="relative w-full px-6 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DoodleBorder color={ACCENT} filled rotation={-1} thick />
              <div className="relative flex items-center justify-center gap-3">
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span
                      className="text-2xl font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: "white" }}
                    >
                      Démarrage…
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" style={{ color: ACCENT }} />
                    <span
                      className="text-2xl md:text-3xl font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                    >
                      C'est parti !
                    </span>
                    <ArrowRight className="w-5 h-5" style={{ color: ACCENT }} />
                  </>
                )}
              </div>
            </motion.button>
          ) : (
            <div className="relative px-6 py-4">
              <DoodleBorder color="rgba(255,255,255,0.2)" />
              <div className="relative flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                <span
                  className="text-xl font-black text-white/70"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  En attente de l'hôte…
                </span>
              </div>
            </div>
          )}

          {/* Tip line */}
          <p className="text-center text-[11px] text-white/35 italic mt-4 leading-relaxed">
            Astuce : parle clairement, sois fun, accepte le chaos.
          </p>
        </motion.div>
      </div>
    </DoodleStage>
  );
});

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
