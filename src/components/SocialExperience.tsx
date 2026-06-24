import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  UserRound,
  Heart,
  Play,
  Trash2,
  Loader2,
  Grid3x3,
  Trophy,
  Hash,
} from 'lucide-react';
import { useSocialFeed, SocialFeedTab, SocialPost } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { VideoPreview } from '@/components/VideoPreview';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
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

/* ── compact like pill ─────────────────────────────────────── */
const LikePill = ({ post, onLike }: { post: SocialPost; onLike: (id: string) => void }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      playInkSound('cartoonPop', 0.3);
      onLike(post.id);
    }}
    className={cn(
      'flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md transition-all',
      post.liked_by_me ? 'bg-rose-500/90 text-white' : 'bg-black/50 text-white/90 hover:bg-black/70',
    )}
  >
    <Heart className={cn('w-3.5 h-3.5', post.liked_by_me && 'fill-current')} strokeWidth={2.5} />
    <span className="text-xs font-bold tabular-nums">{post.likes_count}</span>
  </button>
);

/* ── A single feed tile (TikTok portrait) ──────────────────── */
const FeedTile = memo(({
  post, rank, onOpen, onLike, onDelete, isOwner, square,
}: {
  post: SocialPost;
  rank?: number;
  onOpen: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
  isOwner: boolean;
  square?: boolean;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    whileHover={{ y: -3 }}
    transition={{ type: 'spring', damping: 24 }}
    onClick={() => { playInkSound('cartoonPop', 0.3); onOpen(); }}
    className={cn(
      'group relative w-full overflow-hidden rounded-2xl cursor-pointer bg-black/60 border border-white/10 hover:border-white/25',
      square ? 'aspect-square' : 'aspect-[9/16]',
    )}
  >
    <VideoPreview clipId={post.challenge_clip_id || post.clip_id} className="absolute inset-0 w-full h-full" muted />

    {/* gradient + play on hover */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
        <Play className="w-6 h-6 text-white fill-current ml-0.5" />
      </div>
    </div>

    {/* rank medal */}
    {rank != null && rank <= 3 && (
      <div className="absolute top-2 left-2 text-2xl drop-shadow-lg">
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </div>
    )}

    {/* owner delete */}
    {isOwner && onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); playInkSound('cartoonZap', 0.3); onDelete(post.id); }}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600 backdrop-blur-md flex items-center justify-center text-white/90 opacity-0 group-hover:opacity-100 transition-all"
        title="Supprimer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}

    {/* bottom info */}
    <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-black text-white truncate leading-tight" style={{ fontFamily: FONT }}>
          @{post.owner_name}
        </p>
        {post.caption && <p className="text-[11px] text-white/70 truncate">{post.caption}</p>}
      </div>
      <LikePill post={post} onLike={onLike} />
    </div>
  </motion.div>
));
FeedTile.displayName = 'FeedTile';

/* ============================================================ */
const SocialExperienceComponent = () => {
  const { user, profile, friendCode } = useAuth();
  const [view, setView] = useState<View>('foryou');
  const { posts, loading, toggleLike, remove } = useSocialFeed(VIEW_TO_TAB[view]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({ posts: 0, likes: 0 });

  // Profile stats (always available, refreshed when feed changes)
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
        setMyStats({ posts: data.length, likes: data.reduce((s, p: any) => s + (p.likes_count || 0), 0) });
      });
    return () => { cancelled = true; };
  }, [user, posts]);

  const displayName = profile?.display_name || 'Toi';
  const initial = displayName.charAt(0).toUpperCase();

  const emptyCopy = useMemo(() => {
    if (view === 'profile') return { emoji: '📭', title: "Aucune imitation partagée", sub: "Partage tes meilleurs moments en fin de partie d'imitation." };
    if (view === 'trending') return { emoji: '🔥', title: 'Pas encore de tendance', sub: 'Les imitations les plus likées de la semaine apparaîtront ici.' };
    return { emoji: '✨', title: 'Le fil est vide', sub: 'Sois le premier à partager une imitation avec la communauté !' };
  }, [view]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#160a26] to-[#0d0618]">
      {/* PROFILE STRIP */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3.5 rounded-2xl p-3 bg-white/[0.04] border border-white/10">
          <div
            className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#a855f7,#6d28d9)', border: '2px solid rgba(255,255,255,0.15)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-white" style={{ fontFamily: FONT }}>{initial}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-white leading-none truncate" style={{ fontFamily: FONT }}>
              {displayName}
            </h2>
            {friendCode && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-cyan-300/80">
                <Hash className="w-3 h-3" />{friendCode}
              </span>
            )}
          </div>

          {/* stats */}
          <div className="flex items-center gap-4 pr-1">
            <Stat icon={Grid3x3} value={myStats.posts} label="posts" />
            <Stat icon={Heart} value={myStats.likes} label="likes" />
          </div>
        </div>
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
                <span
                  className={cn('relative text-base font-black leading-none', active ? 'text-white' : 'text-white/50')}
                  style={{ fontFamily: FONT }}
                >
                  {n.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <motion.div animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 2.2, repeat: Infinity }} className="text-7xl inline-block">
              {emptyCopy.emoji}
            </motion.div>
            <p className="text-xl font-black text-white/75" style={{ fontFamily: FONT }}>{emptyCopy.title}</p>
            <p className="text-sm text-white/45 max-w-sm mx-auto">{emptyCopy.sub}</p>
          </div>
        ) : view === 'profile' ? (
          /* Instagram-style square grid */
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {posts.map((post, idx) => (
                <FeedTile
                  key={post.id}
                  post={post}
                  square
                  onOpen={() => setViewerIndex(idx)}
                  onLike={toggleLike}
                  onDelete={remove}
                  isOwner={user?.id === post.owner_id}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* TikTok-style portrait grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {posts.map((post, idx) => (
                <FeedTile
                  key={post.id}
                  post={post}
                  rank={view === 'trending' ? idx + 1 : undefined}
                  onOpen={() => setViewerIndex(idx)}
                  onLike={toggleLike}
                  onDelete={remove}
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
          {viewerIndex !== null && posts[viewerIndex] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="force-cursor"
              style={{
                position: 'fixed', inset: 0, width: '100vw', height: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, zIndex: 10000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(14px)',
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewerIndex(null); }}
            >
              <SocialTikTokViewer
                posts={posts}
                startIndex={viewerIndex}
                onClose={() => setViewerIndex(null)}
                onLike={toggleLike}
                onDelete={remove}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon: any; value: number; label: string }) => (
  <div className="flex flex-col items-center leading-none">
    <span className="text-lg font-black text-white tabular-nums" style={{ fontFamily: FONT }}>{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-0.5">
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  </div>
);

export const SocialExperience = memo(SocialExperienceComponent);
