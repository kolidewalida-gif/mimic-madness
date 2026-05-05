import { cn } from '@/lib/utils';
import { Sparkles, Check } from 'lucide-react';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { id: 'mixed', name: 'Mélangé', emoji: '🎲' },
  { id: 'general', name: 'Culture G', emoji: '🎯' },
  { id: 'anime', name: 'Anime', emoji: '🎌' },
  { id: 'histoire', name: 'Histoire', emoji: '📜' },
  { id: 'sport', name: 'Sport', emoji: '⚽' },
  { id: 'musique', name: 'Musique', emoji: '🎵' },
  { id: 'cinema', name: 'Cinéma', emoji: '🎬' },
  { id: 'science', name: 'Science', emoji: '🔬' },
  { id: 'geographie', name: 'Géographie', emoji: '🌍' },
  { id: 'jeux_video', name: 'Jeux Vidéo', emoji: '🎮' },
  { id: 'art', name: 'Art', emoji: '🎨' }
];

interface QuizCategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  disabled?: boolean;
}

export const QuizCategorySelector = ({
  selectedCategory,
  onCategoryChange,
  disabled
}: QuizCategorySelectorProps) => {
  const handleSelect = (catId: string) => {
    if (!disabled) {
      playSoundEffect('click', 0.3);
      onCategoryChange(catId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-foreground-muted">
        <Sparkles className="h-4 w-4 text-accent" />
        Catégorie
        <Sparkles className="h-4 w-4 text-accent" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat, index) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              disabled={disabled}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all duration-300 text-center group",
                "hover:scale-105 active:scale-95 gpu-accelerated",
                "animate-fadeIn",
                isSelected
                  ? "border-accent bg-accent/20 shadow-lg shadow-accent/30"
                  : "border-border/50 glass-ultra hover:border-accent/50 hover:bg-accent/10",
                disabled && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg animate-zoomIn">
                  <Check className="h-4 w-4 text-accent-foreground" />
                </div>
              )}
              
              {/* Emoji with glow */}
              <div className="relative">
                <span className={cn(
                  "text-3xl block mb-2 transition-transform duration-300",
                  isSelected && "scale-110",
                  !disabled && "group-hover:scale-110"
                )}>
                  {cat.emoji}
                </span>
                {isSelected && (
                  <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full -z-10" />
                )}
              </div>
              
              {/* Name */}
              <p className={cn(
                "text-xs font-bold truncate transition-colors duration-300",
                isSelected ? "text-accent" : "text-foreground-muted group-hover:text-foreground"
              )}>
                {cat.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
