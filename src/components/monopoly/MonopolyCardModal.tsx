/**
 * MonopolyCardModal — task 18.1
 *
 * Renders a Chance / Community Chest card pulled from `useMonopolyGame`.
 * The modal opens behind a short 3D card-flip cinematic + swoosh that
 * runs before the card text is revealed. Reduced-motion mounts skip the
 * flip and fade in instead (Req 12.2 / 18.1).
 *
 * Public surface preserved (Req 13.1 — public component contracts):
 *   ```tsx
 *   <MonopolyCardModal card={card} onClose={fn} isMyTurn={bool} />
 *   ```
 *
 * Validates Requirements 6.3, 12.2, 13.1.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  InkButton,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import type { GameCard } from '@/lib/monopolyBoard';

interface Props {
  card: GameCard;
  onClose: () => void;
  isMyTurn: boolean;
}

/** Total flip duration in milliseconds (Req 18.1, design Property 5: 400-800ms). */
const FLIP_DURATION_MS = 600;
/** Reduced-motion fade-in duration. */
const REDUCED_FADE_MS = 200;

/**
 * Detect the user's reduced-motion preference at mount time. We only need
 * a snapshot — the cinematic is short-lived, so re-evaluating during the
 * flip would be overkill.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MonopolyCardModal({ card, onClose, isMyTurn }: Props) {
  // `flipping = true` → showing the back of the card. After
  // FLIP_DURATION_MS we flip to the front and reveal the text.
  const [flipping, setFlipping] = useState(true);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    // Play swoosh once on entry — the audio map also dispatches it via
    // CARD_DRAW, but mounting the modal is a separate, user-visible cue.
    playInkSound('cartoonSwoosh', 0.4);
    const dur = reducedMotion ? REDUCED_FADE_MS : FLIP_DURATION_MS;
    const t = setTimeout(() => {
      setFlipping(false);
      // "Snap" sound when the card lands face-up.
      if (!reducedMotion) playInkSound('cartoonDing', 0.35);
    }, dur);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  // Pick visual based on action type.
  const isBad = ['pay', 'pay_each', 'repairs', 'jail', 'move_back'].includes(card.action);
  const isGood = ['collect', 'collect_each', 'get_out_of_jail'].includes(card.action);

  const accent = isBad ? '#ef4444' : isGood ? '#22c55e' : 'var(--ink-text-dim)';
  const emoji =
    card.action === 'jail'
      ? '👮'
      : card.action === 'get_out_of_jail'
        ? '🎫'
        : card.action === 'collect' || card.action === 'collect_each'
          ? '💰'
          : card.action === 'pay' || card.action === 'pay_each' || card.action === 'repairs'
            ? '💸'
            : card.action === 'move_to'
              ? '🚀'
              : card.action === 'move_back'
                ? '⬅️'
                : '🎴';

  const title = isGood ? 'BONNE NOUVELLE !' : isBad ? 'AÏE !' : 'CARTE !';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(circle, rgba(0,0,0,0.6), rgba(0,0,0,0.85))',
        backdropFilter: 'blur(8px)',
        perspective: '1000px',
      }}
    >
      {/* Outer flip wrapper — rotates 180° on Y to swap back/front faces. */}
      <motion.div
        initial={{ scale: 0.5, rotateY: 0, opacity: 0 }}
        animate={
          reducedMotion
            ? { scale: 1, rotateY: 180, opacity: 1 }
            : {
                scale: [0.5, 1.05, 1],
                rotateY: [0, 360, 540], // 0° (back) → 360° → 540° = -180° (front)
                opacity: [0, 1, 1],
              }
        }
        exit={{ scale: 0.5, opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: REDUCED_FADE_MS / 1000 }
            : {
                duration: FLIP_DURATION_MS / 1000,
                ease: 'easeOut',
              }
        }
        className="relative w-full max-w-sm rounded-3xl"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card BACK — visible during the flip */}
        <AnimatePresence>
          {flipping && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-3xl flex items-center justify-center overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #1a0d2e 0%, #4c1d95 50%, #1a0d2e 100%)',
                border: '1px solid var(--ink-line)',
                boxShadow:
                  'none',
                backfaceVisibility: 'hidden',
                minHeight: '400px',
              }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="text-7xl mb-4"
                >
                  🎴
                </motion.div>
                <p
                  className="text-3xl font-black uppercase tracking-widest"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: '#fbbf24',
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  MIMIC<br />POLY
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card FRONT — content shown after the flip */}
        <AnimatePresence>
          {!flipping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                border: '1px solid var(--ink-line)',
                boxShadow: `0 0 0 rgba(0,0,0,0), 0 18px 50px ${accent}99`,
                transform: 'rotate(-2deg)',
              }}
            >
              {/* paint splatter top */}
              <div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-90"
                style={{
                  background: `radial-gradient(circle, ${accent}aa, transparent 70%)`,
                  filter: 'blur(12px)',
                }}
              />

              <div className="relative p-7 text-center space-y-4">
                {/* Emoji */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 14,
                    delay: 0.05,
                  }}
                  className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    border: '1px solid var(--ink-line)',
                    boxShadow: `0 0 0 rgba(0,0,0,0), 0 12px 24px ${accent}88`,
                  }}
                >
                  <motion.span
                    animate={{ rotate: [-6, 6, -6] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="text-5xl"
                  >
                    {emoji}
                  </motion.span>
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-3xl font-black uppercase tracking-wider leading-none"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: accent,
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {title}
                </motion.h3>

                {/* Card text */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="px-3 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--ink-line)',
                  }}
                >
                  <p
                    className="text-lg md:text-xl font-black text-white leading-snug"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {card.textFr}
                  </p>
                </motion.div>

                {/* Action button */}
                {isMyTurn && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                  >
                    <InkButton
                      onClick={onClose}
                      color={accent}
                      size="lg"
                      className="w-full"
                    >
                      CONTINUER
                    </InkButton>
                  </motion.div>
                )}

                {!isMyTurn && (
                  <p
                    className="text-sm text-white/60 font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    En attente du joueur...
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
