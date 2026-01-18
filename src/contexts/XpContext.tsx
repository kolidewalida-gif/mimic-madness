import { createContext, useContext, useCallback, ReactNode } from 'react';
import { usePlayerLevel, XP_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitRewardNotification, emitLevelUpNotification } from '@/components/RewardNotification';
import { useAuth } from '@/hooks/useAuth';

interface XpContextType {
  // Core XP function
  addXpWithNotification: (action: keyof typeof XP_REWARDS) => Promise<void>;
  
  // Convenience functions for common actions
  onMessageSent: () => Promise<void>;
  onGifSent: () => Promise<void>;
  onGameWin: () => Promise<void>;
  onGameLoss: () => Promise<void>;
  onGameParticipation: () => Promise<void>;
  onQuizCorrectAnswer: () => Promise<void>;
  onQuizWin: () => Promise<void>;
  onAudioPhoneComplete: () => Promise<void>;
  onRecordingMade: () => Promise<void>;
  onFriendAdded: () => Promise<void>;
  onGameHosted: () => Promise<void>;
  onPerfectRound: () => Promise<void>;
  onAchievementUnlocked: () => Promise<void>;
  onDailyLogin: () => Promise<void>;
  
  // Current state
  level: number;
  totalXp: number;
  progressPercent: number;
}

export const XpContext = createContext<XpContextType | null>(null);

export const XpProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addXp, level, totalXp, progressPercent, pendingLevelUp, pendingReward, dismissLevelUp, dismissReward } = usePlayerLevel();

  const addXpWithNotification = useCallback(async (action: keyof typeof XP_REWARDS) => {
    if (!user) return;
    
    const xpAmount = XP_REWARDS[action];
    const result = await addXp(action);
    
    // Always emit XP gain popup
    emitXpGain(xpAmount, action);
    
    // Check for level up
    if (result?.leveledUp) {
      emitLevelUpNotification(result.newLevel);
    }
  }, [user, addXp]);

  // Create convenience functions
  const onMessageSent = useCallback(() => addXpWithNotification('messageSent'), [addXpWithNotification]);
  const onGifSent = useCallback(() => addXpWithNotification('gifSent'), [addXpWithNotification]);
  const onGameWin = useCallback(() => addXpWithNotification('gameWin'), [addXpWithNotification]);
  const onGameLoss = useCallback(() => addXpWithNotification('gameLoss'), [addXpWithNotification]);
  const onGameParticipation = useCallback(() => addXpWithNotification('gameParticipation'), [addXpWithNotification]);
  const onQuizCorrectAnswer = useCallback(() => addXpWithNotification('quizCorrectAnswer'), [addXpWithNotification]);
  const onQuizWin = useCallback(() => addXpWithNotification('quizWin'), [addXpWithNotification]);
  const onAudioPhoneComplete = useCallback(() => addXpWithNotification('audioPhoneComplete'), [addXpWithNotification]);
  const onRecordingMade = useCallback(() => addXpWithNotification('recordingMade'), [addXpWithNotification]);
  const onFriendAdded = useCallback(() => addXpWithNotification('friendAdded'), [addXpWithNotification]);
  const onGameHosted = useCallback(() => addXpWithNotification('gameHosted'), [addXpWithNotification]);
  const onPerfectRound = useCallback(() => addXpWithNotification('perfectRound'), [addXpWithNotification]);
  const onAchievementUnlocked = useCallback(() => addXpWithNotification('achievementUnlocked'), [addXpWithNotification]);
  const onDailyLogin = useCallback(() => addXpWithNotification('dailyLogin'), [addXpWithNotification]);

  return (
    <XpContext.Provider value={{
      addXpWithNotification,
      onMessageSent,
      onGifSent,
      onGameWin,
      onGameLoss,
      onGameParticipation,
      onQuizCorrectAnswer,
      onQuizWin,
      onAudioPhoneComplete,
      onRecordingMade,
      onFriendAdded,
      onGameHosted,
      onPerfectRound,
      onAchievementUnlocked,
      onDailyLogin,
      level,
      totalXp,
      progressPercent,
    }}>
      {children}
    </XpContext.Provider>
  );
};

export const useXp = () => {
  const context = useContext(XpContext);
  if (!context) {
    throw new Error('useXp must be used within an XpProvider');
  }
  return context;
};