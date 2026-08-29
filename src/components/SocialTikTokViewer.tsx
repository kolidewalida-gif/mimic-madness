import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Send,
  Share2,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { VideoPreview } from '@/components/VideoPreview';
import { VideoWithAudioOverlay } from '@/components/VideoWithAudioOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useSocialComments } from '@/hooks/useSocialComments';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import type { SocialPost } from '@/hooks/useSocialFeed';
import { cn } from '@/lib/utils';

interface Props {
  posts: SocialPost[];
  startIndex: number;
  onClose: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void | Promise<void>;
  onOpenProfile?: (post: SocialPost) => void;
  /** Render inline (fills its container) instead of as a floating modal. */
  embedded?: boolean;
  audioVolume?: number;
  audioMuted?: boolean;
  onAudioVolumeChange?: (value: number) => void;
  onAudioMutedChange?: (muted: boolean) => void;
  /** Suspends global shortcuts while another overlay owns the top layer. */
  isKeyboardActive?: () => boolean;
}

interface PointerGesture {
  pointerId: number;
  startX: number;
  startY: number;
  lastY: number;
  canvas: HTMLElement | null;
  pointerType: string;
}

const clampIndex = (index: number, length: number) => (
  length > 0 ? Math.max(0, Math.min(index, length - 1)) : 0
);

const compactNumber = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const ALWAYS_KEYBOARD_ACTIVE = () => true;

const formatCommentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const copyShareUrl = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.readOnly = true;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }
};

