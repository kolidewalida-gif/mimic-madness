import { memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Trash2 } from 'lucide-react';
import { SocialPost } from '@/hooks/useSocialFeed';
import { VideoPreview } from '@/components/VideoPreview';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const FONT = "'Caveat', cursive";

export const LikePill = ({ post, onLike }: { post: SocialPost; onLike: (id: string) => void }) => (
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

export const FeedTile = memo(({
  post, rank, onOpen, onLike, onDelete, onOpenProfile, isOwner, square,
}: {
  post: SocialPost;
  rank?: number;
  onOpen: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenProfile?: (post: SocialPost) => void;
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

    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
        <Play className="w-6 h-6 text-white fill-current ml-0.5" />
      </div>
    </div>

    {rank != null && rank <= 3 && (
      <div className="absolute top-2 left-2 text-2xl drop-shadow-lg">
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </div>
    )}

    {isOwner && onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); playInkSound('cartoonZap', 0.3); onDelete(post.id); }}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600 backdrop-blur-md flex items-center justify-center text-white/90 opacity-0 group-hover:opacity-100 transition-all"
        title="Supprimer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}

    <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2">
      <button
        onClick={(e) => {
          if (onOpenProfile) {
            e.stopPropagation();
            playInkSound('cartoonPop', 0.3);
            onOpenProfile(post);
          }
        }}
        className="min-w-0 text-left"
      >
        <p className={cn('text-sm font-black text-white truncate leading-tight', onOpenProfile && 'hover:text-cyan-300')} style={{ fontFamily: FONT }}>
          @{post.owner_name}
        </p>
        {post.caption && <p className="text-[11px] text-white/70 truncate">{post.caption}</p>}
      </button>
      <LikePill post={post} onLike={onLike} />
    </div>
  </motion.div>
));
FeedTile.displayName = 'FeedTile';
