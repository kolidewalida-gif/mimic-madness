import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
  { id: 'mixed', name: 'Mélangé', emoji: '🎲' },
  { id: 'general', name: 'Culture Générale', emoji: '🎯' },
  { id: 'anime', name: 'Anime & Manga', emoji: '🎌' },
  { id: 'histoire', name: 'Histoire', emoji: '📜' },
  { id: 'sport', name: 'Sport', emoji: '⚽' },
  { id: 'musique', name: 'Musique', emoji: '🎵' },
  { id: 'cinema', name: 'Cinéma & Séries', emoji: '🎬' },
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
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
        Catégorie
      </h4>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            disabled={disabled}
            className={cn(
              "p-2 rounded-lg border transition-all duration-300 text-center",
              "hover:scale-105 active:scale-95",
              selectedCategory === cat.id
                ? "border-accent bg-accent/20 shadow-lg shadow-accent/30"
                : "border-border/50 bg-background-secondary/30 hover:border-accent/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-xl">{cat.emoji}</span>
            <p className={cn(
              "text-[10px] mt-1 font-medium truncate",
              selectedCategory === cat.id ? "text-accent" : "text-foreground-muted"
            )}>
              {cat.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
