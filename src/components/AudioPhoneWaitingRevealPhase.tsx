import { motion } from 'framer-motion';
import { Play, PartyPopper, Loader2 } from 'lucide-react';
import {
  PulpStage,
  PulpPanel,
  PulpTitle,
  PulpButton,
  PulpTag,
  PULP,
  PULP_FONT,
} from '@/components/audiophone/PulpComic';
import { InkBetaPanel } from '@/components/game-beta/InkBetaGameLayout';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface AudioPhoneWaitingRevealPhaseProps {
  isHost: boolean;
  onStartReveal: () => void;
  variant?: 'default' | 'inkBeta';
  /** Nombre de phrases qui seront rejouées. */
  phraseCount?: number;
  /** Les URL des enregistrements sont encore en cours de récupération. */
  isPreparing?: boolean;
}

export const AudioPhoneWaitingRevealPhase = ({
  isHost,
  onStartReveal,
  variant = 'default',
  phraseCount = 0,
  isPreparing = false,
}: AudioPhoneWaitingRevealPhaseProps) => {
  if (variant === 'inkBeta') {
    return (
      <InkBetaPanel
        step="Tout est enregistré"
        title="Place à la révélation"
        titleId="ik-ap-reveal-title"
      >
        <p className="ik-game-lead">
          On va rejouer chaque phrase dans l'ordre : l'originale, sa version à l'envers, puis toutes
          les imitations. <strong>{phraseCount} phrase{phraseCount > 1 ? 's' : ''}</strong> au
          programme.
        </p>

        {isHost ? (
          <button
            type="button"
            onClick={() => {
              playInkSound('cartoonFanfare', 0.5);
              onStartReveal();
            }}
            disabled={isPreparing}
            className="ik-primary-action menu-focus"
          >
            <span className="ik-primary-action-icon">
              {isPreparing ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Play fill="currentColor" aria-hidden="true" />
              )}
            </span>
            <span>{isPreparing ? 'Préparation…' : 'Lancer la révélation'}</span>
          </button>
        ) : (
          <p className="ik-game-note">
            <Loader2 className="animate-spin" aria-hidden="true" /> L'hôte lance la révélation…
          </p>
        )}
      </InkBetaPanel>
    );
  }

  return (
    <PulpStage accent={PULP.yellow} accent2={PULP.red}>
      <div className="relative min-h-screen flex items-center justify-center p-5 pb-[120px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          className="w-full max-w-lg"
        >
          <PulpPanel accent={PULP.yellow}>
            <div className="px-7 py-9 text-center space-y-6">
              <motion.div
                animate={{ rotate: [-8, 8, -8], y: [0, -6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${PULP.yellow}, ${PULP.red}aa)`,
                  border: `4px solid ${PULP.ink}`,
                  boxShadow: `0 0 30px ${PULP.yellow}88`,
                }}
              >
                <PartyPopper className="h-11 w-11" style={{ color: PULP.ink }} strokeWidth={2.5} />
              </motion.div>

              <div className="space-y-3">
                <PulpTitle size="md" accent={PULP.red} accent2={PULP.blue}>
                  Toutes les imitations sont prêtes !
                </PulpTitle>
                <p
                  className="text-base uppercase text-[color:var(--pulp-paper)]/60"
                  style={{ fontFamily: PULP_FONT, letterSpacing: '0.05em' }}
                >
                  {isHost
                    ? 'Lance la révélation pour découvrir les résultats'
                    : "En attente de l'hôte pour la révélation…"}
                </p>
              </div>

              {isHost ? (
                <PulpButton
                  onClick={() => {
                    playInkSound('cartoonFanfare', 0.5);
                    onStartReveal();
                  }}
                  color={PULP.red}
                  size="lg"
                  className="w-full"
                >
                  <Play className="w-6 h-6" strokeWidth={3} />
                  Lancer la révélation
                </PulpButton>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="h-3 w-3 rounded-full"
                      style={{ background: i === 1 ? PULP.red : PULP.yellow }}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <PulpTag color={PULP.blue} rotate={-2}>
                  Le générique arrive
                </PulpTag>
              </div>
            </div>
          </PulpPanel>
        </motion.div>
      </div>
    </PulpStage>
  );
};
