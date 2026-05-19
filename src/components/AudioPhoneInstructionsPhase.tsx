import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import {
  InkGameStage,
  InkPhasePill,
  InkButton,
  InkTitle,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from "@/components/ink/InkPrimitives";

interface AudioPhoneInstructionsPhaseProps {
  isHost: boolean;
  playerCount: number;
  onStart: () => void;
}

const ACCENT = "#f59e0b"; // amber/orange — matches AudioPhone card

const STEPS = [
  {
    icon: Mic,
    title: "Enregistre",
    desc: "Une phrase claire et fun",
    color: "#34d399",
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
    color: "#06b6d4",
  },
  {
    icon: MessageSquare,
    title: "Imite",
    desc: "Reproduis ce que tu entends",
    color: "#fbbf24",
  },
];

export const AudioPhoneInstructionsPhase = memo(
  ({ isHost, playerCount, onStart }: AudioPhoneInstructionsPhaseProps) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isStarting, setIsStarting] = useState(false);

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
      <InkGameStage accent={ACCENT}>
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 pb-[200px]">
          {/* TITLE */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 space-y-3"
          >
            <InkPhasePill icon={Phone} label="Mode Audio Phone" accent={ACCENT} />
            <InkTitle size="xxl">Audio Phone</InkTitle>
            <p
              className="text-base text-white/70 max-w-md mx-auto font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Téléphone arabe version{" "}
              <span
                className="text-amber-300"
                style={{ textShadow: `0 2px 8px ${ACCENT}88` }}
              >
                audio inversé
              </span>
              . Saurez-vous décoder le chaos ?
            </p>
          </motion.div>

          {/* PLAYER COUNT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 mb-6 px-4 py-2 rounded-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
              border: "2.5px solid #0a0810",
              boxShadow: "0 3px 0 #0a0810",
            }}
          >
            <Users className="w-4 h-4 text-white/70" />
            <span
              className="text-base font-black text-white leading-none"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              {playerCount} joueur{playerCount > 1 ? "s" : ""} connecté
              {playerCount > 1 ? "s" : ""}
            </span>
          </motion.div>

          {/* STEPS — relay layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full max-w-5xl mb-8"
          >
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap md:flex-nowrap">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                return (
                  <div
                    key={step.title}
                    className="flex items-center gap-2 md:gap-3"
                  >
                    <motion.button
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      whileHover={{ y: -3, scale: 1.04, rotate: 0 }}
                      whileTap={{ scale: 0.97 }}
                      animate={
                        isActive
                          ? { y: [0, -4, 0], rotate: idx % 2 === 0 ? -2 : 2 }
                          : { rotate: idx % 2 === 0 ? -1 : 1 }
                      }
                      transition={
                        isActive
                          ? {
                              duration: 1.6,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                          : undefined
                      }
                      className="relative w-[150px] md:w-[170px] aspect-[4/5] rounded-2xl flex flex-col items-center justify-center gap-2 px-3"
                      style={{
                        background: isActive
                          ? `linear-gradient(180deg, ${step.color}, ${step.color}cc)`
                          : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                        border: "3px solid #0a0810",
                        boxShadow: isActive
                          ? `0 5px 0 #0a0810, 0 10px 24px ${step.color}66`
                          : "0 4px 0 #0a0810",
                      }}
                    >
                      {/* Step number stamp */}
                      <div
                        className="absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          background: isActive
                            ? "linear-gradient(180deg, #fbbf24, #d97706)"
                            : "rgba(255,255,255,0.08)",
                          border: "2.5px solid #0a0810",
                          boxShadow: "0 3px 0 #0a0810",
                          transform: `rotate(${idx % 2 === 0 ? -10 : 10}deg)`,
                        }}
                      >
                        <span
                          className="text-xl font-black text-white leading-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {idx + 1}
                        </span>
                      </div>

                      {/* Icon */}
                      <div
                        className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                          border: "3px solid #0a0810",
                          boxShadow: "0 3px 0 #0a0810",
                        }}
                      >
                        <Icon
                          className="w-6 h-6 text-white"
                          strokeWidth={2.5}
                        />
                      </div>

                      <h3
                        className="text-2xl font-black leading-none text-white"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={cn(
                          "text-xs text-center leading-tight px-1 font-bold",
                          isActive ? "text-white/85" : "text-white/55",
                        )}
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {step.desc}
                      </p>
                    </motion.button>

                    {idx < STEPS.length - 1 && (
                      <svg
                        className="hidden md:block w-8 h-10 flex-shrink-0"
                        viewBox="0 0 40 40"
                        fill="none"
                        style={{
                          filter:
                            activeStep === idx || activeStep === idx + 1
                              ? `drop-shadow(0 0 6px ${ACCENT})`
                              : undefined,
                        }}
                      >
                        <path
                          d="M4,20 Q12,18 24,20 Q30,21 33,20"
                          stroke={
                            activeStep === idx || activeStep === idx + 1
                              ? ACCENT
                              : "rgba(255,255,255,0.18)"
                          }
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <path
                          d="M27,13 L34,20 L27,27"
                          stroke={
                            activeStep === idx || activeStep === idx + 1
                              ? ACCENT
                              : "rgba(255,255,255,0.18)"
                          }
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* HOST CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-md space-y-3"
          >
            {isHost ? (
              <InkButton
                onClick={handleStart}
                disabled={isStarting}
                color={ACCENT}
                size="lg"
                className="w-full"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Démarrage…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" strokeWidth={2.5} />
                    C'est parti !
                    <ArrowRight className="w-6 h-6" strokeWidth={2.5} />
                  </>
                )}
              </InkButton>
            ) : (
              <div
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                  border: "3px solid #0a0810",
                  boxShadow: "0 4px 0 #0a0810",
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                <span
                  className="text-xl font-black text-white/75 leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  En attente de l'hôte…
                </span>
              </div>
            )}

            <p
              className="text-center text-sm text-white/40 italic font-bold leading-relaxed"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Astuce : parle clairement, sois fun, accepte le chaos.
            </p>
          </motion.div>
        </div>
      </InkGameStage>
    );
  },
);

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
