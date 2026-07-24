import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Trash2, Send, X, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { SocialPost } from '@/hooks/useSocialFeed';
import { useSocialComments } from '@/hooks/useSocialComments';
import { useAuth } from '@/hooks/useAuth';
import { VideoWithAudioOverlay } from '@/components/VideoWithAudioOverlay';
import { VideoPreview } from '@/components/VideoPreview';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const FONT = "'Caveat', cursive";
const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";

interface Props {
  posts: SocialPost[];
  startIndex: number;
  onClose: () => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Render inline (fills its container) instead of as a floating modal. */
  embedded?: boolean;
}

const SocialTikTokViewerComponent = ({ posts, startIndex, onClose, onLike, onDelete, embedded = false }: Props) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, posts.length - 1)));
  const [draft, setDraft] = useState('');
  const [heartPos, setHeartPos] = useState<{ x: number; y: number; id: number } | null>(null);
  const wheelLock = useRef(false);
  const heartIdRef = useRef(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const post = posts[index];
  const { comments, posting, addComment } = useSocialComments(post?.id ?? null);

  // Auto-scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const go = (dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= posts.length) return i;
      playInkSound('cartoonPop', 0.25);
      return next;
    });
    setDraft('');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    if ((e.target as HTMLElement)?.closest('[data-comments]')) return;
    if (wheelLock.current || Math.abs(e.deltaY) < 24) return;
    wheelLock.current = true;
    go(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 450);
  };

  const handleSend = async () => {
    if (!draft.trim() || posting) return;
    const body = draft;
    setDraft('');
    await addComment(body);
    playInkSound('cartoonDing', 0.3);
  };

  const handleVideoDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!post) return;
    const rect = e.currentTarget.getBoundingClientRect();
    heartIdRef.current += 1;
    setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: heartIdRef.current });
    playInkSound('cartoonPop', 0.4);
    if (!post.liked_by_me) onLike(post.id);
    setTimeout(() => setHeartPos(null), 900);
  }, [post, onLike]);

  if (!post) return null;
  const isOwner = user?.id === post.owner_id;

  return (
    <div
      onWheel={onWheel}
      className="force-cursor"
      style={embedded ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#0a0510',
        border: '1px solid rgba(155,114,255,.25)',
      } : {
        position: 'relative',
        width: 'min(96vw, 1240px)',
        height: 'min(92vh, 880px)',
        display: 'flex',
        borderRadius: 28,
        overflow: 'hidden',
        background: '#0a0510',
        border: '5px solid #0a0810',
        boxShadow: '0 14px 0 #0a0810, 0 20px 60px rgba(168,85,247,0.4)',
      }}
    >
      {/* ═══ LEFT: Video ═══ */}
      <div
        className="relative flex-1 flex items-center justify-center bg-black min-w-0"
        onDoubleClick={handleVideoDoubleClick}
        style={{ cursor: 'auto' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
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

        {/* Double-click heart */}
        <AnimatePresence>
          {heartPos && (
            <motion.div
              key={heartPos.id}
              className="absolute pointer-events-none z-30"
              style={{ left: heartPos.x - 48, top: heartPos.y - 48 }}
              initial={{ scale: 0, opacity: 1, rotate: -15 }}
              animate={{ scale: [0, 1.8, 1.4], opacity: [1, 1, 0], y: -100, rotate: 10 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            >
              <Heart className="w-24 h-24 fill-current text-red-500" strokeWidth={1}
                style={{ filter: 'drop-shadow(3px 3px 0 #0a0810)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav arrows */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <NavBtn icon={ChevronUp} disabled={index === 0} onClick={() => go(-1)} />
          <NavBtn icon={ChevronDown} disabled={index === posts.length - 1} onClick={() => go(1)} />
        </div>

        {/* Counter badge */}
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-2xl"
          style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '3px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}>
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            {index + 1} / {posts.length}
          </span>
        </div>

        {/* Double-click hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }}>
          <span className="text-xs text-white/50" style={{ fontFamily: FONT }}>Double-clic pour liker ❤️</span>
        </div>
      </div>

      {/* ═══ RIGHT: Info + Live Chat ═══ */}
      <div
        data-comments
        className="flex flex-col flex-shrink-0"
        style={{
          width: 380,
          maxWidth: '36%',
          borderLeft: '4px solid #0a0810',
          background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          cursor: 'auto',
        }}
      >
        {/* Author header */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '3px solid #0a0810', background: 'linear-gradient(180deg, rgba(168,85,247,0.15), transparent)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }} />
                <h3 className="text-2xl font-black text-white truncate leading-none"
                  style={{ fontFamily: FONT, textShadow: SHADOW }}>
                  {post.owner_name}
                </h3>
              </div>
              {post.caption && (
                <p className="text-sm text-white/65 line-clamp-2 mt-1" style={{ fontFamily: FONT }}>
                  {post.caption}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Like button */}
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}
                onClick={() => { playInkSound('cartoonPop', 0.3); onLike(post.id); }}
                className="flex flex-col items-center gap-0.5"
              >
                <motion.div
                  animate={post.liked_by_me ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: post.liked_by_me
                      ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                    border: '3px solid #0a0810',
                    boxShadow: post.liked_by_me
                      ? '0 4px 0 #0a0810, 0 0 20px rgba(239,68,68,0.5)'
                      : '0 4px 0 #0a0810',
                  }}
                >
                  <Heart className={cn('w-6 h-6 text-white', post.liked_by_me && 'fill-current')} strokeWidth={2.5} />
                </motion.div>
                <span className="text-sm font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                  {post.likes_count}
                </span>
              </motion.button>
              {/* Delete */}
              {isOwner && onDelete && (
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 8 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { playInkSound('cartoonZap', 0.3); onDelete(post.id); onClose(); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center self-start"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}
                >
                  <Trash2 className="w-4 h-4 text-red-300" strokeWidth={2.5} />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Live chat header */}
        <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0"
          style={{ borderBottom: '2px solid rgba(168,85,247,0.2)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageCircle className="w-4 h-4 text-purple-300" strokeWidth={2.5} />
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            Chat live
          </span>
          <span className="ml-auto text-xs text-white/40 font-bold" style={{ fontFamily: FONT }}>
            {comments.length} message{comments.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2.5 min-h-0">
          {comments.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl inline-block">💬</motion.div>
              <p className="text-base font-black text-white/50" style={{ fontFamily: FONT }}>
                Aucun message — lance la conversation !
              </p>
              <p className="text-xs text-white/30" style={{ fontFamily: FONT }}>
                Sois le premier à laisser un mot ✨
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: 16, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="flex items-start gap-2"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(c.user_name.charCodeAt(0) * 37) % 360}, 70%, 50%), hsl(${(c.user_name.charCodeAt(0) * 37 + 60) % 360}, 70%, 35%))`,
                    border: '2px solid #0a0810',
                  }}>
                  <span className="text-sm font-black text-white" style={{ fontFamily: FONT }}>
                    {c.user_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 px-3 py-2 rounded-2xl rounded-tl-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid #0a0810' }}>
                  <span className="text-xs font-black text-purple-300 mr-2" style={{ fontFamily: FONT }}>{c.user_name}</span>
                  <span className="text-sm text-white/85 break-words" style={{ fontFamily: FONT }}>{c.body}</span>
                </div>
              </motion.div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '3px solid #0a0810' }}>
          {user ? (
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 200))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="Envoie un message..."
                className="flex-1 h-11 px-4 rounded-2xl bg-black/50 text-white text-base placeholder:text-white/30 outline-none"
                style={{ fontFamily: FONT, border: '3px solid #0a0810', cursor: 'text' }}
              />
              <motion.button
                whileHover={draft.trim() ? { scale: 1.08, rotate: -5 } : undefined}
                whileTap={draft.trim() ? { scale: 0.92 } : undefined}
                onClick={handleSend}
                disabled={!draft.trim() || posting}
                className={cn('h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0', !draft.trim() && 'opacity-40')}
                style={{ background: 'linear-gradient(180deg, #a855f7, #7c3aed)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}
              >
                <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          ) : (
            <p className="text-center text-sm text-white/40 py-2" style={{ fontFamily: FONT }}>
              Connecte-toi pour chatter
            </p>
          )}
        </div>
      </div>

      {/* Close */}
      {!embedded && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 rounded-2xl flex items-center justify-center z-30 force-cursor"
          style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', cursor: 'pointer' }}
        >
          <X className="w-5 h-5 text-white" strokeWidth={3} />
        </motion.button>
      )}
    </div>
  );
};

const NavBtn = ({ icon: Icon, disabled, onClick }: { icon: any; disabled: boolean; onClick: () => void }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.15, x: -2 } : undefined}
    whileTap={!disabled ? { scale: 0.88 } : undefined}
    onClick={onClick}
    disabled={disabled}
    className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', disabled && 'opacity-25')}
    style={{
      background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
      border: '3px solid #0a0810',
      boxShadow: '0 4px 0 #0a0810',
      cursor: disabled ? 'default' : 'pointer',
    }}
  >
    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
  </motion.button>
);

export const SocialTikTokViewer = memo(SocialTikTokViewerComponent);
