import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Globe, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  games_played: number;
  games_won: number;
}

export const WorldLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    const { data: stats } = await supabase
      .from('player_stats')
      .select('user_id, level, total_xp, games_played, games_won')
      .order('total_xp', { ascending: false })
      .limit(50);

    if (!stats || stats.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const userIds = stats.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    const merged: LeaderboardEntry[] = stats.map((s) => {
      const profile = profileMap.get(s.user_id);
      return {
        user_id: s.user_id,
        display_name: profile?.display_name || 'Joueur',
        avatar_url: profile?.avatar_url || null,
        level: s.level ?? 1,
        total_xp: s.total_xp ?? 0,
        games_played: s.games_played ?? 0,
        games_won: s.games_won ?? 0,
      };
    });

    setEntries(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('world-leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_stats' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankDecoration = (rank: number) => {
    switch (rank) {
      case 0:
        return (
          <div className="w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
            <Crown className="w-4 h-4 text-yellow-400" />
          </div>
        );
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-gray-400/20 border border-gray-400/50 flex items-center justify-center">
            <Medal className="w-4 h-4 text-gray-300" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-600/50 flex items-center justify-center">
            <Medal className="w-4 h-4 text-amber-500" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">{rank + 1}</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/20 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-primary/10 flex-shrink-0">
        <Globe className="w-4 h-4 text-primary" />
        <h3
          className="text-sm font-bold text-primary uppercase tracking-wider"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          Classement Mondial
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun joueur pour le moment</p>
              <p className="text-xs mt-1">Jouez une partie pour apparaître !</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors',
                    index === 0 && 'bg-yellow-500/10 border border-yellow-500/20',
                    index === 1 && 'bg-gray-400/5 border border-gray-400/10',
                    index === 2 && 'bg-amber-600/5 border border-amber-600/10',
                    index > 2 && 'hover:bg-primary/5'
                  )}
                >
                  {/* Rank */}
                  {getRankDecoration(index)}

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.display_name}
                      className="w-7 h-7 rounded-full object-cover border border-border/50"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/30">
                      {entry.display_name[0]?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Name + Level */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.display_name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Flame className="w-3 h-3 text-primary/60" />
                      Niv. {entry.level} · {entry.games_won}W/{entry.games_played}G
                    </p>
                  </div>

                  {/* XP */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{entry.total_xp.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">xp</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
