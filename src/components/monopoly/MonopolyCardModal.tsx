import { motion } from 'framer-motion';
import {
  InkButton,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';
import type { GameCard } from '@/lib/monopolyBoard';

interface Props {
  card: GameCard;
  onClose: () => void;
  isMyTurn: boolean;
}

export function MonopolyCardModal({ card, onClose, isMyTurn }: Props) {
  // Pick visual based on action type
  const isBad = ['pay', 'pay_each', 'repairs', 'jail', 'move_back'].includes(card.action);
  const isGood = ['collect', 'collect_each', 'get_out_of_jail'].includes(card.action);
  const isNeutral = !isBad && !isGood;

  const accent = isBad ? '#ef4444' : isGood ? '#22c55e' : '#06b6d4';
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

  const title = isGood
    ? 'BONNE NOUVELLE !'
    : isBad
      ? 'AÏE !'
      : 'CARTE !';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(circle, rgba(0,0,0,0.6), rgba(0,0,0,0.85))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.4, rotate: -15, y: -50, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, y: 0, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '4px solid #0a0810',
          boxShadow: `0 12px 0 #0a0810, 0 18px 50px ${accent}99`,
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
            transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.1 }}
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              border: '4px solid #0a0810',
              boxShadow: `0 8px 0 #0a0810, 0 12px 24px ${accent}88`,
            }}
          >
            <motion.span
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl"
            >
              {emoji}
            </motion.span>
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-3xl font-black uppercase tracking-wider leading-none"
            style={{
              fontFamily: "'Caveat', cursive",
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
            transition={{ delay: 0.35 }}
            className="px-3 py-3 rounded-2xl"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '2.5px solid #0a0810',
            }}
          >
            <p
              className="text-lg md:text-xl font-black text-white leading-snug"
              style={{
                fontFamily: "'Caveat', cursive",
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
              transition={{ delay: 0.45 }}
            >
              <InkButton onClick={onClose} color={accent} size="lg" className="w-full">
                CONTINUER
              </InkButton>
            </motion.div>
          )}

          {!isMyTurn && (
            <p
              className="text-sm text-white/60 font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              En attente du joueur...
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
