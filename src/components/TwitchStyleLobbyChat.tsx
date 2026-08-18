import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { useChatColor } from '@/hooks/useChatColor';
import { useQuestTracker } from '@/hooks/useQuestTracker';
import { Send, Search, X, Image as ImageIcon, Sparkles, MessageSquare, ArrowDown } from 'lucide-react';
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar keeps the player's chat colour — that is the identity cue. */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: color }}
      >
        {initialOf(msg.playerName)}
      </div>

      <div className={cn('min-w-0 max-w-[80%]', isOwn && 'text-right')}>
        <div className={cn('mb-1 flex items-center gap-1.5', isOwn && 'flex-row-reverse')}>
          <span className="truncate text-[11px] font-semibold" style={{ color }}>
            {msg.playerName}
          </span>
          <span className="text-[10px] tabular-nums text-[var(--ink-text-mute)]">
            {formatTime(msg.createdAt)}
          </span>
        </div>

        {isMedia ? (
          <img
            src={msg.content}
            alt="gif"
            className="max-h-32 max-w-full rounded-2xl border border-[var(--ink-line)]"
          />
        ) : (
          <div
            className={cn(
              'inline-block break-words rounded-2xl px-3 py-2 text-left text-sm leading-snug',
              isOwn ? 'rounded-br-md text-white' : 'rounded-bl-md text-[var(--ink-text)]',
            )}
            style={
              isOwn
                ? { background: 'var(--c-violet)' }
                : {
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid var(--ink-line)',
                  }
            }
          >
            {msg.messageType === 'voice' ? (
              <span className="italic opacity-70">🎤 message vocal</span>
            ) : (
              msg.content
            )}
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
      style={{ background: 'rgba(8,5,24,0.82)' }}
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
    <div className={cn('relative flex h-full min-h-0 flex-col overflow-hidden', className)}>
      {/* Header — one label, one count. The status dot used to pulse with
          `animate-ping`, another continuous repaint; it is static now. */}
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[var(--ink-line)] px-4 py-3">
        <span className="if-label flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[var(--c-green)]"
            aria-hidden="true"
          />
          Chat
        </span>
        {messages.length > 0 && (
          <span className="if-mute text-xs tabular-nums">
            {messages.length} message{messages.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ink-accent-line)] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-[var(--ink-text-mute)]">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="if-mute text-xs">
              Aucun message. Lance la discussion&nbsp;!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatLine key={msg.id} msg={msg} isOwn={msg.playerId === playerId} ownColor={msg.playerId === playerId ? ownColor : undefined} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Jump to latest */}
      {!autoScroll && messages.length > 0 && (
        <button
          type="button"
          onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
          className="if-btn if-btn--primary if-btn--sm menu-focus mx-3 mb-2 flex-shrink-0"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          Nouveaux messages
        </button>
      )}

      {/* Composer — one field, two icon buttons, no shouty colours */}
      <div className="flex-shrink-0 border-t border-[var(--ink-line)] p-2.5">
        <div
          className="flex items-center gap-1.5 rounded-[var(--ink-radius-sm)] p-1.5 transition-colors"
          style={{
            background: 'rgba(10,7,26,0.5)',
            border: `1px solid ${focused ? 'var(--c-violet)' : 'var(--ink-line)'}`,
          }}
        >
          <button
            type="button"
            onClick={() => { playInkSound('cartoonPop', 0.3); setShowGifPicker(true); }}
            className="if-icon-btn menu-focus h-8 w-8 min-w-0 border-transparent bg-transparent"
            title="Envoyer un GIF"
            aria-label="Envoyer un GIF"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Écris un message…"
            maxLength={300}
            aria-label="Message"
            className="h-8 min-w-0 flex-1 bg-transparent px-1 text-sm text-[var(--ink-text)] outline-none placeholder:text-[var(--ink-text-mute)]"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="Envoyer"
            className="menu-focus grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--c-violet)' }}
          >
            <Send className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* GIF modal */}
      <AnimatePresence>
        {showGifPicker && <GifPickerModal onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
      </AnimatePresence>

    </div>
  );
});
