import { useCallback } from 'react';
import { usePlayerLevel, XP_REWARDS } from './usePlayerLevel';
import { playSoundEffect } from './useSoundEffects';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';

/**
 * Hook to easily add XP from game actions with automatic notifications
 * This hook is designed to be used across all game modes
 */
export const useXpActions = () => {
  const { addXp } = usePlayerLevel();

  // Helper to add XP with notifications
  const addXpWithNotification = useCallback(async (action: keyof typeof XP_REWARDS) => {
    const result = await addXp(action);
    emitXpGain(XP_REWARDS[action], action);
    if (result?.leveledUp) {
      emitLevelUpNotification(result.newLevel);
      playSoundEffect('achievementEarned', 0.6);
    }
    return result;
  }, [addXp]);

  // Game completion rewards
  const onGameWin = useCallback(async () => {
    const result = await addXpWithNotification('gameWin');
    playSoundEffect('success', 0.4);
    return result;
  }, [addXpWithNotification]);

  const onGameLoss = useCallback(async () => {
    return await addXpWithNotification('gameLoss');
  }, [addXpWithNotification]);

  const onGameParticipation = useCallback(async () => {
    return await addXpWithNotification('gameParticipation');
  }, [addXpWithNotification]);

  const onGameHosted = useCallback(async () => {
    return await addXpWithNotification('gameHosted');
  }, [addXpWithNotification]);

  // Quiz specific rewards
  const onQuizCorrectAnswer = useCallback(async () => {
    return await addXpWithNotification('quizCorrectAnswer');
  }, [addXpWithNotification]);

  const onQuizWin = useCallback(async () => {
    const result = await addXpWithNotification('quizWin');
    playSoundEffect('celebration', 0.5);
    return result;
  }, [addXpWithNotification]);

  const onQuizPerfectGame = useCallback(async () => {
    const result = await addXpWithNotification('quizPerfectGame');
    playSoundEffect('celebration', 0.6);
    return result;
  }, [addXpWithNotification]);

  // Audio Phone specific rewards
  const onAudioPhoneComplete = useCallback(async () => {
    const result = await addXpWithNotification('audioPhoneComplete');
    playSoundEffect('celebration', 0.5);
    return result;
  }, [addXpWithNotification]);

  const onRecordingMade = useCallback(async () => {
    return await addXpWithNotification('recordingMade');
  }, [addXpWithNotification]);

  // Voting rewards
  const onVoteLike = useCallback(async () => {
    return await addXpWithNotification('voteLike');
  }, [addXpWithNotification]);

  const onVoteReceived = useCallback(async () => {
    return await addXpWithNotification('voteReceived');
  }, [addXpWithNotification]);

  // Social rewards
  const onMessageSent = useCallback(async () => {
    return await addXpWithNotification('messageSent');
  }, [addXpWithNotification]);

  const onGifSent = useCallback(async () => {
    return await addXpWithNotification('gifSent');
  }, [addXpWithNotification]);

  const onFriendAdded = useCallback(async () => {
    const result = await addXpWithNotification('friendAdded');
    playSoundEffect('success', 0.3);
    return result;
  }, [addXpWithNotification]);

  // Special rewards
  const onPerfectRound = useCallback(async () => {
    const result = await addXpWithNotification('perfectRound');
    playSoundEffect('celebration', 0.5);
    return result;
  }, [addXpWithNotification]);

  const onAchievementUnlocked = useCallback(async () => {
    return await addXpWithNotification('achievementUnlocked');
  }, [addXpWithNotification]);

  const onDailyLogin = useCallback(async () => {
    return await addXpWithNotification('dailyLogin');
  }, [addXpWithNotification]);

  const onStreakBonus = useCallback(async () => {
    return await addXpWithNotification('streakBonus');
  }, [addXpWithNotification]);

  return {
    // Game actions
    onGameWin,
    onGameLoss,
    onGameParticipation,
    onGameHosted,
    
    // Quiz actions
    onQuizCorrectAnswer,
    onQuizWin,
    onQuizPerfectGame,
    
    // Audio Phone actions
    onAudioPhoneComplete,
    onRecordingMade,
    
    // Voting actions
    onVoteLike,
    onVoteReceived,
    
    // Social actions
    onMessageSent,
    onGifSent,
    onFriendAdded,
    
    // Special actions
    onPerfectRound,
    onAchievementUnlocked,
    onDailyLogin,
    onStreakBonus,
    
    // Raw addXp for custom actions
    addXp,
    addXpWithNotification,
    
    // XP values for display
    XP_REWARDS,
  };
};
