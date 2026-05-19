import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Shuffle,
  Image as ImageIcon,
  Tv,
  Film,
  Users,
  Gamepad2,
  Building,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlurRushCategory } from '@/lib/blurRushImages';
import { BLURRUSH_CATEGORIES, getImagesByCategory } from '@/lib/blurRushImages';

interface BlurRushCategorySelectorProps {
  onSelect: (categories: BlurRushCategory[]) => void;
  isHost: boolean;
}

const ACCENT = '#06b6d4'; // cyan — matches BlurRush card
const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

const CATEGORY_ICONS: Record<BlurRushCategory, React.ReactNode> = {
  Anime: <Tv className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Film: <Film className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Série: <Tv className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Personnage: <Users className="h-5 w-5 text-white" strokeWidth={2.5} />,
  'Jeux Vidéo': <Gamepad2 className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Logo: <ImageIcon className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Monument: <Building className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Art: <Palette className="h-5 w-5 text-white" strokeWidth={2.5} />,
  Mix: <Shuffle className="h-5 w-5 text-white" strokeWidth={2.5} />,
};

const CATEGORY_COLORS: Record<BlurRushCategory, string> = {
  Anime: '#ec4899',
  Film: '#f59e0b',
  Série: '#a855f7',
  Personnage: '#06b6d4',
  'Jeux Vidéo': '#10b981',
  Logo: '#6b7280',
  Monument: '#fbbf24',
  Art: '#f472b6',
  Mix: '#a855f7',
};

export const BlurRushCategorySelector = ({
  onSelect,
  isHost,
}: BlurRushCategorySelectorProps) => {
  const [selected, setSelected] = useState<BlurRushCategory[]>(['Mix']);

  const toggleCategory = (category: BlurRushCategory) => {
    if (!isHost) return;

    if (category === 'Mix') {
      setSelected(['Mix']);
      return;
    }

    let newSelected: BlurRushCategory[] = selected.filter((c) => c !== 'Mix');

    if (newSelected.includes(category)) {
      newSelected = newSelected.filter((c) => c !== category);
    } else {
      newSelected = [...newSelected, category];
    }

    if (newSelected.length === 0) newSelected = ['Mix'];

    setSelected(newSelected);
  };

  const handleConfirm = () => {
    onSelect(selected);
  };

  const totalImages = selected.includes('Mix')
    ? getImagesByCategory('Mix').length
    : selected.reduce((sum, cat) => sum + getImagesByCategory(cat).length, 0);

  return (
    <div className="min-h-screen bg-[#0a0510] text-white relative overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1c20] via-[#0a0510] to-[#0a1820]" />
        <div
          className="absolute top-0 left-1/3 w-[700px] h-[400px] rounded-full opacity-30"
          style={{
            background: `radial-gradient(ellipse, ${ACCENT}66, transparent 70%)`,
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
          style={{
            background: `radial-gradient(ellipse, ${ACCENT}55, transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center py-8 px-4 pb-[200px]"
      >
        <div className="w-full max-w-2xl space-y-5">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 280, damping: 16 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                border: '3px solid #0a0810',
                boxShadow: '0 4px 0 #0a0810',
              }}
            >
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span
                className="text-sm font-black uppercase tracking-wider text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                BlurRush
              </span>
            </motion.div>

            <h1
              className="text-5xl md:text-6xl font-black tracking-tight leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Choix des catégories
            </h1>
            <p
              className="text-base text-white/70 font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {isHost
                ? 'Sélectionne les catégories pour cette partie'
                : "L'hôte choisit les catégories…"}
            </p>
          </motion.div>

          {/* MIX OPTION — big featured card */}
          <motion.button
            onClick={() => toggleCategory('Mix')}
            disabled={!isHost}
            whileHover={isHost ? { scale: 1.02, rotate: -0.5 } : undefined}
            whileTap={isHost ? { scale: 0.98 } : undefined}
            className={cn(
              'relative w-full p-4 rounded-2xl flex items-center gap-4 text-left',
              !isHost && 'opacity-60 cursor-not-allowed',
            )}
            style={{
              background: selected.includes('Mix')
                ? `linear-gradient(180deg, ${CATEGORY_COLORS.Mix}, ${CATEGORY_COLORS.Mix}cc)`
                : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: '3px solid #0a0810',
              boxShadow: '0 5px 0 #0a0810',
            }}
          >
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${CATEGORY_COLORS.Mix}, ${CATEGORY_COLORS.Mix}aa)`,
                border: '3px solid #0a0810',
                boxShadow: '0 4px 0 #0a0810',
              }}
            >
              <Shuffle className="w-6 h-6 text-white" strokeWidth={2.5} />
            </motion.div>
            <div className="flex-1">
              <span
                className="block text-2xl font-black text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Mix — Toutes catégories
              </span>
              <p
                className="text-sm text-white/70 font-bold mt-1"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {getImagesByCategory('Mix').length} images au total
              </p>
            </div>
            {selected.includes('Mix') && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 8 }}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-0.5 bg-white/10" />
            <span
              className="text-sm font-black uppercase tracking-wider text-white/55"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              ou choisis tes catégories
            </span>
            <div className="flex-1 h-0.5 bg-white/10" />
          </div>

          {/* CATEGORIES GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {BLURRUSH_CATEGORIES.map((category, idx) => {
              const isSelected = selected.includes(category);
              const count = getImagesByCategory(category).length;
              const color = CATEGORY_COLORS[category];

              return (
                <motion.button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  disabled={!isHost}
                  initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: idx % 2 === 0 ? -1 : 1,
                  }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={
                    isHost ? { y: -3, scale: 1.06, rotate: 0 } : undefined
                  }
                  whileTap={isHost ? { scale: 0.95 } : undefined}
                  className={cn(
                    'relative p-3 rounded-2xl flex flex-col items-center gap-2',
                    !isHost && 'opacity-60 cursor-not-allowed',
                  )}
                  style={{
                    background: isSelected
                      ? `linear-gradient(180deg, ${color}, ${color}cc)`
                      : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    border: '3px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      border: '2.5px solid #0a0810',
                      boxShadow: '0 3px 0 #0a0810',
                    }}
                  >
                    {CATEGORY_ICONS[category]}
                  </div>
                  <span
                    className="text-base font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    {category}
                  </span>
                  <span
                    className="text-xs font-bold text-white/70"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {count} images
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 8 }}
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                        border: '2.5px solid #0a0810',
                        boxShadow: '0 3px 0 #0a0810',
                      }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* SUMMARY */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3 text-center"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,182,212,0.15), rgba(14,116,144,0.04))',
              border: '3px solid #0a0810',
              boxShadow: '0 3px 0 #0a0810',
            }}
          >
            <span
              className="text-base font-bold text-white/70"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Images dispo :{' '}
            </span>
            <span
              className="text-2xl font-black text-cyan-300"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              {totalImages}
            </span>
          </motion.div>

          {/* CONFIRM BUTTON */}
          {isHost && (
            <motion.button
              onClick={handleConfirm}
              whileHover={{ scale: 1.04, rotate: -1.5 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-full py-4 rounded-2xl flex items-center justify-center gap-3"
              style={{
                background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                border: '4px solid #0a0810',
                boxShadow:
                  '0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
              }}
            >
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
              <span
                className="text-2xl font-black text-white leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                Commencer la partie
              </span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
