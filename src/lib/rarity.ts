/**
 * Single source of truth for rarity presentation.
 * RewardsPanel and AchievementsPanel each carried a byte-identical copy of this
 * table, so any change had to be made twice and drifted over time.
 */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityStyle {
  /** Tailwind gradient stops used for the unlocked icon badge. */
  gradient: string;
  /** Accent colour used for borders, tags and progress fills. */
  color: string;
  label: string;
}

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  common: { gradient: 'from-zinc-500 to-zinc-600', color: '#a1a1aa', label: 'Commun' },
  rare: { gradient: 'from-blue-500 to-cyan-500', color: '#38bdf8', label: 'Rare' },
  epic: { gradient: 'from-purple-500 to-pink-500', color: '#c084fc', label: 'Épique' },
  legendary: { gradient: 'from-amber-400 to-orange-500', color: '#fbbf24', label: 'Légendaire' },
};

export const rarityStyle = (rarity: Rarity): RarityStyle => RARITY_STYLE[rarity] ?? RARITY_STYLE.common;
