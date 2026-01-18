import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';

export const useEquippedTitle = () => {
  const { user } = useAuth();
  const [equippedTitle, setEquippedTitle] = useState<LevelReward | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load equipped title on mount
  useEffect(() => {
    const loadEquippedTitle = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('player_rewards')
          .select('reward_id')
          .eq('user_id', user.id)
          .eq('is_equipped', true)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const reward = LEVEL_REWARDS.find(r => r.id === data.reward_id && r.type === 'title');
          setEquippedTitle(reward || null);
        }
      } catch (error) {
        console.error('Error loading equipped title:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEquippedTitle();

    // Subscribe to changes
    if (user?.id) {
      const channel = supabase
        .channel(`equipped-title:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_rewards',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadEquippedTitle();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const equipTitle = useCallback(async (rewardId: string) => {
    if (!user?.id) return false;

    try {
      // First, unequip all titles
      await supabase
        .from('player_rewards')
        .update({ is_equipped: false })
        .eq('user_id', user.id);

      // Then equip the selected one
      const { error } = await supabase
        .from('player_rewards')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('reward_id', rewardId);

      if (error) throw error;

      const reward = LEVEL_REWARDS.find(r => r.id === rewardId);
      setEquippedTitle(reward || null);
      return true;
    } catch (error) {
      console.error('Error equipping title:', error);
      return false;
    }
  }, [user?.id]);

  const unequipTitle = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('player_rewards')
        .update({ is_equipped: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setEquippedTitle(null);
      return true;
    } catch (error) {
      console.error('Error unequipping title:', error);
      return false;
    }
  }, [user?.id]);

  return {
    equippedTitle,
    isLoading,
    equipTitle,
    unequipTitle
  };
};
