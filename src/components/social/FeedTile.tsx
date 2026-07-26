import { memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play, Trash2, Volume2, VolumeX } from 'lucide-react';
import type { SocialPost } from '@/hooks/useSocialFeed';
import { FeedVideo } from '@/components/social/FeedVideo';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

export const LikePill = ({ post, onLike }: { post: SocialPost; onLike: (id: string) => void }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      playInkSound('cartoonPop', 0.3);
      onLike(post.id);
    }}
    className={cn('social-like-button menu-focus', post.liked_by_me && 'is-liked')}
    aria-label={post.liked_by_me ? `Retirer le like, ${post.likes_count} likes` : `Aimer, ${post.likes_count} likes`}
    aria-pressed={post.liked_by_me}
  >
    <Heart className={cn(post.liked_by_me && 'fill-current')} aria-hidden="true" />
    <span>{post.likes_count}</span>
  </button>
);

export const FeedTile = memo(({
  post, rank, onOpen, onLike, onDelete, onOpenProfile, isOwner, square,
  soundActive = false, volume = 0.7, onToggleSound, onVolume,
}: {
  post: SocialPost;
  rank?: number;
  onOpen: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenProfile?: (post: SocialPost) => void;
  isOwner: boolean;
  square?: boolean;
  soundActive?: boolean;
  volume?: number;
  onToggleSound?: () => void;
  onVolume?: (value: number) => void;
}) => (
  <motion.article
    layout
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.94 }}
    transition={{ type: 'spring', damping: 24 }}
    className={cn('social-feed-tile group', square && 'social-feed-tile--square')}
  >
    <button type="button" onClick={() => { playInkSound('cartoonPop', 0.3); onOpen(); }} className="social-feed-media menu-focus" aria-label={`Ouvrir la création de ${post.owner_name}`}>
      <FeedVideo clipId={post.challenge_clip_id || post.clip_id} soundActive={soundActive} volume={volume} className="absolute inset-0 h-full w-full" />
      <span className="social-feed-shade" />
      <span className="social-feed-play"><Play aria-hidden="true" /></span>
    </button>

    <div className="social-feed-tools">
      {onToggleSound && (
        <button type="button" onClick={onToggleSound} className="menu-icon-control" aria-label={soundActive ? 'Couper le son' : 'Activer le son'} aria-pressed={soundActive}>
          {soundActive ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </button>
      )}
      {isOwner && onDelete && (
        <button type="button" onClick={() => { playInkSound('cartoonZap', 0.3); onDelete(post.id); }} className="menu-icon-control social-delete-button" aria-label="Supprimer la publication">
          <Trash2 aria-hidden="true" />
        </button>
      )}
    </div>


    {soundActive && onVolume && (
      <label className="social-volume-control" onClick={(event) => event.stopPropagation()}>
        <Volume2 aria-hidden="true" />
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => onVolume(parseFloat(event.target.value))} aria-label="Volume de la vidéo" />
      </label>
    )}

    {rank != null && rank <= 3 && (
      <span className="social-rank" aria-label={`Classement numéro ${rank}`}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
    )}

    <footer className="social-feed-footer">
      <button
        type="button"
        onClick={() => {
          if (!onOpenProfile) return;
          playInkSound('cartoonPop', 0.3);
          onOpenProfile(post);
        }}
        disabled={!onOpenProfile}
        aria-label={onOpenProfile ? `Voir le profil de ${post.owner_name}` : undefined}
        className="menu-focus min-w-0 flex-1 text-left"
      >
        <strong>@{post.owner_name}</strong>
        <span>{post.caption || 'Imitation partagée'}</span>
      </button>
      <div className="social-feed-metrics">
        {!!post.comments_count && <span><MessageCircle aria-hidden="true" />{post.comments_count}</span>}
        <LikePill post={post} onLike={onLike} />
      </div>
    </footer>
  </motion.article>
));
FeedTile.displayName = 'FeedTile';