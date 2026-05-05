import { useState, useCallback, useEffect } from 'react';
import { Achievement, ACHIEVEMENTS } from '@/components/AchievementToast';

const STORAGE_KEY = 'mimic-master-achievements';

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
    const stored = localStorage.getItem(STORAGE_KEY);
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

export const useAchievements = () => {
  const [state, setState] = useState<AchievementState>(getInitialState);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setState(prev => {
      if (prev.unlockedIds.includes(achievementId)) return prev;
      
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (achievement) {
        setPendingAchievement({ ...achievement, unlockedAt: new Date() });
      }
      
      return {
        ...prev,
        unlockedIds: [...prev.unlockedIds, achievementId]
      };
    });
  }, []);

  const dismissAchievement = useCallback(() => {
    setPendingAchievement(null);
  }, []);

  const checkAndUnlock = useCallback((type: string, value?: number | string) => {
    setState(prev => {
      const newStats = { ...prev.stats };
      let newUnlocked = [...prev.unlockedIds];
      const toUnlock: string[] = [];

      switch (type) {
        case 'message':
          newStats.messagesCount++;
          if (newStats.messagesCount === 1 && !newUnlocked.includes('first_message')) {
            toUnlock.push('first_message');
          }
          if (newStats.messagesCount >= 100 && !newUnlocked.includes('community_star')) {
            toUnlock.push('community_star');
          }
          break;

        case 'gif':
          newStats.gifsCount++;
          if (newStats.gifsCount === 1 && !newUnlocked.includes('first_gif')) {
            toUnlock.push('first_gif');
          }
          break;

        case 'recording':
          newStats.recordingsCount++;
          if (newStats.recordingsCount === 1 && !newUnlocked.includes('first_recording')) {
            toUnlock.push('first_recording');
          }
          break;

        case 'win':
          newStats.winsCount++;
          newStats.winStreak++;
          if (newStats.winsCount === 1 && !newUnlocked.includes('first_win')) {
            toUnlock.push('first_win');
          }
          if (newStats.winStreak >= 3 && !newUnlocked.includes('win_streak_3')) {
            toUnlock.push('win_streak_3');
          }
          break;

        case 'loss':
          newStats.winStreak = 0;
          break;

        case 'host_game':
          newStats.gamesHosted++;
          if (newStats.gamesHosted >= 10 && !newUnlocked.includes('host_10_games')) {
            toUnlock.push('host_10_games');
          }
          break;

        case 'quiz_correct':
          newStats.quizStreak++;
          if (newStats.quizStreak >= 3 && !newUnlocked.includes('quiz_streak_3')) {
            toUnlock.push('quiz_streak_3');
          }
          if (newStats.quizStreak >= 5 && !newUnlocked.includes('quiz_streak_5')) {
            toUnlock.push('quiz_streak_5');
          }
          break;

        case 'quiz_wrong':
          newStats.quizStreak = 0;
          break;

        case 'perfect_round':
          if (!newUnlocked.includes('perfect_round')) {
            toUnlock.push('perfect_round');
          }
          break;

        case 'play_mode':
          if (typeof value === 'string' && !newStats.modesPlayed.includes(value)) {
            newStats.modesPlayed = [...newStats.modesPlayed, value];
            // Assuming there are 3 game modes: audio_phone, quiz, standard
            if (newStats.modesPlayed.length >= 3 && !newUnlocked.includes('play_all_modes')) {
              toUnlock.push('play_all_modes');
            }
          }
          break;
      }

      // Unlock achievements sequentially with delay
      if (toUnlock.length > 0) {
        const firstUnlock = toUnlock[0];
        newUnlocked = [...newUnlocked, ...toUnlock];
        
        const achievement = ACHIEVEMENTS.find(a => a.id === firstUnlock);
        if (achievement) {
          setTimeout(() => {
            setPendingAchievement({ ...achievement, unlockedAt: new Date() });
          }, 500);
        }
      }

      return {
        stats: newStats,
        unlockedIds: newUnlocked
      };
    });
  }, []);

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
    pendingAchievement,
    dismissAchievement,
    checkAndUnlock,
    unlockAchievement,
    getUnlockedAchievements,
    getLockedAchievements,
    getProgress
  };
};
