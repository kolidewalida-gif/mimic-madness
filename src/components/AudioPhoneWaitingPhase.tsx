import { memo, useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Mic,
  Check,
  Loader2,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InkGameStage,
  InkCard,
  InkPhasePill,
  InkTitle,
  InkTimerBar,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from "@/components/ink/InkPrimitives";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface AudioPhoneWaitingPhaseProps {
  currentPlayerIndex: number;
  playerOrder: string[];
  players: Player[];
  currentPhase: 'recording' | 'listening';
  completedCount: number;
}

const ACCENT = '#f59e0b';

export const AudioPhoneWaitingPhase = memo(({
  currentPlayerIndex,
  playerOrder,
  players,
  currentPhase,
  completedCount,
}: AudioPhoneWaitingPhaseProps) => {
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % 5);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const getPlayerById = (playerId: string) =>
    players.find((p) => p.id === playerId);

  const playerStatuses = useMemo(() => {
    return playerOrder.map((playerId, index) => {
      const player = getPlayerById(playerId);
      return {
        playerId,
        playerName: player?.name || 'Joueur inconnu',
        index,
        isCompleted: index < currentPlayerIndex,
        isCurrent: index === currentPlayerIndex,
        isPending: index > currentPlayerIndex,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerOrder, currentPlayerIndex, players]);

  const currentPlayer = getPlayerById(playerOrder[currentPlayerIndex]);
  const progress = (completedCount / playerOrder.length) * 100;

  return (
    <InkGameStage accent={ACCENT}>
      <div className="menu-screen-safe h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-start p-3 pb-24 sm:p-4 sm:pb-24 md:p-8 md:pb-24 lg:justify-center landscape:py-3 landscape:pb-24">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6 landscape:mb-3 space-y-2 sm:space-y-3"
        >
          <InkPhasePill icon={Clock} label="En attente" accent={ACCENT} />
          <InkTitle size="xl">La chaîne continue…</InkTitle>
          <p
            className="text-base text-white/70 max-w-md mx-auto font-bold"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Patiente pendant que les autres joueurs participent.
          </p>
        </motion.div>

        {/* CURRENT PLAYER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md mb-3 sm:mb-4"
        >
          <InkCard accent={ACCENT} highlighted className="p-4 sm:p-5 landscape:p-3">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                {currentPhase === 'recording' ? (
                  <Mic className="w-7 h-7 text-white" strokeWidth={2.5} />
                ) : (
                  <Headphones className="w-7 h-7 text-white" strokeWidth={2.5} />
                )}
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'none',
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" strokeWidth={3} />
                </div>
              </motion.div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm text-white/60 font-bold leading-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  C'est au tour de
                </p>
                <p
                  className="text-3xl font-black text-white truncate leading-none mt-1"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {currentPlayer?.name}
                </p>
                <p
                  className="text-sm text-amber-300 font-bold mt-1"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {currentPhase === 'recording'
                    ? '🎤 Enregistrement…'
                    : '🎧 Écoute…'}
                </p>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    background: pulseIndex === i ? ACCENT : 'rgba(255,255,255,0.2)',
                    transform: pulseIndex === i ? 'scale(1.5)' : 'scale(1)',
                    boxShadow: pulseIndex === i ? `0 0 8px ${ACCENT}` : 'none',
                  }}
                />
              ))}
            </div>
          </InkCard>
        </motion.div>

        {/* PROGRESS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md mb-3 sm:mb-4"
        >
          <InkCard accent={ACCENT} className="p-4" highlighted={false}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-base font-black text-white leading-none"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Progression
              </span>
              <span
                className="text-sm font-mono font-bold text-amber-300"
              >
                {completedCount}/{playerOrder.length}
              </span>
            </div>
            <InkTimerBar progress={progress} accent={ACCENT} />
          </InkCard>
        </motion.div>

        {/* PLAYER CHAIN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md"
        >
          <InkCard accent="var(--ink-accent)" className="p-3 sm:p-4" highlighted={false}>
            <h3
              className="text-base font-black uppercase tracking-wider text-white/80 mb-3"
              style={{
                fontFamily: "'Outfit', sans-serif",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              Ordre de passage
            </h3>
            <div className="max-h-[min(42dvh,24rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 landscape:max-h-[34dvh]">
              {playerStatuses.map((status, idx) => (
                <motion.div
                  key={status.playerId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all',
                    status.isPending && 'opacity-55',
                  )}
                  style={{
                    background: status.isCompleted
                      ? 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))'
                      : status.isCurrent
                        ? `linear-gradient(180deg, ${ACCENT}33, ${ACCENT}10)`
                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    border: '1px solid var(--ink-line)',
                    boxShadow: status.isCurrent
                      ? `0 0 0 rgba(0,0,0,0), 0 0 12px ${ACCENT}55`
                      : '0 0 0 rgba(0,0,0,0)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: status.isCompleted
                        ? 'linear-gradient(180deg, #34d399, #059669)'
                        : status.isCurrent
                          ? `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`
                          : 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--ink-line)',
                      boxShadow: 'none',
                    }}
                  >
                    {status.isCompleted ? (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    ) : (
                      <span
                        className="text-base font-black text-white leading-none"
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-base font-black flex-1 truncate text-white leading-none"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {status.playerName}
                  </p>
                  {status.isCurrent && (
                    <Loader2
                      className="w-4 h-4 animate-spin text-amber-300"
                      strokeWidth={2.5}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </InkCard>
        </motion.div>
        </div>
      </div>
    </InkGameStage>
  );
});

AudioPhoneWaitingPhase.displayName = "AudioPhoneWaitingPhase";
