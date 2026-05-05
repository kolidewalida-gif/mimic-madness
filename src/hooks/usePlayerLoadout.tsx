import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEquippedTitle } from "@/hooks/useEquippedTitle";
import { LEVEL_REWARDS, type LevelReward, usePlayerLevel } from "@/hooks/usePlayerLevel";

type FrameTier = "none" | "bronze" | "silver" | "gold";
type EffectTier = "none" | "sparkle" | "glow";

const FRAME_PRIORITY: Record<FrameTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

const EFFECT_PRIORITY: Record<EffectTier, number> = {
  none: 0,
  sparkle: 1,
  glow: 2,
};

const getFrameTier = (rewardId: string): FrameTier => {
  if (rewardId === "frame_gold") return "gold";
  if (rewardId === "frame_silver") return "silver";
  if (rewardId === "frame_bronze") return "bronze";
  return "none";
};

const getEffectTier = (rewardId: string): EffectTier => {
  if (rewardId === "effect_glow") return "glow";
  if (rewardId === "effect_sparkle") return "sparkle";
  return "none";
};

export const usePlayerLoadout = (playerId?: string) => {
  const { user } = useAuth();
  const { unlockedRewards } = usePlayerLevel();
  const { equippedTitle } = useEquippedTitle();

  return useMemo(() => {
    const isCurrentUser = Boolean(user?.id && playerId && user.id === playerId);

    if (!isCurrentUser) {
      return {
        isCurrentUser,
        equippedTitle: null as LevelReward | null,
        frameTier: "none" as FrameTier,
        effectTier: "none" as EffectTier,
        featuredBadge: null as LevelReward | null,
        prestigeScore: 0,
      };
    }

    let frameTier: FrameTier = "none";
    let effectTier: EffectTier = "none";
    let featuredBadge: LevelReward | null = null;
    let prestigeScore = 0;

    for (const rewardId of unlockedRewards) {
      const reward = LEVEL_REWARDS.find((entry) => entry.id === rewardId);
      if (!reward) continue;

      prestigeScore += reward.rarity === "legendary" ? 8 : reward.rarity === "epic" ? 5 : reward.rarity === "rare" ? 3 : 1;

      const nextFrameTier = getFrameTier(reward.id);
      if (FRAME_PRIORITY[nextFrameTier] > FRAME_PRIORITY[frameTier]) {
        frameTier = nextFrameTier;
      }

      const nextEffectTier = getEffectTier(reward.id);
      if (EFFECT_PRIORITY[nextEffectTier] > EFFECT_PRIORITY[effectTier]) {
        effectTier = nextEffectTier;
      }

      if (reward.type === "badge") {
        if (!featuredBadge) {
          featuredBadge = reward;
        } else {
          const currentScore = FRAME_PRIORITY.none + (featuredBadge.rarity === "legendary" ? 4 : featuredBadge.rarity === "epic" ? 3 : featuredBadge.rarity === "rare" ? 2 : 1);
          const nextScore = reward.rarity === "legendary" ? 4 : reward.rarity === "epic" ? 3 : reward.rarity === "rare" ? 2 : 1;
          if (nextScore >= currentScore) {
            featuredBadge = reward;
          }
        }
      }
    }

    return {
      isCurrentUser,
      equippedTitle,
      frameTier,
      effectTier,
      featuredBadge,
      prestigeScore,
    };
  }, [equippedTitle, playerId, unlockedRewards, user?.id]);
};
