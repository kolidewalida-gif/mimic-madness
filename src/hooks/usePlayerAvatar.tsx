import { useState, useEffect } from 'react';

const AVATAR_STORAGE_KEY = 'player_avatar';

export interface PlayerAvatarData {
  type: 'initials' | 'image';
  imageUrl?: string;
  backgroundColor?: string;
}

const DEFAULT_COLORS = [
  'hsl(180 100% 50%)',  // Cyan
  'hsl(320 100% 60%)',  // Pink
  'hsl(270 100% 65%)',  // Purple
  'hsl(45 100% 55%)',   // Yellow
  'hsl(150 100% 45%)',  // Green
  'hsl(0 100% 60%)',    // Red
  'hsl(200 100% 55%)',  // Blue
  'hsl(30 100% 55%)',   // Orange
];

export const usePlayerAvatar = (playerId: string) => {
  const [avatarData, setAvatarData] = useState<PlayerAvatarData>(() => {
    const stored = localStorage.getItem(`${AVATAR_STORAGE_KEY}_${playerId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { type: 'initials' };
      }
    }
    return { type: 'initials' };
  });

  useEffect(() => {
    localStorage.setItem(`${AVATAR_STORAGE_KEY}_${playerId}`, JSON.stringify(avatarData));
  }, [playerId, avatarData]);

  const setAvatarImage = (imageUrl: string) => {
    setAvatarData({ type: 'image', imageUrl });
  };

  const setAvatarInitials = (backgroundColor?: string) => {
    setAvatarData({ type: 'initials', backgroundColor });
  };

  const clearAvatar = () => {
    setAvatarData({ type: 'initials' });
    localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${playerId}`);
  };

  const getRandomColor = () => {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  };

  return {
    avatarData,
    setAvatarImage,
    setAvatarInitials,
    clearAvatar,
    getRandomColor,
    DEFAULT_COLORS,
  };
};

// Static helper to get avatar from localStorage for any player
export const getPlayerAvatarData = (playerId: string): PlayerAvatarData => {
  const stored = localStorage.getItem(`${AVATAR_STORAGE_KEY}_${playerId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { type: 'initials' };
    }
  }
  return { type: 'initials' };
};
