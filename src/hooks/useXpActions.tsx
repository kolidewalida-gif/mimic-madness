import { useCallback } from 'react';
import { usePlayerLevel, XP_REWARDS } from './usePlayerLevel';
import { playSoundEffect } from './useSoundEffects';

/**
 * Hook to easily add XP from game actions
 * This hook is designed to be used across all game modes
 */
export const useXpActions = () => {
  const { addXp } = usePlayerLevel();

  // Game completion rewards
  const onGameWin = useCallback(async () => {
    const result = await addXp('gameWin');
    if (result?.leveledUp) {
      playSoundEffect('achievementEarned', 0.6);
    } else {
      playSoundEffect('success', 0.4);
    }
    return result;
  }, [addXp]);

  const onGameLoss = useCallback(async () => {
    const result = await addXp('gameLoss');
    return result;
  }, [addXp]);

  const onGameParticipation = useCallback(async () => {
    const result = await addXp('gameParticipation');
    return result;
  }, [addXp]);

  // Quiz specific rewards
  const onQuizCorrectAnswer = useCallback(async () => {
    const result = await addXp('quizCorrectAnswer');
    return result;
  }, [addXp]);

  const onQuizWin = useCallback(async () => {
    const result = await addXp('quizWin');
    if (result?.leveledUp) {
      playSoundEffect('achievementEarned', 0.6);
    }
    return result;
  }, [addXp]);

  // Audio Phone specific rewards
  const onAudioPhoneComplete = useCallback(async () => {
    const result = await addXp('audioPhoneComplete');
    if (result?.leveledUp) {
      playSoundEffect('achievementEarned', 0.6);
    }
    return result;
  }, [addXp]);

  const onRecordingMade = useCallback(async () => {
    const result = await addXp('recordingMade');
    return result;
  }, [addXp]);

  // Social rewards
  const onMessageSent = useCallback(async () => {
    const result = await addXp('messageSent');
    return result;
  }, [addXp]);

  const onGifSent = useCallback(async () => {
    const result = await addXp('gifSent');
    return result;
  }, [addXp]);

  const onFriendAdded = useCallback(async () => {
    const result = await addXp('friendAdded');
    if (result?.leveledUp) {
      playSoundEffect('achievementEarned', 0.6);
    } else {
      playSoundEffect('success', 0.3);
    }
    return result;
  }, [addXp]);

  // Host rewards
  const onGameHosted = useCallback(async () => {
    const result = await addXp('gameHosted');
    return result;
  }, [addXp]);

  // Special rewards
  const onPerfectRound = useCallback(async () => {
    const result = await addXp('perfectRound');
    if (result?.leveledUp) {
      playSoundEffect('achievementEarned', 0.6);
    } else {
      playSoundEffect('celebration', 0.5);
    }
    return result;
  }, [addXp]);

  const onAchievementUnlocked = useCallback(async () => {
    const result = await addXp('achievementUnlocked');
    return result;
  }, [addXp]);

  const onDailyLogin = useCallback(async () => {
    const result = await addXp('dailyLogin');
    return result;
  }, [addXp]);

  return {
    // Game actions
    onGameWin,
    onGameLoss,
    onGameParticipation,
    
    // Quiz actions
    onQuizCorrectAnswer,
    onQuizWin,
    
    // Audio Phone actions
    onAudioPhoneComplete,
    onRecordingMade,
    
    // Social actions
    onMessageSent,
    onGifSent,
    onFriendAdded,
    
    // Host actions
    onGameHosted,
    
    // Special actions
    onPerfectRound,
    onAchievementUnlocked,
    onDailyLogin,
    
    // Raw addXp for custom actions
    addXp,
    
    // XP values for display
    XP_REWARDS,
  };
};