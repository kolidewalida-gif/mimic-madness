import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shuffle, Image as ImageIcon, Tv, Film, Users, Gamepad2, Building, Palette, Sparkles } from 'lucide-react';
import { HolographicCard, NeonText, PremiumButton } from '@/components/premium';
import { cn } from '@/lib/utils';
import type { BlurRushCategory } from '@/lib/blurRushImages';
import { BLURRUSH_CATEGORIES, getImagesByCategory, BLURRUSH_IMAGES } from '@/lib/blurRushImages';

interface BlurRushCategorySelectorProps {
  onSelect: (categories: BlurRushCategory[]) => void;
  isHost: boolean;
}

const CATEGORY_ICONS: Record<BlurRushCategory, React.ReactNode> = {
  'Anime': <Tv className="h-5 w-5" />,
  'Film': <Film className="h-5 w-5" />,
  'Série': <Tv className="h-5 w-5" />,
  'Personnage': <Users className="h-5 w-5" />,
  'Jeux Vidéo': <Gamepad2 className="h-5 w-5" />,
  'Logo': <ImageIcon className="h-5 w-5" />,
  'Monument': <Building className="h-5 w-5" />,
  'Art': <Palette className="h-5 w-5" />,
  'Mix': <Shuffle className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<BlurRushCategory, string> = {
  'Anime': 'from-pink-500 to-rose-600',
  'Film': 'from-amber-500 to-orange-600',
  'Série': 'from-violet-500 to-purple-600',
  'Personnage': 'from-cyan-500 to-blue-600',
  'Jeux Vidéo': 'from-green-500 to-emerald-600',
  'Logo': 'from-slate-500 to-gray-600',
  'Monument': 'from-yellow-500 to-amber-600',
  'Art': 'from-fuchsia-500 to-pink-600',
  'Mix': 'from-indigo-500 to-violet-600',
};

export const BlurRushCategorySelector = ({ onSelect, isHost }: BlurRushCategorySelectorProps) => {
  const [selected, setSelected] = useState<BlurRushCategory[]>(['Mix']);

  const toggleCategory = (category: BlurRushCategory) => {
    if (!isHost) return;

    if (category === 'Mix') {
      setSelected(['Mix']);
      return;
    }

    // If Mix is selected, deselect it when choosing a specific category
    let newSelected: BlurRushCategory[] = selected.filter(c => c !== 'Mix');

    if (newSelected.includes(category)) {
      newSelected = newSelected.filter(c => c !== category);
    } else {
      newSelected = [...newSelected, category];
    }

    // If nothing selected, default to Mix
    if (newSelected.length === 0) {
      newSelected = ['Mix'];
    }

    setSelected(newSelected);
  };

  const handleConfirm = () => {
    onSelect(selected);
  };

  const totalImages = selected.includes('Mix')
    ? getImagesByCategory('Mix').length
    : selected.reduce((sum, cat) => sum + getImagesByCategory(cat).length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-8"
    >
      <HolographicCard className="p-6 max-w-2xl w-full">
        <div className="text-center mb-6">
          <NeonText className="text-2xl font-bold mb-2">Choix des catégories</NeonText>
          <p className="text-foreground-muted text-sm">
            {isHost 
              ? "Sélectionnez les catégories pour cette partie" 
              : "L'hôte choisit les catégories..."}
          </p>
        </div>

        {/* Mix option */}
        <motion.button
          onClick={() => toggleCategory('Mix')}
          disabled={!isHost}
          className={cn(
            "w-full mb-4 p-4 rounded-xl border-2 transition-all flex items-center gap-4",
            selected.includes('Mix')
              ? "border-primary bg-primary/20"
              : "border-border/50 bg-card/40 hover:border-primary/50",
            !isHost && "opacity-60 cursor-not-allowed"
          )}
          whileHover={isHost ? { scale: 1.02 } : {}}
          whileTap={isHost ? { scale: 0.98 } : {}}
        >
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br",
            CATEGORY_COLORS['Mix']
          )}>
            <Shuffle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-bold text-lg">Mix — Toutes catégories</span>
            <p className="text-sm text-foreground-muted">
              {getImagesByCategory('Mix').length} images au total
            </p>
          </div>
          {selected.includes('Mix') && (
            <div className="p-2 rounded-full bg-primary">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </motion.button>

        <div className="text-center text-sm text-foreground-muted mb-3">— ou sélectionnez des catégories —</div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {BLURRUSH_CATEGORIES.map((category) => {
            const isSelected = selected.includes(category);
            const count = getImagesByCategory(category).length;

            return (
              <motion.button
                key={category}
                onClick={() => toggleCategory(category)}
                disabled={!isHost}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  isSelected
                    ? "border-primary bg-primary/20"
                    : "border-border/50 bg-card/40 hover:border-primary/50",
                  !isHost && "opacity-60 cursor-not-allowed"
                )}
                whileHover={isHost ? { scale: 1.05 } : {}}
                whileTap={isHost ? { scale: 0.95 } : {}}
              >
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-br",
                  CATEGORY_COLORS[category]
                )}>
                  {CATEGORY_ICONS[category]}
                </div>
                <span className="text-sm font-medium">{category}</span>
                <span className="text-xs text-foreground-muted">{count} images</span>
                {isSelected && (
                  <div className="absolute top-1 right-1 p-1 rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="text-center mb-4 p-3 rounded-lg bg-card/60 border border-border/30">
          <span className="text-sm text-foreground-muted">Images disponibles: </span>
          <span className="font-bold text-primary">{totalImages}</span>
        </div>

        {/* Confirm button */}
        {isHost && (
          <PremiumButton onClick={handleConfirm} className="w-full">
            <Sparkles className="h-5 w-5 mr-2" />
            Commencer avec {selected.includes('Mix') ? 'Mix' : selected.join(', ')}
          </PremiumButton>
        )}
      </HolographicCard>
    </motion.div>
  );
};
