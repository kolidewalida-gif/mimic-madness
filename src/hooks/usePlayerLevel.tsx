import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// XP required for each level (exponential curve)
export const LEVEL_XP_REQUIREMENTS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  450,    // Level 4
  700,    // Level 5
  1000,   // Level 6
  1400,   // Level 7
  1900,   // Level 8
  2500,   // Level 9
  3200,   // Level 10
  4000,   // Level 11
  5000,   // Level 12
  6200,   // Level 13
  7600,   // Level 14
  9200,   // Level 15
  11000,  // Level 16
  13000,  // Level 17
  15500,  // Level 18
  18500,  // Level 19
  22000,  // Level 20
  26000,  // Level 21
  30500,  // Level 22
  35500,  // Level 23
  41000,  // Level 24
  47000,  // Level 25
  54000,  // Level 26
  62000,  // Level 27
  71000,  // Level 28
  81000,  // Level 29
  92000,  // Level 30
];

// XP rewards for different actions - Cohérent et logique
export const XP_REWARDS = {
  // Game rewards
  gameWin: 200,           // Gagner une partie
  gameLoss: 50,           // Perdre une partie (participation)
  gameParticipation: 25,  // Participer à une partie
  gameHosted: 30,         // Héberger une partie
  
  // Quiz rewards
  quizCorrectAnswer: 20,  // Bonne réponse au quiz
  quizWin: 150,           // Gagner le quiz
  quizPerfectGame: 100,   // Toutes les réponses correctes
  
  // Audio Phone rewards
  audioPhoneComplete: 75, // Finir une partie Audio Phone
  recordingMade: 15,      // Enregistrement fait
  
  // Voting rewards
  voteLike: 5,            // Donner un like
  voteReceived: 10,       // Recevoir un vote
  
  // Social rewards
  messageSent: 5,         // Message envoyé
  gifSent: 8,             // GIF envoyé
  friendAdded: 50,        // Ami ajouté
  
  // Special rewards
  perfectRound: 75,       // Round parfait
  dailyLogin: 25,         // Connexion quotidienne
  achievementUnlocked: 40, // Succès débloqué
  streakBonus: 15,        // Bonus de série
};

// Rewards unlocked at each level
export interface LevelReward {
  id: string;
  type: 'badge' | 'title' | 'effect' | 'avatar_frame';
  name: string;
  description: string;
  icon: string;
  level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const LEVEL_REWARDS: LevelReward[] = [
  { id: 'badge_beginner', type: 'badge', name: 'Débutant', description: 'Premier pas', icon: 'star', level: 1, rarity: 'common' },
  { id: 'badge_explorer', type: 'badge', name: 'Explorateur', description: 'En route vers la gloire', icon: 'compass', level: 3, rarity: 'common' },
  { id: 'title_player', type: 'title', name: 'Joueur', description: 'Titre: Joueur', icon: 'user', level: 5, rarity: 'common' },
  { id: 'badge_enthusiast', type: 'badge', name: 'Enthousiaste', description: 'On commence à maîtriser', icon: 'zap', level: 7, rarity: 'rare' },
  { id: 'effect_sparkle', type: 'effect', name: 'Étincelles', description: 'Effet: Étincelles sur votre avatar', icon: 'sparkles', level: 10, rarity: 'rare' },
  { id: 'frame_bronze', type: 'avatar_frame', name: 'Cadre Bronze', description: 'Cadre avatar bronze', icon: 'circle', level: 12, rarity: 'rare' },
  { id: 'title_veteran', type: 'title', name: 'Vétéran', description: 'Titre: Vétéran', icon: 'shield', level: 15, rarity: 'epic' },
  { id: 'badge_master', type: 'badge', name: 'Maître', description: 'Un vrai expert', icon: 'award', level: 18, rarity: 'epic' },
  { id: 'effect_glow', type: 'effect', name: 'Aura Lumineuse', description: 'Effet: Aura autour de votre avatar', icon: 'sun', level: 20, rarity: 'epic' },
  { id: 'frame_silver', type: 'avatar_frame', name: 'Cadre Argent', description: 'Cadre avatar argent', icon: 'circle', level: 22, rarity: 'epic' },
  { id: 'title_legend', type: 'title', name: 'Légende', description: 'Titre: Légende', icon: 'crown', level: 25, rarity: 'legendary' },
  { id: 'badge_champion', type: 'badge', name: 'Champion Suprême', description: 'Le sommet de la gloire', icon: 'trophy', level: 28, rarity: 'legendary' },
  { id: 'frame_gold', type: 'avatar_frame', name: 'Cadre Or', description: 'Cadre avatar or animé', icon: 'circle', level: 30, rarity: 'legendary' },
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

  // Calculate level from total XP
  const calculateLevel = useCallback((totalXp: number): number => {
    let level = 1;
    for (let i = LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i--) {
      if (totalXp >= LEVEL_XP_REQUIREMENTS[i]) {
        level = i + 1;
        break;
      }
    }
    return Math.min(level, LEVEL_XP_REQUIREMENTS.length);
  }, []);

  // Calculate progress percentage
  const calculateProgress = useCallback((totalXp: number, level: number): number => {
    const currentLevelXp = LEVEL_XP_REQUIREMENTS[level - 1] || 0;
    const nextLevelXp = LEVEL_XP_REQUIREMENTS[level] || LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];
    const xpInCurrentLevel = totalXp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    return Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100));
  }, []);

  // Update state from stats
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

  // Fetch unlocked rewards
  useEffect(() => {
    if (!user) return;

    const fetchRewards = async () => {
      const { data } = await supabase
        .from('player_rewards')
        .select('reward_id')
        .eq('user_id', user.id);
      
      if (data) {
        setUnlockedRewards(data.map(r => r.reward_id));
      }
    };

    fetchRewards();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('player-rewards')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_rewards',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchRewards()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Add XP and handle level ups
  const addXp = useCallback(async (action: keyof typeof XP_REWARDS) => {
    if (!user) return;

    const xpGain = XP_REWARDS[action];
    const currentTotal = levelState.totalXp;
    const newTotal = currentTotal + xpGain;
    const oldLevel = levelState.level;
    const newLevel = calculateLevel(newTotal);

    // Update database
    await supabase
      .from('player_stats')
      .update({
        total_xp: newTotal,
        current_xp: newTotal - (LEVEL_XP_REQUIREMENTS[newLevel - 1] || 0),
        level: newLevel,
      })
      .eq('user_id', user.id);

    // Check for level up
    if (newLevel > oldLevel) {
      setPendingLevelUp(newLevel);

      // Check for new rewards
      const newRewards = LEVEL_REWARDS.filter(r => 
        r.level <= newLevel && r.level > oldLevel && !unlockedRewards.includes(r.id)
      );

      for (const reward of newRewards) {
        await supabase
          .from('player_rewards')
          .insert({
            user_id: user.id,
            reward_id: reward.id,
          });
        
        setPendingReward(reward);
      }
    }

    return { xpGain, newLevel, leveledUp: newLevel > oldLevel };
  }, [user, levelState, calculateLevel, unlockedRewards]);

  // Dismiss level up notification
  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);

  // Dismiss reward notification
  const dismissReward = useCallback(() => {
    setPendingReward(null);
  }, []);

  // Get rewards available at a specific level
  const getRewardsForLevel = useCallback((level: number): LevelReward[] => {
    return LEVEL_REWARDS.filter(r => r.level === level);
  }, []);

  // Get all unlockable rewards up to max level
  const getAllRewards = useCallback((): LevelReward[] => {
    return LEVEL_REWARDS;
  }, []);

  // Check if a reward is unlocked
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
