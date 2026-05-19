import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'mixed', name: 'Mélangé', emoji: '🎲', color: '#a855f7' },
  { id: 'general', name: 'Culture G', emoji: '🎯', color: '#06b6d4' },
  { id: 'anime', name: 'Anime', emoji: '🎌', color: '#ec4899' },
  { id: 'histoire', name: 'Histoire', emoji: '📜', color: '#f59e0b' },
  { id: 'sport', name: 'Sport', emoji: '⚽', color: '#10b981' },
  { id: 'musique', name: 'Musique', emoji: '🎵', color: '#a855f7' },
  { id: 'cinema', name: 'Cinéma', emoji: '🎬', color: '#f59e0b' },
  { id: 'science', name: 'Science', emoji: '🔬', color: '#06b6d4' },
  { id: 'geographie', name: 'Géographie', emoji: '🌍', color: '#10b981' },
  { id: 'jeux_video', name: 'Jeux Vidéo', emoji: '🎮', color: '#ec4899' },
  { id: 'art', name: 'Art', emoji: '🎨', color: '#f472b6' },
];

interface QuizCategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  disabled?: boolean;
}

export const QuizCategorySelector = ({
  selectedCategory,
  onCategoryChange,
  disabled,
}: QuizCategorySelectorProps) => {
  const handleSelect = (catId: string) => {
    if (!disabled) {
      playSoundEffect('click', 0.3);
      onCategoryChange(catId);
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {CATEGORIES.map((cat, index) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <motion.button
            key={cat.id}
            type="button"
            onClick={() => handleSelect(cat.id)}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: index % 2 === 0 ? -1 : 1,
            }}
            transition={{ delay: index * 0.04 }}
            whileHover={
              !disabled ? { y: -3, scale: 1.06, rotate: 0 } : undefined
            }
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            className={cn(
              'relative p-3 rounded-2xl flex flex-col items-center gap-1',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            style={{
              background: isSelected
                ? `linear-gradient(180deg, ${cat.color}, ${cat.color}cc)`
                : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: '3px solid #0a0810',
              boxShadow: isSelected
                ? `0 4px 0 #0a0810, 0 0 12px ${cat.color}66`
                : '0 4px 0 #0a0810',
            }}
          >
            <span
              className="text-3xl block"
              style={{ filter: 'drop-shadow(1.5px 1.5px 0 rgba(0,0,0,0.4))' }}
            >
              {cat.emoji}
            </span>
            <p
              className="text-sm font-black truncate w-full text-center text-white leading-none"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              {cat.name}
            </p>
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
  );
};
