import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Sparkles, UserRound, Heart, Loader2, Grid3x3, Hash, Search, X,
} from 'lucide-react';
import { useSocialFeed, SocialFeedTab } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { supabase } from '@/integrations/supabase/client';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { FeedTile } from '@/components/social/FeedTile';
import { PublicProfileView } from '@/components/social/PublicProfileView';
import { computeSocialBadges } from '@/lib/socialBadges';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const FONT = "'Caveat', cursive";

type View = 'foryou' | 'trending' | 'profile';

const VIEW_TO_TAB: Record<View, SocialFeedTab> = {
  foryou: 'recent',
  trending: 'top_week',
  profile: 'mine',
};

const NAV: { id: View; label: string; icon: any; color: string }[] = [
  { id: 'foryou', label: 'Pour toi', icon: Sparkles, color: '#a855f7' },
  { id: 'trending', label: 'Tendances', icon: Flame, color: '#fb7185' },
  { id: 'profile', label: 'Mon profil', icon: UserRound, color: '#22d3ee' },
];

interface UserResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const SocialExperienceComponent = () => {
  const { user, profile, friendCode } = useAuth();
  const { level, progressPercent } = usePlayerLevel();
  const [view, setView] = useState<View>('foryou');
  const { posts, loading, toggleLike, remove } = useSocialFeed(VIEW_TO_TAB[view]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({ posts: 0, likes: 0, top: false });
  const [profileUser, setProfileUser] = useState<{ id: string; name: string } | null>(null);

  // search
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Profile stats (always available)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('social_posts')
      .select('likes_count')
      .eq('owner_id', user.id)
      .eq('is_hidden', false)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMyStats((s) => ({ ...s, posts: data.length, likes: data.reduce((a, p: any) => a + (p.likes_count || 0), 0) }));
      });
    return () => { cancelled = true; };
  }, [user, posts]);

  // user search (debounced)
  useEffect(() => {
    if (!search.trim()) { setUserResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${search.trim()}%`)
        .limit(8);
      setUserResults((data ?? []) as UserResult[]);
    }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const displayName = profile?.display_name || 'Toi';
  const initial = displayName.charAt(0).toUpperCase();
  const myBadges = useMemo(
    () => computeSocialBadges({ postsCount: myStats.posts, totalLikes: myStats.likes, isTopWeek: myStats.top }),
    [myStats],
  );

  // posts filtered by search query (client-side over loaded feed)
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) => p.owner_name?.toLowerCase().includes(q) || p.caption?.toLowerCase().includes(q),
    );
  }, [posts, search]);

  const emptyCopy = useMemo(() => {
    if (view === 'profile') return { emoji: '📭', title: 'Aucune imitation partagée', sub: "Partage tes meilleurs moments en fin de partie d'imitation." };
    if (view === 'trending') return { emoji: '🔥', title: 'Pas encore de tendance', sub: 'Les imitations les plus likées de la semaine apparaîtront ici.' };
    return { emoji: '✨', title: 'Le fil est vide', sub: 'Sois le premier à partager une imitation avec la communauté !' };
  }, [view]);

  const openProfile = (id: string, name: string) => {
    playInkSound('cartoonPop', 0.3);
    setProfileUser({ id, name });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#160a26] to-[#0d0618]">
      {/* PROFILE STRIP */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3.5 rounded-2xl p-3 bg-white/[0.04] border border-white/10">
          <button
            onClick={() => user && openProfile(user.id, displayName)}
            className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#a855f7,#6d28d9)', border: '2px solid rgba(255,255,255,0.15)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-white" style={{ fontFamily: FONT }}>{initial}</span>
            )}
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[9px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 border border-[#0a0810] leading-tight">
              {level}
            </span>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-white leading-none truncate" style={{ fontFamily: FONT }}>{displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              {friendCode && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300/80"><Hash className="w-3 h-3" />{friendCode}</span>
              )}
            </div>
            {/* XP bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-300/80">NIV {level}</span>
              <div className="flex-1 h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pr-1">
            <Stat icon={Grid3x3} value={myStats.posts} label="posts" />
            <Stat icon={Heart} value={myStats.likes} label="likes" />
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex-shrink-0 px-5 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur ou une imitation…"
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-400/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* user results */}
        {search.trim() && userResults.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {userResults.map((u) => (
              <button
                key={u.user_id}
                onClick={() => openProfile(u.user_id, u.display_name || 'Joueur')}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-colors"
              >
                <span className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#a855f7,#6d28d9)' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-bold text-white">@{u.display_name || 'Joueur'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SEGMENTED NAV */}
      <div className="flex-shrink-0 px-5 pb-3">
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-black/30 border border-white/10">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { playInkSound('cartoonPop', 0.3); setView(n.id); }}
                className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
              >
                {active && (
                  <motion.div
                    layoutId="social-nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `linear-gradient(180deg, ${n.color}, ${n.color}cc)`, boxShadow: `0 4px 16px ${n.color}66` }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  />
                )}
                <Icon className={cn('relative w-4 h-4', active ? 'text-white' : 'text-white/50')} strokeWidth={2.5} />
                <span className={cn('relative text-base font-black leading-none', active ? 'text-white' : 'text-white/50')} style={{ fontFamily: FONT }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
        {/* My badges (profile tab) */}
        {view === 'profile' && (
          <div className="mb-4 flex flex-wrap gap-2">
            {myBadges.map((b) => (
              <div
                key={b.id}
                title={b.description}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold', b.unlocked ? 'text-white' : 'text-white/30')}
                style={{ background: b.unlocked ? `${b.color}22` : 'rgba(255,255,255,0.03)', borderColor: b.unlocked ? `${b.color}88` : 'rgba(255,255,255,0.08)' }}
              >
                <span className={cn(!b.unlocked && 'opacity-40')}>{b.emoji}</span>
                {b.label}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <motion.div animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 2.2, repeat: Infinity }} className="text-7xl inline-block">
              {search.trim() ? '🔎' : emptyCopy.emoji}
            </motion.div>
            <p className="text-xl font-black text-white/75" style={{ fontFamily: FONT }}>{search.trim() ? 'Aucun résultat' : emptyCopy.title}</p>
            <p className="text-sm text-white/45 max-w-sm mx-auto">{search.trim() ? 'Essaie un autre nom ou mot-clé.' : emptyCopy.sub}</p>
          </div>
        ) : view === 'profile' ? (
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, idx) => (
                <FeedTile key={post.id} post={post} square onOpen={() => setViewerIndex(idx)} onLike={toggleLike} onDelete={remove} isOwner={user?.id === post.owner_id} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, idx) => (
                <FeedTile
                  key={post.id}
                  post={post}
                  rank={view === 'trending' && !search.trim() ? idx + 1 : undefined}
                  onOpen={() => setViewerIndex(idx)}
                  onLike={toggleLike}
                  onDelete={remove}
                  onOpenProfile={(p) => openProfile(p.owner_id, p.owner_name)}
                  isOwner={user?.id === post.owner_id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FULL TIKTOK VIEWER */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewerIndex !== null && filteredPosts[viewerIndex] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="force-cursor"
              style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 10000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(14px)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewerIndex(null); }}
            >
              <SocialTikTokViewer posts={filteredPosts} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onLike={toggleLike} onDelete={remove} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* PUBLIC PROFILE */}
      <AnimatePresence>
        {profileUser && (
          <PublicProfileView userId={profileUser.id} fallbackName={profileUser.name} onClose={() => setProfileUser(null)} onLike={toggleLike} />
        )}
      </AnimatePresence>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon: any; value: number; label: string }) => (
  <div className="flex flex-col items-center leading-none">
    <span className="text-lg font-black text-white tabular-nums" style={{ fontFamily: FONT }}>{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-0.5"><Icon className="w-2.5 h-2.5" />{label}</span>
  </div>
);

export const SocialExperience = memo(SocialExperienceComponent);
