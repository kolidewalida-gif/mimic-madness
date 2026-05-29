import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Trophy, Clock, User, Trash2, Loader2, Sparkles, Share2, MessageCircle,
} from 'lucide-react';
import { useSocialFeed, SocialFeedTab, SocialPost } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { VideoPreview } from '@/components/VideoPreview';
import { SocialTikTokViewer } from '@/components/SocialTikTokViewer';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";
const FONT = "'Caveat', cursive";

const TAB_META: Record<SocialFeedTab, { label: string; icon: any; color: string }> = {
  top_week: { label: 'Top semaine', icon: Trophy, color: '#fbbf24' },
  recent: { label: 'Récents', icon: Clock, color: '#06b6d4' },
  mine: { label: 'Mes posts', icon: User, color: '#a855f7' },
};

const PostCard = memo(({
  post, rank, onLike, onDelete, onOpen, isOwner,
}: {
  post: SocialPost;
  rank?: number;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpen: () => void;
  isOwner: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', damping: 22 }}
      className="relative rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
        border: '4px solid #0a0810',
        boxShadow: '0 6px 0 #0a0810',
      }}
    >
      {/* Rank medal (only on top_week leaderboard) */}
      {rank != null && rank <= 3 && (
        <div
          className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background:
              rank === 1
                ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                : rank === 2
                  ? 'linear-gradient(180deg, #d1d5db, #9ca3af)'
                  : 'linear-gradient(180deg, #f97316, #c2410c)',
            border: '3px solid #0a0810',
            boxShadow: '0 3px 0 #0a0810',
          }}
        >
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </span>
        </div>
      )}

      {/* Owner delete (top-right) */}
      {isOwner && onDelete && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 8 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            playInkSound('cartoonZap', 0.3);
            onDelete(post.id);
          }}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
            border: '2.5px solid #0a0810',
            boxShadow: '0 2px 0 #0a0810',
          }}
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Thumbnail — clicking opens the TikTok-style viewer */}
      <button
        type="button"
        onClick={() => { playInkSound('cartoonPop', 0.3); onOpen(); }}
        className="relative w-full aspect-video bg-black/60 overflow-hidden flex items-center justify-center group"
      >
        <VideoPreview
          clipId={post.challenge_clip_id || post.clip_id}
          className="w-full h-full"
          muted
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #fbbf24, #d97706)',
              border: '3px solid #0a0810',
              boxShadow: '0 4px 0 #0a0810',
            }}
          >
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
          </motion.div>
        </div>
      </button>

      {/* Footer */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-black text-white truncate" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            {post.owner_name}
          </span>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Comment count → opens viewer */}
            <button
              onClick={() => { playInkSound('cartoonPop', 0.3); onOpen(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '2.5px solid #0a0810', boxShadow: '0 2px 0 #0a0810' }}
            >
              <MessageCircle className="w-3.5 h-3.5 text-white/70" strokeWidth={2.5} />
              <span className="text-xs font-black text-white" style={{ fontFamily: FONT }}>{post.comments_count ?? 0}</span>
            </button>

            <motion.button
              whileHover={{ scale: 1.08, rotate: -5 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => { playInkSound('cartoonPop', 0.3); onLike(post.id); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
              style={{
                background: post.liked_by_me ? 'linear-gradient(180deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,0.05)',
                border: '2.5px solid #0a0810',
                boxShadow: '0 2px 0 #0a0810',
              }}
            >
              <Heart className={cn('w-3.5 h-3.5', post.liked_by_me && 'fill-current')} style={{ color: 'white' }} strokeWidth={2.5} />
              <span className="text-xs font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                {post.likes_count}
              </span>
            </motion.button>
          </div>
        </div>

        {post.caption && (
          <p className="text-xs text-white/65 line-clamp-2" style={{ fontFamily: FONT }}>
            {post.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
});
PostCard.displayName = 'PostCard';

/* ============================================================
   MAIN COMPONENT
============================================================ */
interface InkSocialFeedProps {
  /**
   * When true, render the feed without its outer card / header. Used when
   * the component is mounted inside another container that already provides
   * the modal frame (e.g. the SocialHubPanel drawer). Avoids the nested
   * modal-in-modal look.
   */
  inlineMode?: boolean;
}

const InkSocialFeedComponent = ({ inlineMode = false }: InkSocialFeedProps) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<SocialFeedTab>('top_week');
  const { posts, loading, toggleLike, remove } = useSocialFeed(tab);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const tabsBar = (
    <div className={cn('flex gap-2 flex-shrink-0', inlineMode ? 'px-5 pt-4 pb-3' : 'px-4 py-2.5 border-b border-white/10')}>
      {(['top_week', 'recent', 'mine'] as SocialFeedTab[]).map((t) => {
        const meta = TAB_META[t];
        const Icon = meta.icon;
        const active = tab === t;
        return (
          <motion.button
            key={t}
            onClick={() => {
              playInkSound('cartoonPop', 0.3);
              setTab(t);
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-2xl flex items-center gap-2"
            style={{
              background: active
                ? `linear-gradient(180deg, ${meta.color}, ${meta.color}cc)`
                : 'rgba(255,255,255,0.04)',
              border: '2.5px solid #0a0810',
              boxShadow: active ? '0 3px 0 #0a0810' : 'none',
            }}
          >
            <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
            <span
              className="text-base font-black text-white"
              style={{ fontFamily: FONT, textShadow: active ? SHADOW_SM : 'none' }}
            >
              {meta.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );

  const feedBody = (
    <div className={cn('flex-1 overflow-y-auto custom-scrollbar', inlineMode ? 'px-5 pb-5' : 'p-3')}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl inline-block"
          >
            {tab === 'mine' ? '📭' : '✨'}
          </motion.div>
          <p
            className="text-xl font-black text-white/70"
            style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
          >
            {tab === 'mine'
              ? 'Tu n\'as pas encore partagé d\'imitation'
              : 'Pas encore de post — sois le premier !'}
          </p>
          <p className="text-sm text-white/45 max-w-sm mx-auto" style={{ fontFamily: FONT }}>
            À la fin d'une partie d'imitation, partage tes meilleurs moments avec la communauté.
          </p>
        </div>
      ) : (
        <div className={cn('grid gap-4', inlineMode ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
          <AnimatePresence mode="popLayout">
            {posts.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                rank={tab === 'top_week' ? idx + 1 : undefined}
                onLike={toggleLike}
                onDelete={remove}
                onOpen={() => setViewerIndex(idx)}
                isOwner={user?.id === post.owner_id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // TikTok-style full viewer (portaled to body to escape transformed ancestors)
  const viewer = typeof document !== 'undefined' && createPortal(
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
            padding: 16, zIndex: 10000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)',
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
  );

  // Inline mode: no outer card, no header — caller already provides them.
  // Used by SocialHubPanel which has its own modal chrome.
  if (inlineMode) {
    return (
      <div className="flex flex-col h-full">
        {tabsBar}
        {feedBody}
        {viewer}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-3xl overflow-hidden flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
        border: '4px solid #0a0810',
        boxShadow: '0 8px 0 #0a0810',
      }}
    >
      {/* Header */}
      <div
        className="relative px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
          borderBottom: '3px solid #0a0810',
        }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              border: '2.5px solid #0a0810',
              boxShadow: '0 3px 0 #0a0810',
            }}
          >
            <Share2 className="w-5 h-5 text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <h2
              className="text-2xl font-black text-white leading-none"
              style={{ fontFamily: FONT, textShadow: SHADOW }}
            >
              Social
            </h2>
            <p className="text-xs text-white/55 mt-0.5" style={{ fontFamily: FONT }}>
              Les meilleures imitations de la communauté
            </p>
          </div>
        </div>
      </div>

      {tabsBar}
      {feedBody}
      {viewer}
    </div>
  );
};

export const InkSocialFeed = memo(InkSocialFeedComponent);
