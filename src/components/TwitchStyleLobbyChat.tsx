import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { useChatColor } from '@/hooks/useChatColor';
import { useQuestTracker } from '@/hooks/useQuestTracker';
import { Send, Search, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { CHAT_GIFS, CATEGORY_LABELS, searchGifs, type GifCategory } from '@/lib/chatGifs';

interface TwitchStyleLobbyChatProps {
  lobbyId: string;
  playerId: string;
  playerName: string;
  className?: string;
}

const PSEUDO_COLORS = [
  'var(--ink-accent)', 'var(--ink-text-dim)', '#fbbf24', '#34d399', '#fb7185',
  '#f472b6', '#60a5fa', '#fb923c', 'var(--ink-accent)', 'var(--ink-text-dim)',
  '#a3e635', '#f87171', 'var(--ink-accent)', '#fde047', '#38bdf8',
];
const colorFor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PSEUDO_COLORS[Math.abs(h) % PSEUDO_COLORS.length];
};
const initialOf = (name: string) => (name?.trim()?.[0] || '?').toUpperCase();
const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/* ============================================================
   Chat bubble — premium glass with colored avatar
============================================================ */
const ChatLine = memo(({ msg, isOwn, ownColor }: { msg: ChatMessage; isOwn: boolean; ownColor?: string }) => {
  const hashColor = colorFor(msg.playerId || msg.playerName);
  const color = isOwn && ownColor && ownColor !== '' && ownColor !== 'rainbow' ? ownColor : hashColor;
  const isMedia = msg.messageType === 'gif' || msg.messageType === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={cn('group flex items-end gap-2 px-1.5', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          boxShadow: `0 0 0 1.5px ${color}55, 0 2px 8px ${color}55`,
        }}
      >
        {initialOf(msg.playerName)}
      </div>

      {/* bubble */}
      <div className={cn('max-w-[78%] min-w-0', isOwn ? 'items-end text-right' : 'items-start')}>
        <div className={cn('flex items-center gap-1.5 mb-0.5', isOwn && 'flex-row-reverse')}>
          <span className="text-[11px] font-bold truncate" style={{ color }}>{msg.playerName}</span>
          <span className="text-[9px] text-white/25 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{formatTime(msg.createdAt)}</span>
        </div>

        {isMedia ? (
          <img
            src={msg.content}
            alt="gif"
            className="rounded-2xl max-h-32 max-w-full border border-white/10"
            style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}
          />
        ) : (
          <div
            className={cn(
              'inline-block px-3 py-1.5 text-sm text-white/95 break-words rounded-2xl',
              isOwn ? 'rounded-br-md' : 'rounded-bl-md',
            )}
            style={
              isOwn
                ? { background: 'linear-gradient(135deg, var(--ink-accent-soft), rgba(124,58,237,0.35))', border: '1px solid rgba(192,132,252,0.3)' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {msg.messageType === 'voice' ? <span className="italic text-white/60">🎤 message vocal</span> : msg.content}
          </div>
        )}
      </div>
    </motion.div>
  );
});
ChatLine.displayName = 'ChatLine';

