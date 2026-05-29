import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Trash2, Send, Loader2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { SocialPost } from '@/hooks/useSocialFeed';
import { useSocialComments } from '@/hooks/useSocialComments';
import { useAuth } from '@/hooks/useAuth';
import { VideoWithAudioOverlay } from '@/components/VideoWithAudioOverlay';
import { VideoPreview } from '@/components/VideoPreview';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const SHADOW_SM = '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810';
const FONT = "'Caveat', cursive";

interface Props {
  posts: SocialPost[];
  startIndex: number;
  onClose: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
}

const SocialTikTokViewerComponent = ({ posts, startIndex, onClose, onLike, onDelete }: Props) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, posts.length - 1)));
  const [draft, setDraft] = useState('');
  const [heartPos, setHeartPos] = useState<{ x: number; y: number; id: number } | null>(null);
  const wheelLock = useRef(false);
  const heartIdRef = useRef(0);

  const post = posts[index];
  const { comments, loading, posting, addComment, removeComment } = useSocialComments(post?.id ?? null);

  const go = (dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= posts.length) return i;
      playInkSound('cartoonPop', 0.25);
      return next;
    });
    setDraft('');
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in the comment input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const onWheel = (e: React.WheelEvent) => {
    // Don't scroll-navigate when hovering the comments panel
    if ((e.target as HTMLElement)?.closest('[data-comments-panel]')) return;
    if (wheelLock.current) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 450);
  };

  const handleSend = async () => {
    if (!draft.trim() || posting) return;
    const body = draft;
    setDraft(''); // clear immediately so it feels instant
    const ok = await addComment(body);
    if (ok) {
      playInkSound('cartoonDing', 0.3);
    } else {
      setDraft(body); // restore on failure
    }
  };

  // Double-click to like (TikTok style) with floating heart animation
  const handleVideoDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!post) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heartIdRef.current += 1;
    setHeartPos({ x, y, id: heartIdRef.current });
    playInkSound('cartoonPop', 0.4);
    // Only like if not already liked
    if (!post.liked_by_me) {
      onLike(post.id);
    }
    setTimeout(() => setHeartPos(null), 900);
  }, [post, onLike]);

  if (!post) return null;
  const isOwner = user?.id === post.owner_id;

  return (
    // cursor: auto ensures the mouse is always visible inside the viewer
    <div
      onWheel={onWheel}
      style={{
        position: 'relative',
        width: 'min(96vw, 1200px)',
        height: 'min(92vh, 860px)',
        display: 'flex',
        borderRadius: 24,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #160a26, #0a0510)',
        border: '4px solid #0a0810',
        boxShadow: '0 12px 0 #0a0810, 0 18px 50px rgba(239,68,68,0.35)',
        cursor: 'auto',
      }}
    >
      {/* ═══ LEFT: Video stage ═══ */}
      <div
        className="relative flex-1 flex items-center justify-center bg-black min-w-0"
        onDoubleClick={handleVideoDoubleClick}
        style={{ cursor: 'auto' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full flex items-center justify-center"
          >
            {post.challenge_clip_id ? (
              <VideoWithAudioOverlay
                videoClipId={post.challenge_clip_id}
                audioClipId={post.clip_id}
                className="max-h-full max-w-full"
              />
            ) : (
              <VideoPreview clipId={post.clip_id} className="max-h-full max-w-full" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Double-click heart burst (TikTok style) */}
        <AnimatePresence>
          {heartPos && (
            <motion.div
              key={heartPos.id}
              className="absolute pointer-events-none z-30"
              style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 1.6, 1.2], opacity: [1, 1, 0], y: -80 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            >
              <Heart className="w-20 h-20 fill-current text-red-500 drop-shadow-lg" strokeWidth={1} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Up / Down navigation */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <NavBtn icon={ChevronUp} disabled={index === 0} onClick={() => go(-1)} />
          <NavBtn icon={ChevronDown} disabled={index === posts.length - 1} onClick={() => go(1)} />
        </div>

        {/* Post counter */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full z-20"
          style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #0a0810' }}>
          <span className="text-sm font-black text-white" style={{ fontFamily: FONT }}>
            {index + 1} / {posts.length}
          </span>
        </div>

        {/* Double-click hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full z-20 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-xs text-white/50" style={{ fontFamily: FONT }}>Double-clic pour liker ❤️</span>
        </div>
      </div>

      {/* ═══ RIGHT: Info + comments ═══ */}
      <div
        data-comments-panel
        className="flex flex-col flex-shrink-0"
        style={{ width: 360, maxWidth: '38%', borderLeft: '3px solid #0a0810', background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', cursor: 'auto' }}
      >
        {/* Author + like button */}
        <div className="p-4 flex items-start justify-between gap-3 flex-shrink-0" style={{ borderBottom: '3px solid #0a0810' }}>
          <div className="min-w-0">
            <div className="text-xl font-black text-white truncate" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
              {post.owner_name}
            </div>
            {post.caption && (
              <p className="text-sm text-white/70 mt-1 line-clamp-3" style={{ fontFamily: FONT }}>
                {post.caption}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Like button with count */}
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
              onClick={() => { playInkSound('cartoonPop', 0.3); onLike(post.id); }}
              className="flex flex-col items-center gap-0.5"
            >
              <motion.div
                animate={post.liked_by_me ? { scale: [1, 1.35, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: post.liked_by_me ? 'linear-gradient(180deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,0.06)',
                  border: '2.5px solid #0a0810', boxShadow: post.liked_by_me ? '0 3px 0 #0a0810, 0 0 16px rgba(239,68,68,0.5)' : '0 3px 0 #0a0810',
                }}>
                <Heart className={cn('w-6 h-6 text-white', post.liked_by_me && 'fill-current')} strokeWidth={2.5} />
              </motion.div>
              <span className="text-sm font-black text-white" style={{ fontFamily: FONT }}>{post.likes_count}</span>
            </motion.button>
            {isOwner && onDelete && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 8 }} whileTap={{ scale: 0.9 }}
                onClick={() => { playInkSound('cartoonZap', 0.3); onDelete(post.id); onClose(); }}
                className="w-9 h-9 rounded-full flex items-center justify-center self-start"
                style={{ background: 'rgba(239,68,68,0.25)', border: '2.5px solid #0a0810', boxShadow: '0 2px 0 #0a0810' }}
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Comments header */}
        <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
          <MessageCircle className="w-4 h-4 text-purple-300" strokeWidth={2.5} />
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            {comments.length} commentaire{comments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="text-4xl">💬</div>
              <p className="text-sm font-black text-white/50" style={{ fontFamily: FONT }}>
                Aucun commentaire — lance la conversation !
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 group"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: '2px solid #0a0810' }}>
                  <span className="text-sm font-black text-white" style={{ fontFamily: FONT }}>
                    {c.user_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-purple-200" style={{ fontFamily: FONT }}>{c.user_name}</div>
                  <p className="text-sm text-white/80 break-words" style={{ fontFamily: FONT }}>{c.body}</p>
                </div>
                {user?.id === c.user_id && !c.id.startsWith('tmp-') && (
                  <button
                    onClick={() => removeComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 flex-shrink-0 p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '3px solid #0a0810' }}>
          {user ? (
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 300))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="Ajoute un commentaire..."
                className="flex-1 h-10 px-3 rounded-xl bg-black/40 text-white text-base placeholder:text-white/30 outline-none"
                style={{ fontFamily: FONT, border: '2.5px solid #0a0810', cursor: 'text' }}
              />
              <motion.button
                whileHover={draft.trim() ? { scale: 1.06 } : undefined}
                whileTap={draft.trim() ? { scale: 0.94 } : undefined}
                onClick={handleSend}
                disabled={!draft.trim() || posting}
                className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', !draft.trim() && 'opacity-50')}
                style={{ background: 'linear-gradient(180deg, #a855f7, #7c3aed)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}
              >
                {posting ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" strokeWidth={2.5} />}
              </motion.button>
            </div>
          ) : (
            <p className="text-center text-sm text-white/40 py-2" style={{ fontFamily: FONT }}>
              Connecte-toi pour commenter
            </p>
          )}
        </div>
      </div>

      {/* Close */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center z-30"
        style={{ background: 'rgba(239,68,68,0.3)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810', cursor: 'pointer' }}
      >
        <X className="w-5 h-5 text-white" strokeWidth={3} />
      </motion.button>
    </div>
  );
};

const NavBtn = ({ icon: Icon, disabled, onClick }: { icon: any; disabled: boolean; onClick: () => void }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.12 } : undefined}
    whileTap={!disabled ? { scale: 0.9 } : undefined}
    onClick={onClick}
    disabled={disabled}
    className={cn('w-11 h-11 rounded-full flex items-center justify-center', disabled && 'opacity-30')}
    style={{ background: 'rgba(0,0,0,0.6)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810', cursor: disabled ? 'default' : 'pointer' }}
  >
    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
  </motion.button>
);

export const SocialTikTokViewer = memo(SocialTikTokViewerComponent);
