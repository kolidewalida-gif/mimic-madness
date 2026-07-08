import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type BanRow = {
  id: string;
  user_id: string;
  ban_type: 'global' | 'chat' | 'lobby' | 'mute';
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  revoked_at: string | null;
};

const isActive = (b: BanRow) =>
  !b.revoked_at && (!b.expires_at || new Date(b.expires_at).getTime() > Date.now());

export const useBanStatus = () => {
  const { user } = useAuth();
  const [bans, setBans] = useState<BanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setBans([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null);
    setBans(((data ?? []) as BanRow[]).filter(isActive));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
    if (!user?.id) return;
    const ch = supabase
      .channel(`bans-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_bans', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    const t = setInterval(refresh, 60_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, [user?.id, refresh]);

  const hasType = (t: BanRow['ban_type']) => bans.some(b => b.ban_type === t);

  return {
    bans,
    loading,
    isGlobalBanned: hasType('global'),
    isChatBanned: hasType('chat') || hasType('global'),
    isLobbyBanned: hasType('lobby') || hasType('global'),
    isMuted: hasType('mute') || hasType('global'),
    refresh,
  };
};