/* ============================================================
   GIF Picker — portaled centered modal
============================================================ */
const GifPickerModal = memo(function GifPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<GifCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const visibleGifs = useMemo(() => {
    if (search.trim()) return searchGifs(search);
    if (activeCategory === 'all') return CHAT_GIFS;
    return CHAT_GIFS.filter((g) => g.category === activeCategory);
  }, [activeCategory, search]);

  const categories = useMemo(
    () => Object.entries(CATEGORY_LABELS) as [GifCategory, typeof CATEGORY_LABELS[GifCategory]][],
    [],
  );

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="relative w-full max-w-md flex flex-col rounded-3xl overflow-hidden"
        style={{ height: 'min(72vh, 560px)', background: 'linear-gradient(180deg,#1c1030,#0d0618)', border: '1px solid var(--ink-accent-soft)', boxShadow: '0 30px 80px rgba(124,58,237,0.35)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-[var(--ink-accent)]/20 to-[var(--ink-accent-strong)]/10">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-base font-bold text-white">GIFs</span>
          <div className="flex-1 relative ml-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un GIF…"
              className="w-full h-9 pl-8 pr-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none bg-black/40 border border-white/10 focus:border-[var(--ink-accent-line)]/50"
            />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!search.trim() && (
          <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto custom-scrollbar flex-shrink-0 border-b border-white/5">
            <CatChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="✨ Tout" color="var(--ink-accent)" />
            {categories.map(([key, info]) => (
              <CatChip key={key} active={activeCategory === key} onClick={() => setActiveCategory(key)} label={`${info.emoji} ${info.label}`} color={info.color} />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {visibleGifs.map((gif, i) => (
              <motion.button
                key={`${gif.url}-${i}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i * 0.008, 0.15) }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playInkSound('cartoonPop', 0.3); onSelect(gif.url); }}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[var(--ink-accent-line)]/60"
              >
                <img src={gif.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </motion.button>
            ))}
            {visibleGifs.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <span className="text-5xl">🤷</span>
                <p className="text-sm text-white/50 mt-2">Aucun GIF trouvé</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
});

const CatChip = ({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) => (
  <button
    onClick={onClick}
    className={cn('flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border', active ? 'text-white' : 'text-white/55 border-white/10 hover:text-white')}
    style={{ background: active ? `linear-gradient(180deg,${color},${color}cc)` : 'rgba(255,255,255,0.04)', borderColor: active ? 'transparent' : undefined, boxShadow: active ? `0 4px 14px ${color}66` : undefined }}
  >
    {label}
  </button>
);

/* ============================================================
   MAIN CHAT — ultra stylish
============================================================ */
export const TwitchStyleLobbyChat = memo(function TwitchStyleLobbyChat({
  lobbyId,
  playerId,
  playerName,
  className,
}: TwitchStyleLobbyChatProps) {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(lobbyId, playerId, playerName);
  const { colorId: ownColorId, currentHex: ownColorHex } = useChatColor();
  const { track } = useQuestTracker();
  const ownColor = ownColorId === 'default' ? undefined : (ownColorHex || ownColorId);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 30);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    playInkSound('cartoonPop', 0.25);
    sendMessage(trimmed, 'text');
    void track('send_chat_message');
    setInput('');
    setAutoScroll(true);
  }, [input, isSending, sendMessage, track]);

  const handleSendGif = useCallback(
    (url: string) => {
      sendMessage(url, 'gif');
      void track('send_gif');
      void track('send_chat_message');
      setShowGifPicker(false);
      setAutoScroll(true);
    },
    [sendMessage, track],
  );

  return (
    <div className={cn('relative flex h-full flex-col overflow-hidden rounded-2xl', className)}>
      {/* The border used to be a conic gradient spinning on an 8s loop with a
          blur filter on top. A blurred conic gradient repaints in full every
          frame, which is what made the lobby shimmer. It is now static. */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="relative flex items-center justify-between px-3.5 py-2.5 flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-400" style={{ boxShadow: '0 0 8px #34d399' }} />
            </span>
            <span
              className="if-label"
            >
              Chat en direct
            </span>
          </div>
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--ink-accent)', boxShadow: '0 0 12px var(--ink-accent-soft)' }}>
            {messages.length}
          </span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto custom-scrollbar py-2.5 min-h-0 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-[3px] border-[var(--ink-accent-line)] border-t-transparent animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
              {/* Static: rotating a glyph re-rasterises it every frame, which
                  reads as flickering on an otherwise idle screen. */}
              <div className="mb-3 text-5xl">💬</div>
              <p className="text-base font-black text-white/80">Aucun message</p>
              <p className="text-xs text-white/40 mt-0.5">Sois le premier à écrire ✨</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatLine key={msg.id} msg={msg} isOwn={msg.playerId === playerId} ownColor={msg.playerId === playerId ? ownColor : undefined} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* New messages pill */}
        {!autoScroll && messages.length > 0 && (
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
            className="relative mx-3 mb-1.5 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: 'var(--ink-accent)', boxShadow: '0 4px 16px var(--ink-accent-soft)' }}
            whileTap={{ scale: 0.97 }}
          >
            ↓ Nouveaux messages
          </motion.button>
        )}

        {/* Input bar */}
        <div className="relative p-2.5 flex-shrink-0 border-t border-white/10">
          <div
            className={cn('flex gap-2 items-center rounded-2xl p-1.5 transition-all', focused ? 'ring-2 ring-purple-400/50' : '')}
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <motion.button
              type="button"
              onClick={() => { playInkSound('cartoonPop', 0.3); setShowGifPicker(true); }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="flex-shrink-0 h-9 px-3 rounded-xl flex items-center gap-1.5 font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 14px rgba(251,191,36,0.45)' }}
              title="Envoyer un GIF"
            >
              <ImageIcon className="w-4 h-4" strokeWidth={2.5} />
              GIF
            </motion.button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Écris quelque chose…"
              maxLength={300}
              className="flex-1 min-w-0 h-9 px-2 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
            />

            <motion.button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              whileHover={input.trim() && !isSending ? { scale: 1.1, rotate: -8 } : undefined}
              whileTap={input.trim() && !isSending ? { scale: 0.9 } : undefined}
              className={cn('flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all', !input.trim() || isSending ? 'opacity-40 cursor-not-allowed' : '')}
              style={{
                background: 'var(--ink-accent)',
                boxShadow: input.trim() && !isSending ? '0 4px 16px var(--ink-accent-soft)' : 'none',
              }}
            >
              <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* GIF modal */}
      <AnimatePresence>
        {showGifPicker && <GifPickerModal onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
      </AnimatePresence>

    </div>
  );
});
