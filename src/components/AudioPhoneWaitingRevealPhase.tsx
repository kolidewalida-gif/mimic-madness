import { motion } from 'framer-motion';
import { Play, Sparkles, PartyPopper } from 'lucide-react';
import { DoodleBorder, DoodleStage, DoodleWobble } from '@/components/doodle/Doodle';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface AudioPhoneWaitingRevealPhaseProps {
  isHost: boolean;
  onStartReveal: () => void;
}

const ACCENT = '#c084fc';

export const AudioPhoneWaitingRevealPhase = ({
  isHost,
  onStartReveal,
}: AudioPhoneWaitingRevealPhaseProps) => {
  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          className="relative w-full max-w-lg px-6 py-8"
        >
          <DoodleBorder color={ACCENT} filled rotation={1} thick />
          <div className="relative text-center space-y-5">
            <div className="relative w-24 h-24 mx-auto">
              <DoodleWobble>
                <PartyPopper className="w-16 h-16 mx-auto" style={{ color: ACCENT }} />
              </DoodleWobble>
              <Sparkles
                className="absolute -top-1 -right-1 w-5 h-5 text-amber-300"
                style={{ transform: 'rotate(-20deg)' }}
              />
              <Sparkles
                className="absolute -bottom-1 -left-1 w-4 h-4"
                style={{ color: '#f472b6', transform: 'rotate(20deg)' }}
              />
            </div>

            <div>
              <h2
                className="text-2xl md:text-3xl font-black mb-1 text-white leading-tight"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: `0 0 18px ${ACCENT}33`,
                }}
              >
                Toutes les imitations sont prêtes !
              </h2>
              <p className="text-sm text-white/55">
                {isHost
                  ? 'Lance la révélation pour découvrir les résultats !'
                  : "En attente de l'hôte pour la révélation…"}
              </p>
            </div>

            {isHost ? (
              <motion.button
                type="button"
                onClick={() => {
                  playInkSound('cartoonFanfare', 0.5);
                  onStartReveal();
                }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: [
                    `0 4px 20px ${ACCENT}55`,
                    `0 4px 30px ${ACCENT}99`,
                    `0 4px 20px ${ACCENT}55`,
                  ],
                }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-full px-6 py-4"
              >
                <DoodleBorder color={ACCENT} filled rotation={-1} thick />
                <div className="relative flex items-center justify-center gap-3">
                  <Play className="w-5 h-5" style={{ color: ACCENT }} />
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                  >
                    Lancer la révélation !
                  </span>
                </div>
              </motion.button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: ACCENT }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DoodleStage>
  );
};