const SocialTikTokViewerComponent = ({
  posts,
  startIndex,
  onClose,
  onLike,
  onDelete,
  onOpenProfile,
  embedded = false,
  audioVolume = 0.7,
  audioMuted = true,
  onAudioVolumeChange,
  onAudioMutedChange,
  isKeyboardActive = ALWAYS_KEYBOARD_ACTIVE,
}: Props) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(() => clampIndex(startIndex, posts.length));
  const [isPlaying, setIsPlaying] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(1, audioVolume)));
  const [muted, setMuted] = useState(audioMuted);
  const [sharing, setSharing] = useState(false);
  const [heartPos, setHeartPos] = useState<{ x: number; y: number; id: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(false);
  const wheelTimer = useRef<number | null>(null);
  const simpleVideoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<PointerGesture | null>(null);
  const suppressClickRef = useRef(false);
  const tapTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ at: number; x: number; y: number; postId: string; pointerType: string } | null>(null);
  const lastHeartAtRef = useRef(0);
  const heartIdRef = useRef(0);

  const post = posts[index];
  const { comments, loading: commentsLoading, posting, addComment, removeComment } = useSocialComments(post?.id ?? null);

  useEffect(() => {
    setIndex((current) => clampIndex(current, posts.length));
  }, [posts.length]);

  useEffect(() => {
    setVolume(Math.max(0, Math.min(1, audioVolume)));
  }, [audioVolume]);

  useEffect(() => {
    setMuted(audioMuted);
  }, [audioMuted]);

  useEffect(() => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = null;
    lastTapRef.current = null;
    suppressClickRef.current = false;
    setIsPlaying(true);
    setDraft('');
    setDragY(0);
  }, [post?.id]);

  useEffect(() => {
    const video = simpleVideoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [muted, post?.id, volume]);

  useEffect(() => {
    if (commentsOpen) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length, commentsOpen]);

  useEffect(() => () => {
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
  }, []);

  const go = useCallback((direction: 1 | -1) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0 || next >= posts.length) return current;
      playInkSound('cartoonPop', 0.25);
      return next;
    });
  }, [posts.length]);

  const togglePlayback = useCallback(() => {
    setIsPlaying((current) => {
      const next = !current;
      const video = simpleVideoRef.current;
      if (video) {
        if (next) void video.play().catch(() => {});
        else video.pause();
      }
      return next;
    });
  }, []);

  const updateMuted = useCallback((next: boolean) => {
    setMuted(next);
    onAudioMutedChange?.(next);
    const video = simpleVideoRef.current;
    if (video) video.muted = next;
  }, [onAudioMutedChange]);

  const updateVolume = useCallback((next: number) => {
    const safe = Math.max(0, Math.min(1, next));
    setVolume(safe);
    onAudioVolumeChange?.(safe);
    if (safe > 0 && muted) updateMuted(false);
  }, [muted, onAudioVolumeChange, updateMuted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isKeyboardActive()) return;
      const target = event.target as HTMLElement | null;
      if (embedded && (!target || !rootRef.current?.contains(target))) return;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === ' ' && target?.closest('button, a[href], [role="button"]')) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        go(-1);
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        updateMuted(!muted);
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setCommentsOpen((current) => !current);
      } else if (event.key === 'Escape' && !embedded) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embedded, go, isKeyboardActive, muted, onClose, togglePlayback, updateMuted]);

  const handleWheel = (event: ReactWheelEvent) => {
    if ((event.target as HTMLElement)?.closest('[data-comments]')) return;
    if (wheelLock.current || Math.abs(event.deltaY) < 24) return;

    event.preventDefault();
    event.stopPropagation();
    wheelLock.current = true;
    go(event.deltaY > 0 ? 1 : -1);
    if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    wheelTimer.current = window.setTimeout(() => {
      wheelLock.current = false;
    }, 420);
  };

  const showHeart = useCallback((x: number, y: number) => {
    if (!post || Date.now() - lastHeartAtRef.current < 350) return;
    lastHeartAtRef.current = Date.now();
    heartIdRef.current += 1;
    setHeartPos({ x, y, id: heartIdRef.current });
    playInkSound('cartoonPop', 0.4);
    if (!post.liked_by_me) onLike(post.id);
    window.setTimeout(() => setHeartPos(null), 850);
  }, [onLike, post]);

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    showHeart(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, [data-no-swipe]')) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      canvas: target.closest<HTMLElement>('.social-viewer-canvas'),
      pointerType: event.pointerType,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gesture.lastY = event.clientY;
    setDragY(Math.max(-90, Math.min(90, event.clientY - gesture.startY)));
  };

  const finishPointerGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setDragY(0);

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const isVerticalSwipe = Math.abs(deltaY) > 56 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
    if (isVerticalSwipe) {
      suppressClickRef.current = true;
      go(deltaY < 0 ? 1 : -1);
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      return;
    }

    if (Math.hypot(deltaX, deltaY) > 14 || !post) return;
    const canvas = gesture.canvas;
    if (!canvas?.isConnected) {
      lastTapRef.current = null;
      return;
    }
    const now = Date.now();
    const previousTap = lastTapRef.current;
    const isNearbyDoubleTap = Boolean(
      previousTap
      && previousTap.postId === post.id
      && previousTap.pointerType === gesture.pointerType
      && now - previousTap.at < 320
      && Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) <= 48
    );

    if (isNearbyDoubleTap) {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      if (gesture.pointerType !== 'mouse') {
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
      const rect = canvas.getBoundingClientRect();
      showHeart(event.clientX - rect.left, event.clientY - rect.top);
      lastTapRef.current = null;
      return;
    }

    const nextTap = {
      at: now,
      x: event.clientX,
      y: event.clientY,
      postId: post.id,
      pointerType: gesture.pointerType,
    };
    lastTapRef.current = nextTap;

    if (gesture.pointerType !== 'mouse') {
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
        togglePlayback();
      }
      suppressClickRef.current = true;
      tapTimerRef.current = window.setTimeout(() => {
        if (lastTapRef.current === nextTap) lastTapRef.current = null;
        suppressClickRef.current = false;
        tapTimerRef.current = null;
        togglePlayback();
      }, 330);
    }
  };

  const handleMediaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, [data-no-swipe]')) return;
    if (suppressClickRef.current) return;
    togglePlayback();
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setDraft('');
    const didPost = await addComment(body);
    if (didPost) playInkSound('cartoonDing', 0.3);
    else {
      setDraft(body);
      toast.error("Le commentaire n'a pas pu être envoyé");
    }
  };

  const handleRemoveComment = async (commentId: string) => {
    const didRemove = await removeComment(commentId);
    if (!didRemove) toast.error("Le commentaire n'a pas pu être supprimé");
  };

  const handleShare = async () => {
    if (!post || sharing) return;
    setSharing(true);
    const url = `${window.location.origin}${window.location.pathname}#social-${post.id}`;
    const shareData = {
      title: `Création de ${post.owner_name} · Mimic Master`,
      text: post.caption || `Découvre la création de ${post.owner_name} sur Mimic Master.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (await copyShareUrl(url)) {
        toast.success('Lien copié !');
      } else {
        toast.error('Impossible de partager cette création');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (await copyShareUrl(url)) toast.success('Lien copié !');
      else toast.error('Impossible de partager cette création');
    } finally {
      setSharing(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !onDelete) return;
    const confirmed = window.confirm('Supprimer définitivement cette publication ?');
    if (!confirmed) return;
    await onDelete(post.id);
    if (!embedded) onClose();
  };

  if (!post) return null;
  const isOwner = user?.id === post.owner_id;

  return (
    <div
      ref={rootRef}
      role={embedded ? 'region' : undefined}
      tabIndex={embedded ? 0 : undefined}
      aria-label={embedded ? 'Lecteur Social intégré. Utilise les flèches pour changer de publication.' : undefined}
      className={cn('social-tiktok-viewer force-cursor', embedded ? 'is-embedded' : 'is-floating', commentsOpen && 'has-comments-open')}
      onWheel={handleWheel}
      onPointerDownCapture={(event) => {
        if (embedded && !(event.target as HTMLElement).closest('button, a, input, textarea, select')) {
          rootRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <section
        className="social-viewer-stage"
        aria-label={`Création de ${post.owner_name}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerGesture}
        onPointerCancel={() => {
          gestureRef.current = null;
          setDragY(0);
        }}
        style={{ touchAction: 'pan-x' }}
      >
        <div
          className="social-viewer-canvas"
          onDoubleClick={handleDoubleClick}
          onClick={handleMediaClick}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={post.id}
              className="social-viewer-media"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: dragY, scale: dragY === 0 ? 1 : 0.985 }}
              exit={{ opacity: 0, y: -28 }}
              transition={{ duration: 0.18 }}
            >
              {post.challenge_clip_id ? (
                <VideoWithAudioOverlay
                  videoClipId={post.challenge_clip_id}
                  audioClipId={post.clip_id}
                  className="social-viewer-dual-media"
                  externalControl
                  isPlayingExternal={isPlaying}
                  overlayAudioVolume={volume}
                  overlayAudioMuted={muted}
                  preservePositionOnResume
                  loopPlayback
                  onPlayStateChange={setIsPlaying}
                />
              ) : (
                <VideoPreview
                  clipId={post.clip_id}
                  className="social-viewer-single-media"
                  videoRef={simpleVideoRef}
                  autoPlay={isPlaying}
                  muted={muted}
                  volume={volume}
                  loop
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="social-viewer-topbar" data-no-swipe>
            <span className="social-viewer-counter" aria-live="polite">{index + 1}<i>/</i>{posts.length}</span>
            <span className="social-viewer-gesture-hint">Glisse verticalement</span>
            {!embedded && (
              <button type="button" className="menu-focus" onClick={onClose} aria-label="Fermer le lecteur"><X aria-hidden="true" /></button>
            )}
          </div>

          <button
            type="button"
            className={cn('social-viewer-play menu-focus', isPlaying && 'is-playing')}
            onClick={(event) => { event.stopPropagation(); togglePlayback(); }}
            aria-label={isPlaying ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}
            data-no-swipe
          >
            {isPlaying ? <Pause aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
          </button>

          <AnimatePresence>
            {heartPos && (
              <motion.div
                key={heartPos.id}
                className="social-viewer-heart-burst"
                style={{ left: heartPos.x, top: heartPos.y }}
                initial={{ scale: 0, opacity: 1, rotate: -12 }}
                animate={{ scale: [0, 1.7, 1.35], opacity: [1, 1, 0], y: -90, rotate: 8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <Heart fill="currentColor" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="social-viewer-mobile-meta" data-no-swipe>
            <button type="button" onClick={() => onOpenProfile?.(post)} disabled={!onOpenProfile} className="menu-focus">@{post.owner_name}</button>
            {post.caption && <p>{post.caption}</p>}
          </div>
        </div>

        <div className={cn('social-viewer-actions', isOwner && onDelete && 'has-delete')} aria-label="Actions de la publication" data-no-swipe>
          <button
            type="button"
            className={cn('menu-focus', post.liked_by_me && 'is-liked')}
            onClick={() => { playInkSound('cartoonPop', 0.3); onLike(post.id); }}
            aria-label={post.liked_by_me ? 'Retirer le j’aime de cette publication' : 'Aimer cette publication'}
            aria-pressed={Boolean(post.liked_by_me)}
          >
            <span className="social-viewer-action-icon"><Heart fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden="true" /></span>
            <span><strong>{compactNumber.format(post.likes_count)}</strong><small>{post.liked_by_me ? 'Aimé' : 'J’aime'}</small></span>
          </button>
          <button
            type="button"
            className={cn('menu-focus', commentsOpen && 'is-active')}
            onClick={() => setCommentsOpen((current) => !current)}
            aria-label={commentsOpen ? 'Masquer les commentaires' : 'Afficher les commentaires'}
            aria-expanded={commentsOpen}
          >
            <span className="social-viewer-action-icon"><MessageCircle aria-hidden="true" /></span>
            <span><strong>{comments.length}</strong><small>Commentaires</small></span>
          </button>
          <button type="button" className="menu-focus" onClick={() => void handleShare()} disabled={sharing} aria-label="Partager cette publication">
            <span className="social-viewer-action-icon">{sharing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Share2 aria-hidden="true" />}</span>
            <span><strong>Partager</strong><small>Lien ou app</small></span>
          </button>
          {isOwner && onDelete && (
            <button type="button" className="menu-focus is-danger" onClick={() => void handleDeletePost()} aria-label="Supprimer définitivement cette publication">
              <span className="social-viewer-action-icon"><Trash2 aria-hidden="true" /></span>
              <span><strong>Supprimer</strong><small>Définitif</small></span>
            </button>
          )}
        </div>

        <div className="social-viewer-nav" data-no-swipe>
          <NavButton label="Publication précédente" icon={ChevronUp} disabled={index === 0} onClick={() => go(-1)} />
          <NavButton label="Publication suivante" icon={ChevronDown} disabled={index === posts.length - 1} onClick={() => go(1)} />
        </div>
      </section>

      <aside className="social-viewer-panel" data-comments>
        <header className="social-viewer-author">
          <button
            type="button"
            className="social-viewer-author-button menu-focus"
            onClick={() => onOpenProfile?.(post)}
            disabled={!onOpenProfile}
          >
            <span><UserRound aria-hidden="true" /></span>
            <span><small>Créé par</small><strong>@{post.owner_name}</strong></span>
            {onOpenProfile && <i>Voir le profil</i>}
          </button>
          {post.caption && <p>{post.caption}</p>}
          <div className="social-viewer-metrics">
            <span><Eye aria-hidden="true" /> {compactNumber.format(post.views_count || 0)} vues</span>
            <span><Heart aria-hidden="true" /> {compactNumber.format(post.likes_count || 0)} likes</span>
            <span><MessageCircle aria-hidden="true" /> {comments.length} commentaires</span>
          </div>
        </header>

        <div className="social-viewer-audio" data-no-swipe>
          <button type="button" className="menu-focus" onClick={() => updateMuted(!muted)} aria-pressed={muted} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <label>
            <span>{muted ? 'Son coupé' : `Volume ${Math.round(volume * 100)} %`}</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => updateVolume(Number(event.target.value))} aria-label="Volume de la vidéo" />
          </label>
          <button type="button" className="social-viewer-play-label menu-focus" onClick={togglePlayback} aria-label={isPlaying ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
            {isPlaying ? 'Pause' : 'Lecture'}
          </button>
        </div>

        <section className={cn('social-viewer-comments', commentsOpen && 'is-open')} aria-label="Commentaires persistants">
          <header>
            <div><MessageCircle aria-hidden="true" /><span><strong>Commentaires</strong><small>Conservés avec la publication</small></span></div>
            <button type="button" className="menu-focus" onClick={() => setCommentsOpen(false)} aria-label="Masquer les commentaires"><ChevronDown aria-hidden="true" /></button>
          </header>

          {commentsOpen && (
            <>
              <div className="social-viewer-comment-list custom-scrollbar">
                {commentsLoading && comments.length === 0 ? (
                  <div className="social-viewer-comments-loading"><Loader2 className="animate-spin" aria-hidden="true" /> Chargement…</div>
                ) : comments.length === 0 ? (
                  <div className="social-viewer-comments-empty"><MessageCircle aria-hidden="true" /><strong>Ouvre la discussion</strong><p>Sois le premier à commenter cette création.</p></div>
                ) : comments.map((comment) => (
                  <article key={comment.id} className="social-viewer-comment">
                    <span className="social-viewer-comment-avatar" aria-hidden="true">{comment.user_name?.charAt(0).toUpperCase() || '?'}</span>
                    <div><p><strong>{comment.user_name}</strong><time dateTime={comment.created_at}>{formatCommentDate(comment.created_at)}</time></p><span>{comment.body}</span></div>
                    {comment.user_id === user?.id && !comment.id.startsWith('tmp-') && (
                      <button type="button" className="menu-focus" onClick={() => void handleRemoveComment(comment.id)} aria-label="Supprimer mon commentaire"><Trash2 aria-hidden="true" /></button>
                    )}
                  </article>
                ))}
                <div ref={commentsEndRef} />
              </div>

              <form
                className="social-viewer-comment-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                {user ? (
                  <>
                    <label htmlFor={`social-comment-${post.id}`} className="sr-only">Ajouter un commentaire</label>
                    <input id={`social-comment-${post.id}`} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 300))} placeholder="Ajouter un commentaire…" maxLength={300} />
                    <button type="submit" className="menu-focus" disabled={!draft.trim() || posting} aria-label="Publier le commentaire">
                      {posting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                    </button>
                  </>
                ) : (
                  <p>Connecte-toi pour commenter.</p>
                )}
              </form>
            </>
          )}
        </section>
      </aside>
    </div>
  );
};

const NavButton = ({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ChevronUp;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="menu-focus">
    <Icon aria-hidden="true" />
  </button>
);

export const SocialTikTokViewer = memo(SocialTikTokViewerComponent);
