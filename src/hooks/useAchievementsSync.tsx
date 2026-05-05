import { useState, useCallback, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Achievement, ACHIEVEMENTS } from '@/components/AchievementToast';
import { emitAchievementNotification } from '@/components/RewardNotification';
import { XpContext } from '@/contexts/XpContext';

const LOCAL_STORAGE_KEY = 'mimic-master-achievements';

interface AchievementState {
  unlockedIds: string[];
  stats: {
    messagesCount: number;
    gifsCount: number;
    recordingsCount: number;
    winsCount: number;
    gamesHosted: number;
    quizStreak: number;
    winStreak: number;
    modesPlayed: string[];
  };
}

const getInitialState = (): AchievementState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load achievements:', e);
  }
  return {
    unlockedIds: [],
    stats: {
      messagesCount: 0,
      gifsCount: 0,
      recordingsCount: 0,
      winsCount: 0,
      gamesHosted: 0,
      quizStreak: 0,
      winStreak: 0,
      modesPlayed: []
    }
  };
};

/**
 * Achievement system that syncs with backend for logged-in users
 * and falls back to localStorage for guests.
 */
export const useAchievementsSync = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AchievementState>(getInitialState);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use context directly (may be null)
  const xpContext = useContext(XpContext);

  // Load achievements from backend when user logs in
  useEffect(() => {
    const loadFromBackend = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('player_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);

        if (error) throw error;

        if (data && data.length > 0) {
          const backendIds = data.map(d => d.achievement_id);
          setState(prev => {
            // Merge backend achievements with local
            const mergedIds = [...new Set([...prev.unlockedIds, ...backendIds])];
            return { ...prev, unlockedIds: mergedIds };
          });
        }
      } catch (error) {
        console.error('Error loading achievements from backend:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromBackend();
  }, [user?.id]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Save achievement to backend
  const saveToBackend = useCallback(async (achievementId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('player_achievements')
        .upsert({
          user_id: user.id,
          achievement_id: achievementId
        }, {
          onConflict: 'user_id,achievement_id'
        });

      if (error) {
        console.error('Error saving achievement:', error);
      }
    } catch (error) {
      console.error('Error saving achievement to backend:', error);
    }
  }, [user?.id]);

  const unlockAchievement = useCallback((achievementId: string) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    setState(prev => {
      if (prev.unlockedIds.includes(achievementId)) return prev;
      
      // Emit notification
      emitAchievementNotification(
        achievement.title,
        achievement.description,
        achievement.rarity
      );
      
      // Award XP for achievement (if context available)
      xpContext?.onAchievementUnlocked();
      
      // Save to backend
      saveToBackend(achievementId);
      
      return {
        ...prev,
        unlockedIds: [...prev.unlockedIds, achievementId]
      };
    });
  }, [saveToBackend, xpContext]);

  const checkAndUnlock = useCallback((type: string, value?: number | string) => {
    setState(prev => {
      const newStats = { ...prev.stats };
      const toUnlock: string[] = [];

      switch (type) {
        case 'message':
          newStats.messagesCount++;
          if (newStats.messagesCount === 1 && !prev.unlockedIds.includes('first_message')) {
            toUnlock.push('first_message');
          }
          if (newStats.messagesCount >= 100 && !prev.unlockedIds.includes('community_star')) {
            toUnlock.push('community_star');
          }
          break;

        case 'gif':
          newStats.gifsCount++;
          if (newStats.gifsCount === 1 && !prev.unlockedIds.includes('first_gif')) {
            toUnlock.push('first_gif');
          }
          break;

        case 'recording':
          newStats.recordingsCount++;
          if (newStats.recordingsCount === 1 && !prev.unlockedIds.includes('first_recording')) {
            toUnlock.push('first_recording');
          }
          break;

        case 'win':
          newStats.winsCount++;
          newStats.winStreak++;
          if (newStats.winsCount === 1 && !prev.unlockedIds.includes('first_win')) {
            toUnlock.push('first_win');
          }
          if (newStats.winStreak >= 3 && !prev.unlockedIds.includes('win_streak_3')) {
            toUnlock.push('win_streak_3');
          }
          break;

        case 'loss':
          newStats.winStreak = 0;
          break;

        case 'host_game':
          newStats.gamesHosted++;
          if (newStats.gamesHosted >= 10 && !prev.unlockedIds.includes('host_10_games')) {
            toUnlock.push('host_10_games');
          }
          break;

        case 'quiz_correct':
          newStats.quizStreak++;
          if (newStats.quizStreak >= 3 && !prev.unlockedIds.includes('quiz_streak_3')) {
            toUnlock.push('quiz_streak_3');
          }
          if (newStats.quizStreak >= 5 && !prev.unlockedIds.includes('quiz_streak_5')) {
            toUnlock.push('quiz_streak_5');
          }
          break;

        case 'quiz_wrong':
          newStats.quizStreak = 0;
          break;

        case 'perfect_round':
          if (!prev.unlockedIds.includes('perfect_round')) {
            toUnlock.push('perfect_round');
          }
          break;

        case 'play_mode':
          if (typeof value === 'string' && !newStats.modesPlayed.includes(value)) {
            newStats.modesPlayed = [...newStats.modesPlayed, value];
            if (newStats.modesPlayed.length >= 3 && !prev.unlockedIds.includes('play_all_modes')) {
              toUnlock.push('play_all_modes');
            }
          }
          break;
      }

      // Unlock achievements with notifications
      if (toUnlock.length > 0) {
        toUnlock.forEach((achievementId, index) => {
          const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
          if (achievement) {
            setTimeout(() => {
              emitAchievementNotification(
                achievement.title,
                achievement.description,
                achievement.rarity
              );
              
              // Save to backend (call the local save function)
              if (user?.id) {
                supabase
                  .from('player_achievements')
                  .upsert({
                    user_id: user.id,
                    achievement_id: achievementId
                  }, {
                    onConflict: 'user_id,achievement_id'
                  });
              }
            }, index * 1500); // Stagger notifications
          }
        });
      }

      return {
        stats: newStats,
        unlockedIds: [...prev.unlockedIds, ...toUnlock]
      };
    });
  }, [saveToBackend]);

  const getUnlockedAchievements = useCallback((): Achievement[] => {
    return ACHIEVEMENTS.filter(a => state.unlockedIds.includes(a.id))
      .map(a => ({ ...a, unlockedAt: new Date() }));
  }, [state.unlockedIds]);

  const getLockedAchievements = useCallback((): Achievement[] => {
    return ACHIEVEMENTS.filter(a => !state.unlockedIds.includes(a.id));
  }, [state.unlockedIds]);

  const getProgress = useCallback(() => {
    return {
      unlocked: state.unlockedIds.length,
      total: ACHIEVEMENTS.length,
      percentage: Math.round((state.unlockedIds.length / ACHIEVEMENTS.length) * 100)
    };
  }, [state.unlockedIds]);

  return {
    unlockedIds: state.unlockedIds,
    stats: state.stats,
    isLoading,
    checkAndUnlock,
    unlockAchievement,
    getUnlockedAchievements,
    getLockedAchievements,
    getProgress
  };
};
