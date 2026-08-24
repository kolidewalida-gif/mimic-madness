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

const FONT = "'Outfit', sans-serif";
const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";

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
      className={cn(
        "force-cursor relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-[#0a0510] [@media(min-width:761px)_and_(min-height:621px)]:flex-row",
        embedded
          ? "h-full border border-[var(--ink-accent-line)]"
          : "max-w-[1240px] border border-[var(--ink-line)] [@media(min-width:761px)_and_(min-height:621px)]:rounded-[28px]",
      )}
      style={embedded ? {
        height: '100%',
      } : {
        width: 'min(calc(100vw - max(2rem, env(safe-area-inset-left, 0px)) - max(2rem, env(safe-area-inset-right, 0px))), 1240px)',
        height: 'min(calc(100dvh - max(2rem, env(safe-area-inset-top, 0px)) - max(2rem, env(safe-area-inset-bottom, 0px))), 880px)',
        maxHeight: '100dvh',
        boxShadow: 'none',
      }}
    >
      {/* ═══ LEFT: Video ═══ */}
      <div
        className="relative flex min-h-0 min-w-0 flex-[1_1_55%] items-center justify-center bg-black [@media(min-width:761px)_and_(min-height:621px)]:h-full"
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
                externalControl
                isPlayingExternal
              />
            ) : (
              <VideoPreview clipId={post.clip_id} className="max-h-full max-w-full" autoPlay loop />
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
                style={{ filter: 'none' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav arrows */}
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:right-4 sm:gap-3">
          <NavBtn label="Publication précédente" icon={ChevronUp} disabled={index === 0} onClick={() => go(-1)} />
          <NavBtn label="Publication suivante" icon={ChevronDown} disabled={index === posts.length - 1} onClick={() => go(1)} />
        </div>

        {/* Counter badge */}
        <div className="absolute left-2 top-2 z-20 rounded-2xl px-2.5 py-1 sm:left-4 sm:top-4 sm:px-3 sm:py-1.5"
          style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            {index + 1} / {posts.length}
          </span>
        </div>

        {/* Double-click hint */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 sm:bottom-4"
          style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }}>
          <span className="text-xs text-white/50 [@media(pointer:coarse)]:hidden" style={{ fontFamily: FONT }}>
            Double-clic pour liker ❤️
          </span>
          <span className="hidden text-xs text-white/50 [@media(pointer:coarse)]:inline" style={{ fontFamily: FONT }}>
            Double-tap pour liker ❤️
          </span>
        </div>
      </div>

      {/* ═══ RIGHT: Info + Live Chat ═══ */}
      <div
        data-comments
        className="flex min-h-[clamp(10rem,38dvh,20rem)] w-full flex-[1_1_45%] flex-col border-t border-[var(--ink-line)] [@media(min-width:761px)_and_(min-height:621px)]:min-h-0 [@media(min-width:761px)_and_(min-height:621px)]:w-[380px] [@media(min-width:761px)_and_(min-height:621px)]:max-w-[36%] [@media(min-width:761px)_and_(min-height:621px)]:flex-none [@media(min-width:761px)_and_(min-height:621px)]:border-l [@media(min-width:761px)_and_(min-height:621px)]:border-t-0"
        style={{
          background: 'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          cursor: 'auto',
        }}
      >
        {/* Author header */}
        <div className="flex-shrink-0 p-3 [@media(min-width:761px)_and_(min-height:621px)]:p-4" style={{ borderBottom: '1px solid var(--ink-line)', background: 'linear-gradient(180deg, var(--ink-accent-soft), transparent)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" style={{ filter: 'none' }} />
                <h3 className="truncate text-xl font-black leading-none text-white [@media(min-width:761px)_and_(min-height:621px)]:text-2xl"
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
                aria-label={post.liked_by_me ? `Retirer le like (${post.likes_count})` : `Liker (${post.likes_count})`}
                className="flex flex-col items-center gap-0.5"
              >
                <motion.div
                  animate={post.liked_by_me ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full [@media(min-width:761px)_and_(min-height:621px)]:h-14 [@media(min-width:761px)_and_(min-height:621px)]:w-14"
                  style={{
                    background: post.liked_by_me
                      ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                    border: '1px solid var(--ink-line)',
                    boxShadow: post.liked_by_me
                      ? '0 0 0 rgba(0,0,0,0), 0 0 20px rgba(239,68,68,0.5)'
                      : '0 0 0 rgba(0,0,0,0)',
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
                  aria-label="Supprimer la publication"
                  className="flex h-11 w-11 items-center justify-center self-start rounded-full"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                >
                  <Trash2 className="w-4 h-4 text-red-300" strokeWidth={2.5} />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Live chat header */}
        <div className="flex flex-shrink-0 items-center gap-2 px-3 py-2 [@media(min-width:761px)_and_(min-height:621px)]:px-4 [@media(min-width:761px)_and_(min-height:621px)]:py-2.5"
          style={{ borderBottom: '2px solid var(--ink-accent-soft)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageCircle className="w-4 h-4 text-[var(--ink-accent-text)]" strokeWidth={2.5} />
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            Chat live
          </span>
          <span className="ml-auto text-xs text-white/40 font-bold" style={{ fontFamily: FONT }}>
            {comments.length} message{comments.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Comments */}
        <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2 [@media(min-width:761px)_and_(min-height:621px)]:px-4 [@media(min-width:761px)_and_(min-height:621px)]:py-3">
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
                    border: '1px solid var(--ink-line)',
                  }}>
                  <span className="text-sm font-black text-white" style={{ fontFamily: FONT }}>
                    {c.user_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0 px-3 py-2 rounded-2xl rounded-tl-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ink-line)' }}>
                  <span className="text-xs font-black text-[var(--ink-accent-text)] mr-2" style={{ fontFamily: FONT }}>{c.user_name}</span>
                  <span className="text-sm text-white/85 break-words" style={{ fontFamily: FONT }}>{c.body}</span>
                </div>
              </motion.div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--ink-line)' }}>
          {user ? (
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 200))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="Envoie un message..."
                className="flex-1 h-11 px-4 rounded-2xl bg-black/50 text-white text-base placeholder:text-white/30 outline-none"
                style={{ fontFamily: FONT, border: '1px solid var(--ink-line)', cursor: 'text' }}
              />
              <motion.button
                whileHover={draft.trim() ? { scale: 1.08, rotate: -5 } : undefined}
                whileTap={draft.trim() ? { scale: 0.92 } : undefined}
                onClick={handleSend}
                disabled={!draft.trim() || posting}
                aria-label="Envoyer le message"
                className={cn('h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0', !draft.trim() && 'opacity-40')}
                style={{ background: 'var(--ink-accent)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
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
          aria-label="Fermer le viewer"
          className="absolute top-4 right-4 w-11 h-11 rounded-2xl flex items-center justify-center z-30 force-cursor"
          style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '1px solid var(--ink-line)', boxShadow: 'none', cursor: 'pointer' }}
        >
          <X className="w-5 h-5 text-white" strokeWidth={3} />
        </motion.button>
      )}
    </div>
  );
};

const NavBtn = ({ label, icon: Icon, disabled, onClick }: { label: string; icon: any; disabled: boolean; onClick: () => void }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.15, x: -2 } : undefined}
    whileTap={!disabled ? { scale: 0.88 } : undefined}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn('flex h-11 w-11 items-center justify-center rounded-2xl [@media(min-width:761px)_and_(min-height:621px)]:h-12 [@media(min-width:761px)_and_(min-height:621px)]:w-12', disabled && 'opacity-25')}
    style={{
      background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
      cursor: disabled ? 'default' : 'pointer',
    }}
  >
    <Icon className="h-5 w-5 text-white [@media(min-width:761px)_and_(min-height:621px)]:h-6 [@media(min-width:761px)_and_(min-height:621px)]:w-6" strokeWidth={2.5} />
  </motion.button>
);

export const SocialTikTokViewer = memo(SocialTikTokViewerComponent);
