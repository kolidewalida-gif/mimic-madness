import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';

/**
 * useChatColor — per-user chat pseudo color, unlocked by level.
 *
 * The default color is computed from a hash of the player id (Twitch-style).
 * If the user picks a custom color from the palette, it overrides the hash.
 * Each color is gated by a minimum level so they feel like a reward.
 */

export interface ChatColorOption {
  id: string;
  hex: string;
  label: string;
  minLevel: number;
}

export const CHAT_COLOR_PALETTE: ChatColorOption[] = [
  // Default tier — always unlocked
  { id: 'default', hex: '', label: 'Auto (hash)', minLevel: 1 },
  // Level 1+ basics
  { id: 'purple', hex: '#a06bff', label: 'Violet', minLevel: 1 },
  { id: 'cyan', hex: '#40c9ff', label: 'Cyan néon', minLevel: 1 },
  // Level 5+
  { id: 'pink', hex: '#f472b6', label: 'Rose bonbon', minLevel: 5 },
  { id: 'amber', hex: '#fbbf24', label: 'Or jaune', minLevel: 5 },
  // Level 10+
  { id: 'emerald', hex: '#34d399', label: 'Émeraude', minLevel: 10 },
  { id: 'orange', hex: '#fb923c', label: 'Orange pop', minLevel: 10 },
  // Level 15+
  { id: 'red', hex: '#ef4444', label: 'Rouge dragon', minLevel: 15 },
  { id: 'sky', hex: '#60a5fa', label: 'Bleu ciel', minLevel: 15 },
  // Level 20+
  { id: 'magenta', hex: '#e879f9', label: 'Magenta royal', minLevel: 20 },
  { id: 'lime', hex: '#a3e635', label: 'Citron acide', minLevel: 20 },
  // Level 25+ (legendary)
  { id: 'gold', hex: '#facc15', label: 'Or légendaire', minLevel: 25 },
  { id: 'rainbow', hex: 'rainbow', label: 'Arc-en-ciel ✨', minLevel: 25 },
];

export const useChatColor = () => {
  const { user } = useAuth();
  const { level } = usePlayerLevel();
  const [colorId, setColorId] = useState<string>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setColorId('default');
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('player_stats')
      .select('chat_color')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setColorId(data?.chat_color || 'default');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setColor = useCallback(
    async (id: string) => {
      if (!user) return;
      const option = CHAT_COLOR_PALETTE.find((c) => c.id === id);
      if (!option) return;
      if (level < option.minLevel) return; // gated
      setColorId(id);
      await supabase
        .from('player_stats')
        .update({ chat_color: id })
        .eq('user_id', user.id);
    },
    [user, level],
  );

  const isUnlocked = useCallback(
    (id: string) => {
      const option = CHAT_COLOR_PALETTE.find((c) => c.id === id);
      if (!option) return false;
      return level >= option.minLevel;
    },
    [level],
  );

  const currentHex =
    CHAT_COLOR_PALETTE.find((c) => c.id === colorId)?.hex || '';

  return {
    colorId,
    currentHex,
    setColor,
    isUnlocked,
    loading,
    palette: CHAT_COLOR_PALETTE,
  };
};
