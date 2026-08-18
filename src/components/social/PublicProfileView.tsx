import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Grid3x3, Heart, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SocialPost } from '@/hooks/useSocialFeed';
import { weeklyPeriodKey } from '@/lib/questDefinitions';
import { computeSocialBadges, levelFromXp } from '@/lib/socialBadges';
import { FeedTile } from '@/components/social/FeedTile';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const FONT = "'Outfit', sans-serif";

interface PublicProfileViewProps {
  userId: string;
  fallbackName?: string;
  onClose: () => void;
  /** like a post (reuses the feed toggle so counts stay in sync) */
  onLike?: (id: string) => void;
}

export const PublicProfileView = ({ userId, fallbackName, onClose, onLike }: PublicProfileViewProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [level, setLevel] = useState(1);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isTopWeek, setIsTopWeek] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [soundId, setSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem('feedVolume') || '0.7');
    return isNaN(v) ? 0.7 : v;
  });
  const setVol = (v: number) => { setVolume(v); try { localStorage.setItem('feedVolume', String(v)); } catch { /* ignore */ } };
  const isMe = user?.id === userId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const weekKey = weeklyPeriodKey();
      const [profRes, statsRes, postsRes, topRes] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle(),
        supabase.from('player_stats').select('total_xp').eq('user_id', userId).maybeSingle(),
        supabase.from('social_posts').select('*').eq('owner_id', userId).eq('is_hidden', false).order('created_at', { ascending: false }),
        supabase.from('social_posts').select('owner_id').eq('week_key', weekKey).eq('is_hidden', false).order('likes_count', { ascending: false }).limit(1),
      ]);
      if (cancelled) return;
      setProfile(profRes.data ?? { display_name: fallbackName ?? null, avatar_url: null });
      setLevel(levelFromXp(((statsRes.data as any)?.total_xp) || 0));
      let p = (postsRes.data ?? []) as SocialPost[];
      // hydrate liked_by_me for current viewer
      if (user && p.length) {
        const { data: likes } = await supabase
          .from('social_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', p.map((x) => x.id));
        const liked = new Set((likes ?? []).map((l) => l.post_id));
        p = p.map((x) => ({ ...x, liked_by_me: liked.has(x.id) }));
      }
      setPosts(p);
      const topOwner = (topRes.data?.[0] as any)?.owner_id;
      setIsTopWeek(!!topOwner && topOwner === userId);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const totalLikes = useMemo(() => posts.reduce((s, p) => s + (p.likes_count || 0), 0), [posts]);
  const badges = useMemo(
    () => computeSocialBadges({ postsCount: posts.length, totalLikes, isTopWeek }),
    [posts.length, totalLikes, isTopWeek],
  );

  const displayName = profile?.display_name || fallbackName || 'Joueur';
  const initial = displayName.charAt(0).toUpperCase();

  const localLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) } : p,
      ),
    );
    onLike?.(id);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10055] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="relative w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{ height: 'min(88vh, 760px)', background: 'linear-gradient(180deg,#160a26,#0d0618)', border: '1px solid rgba(168,85,247,0.3)' }}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-lg font-black text-white" style={{ fontFamily: FONT }}>Profil</span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* identity */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#a855f7,#6d28d9)', border: '2px solid rgba(255,255,255,0.15)' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-white" style={{ fontFamily: FONT }}>{initial}</span>
                )}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 border border-[var(--ink-line)]">
                  NIV. {level}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-black text-white truncate leading-none" style={{ fontFamily: FONT }}>{displayName}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-lg font-black text-white" style={{ fontFamily: FONT }}>{posts.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-0.5"><Grid3x3 className="w-2.5 h-2.5" />posts</span>
                  </div>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-lg font-black text-white" style={{ fontFamily: FONT }}>{totalLikes}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />likes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* badges */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Badges</p>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    title={b.description}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold transition-all', b.unlocked ? 'text-white' : 'text-white/30')}
                    style={{
                      background: b.unlocked ? `${b.color}22` : 'rgba(255,255,255,0.03)',
                      borderColor: b.unlocked ? `${b.color}88` : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <span className={cn(!b.unlocked && 'grayscale opacity-50')}>{b.unlocked ? b.emoji : <Lock className="w-3.5 h-3.5" />}</span>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* posts grid */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Imitations</p>
              {posts.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-sm">Aucune imitation partagée pour l'instant.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <AnimatePresence mode="popLayout">
                    {posts.map((post, idx) => (
                      <FeedTile
                        key={post.id}
                        post={post}
                        square
                        isOwner={isMe}
                        onLike={localLike}
                        onOpen={() => { setSoundId(null); setViewerIndex(idx); }}
                        soundActive={soundId === post.id}
                        volume={volume}
                        onToggleSound={() => setSoundId((prev) => (prev === post.id ? null : post.id))}
                        onVolume={setVol}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* viewer */}
      <AnimatePresence>
        {viewerIndex !== null && posts[viewerIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="force-cursor"
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 10002, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewerIndex(null); }}
          >
            <SocialTikTokViewer posts={posts} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onLike={localLike} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
};
