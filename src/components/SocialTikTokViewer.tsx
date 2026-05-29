import { useState, useRef, useEffect, memo } from 'react';
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

/**
 * TikTok-on-PC viewer: one post at a time (video left, comments right),
 * vertical navigation with arrow buttons / wheel / arrow keys.
 */
const SocialTikTokViewerComponent = ({ posts, startIndex, onClose, onLike, onDelete }: Props) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, posts.length - 1)));
  const [draft, setDraft] = useState('');
  const wheelLock = useRef(false);

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
      if (e.key === 'ArrowDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 450);
  };

  const handleSend = async () => {
    if (!draft.trim() || posting) return;
    const ok = await addComment(draft);
    if (ok) { setDraft(''); playInkSound('cartoonDing', 0.3); }
  };

  if (!post) return null;
  const isOwner = user?.id === post.owner_id;

  return (
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
      }}
    >
      {/* ═══ LEFT: Video stage ═══ */}
      <div className="relative flex-1 flex items-center justify-center bg-black min-w-0">
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
      </div>

      {/* ═══ RIGHT: Info + comments ═══ */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{ width: 360, maxWidth: '38%', borderLeft: '3px solid #0a0810', background: 'linear-gradient(180deg, #1a0d2e, #0f0820)' }}
      >
        {/* Author + actions */}
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
            <motion.button
              whileHover={{ scale: 1.1, rotate: -6 }} whileTap={{ scale: 0.9 }}
              onClick={() => { playInkSound('cartoonPop', 0.3); onLike(post.id); }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: post.liked_by_me ? 'linear-gradient(180deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,0.06)',
                  border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810',
                }}>
                <Heart className={cn('w-5 h-5 text-white', post.liked_by_me && 'fill-current')} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black text-white" style={{ fontFamily: FONT }}>{post.likes_count}</span>
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
                {user?.id === c.user_id && (
                  <button
                    onClick={() => removeComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 flex-shrink-0"
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
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ajoute un commentaire..."
                className="flex-1 h-10 px-3 rounded-xl bg-black/40 text-white text-base placeholder:text-white/30 outline-none"
                style={{ fontFamily: FONT, border: '2.5px solid #0a0810' }}
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
        style={{ background: 'rgba(239,68,68,0.3)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}
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
    style={{ background: 'rgba(0,0,0,0.6)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}
  >
    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
  </motion.button>
);

export const SocialTikTokViewer = memo(SocialTikTokViewerComponent);
