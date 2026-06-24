import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { useChatColor } from '@/hooks/useChatColor';
import { useQuestTracker } from '@/hooks/useQuestTracker';
import { Send, Search, X, Image as ImageIcon } from 'lucide-react';
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

/* Stable vivid pseudo colors */
const PSEUDO_COLORS = [
  '#c084fc', '#22d3ee', '#fbbf24', '#34d399', '#fb7185',
  '#f472b6', '#60a5fa', '#fb923c', '#a855f7', '#67e8f9',
  '#a3e635', '#f87171', '#e879f9', '#fde047', '#38bdf8',
];
const colorFor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PSEUDO_COLORS[Math.abs(h) % PSEUDO_COLORS.length];
};
const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/* ============================================================
   Chat line — clean, readable
============================================================ */
const ChatLine = memo(({ msg, isOwn, ownColor }: { msg: ChatMessage; isOwn: boolean; ownColor?: string }) => {
  const hashColor = colorFor(msg.playerId || msg.playerName);
  const color = isOwn && ownColor && ownColor !== '' && ownColor !== 'rainbow' ? ownColor : hashColor;
  const isMedia = msg.messageType === 'gif' || msg.messageType === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="px-2.5 py-1 rounded-lg hover:bg-white/[0.03] transition-colors"
    >
      <span className="text-[10px] text-white/25 mr-1.5 tabular-nums align-middle">{formatTime(msg.createdAt)}</span>
      <span className="font-bold text-sm align-middle" style={{ color }}>{msg.playerName}</span>
      {!isMedia && msg.messageType !== 'voice' && (
        <span className="text-sm text-white/90 align-middle"> {msg.content}</span>
      )}
      {msg.messageType === 'voice' && (
        <span className="italic text-white/50 text-xs align-middle"> 🎤 message vocal</span>
      )}
      {isMedia && (
        <div className="mt-1">
          <img src={msg.content} alt="gif" className="rounded-xl max-h-32 max-w-[200px] border border-white/10" />
        </div>
      )}
    </motion.div>
  );
});
ChatLine.displayName = 'ChatLine';

/* ============================================================
   GIF Picker — portaled centered modal (never clipped)
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
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
        style={{ height: 'min(70vh, 540px)', background: 'linear-gradient(180deg,#1a0d2e,#0d0618)', border: '1px solid rgba(168,85,247,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="text-base font-bold text-white">GIFs</span>
          <span className="text-xs text-white/40">{CHAT_GIFS.length}</span>
          <div className="flex-1 relative ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un GIF…"
              className="w-full h-9 pl-8 pr-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none bg-black/40 border border-white/10 focus:border-purple-400/50"
            />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories */}
        {!search.trim() && (
          <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto custom-scrollbar flex-shrink-0 border-b border-white/5">
            <CatChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="✨ Tout" color="#a855f7" />
            {categories.map(([key, info]) => (
              <CatChip
                key={key}
                active={activeCategory === key}
                onClick={() => setActiveCategory(key)}
                label={`${info.emoji} ${info.label}`}
                color={info.color}
              />
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {visibleGifs.map((gif, i) => (
              <motion.button
                key={`${gif.url}-${i}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i * 0.008, 0.15) }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playInkSound('cartoonPop', 0.3); onSelect(gif.url); }}
                className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/50"
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
    style={{ background: active ? `linear-gradient(180deg,${color},${color}cc)` : 'rgba(255,255,255,0.04)', borderColor: active ? 'transparent' : undefined }}
  >
    {label}
  </button>
);

/* ============================================================
   MAIN CHAT — clean redesign
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
    <div
      className={cn('relative flex flex-col rounded-2xl overflow-hidden bg-[#140a22]/85 border border-white/10', className)}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 flex-shrink-0 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ boxShadow: '0 0 6px #34d39988' }}
          />
          <span className="text-sm font-bold uppercase tracking-wide text-white/90">Chat en direct</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-purple-200 bg-purple-500/20 border border-purple-400/20">
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar py-2 px-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-[3px] border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="text-4xl mb-2 opacity-80">💬</motion.div>
            <p className="text-sm font-bold text-white/70">Aucun message</p>
            <p className="text-xs text-white/40 mt-0.5">Sois le premier à écrire ✨</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatLine key={msg.id} msg={msg} isOwn={msg.playerId === playerId} ownColor={msg.playerId === playerId ? ownColor : undefined} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New messages pill */}
      {!autoScroll && messages.length > 0 && (
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
          className="mx-2 mb-1 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600/90 hover:bg-purple-600"
          whileTap={{ scale: 0.98 }}
        >
          ↓ Nouveaux messages
        </motion.button>
      )}

      {/* Input bar */}
      <div className="p-2 flex-shrink-0 border-t border-white/10 bg-white/[0.02]">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => { playInkSound('cartoonPop', 0.3); setShowGifPicker(true); }}
            className={cn(
              'flex-shrink-0 h-10 px-3 rounded-xl flex items-center gap-1.5 font-bold text-sm transition-all',
              showGifPicker ? 'bg-amber-500 text-white' : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25',
            )}
            title="Envoyer un GIF"
          >
            <ImageIcon className="w-4 h-4" strokeWidth={2.5} />
            GIF
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ton message…"
            maxLength={300}
            className="flex-1 min-w-0 h-10 px-3.5 rounded-xl text-sm text-white placeholder:text-white/30 outline-none bg-black/40 border border-white/10 focus:border-purple-400/50 transition-colors"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !isSending ? 'bg-gradient-to-br from-purple-500 to-violet-700 text-white hover:brightness-110' : 'bg-white/5 text-white/30 cursor-not-allowed',
            )}
          >
            <Send className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* GIF modal (portaled to body — never clipped by overflow) */}
      <AnimatePresence>
        {showGifPicker && <GifPickerModal onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
      </AnimatePresence>
    </div>
  );
});
