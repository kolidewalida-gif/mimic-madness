/**
 * Client-side derived social badges. No DB table needed — everything is
 * computed from a user's public post stats (post count + total likes received)
 * and an optional weekly #1 flag.
 */
export interface SocialBadge {
  id: string;
  label: string;
  emoji: string;
  /** Accent color (hex) */
  color: string;
  description: string;
  unlocked: boolean;
}

export interface BadgeInput {
  postsCount: number;
  totalLikes: number;
  /** true if the user currently holds the #1 spot of the weekly top */
  isTopWeek?: boolean;
}

export function computeSocialBadges({ postsCount, totalLikes, isTopWeek }: BadgeInput): SocialBadge[] {
  return [
    {
      id: "first_post",
      label: "Première imitation",
      emoji: "🎬",
      color: "#22d3ee",
      description: "Partage ta première imitation",
      unlocked: postsCount >= 1,
    },
    {
      id: "creator",
      label: "Créateur",
      emoji: "🎭",
      color: "#a855f7",
      description: "Partage 5 imitations",
      unlocked: postsCount >= 5,
    },
    {
      id: "rising_star",
      label: "Étoile montante",
      emoji: "🌟",
      color: "#fbbf24",
      description: "Partage 10 imitations",
      unlocked: postsCount >= 10,
    },
    {
      id: "loved",
      label: "Apprécié",
      emoji: "💖",
      color: "#fb7185",
      description: "Reçois 50 likes au total",
      unlocked: totalLikes >= 50,
    },
    {
      id: "idol",
      label: "Idole",
      emoji: "🔥",
      color: "#f97316",
      description: "Reçois 100 likes au total",
      unlocked: totalLikes >= 100,
    },
    {
      id: "legend",
      label: "Légende",
      emoji: "👑",
      color: "#facc15",
      description: "Reçois 500 likes au total",
      unlocked: totalLikes >= 500,
    },
    {
      id: "top_week",
      label: "N°1 de la semaine",
      emoji: "🏆",
      color: "#34d399",
      description: "Termine en tête du classement hebdo",
      unlocked: !!isTopWeek,
    },
  ];
}

/** Level helper mirroring usePlayerLevel thresholds (kept local to avoid hook deps). */
export const LEVEL_XP_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600,
  9200, 11000, 13000, 15500, 18500, 22000, 26000, 30500, 35500, 41000, 47000,
  54000, 62000, 71000, 81000, 92000,
];

export function levelFromXp(totalXp: number): number {
  let level = 1;
  for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, LEVEL_XP_THRESHOLDS.length);
}
