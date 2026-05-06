import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const LEVEL_XP_REQUIREMENTS = [
  0,
  100,
  250,
  450,
  700,
  1000,
  1400,
  1900,
  2500,
  3200,
  4000,
  5000,
  6200,
  7600,
  9200,
  11000,
  13000,
  15500,
  18500,
  22000,
  26000,
  30500,
  35500,
  41000,
  47000,
  54000,
  62000,
  71000,
  81000,
  92000,
];

export const XP_REWARDS = {
  gameWin: 200,
  gameLoss: 50,
  gameParticipation: 25,
  gameHosted: 30,
  quizCorrectAnswer: 20,
  quizWin: 150,
  quizPerfectGame: 100,
  audioPhoneComplete: 75,
  recordingMade: 15,
  voteLike: 5,
  voteReceived: 10,
  messageSent: 5,
  gifSent: 8,
  friendAdded: 50,
  perfectRound: 75,
  dailyLogin: 25,
  achievementUnlocked: 40,
  streakBonus: 15,
};

export interface LevelReward {
  id: string;
  type: "badge" | "title" | "effect" | "avatar_frame";
  name: string;
  description: string;
  perk?: string;
  icon: string;
  level: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const LEVEL_REWARDS: LevelReward[] = [
  { id: "badge_beginner", type: "badge", name: "Debutant", description: "Premier pas", perk: "Badge de prestige visible dans votre progression.", icon: "star", level: 1, rarity: "common" },
  { id: "badge_explorer", type: "badge", name: "Explorateur", description: "En route vers la gloire", perk: "Renforce votre collection et votre score de prestige.", icon: "compass", level: 3, rarity: "common" },
  { id: "title_player", type: "title", name: "Joueur", description: "Titre de base", perk: "Titre visible sur votre profil et votre avatar joueur.", icon: "user", level: 5, rarity: "common" },
  { id: "badge_enthusiast", type: "badge", name: "Enthousiaste", description: "On commence a maitriser", perk: "Badge rare mis en avant dans votre collection.", icon: "zap", level: 7, rarity: "rare" },
  { id: "effect_sparkle", type: "effect", name: "Etincelles", description: "Effet cosmetique", perk: "Ajoute des etincelles premium autour de votre avatar.", icon: "sparkles", level: 10, rarity: "rare" },
  { id: "frame_bronze", type: "avatar_frame", name: "Cadre Bronze", description: "Cadre avatar bronze", perk: "Active un cadre bronze dans les lobbies et parties.", icon: "circle", level: 12, rarity: "rare" },
  { id: "title_veteran", type: "title", name: "Veteran", description: "Titre d experience", perk: "Titre epique visible dans les interfaces de jeu.", icon: "shield", level: 15, rarity: "epic" },
  { id: "badge_master", type: "badge", name: "Maitre", description: "Un vrai expert", perk: "Badge epique pour afficher votre maitrise du jeu.", icon: "award", level: 18, rarity: "epic" },
  { id: "effect_glow", type: "effect", name: "Aura Lumineuse", description: "Effet cosmetique", perk: "Entoure votre avatar d une aura premium plus intense.", icon: "sun", level: 20, rarity: "epic" },
  { id: "frame_silver", type: "avatar_frame", name: "Cadre Argent", description: "Cadre avatar argent", perk: "Remplace le bronze par un cadre argent plus prestigieux.", icon: "circle", level: 22, rarity: "epic" },
  { id: "title_legend", type: "title", name: "Legende", description: "Titre ultime", perk: "Titre legendaire affiche avec un style prestige complet.", icon: "crown", level: 25, rarity: "legendary" },
  { id: "badge_champion", type: "badge", name: "Champion Supreme", description: "Le sommet de la gloire", perk: "Badge legendaire qui signe votre statut de top joueur.", icon: "trophy", level: 28, rarity: "legendary" },
  { id: "frame_gold", type: "avatar_frame", name: "Cadre Or", description: "Cadre avatar or anime", perk: "Cadre final anime pour votre avatar dans tout le jeu.", icon: "circle", level: 30, rarity: "legendary" },
];

interface LevelState {
  level: number;
  currentXp: number;
  totalXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export const usePlayerLevel = () => {
  const { user, stats } = useAuth();
  const [levelState, setLevelState] = useState<LevelState>({
    level: 1,
    currentXp: 0,
    totalXp: 0,
    xpForCurrentLevel: 0,
    xpForNextLevel: 100,
    progressPercent: 0,
  });
  const [unlockedRewards, setUnlockedRewards] = useState<string[]>([]);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [pendingReward, setPendingReward] = useState<LevelReward | null>(null);

  const calculateLevel = useCallback((totalXp: number): number => {
    let level = 1;
    for (let i = LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i -= 1) {
      if (totalXp >= LEVEL_XP_REQUIREMENTS[i]) {
        level = i + 1;
        break;
      }
    }
    return Math.min(level, LEVEL_XP_REQUIREMENTS.length);
  }, []);

  const calculateProgress = useCallback((totalXp: number, level: number): number => {
    const currentLevelXp = LEVEL_XP_REQUIREMENTS[level - 1] || 0;
    const nextLevelXp = LEVEL_XP_REQUIREMENTS[level] || LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];
    const xpInCurrentLevel = totalXp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    return Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100));
  }, []);

  useEffect(() => {
    if (stats) {
      const totalXp = (stats as any).total_xp || 0;
      const level = calculateLevel(totalXp);
      const currentLevelXp = LEVEL_XP_REQUIREMENTS[level - 1] || 0;
      const nextLevelXp = LEVEL_XP_REQUIREMENTS[level] || LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];

      setLevelState({
        level,
        currentXp: totalXp - currentLevelXp,
        totalXp,
        xpForCurrentLevel: currentLevelXp,
        xpForNextLevel: nextLevelXp,
        progressPercent: calculateProgress(totalXp, level),
      });
    }
  }, [stats, calculateLevel, calculateProgress]);

  useEffect(() => {
    if (!user) return;

    const fetchRewards = async () => {
      const { data } = await supabase
        .from("player_rewards")
        .select("reward_id")
        .eq("user_id", user.id);

      if (data) {
        setUnlockedRewards(data.map((reward) => reward.reward_id));
      }
    };

    fetchRewards();

    const channel = supabase
      .channel("player-rewards")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_rewards",
          filter: `user_id=eq.${user.id}`
        },
        () => fetchRewards()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addXp = useCallback(async (action: keyof typeof XP_REWARDS) => {
    if (!user) return;

    const xpGain = XP_REWARDS[action];
    const currentTotal = levelState.totalXp;
    const newTotal = currentTotal + xpGain;
    const oldLevel = levelState.level;
    const newLevel = calculateLevel(newTotal);

    await supabase
      .from("player_stats")
      .update({
        total_xp: newTotal,
        current_xp: newTotal - (LEVEL_XP_REQUIREMENTS[newLevel - 1] || 0),
        level: newLevel,
      })
      .eq("user_id", user.id);

    if (newLevel > oldLevel) {
      setPendingLevelUp(newLevel);

      const newRewards = LEVEL_REWARDS.filter((reward) =>
        reward.level <= newLevel && reward.level > oldLevel && !unlockedRewards.includes(reward.id)
      );

      for (const reward of newRewards) {
        await supabase
          .from("player_rewards")
          .insert({
            user_id: user.id,
            reward_id: reward.id,
          });

        setPendingReward(reward);
      }
    }

    return { xpGain, newLevel, leveledUp: newLevel > oldLevel };
  }, [user, levelState, calculateLevel, unlockedRewards]);

  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);

  const dismissReward = useCallback(() => {
    setPendingReward(null);
  }, []);

  const getRewardsForLevel = useCallback((level: number): LevelReward[] => {
    return LEVEL_REWARDS.filter((reward) => reward.level === level);
  }, []);

  const getAllRewards = useCallback((): LevelReward[] => {
    return LEVEL_REWARDS;
  }, []);

  const isRewardUnlocked = useCallback((rewardId: string): boolean => {
    return unlockedRewards.includes(rewardId);
  }, [unlockedRewards]);

  return {
    ...levelState,
    addXp,
    unlockedRewards,
    pendingLevelUp,
    pendingReward,
    dismissLevelUp,
    dismissReward,
    getRewardsForLevel,
    getAllRewards,
    isRewardUnlocked,
    XP_REWARDS,
    LEVEL_REWARDS,
  };
};
