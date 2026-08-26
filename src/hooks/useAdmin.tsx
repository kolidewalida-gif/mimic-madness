import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdmin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /*
     * Tant que la session n'est pas résolue, on reste en chargement.
     *
     * Sans ce garde, le premier rendu voyait `user` à `null` — la session
     * Supabase se lit de façon asynchrone — et tombait dans la branche
     * ci-dessous, annonçant « résolu, pas administrateur ». Les consommateurs
     * agissaient alors sur une réponse fausse : le garde-fou de thème
     * réécrivait `ink` par-dessus le choix de l'utilisateur avant même que son
     * compte soit connu, et les sélecteurs masquaient les entrées réservées.
     */
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!user?.id) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data && !error);
      setIsLoading(false);
    };

    checkAdmin();
  }, [authLoading, user?.id]);

  const giveAllRewards = useCallback(async () => {
    if (!user?.id || !isAdmin) return false;

    try {
      // Import rewards list
      const { LEVEL_REWARDS } = await import('./usePlayerLevel');
      
      // Get existing rewards
      const { data: existing } = await supabase
        .from('player_rewards')
        .select('reward_id')
        .eq('user_id', user.id);

      const existingIds = new Set(existing?.map(r => r.reward_id) || []);

      // Insert missing rewards
      const missing = LEVEL_REWARDS.filter(r => !existingIds.has(r.id));
      if (missing.length > 0) {
        await supabase.from('player_rewards').insert(
          missing.map(r => ({ user_id: user.id, reward_id: r.id }))
        );
      }

      return true;
    } catch (error) {
      console.error('Error giving all rewards:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  const giveAllAchievements = useCallback(async () => {
    if (!user?.id || !isAdmin) return false;

    try {
      const { ACHIEVEMENTS } = await import('@/components/AchievementToast');
      
      const { data: existing } = await supabase
        .from('player_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const existingIds = new Set(existing?.map(a => a.achievement_id) || []);
      const missing = ACHIEVEMENTS.filter(a => !existingIds.has(a.id));

      if (missing.length > 0) {
        await supabase.from('player_achievements').insert(
          missing.map(a => ({ user_id: user.id, achievement_id: a.id }))
        );
      }

      return true;
    } catch (error) {
      console.error('Error giving all achievements:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  const setLevel = useCallback(async (level: number) => {
    if (!user?.id || !isAdmin) return false;

    try {
      const { LEVEL_XP_REQUIREMENTS } = await import('./usePlayerLevel');
      const totalXp = LEVEL_XP_REQUIREMENTS[level - 1] || 0;

      await supabase
        .from('player_stats')
        .update({ level, total_xp: totalXp, current_xp: 0 })
        .eq('user_id', user.id);

      return true;
    } catch (error) {
      console.error('Error setting level:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  const setStats = useCallback(async (updates: Record<string, number>) => {
    if (!user?.id || !isAdmin) return false;

    try {
      await supabase
        .from('player_stats')
        .update(updates as any)
        .eq('user_id', user.id);

      return true;
    } catch (error) {
      console.error('Error setting stats:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  return {
    isAdmin,
    isLoading,
    giveAllRewards,
    giveAllAchievements,
    setLevel,
    setStats,
  };
};
