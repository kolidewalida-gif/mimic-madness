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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import {
  PulpStage,
  PulpPanel,
  PulpTitle,
  PulpButton,
  PulpTag,
  PULP,
  PULP_FONT,
} from "@/components/audiophone/PulpComic";
import { InkBetaPanel } from "@/components/game-beta/InkBetaGameLayout";

interface AudioPhoneInstructionsPhaseProps {
  isHost: boolean;
  playerCount: number;
  onStart: () => void;
  variant?: 'default' | 'inkBeta';
}

const STEPS = [
  { icon: Mic, title: "Enregistre", desc: "Une phrase claire et fun", color: PULP.red },
  { icon: RotateCcw, title: "Inversion", desc: "L'audio est joué à l'envers", color: PULP.purple },
  { icon: Headphones, title: "Écoute", desc: "Tente de comprendre", color: PULP.blue },
  { icon: MessageSquare, title: "Imite", desc: "Reproduis ce que tu entends", color: PULP.yellow },
];

export const AudioPhoneInstructionsPhase = memo(
  ({ isHost, playerCount, onStart, variant = 'default' }: AudioPhoneInstructionsPhaseProps) => {
    const isInkBeta = variant === 'inkBeta';
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

    if (isInkBeta) {
      /*
       * Les quatre étapes sont montrées d'un bloc, sans surbrillance tournante :
       * ici elles expliquent la règle, elles ne disent pas où l'on en est. Un
       * halo qui se déplace toutes les deux secondes ferait croire le contraire.
       */
      return (
        <InkBetaPanel step="Comment ça marche" title="Audio Phone" titleId="ik-ap-rules-title">
          <p className="ik-game-lead">
            Un téléphone arabe où le son est <strong>joué à l'envers</strong>. Chacun enregistre une
            phrase, tout le monde tente de la reproduire à l'oreille, et on écoute les dégâts
            ensemble à la fin.
          </p>

          <ol className="ik-ap-flow">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="ik-ap-flow-step">
                  <span className="ik-ap-flow-num">{idx + 1}</span>
                  <span className="ik-ap-flow-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </li>
              );
            })}
          </ol>

          {isHost ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className="ik-primary-action menu-focus"
            >
              <span className="ik-primary-action-icon">
                {isStarting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </span>
              <span>{isStarting ? 'Démarrage…' : "C'est parti !"}</span>
            </button>
          ) : (
            <p className="ik-game-note">
              <Loader2 className="animate-spin" aria-hidden="true" /> En attente de l'hôte…
            </p>
          )}

          <p className="ik-progress-label">
            {playerCount} joueur{playerCount > 1 ? 's' : ''} · parle clairement, accepte le chaos
          </p>
        </InkBetaPanel>
      );
    }

    return (
      <PulpStage accent={PULP.red} accent2={PULP.blue}>
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 pb-[200px]">
          {/* TITLE */}
          <motion.div
            initial={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-7 space-y-4"
          >
            <PulpTag color={PULP.yellow} rotate={-2}>
              <Phone className="w-3.5 h-3.5" /> Mode Audio Phone
            </PulpTag>
            <PulpTitle size="xl">Audio Phone</PulpTitle>
            <p
              className="text-lg text-[color:var(--pulp-paper)]/70 max-w-md mx-auto"
              style={{ fontFamily: PULP_FONT, letterSpacing: "0.04em" }}
            >
              TÉLÉPHONE ARABE VERSION{" "}
              <span style={{ color: PULP.yellow }}>AUDIO INVERSÉ</span>. SAUREZ-VOUS
              DÉCODER LE CHAOS ?
            </p>
          </motion.div>

          {/* PLAYER COUNT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-7"
          >
            <PulpTag color={PULP.blue} rotate={2}>
              <Users className="w-3.5 h-3.5" /> {playerCount} joueur
              {playerCount > 1 ? "s" : ""} connecté{playerCount > 1 ? "s" : ""}
            </PulpTag>
          </motion.div>

          {/* STEPS — comic strip panels */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full max-w-5xl mb-9"
          >
            <div className="flex items-stretch justify-center gap-3 md:gap-4 flex-wrap md:flex-nowrap">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                return (
                  <div key={step.title} className="flex items-center gap-2 md:gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      whileHover={{ y: -4, scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      animate={
                        isActive
                          ? { y: [0, -5, 0], rotate: idx % 2 === 0 ? -1.5 : 1.5 }
                          : { rotate: idx % 2 === 0 ? -1 : 1 }
                      }
                      transition={
                        isActive
                          ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                          : undefined
                      }
                      className="relative w-[150px] md:w-[172px] aspect-[4/5]"
                    >
                      <PulpPanel accent={isActive ? step.color : "rgba(243,237,224,0.25)"}>
                        <div className="flex h-full flex-col items-center justify-center gap-2.5 px-3 py-4 aspect-[4/5]">
                          {/* panel number */}
                          <span
                            className="absolute -top-3 -left-2 px-2 leading-none"
                            style={{
                              fontFamily: PULP_FONT,
                              fontSize: "1.6rem",
                              color: PULP.paper,
                              background: step.color,
                              border: `2.5px solid ${PULP.ink}`,
                              transform: `rotate(${idx % 2 === 0 ? -8 : 8}deg)`,
                              boxShadow: `2px 2px 0 ${PULP.ink}`,
                            }}
                          >
                            {idx + 1}
                          </span>

                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-full"
                            style={{
                              background: `radial-gradient(circle at 35% 30%, ${step.color}, ${step.color}99)`,
                              border: `3px solid ${PULP.ink}`,
                              boxShadow: isActive ? `0 0 22px ${step.color}aa` : "none",
                            }}
                          >
                            <Icon className="h-7 w-7" style={{ color: PULP.paper }} strokeWidth={2.5} />
                          </div>

                          <h3
                            className="uppercase leading-none"
                            style={{
                              fontFamily: PULP_FONT,
                              fontSize: "1.7rem",
                              color: PULP.paper,
                              letterSpacing: "0.03em",
                              textShadow: isActive
                                ? `1.5px 0 0 ${step.color}`
                                : undefined,
                            }}
                          >
                            {step.title}
                          </h3>
                          <p
                            className={cn(
                              "text-center text-xs leading-tight px-1",
                              isActive
                                ? "text-[color:var(--pulp-paper)]/85"
                                : "text-[color:var(--pulp-paper)]/45",
                            )}
                            style={{ fontFamily: PULP_FONT, letterSpacing: "0.04em" }}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </PulpPanel>
                    </motion.button>

                    {idx < STEPS.length - 1 && (
                      <ArrowRight
                        className="hidden md:block w-7 h-7 flex-shrink-0"
                        style={{
                          color:
                            activeStep === idx || activeStep === idx + 1
                              ? PULP.yellow
                              : "rgba(243,237,224,0.18)",
                        }}
                        strokeWidth={3}
                      />
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
            className="w-full max-w-md flex flex-col items-center gap-4"
          >
            {isHost ? (
              <PulpButton
                onClick={handleStart}
                disabled={isStarting}
                color={PULP.red}
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
                    C'est parti !
                    <ArrowRight className="w-6 h-6" strokeWidth={3} />
                  </>
                )}
              </PulpButton>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[color:var(--pulp-paper)]/60" />
                <span
                  className="uppercase"
                  style={{
                    fontFamily: PULP_FONT,
                    fontSize: "1.5rem",
                    letterSpacing: "0.05em",
                    color: "rgba(243,237,224,0.75)",
                  }}
                >
                  En attente de l'hôte…
                </span>
              </div>
            )}

            <p
              className="text-center text-sm text-[color:var(--pulp-paper)]/40 uppercase"
              style={{ fontFamily: PULP_FONT, letterSpacing: "0.08em" }}
            >
              Astuce : parle clairement, sois fun, accepte le chaos.
            </p>
          </motion.div>
        </div>
      </PulpStage>
    );
  },
);

AudioPhoneInstructionsPhase.displayName = "AudioPhoneInstructionsPhase";
