import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Global avatar hook - persists across lobbies/sessions
export const useGlobalPlayerAvatar = (playerId: string) => {
  const [avatarData, setAvatarData] = useState<PlayerAvatarData>({ type: 'initials' });
  const [isLoading, setIsLoading] = useState(false);

  // Load avatar from database
  useEffect(() => {
    if (!playerId) return;

    const loadAvatar = async () => {
      const { data } = await supabase
        .from('player_global_avatars')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (data) {
        setAvatarData({
          type: data.avatar_type as 'initials' | 'image',
          imageUrl: data.image_url || undefined,
          backgroundColor: data.background_color || undefined,
        });
      }
    };

    loadAvatar();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`global-avatar:${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_global_avatars',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as any;
            setAvatarData({
              type: newData.avatar_type as 'initials' | 'image',
              imageUrl: newData.image_url || undefined,
              backgroundColor: newData.background_color || undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  const setAvatarImage = useCallback(async (imageUrl: string) => {
    if (!playerId) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('player_global_avatars')
        .upsert({
          player_id: playerId,
          avatar_type: 'image',
          image_url: imageUrl,
          background_color: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_id'
        });
      
      setAvatarData({ type: 'image', imageUrl });
    } catch (error) {
      console.error('Error saving avatar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  const setAvatarColor = useCallback(async (backgroundColor: string) => {
    if (!playerId) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('player_global_avatars')
        .upsert({
          player_id: playerId,
          avatar_type: 'initials',
          image_url: null,
          background_color: backgroundColor,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_id'
        });
      
      setAvatarData({ type: 'initials', backgroundColor });
    } catch (error) {
      console.error('Error saving avatar color:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  const clearAvatar = useCallback(async () => {
    if (!playerId) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('player_global_avatars')
        .delete()
        .eq('player_id', playerId);
      
      setAvatarData({ type: 'initials' });
    } catch (error) {
      console.error('Error clearing avatar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  const getRandomColor = () => {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  };

  return {
    avatarData,
    isLoading,
    setAvatarImage,
    setAvatarColor,
    clearAvatar,
    getRandomColor,
    DEFAULT_COLORS,
  };
};

// Hook to get avatars for multiple players (for lobby display)
export const useMultiplePlayerAvatars = (playerIds: string[]) => {
  const [avatars, setAvatars] = useState<Map<string, PlayerAvatarData>>(new Map());

  useEffect(() => {
    if (!playerIds.length) return;

    const loadAvatars = async () => {
      const { data } = await supabase
        .from('player_global_avatars')
        .select('*')
        .in('player_id', playerIds);

      if (data) {
        const avatarMap = new Map<string, PlayerAvatarData>();
        data.forEach(item => {
          avatarMap.set(item.player_id, {
            type: item.avatar_type as 'initials' | 'image',
            imageUrl: item.image_url || undefined,
            backgroundColor: item.background_color || undefined,
          });
        });
        setAvatars(avatarMap);
      }
    };

    loadAvatars();

    // Subscribe to all avatar changes for these players
    const channel = supabase
      .channel(`multi-avatars:${playerIds.join(',')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_global_avatars'
        },
        () => {
          loadAvatars();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerIds.join(',')]);

  const getAvatar = (playerId: string): PlayerAvatarData => {
    return avatars.get(playerId) || { type: 'initials' };
  };

  return { avatars, getAvatar };
};
