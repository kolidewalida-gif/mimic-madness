import { motion } from 'framer-motion';
import { BT, GRAIN_BG } from './blindtestTheme';

/**
 * Animated "neon lounge" backdrop: near-black base, slowly drifting
 * colored aurora blobs, a faint category-tinted spotlight, fine grain
 * and a subtle vignette. Purely decorative (pointer-events none).
 */
export const BlindtestBackground = ({ accent = BT.violet }: { accent?: string }) => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ background: BT.bg }}>
    {/* drifting aurora blobs */}
    <motion.div
      className="absolute rounded-full"
      style={{ width: '55vw', height: '55vw', top: '-15%', left: '-10%', background: `radial-gradient(circle, ${BT.magenta}55, transparent 65%)`, filter: 'blur(90px)' }}
      animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{ width: '50vw', height: '50vw', bottom: '-18%', right: '-8%', background: `radial-gradient(circle, ${BT.cyan}44, transparent 65%)`, filter: 'blur(100px)' }}
      animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{ width: '40vw', height: '40vw', top: '30%', left: '35%', background: `radial-gradient(circle, ${BT.violet}44, transparent 65%)`, filter: 'blur(110px)' }}
      animate={{ x: [0, 40, -30, 0], y: [0, -40, 20, 0] }}
      transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
    />
    {/* dynamic category-tinted spotlight */}
    <div
      className="absolute left-1/2 -translate-x-1/2 rounded-full transition-colors duration-700"
      style={{ width: '70vw', height: '40vw', top: '-8%', background: `radial-gradient(ellipse, ${accent}33, transparent 70%)`, filter: 'blur(80px)' }}
    />
    {/* fine grain */}
    <div className="absolute inset-0 opacity-60" style={{ backgroundImage: GRAIN_BG, backgroundSize: '3px 3px' }} />
    {/* vignette */}
    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }} />
  </div>
);
