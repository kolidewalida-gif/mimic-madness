import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { Send, Smile, Sparkles, Search, X, Image as ImageIcon } from 'lucide-react';
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

const SHADOW_SM = '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810';
const FONT = "'Caveat', cursive";

/* ============================================================
   Pseudo colors — Twitch-style stable hash → vivid cartoon palette
============================================================ */
const PSEUDO_COLORS = [
  '#a855f7', '#06b6d4', '#fbbf24', '#34d399', '#ef4444',
  '#f472b6', '#60a5fa', '#fb923c', '#c084fc', '#22d3ee',
  '#a3e635', '#f87171', '#e879f9', '#fde047', '#67e8f9',
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
   Single chat line — graffiti style
============================================================ */
const ChatLine = memo(({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) => {
  const color = colorFor(msg.playerId || msg.playerName);
  const isMedia = msg.messageType === 'gif' || msg.messageType === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, rotate: isOwn ? 1 : -1 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        'group px-2 py-1.5 rounded-lg break-words transition-colors',
        'hover:bg-white/[0.04]',
        isOwn && 'bg-white/[0.02]',
      )}
    >
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span
          className="text-[10px] text-white/30 font-mono flex-shrink-0"
        >
          {formatTime(msg.createdAt)}
        </span>
        <span
          className="font-black text-base flex-shrink-0"
          style={{
            color,
            fontFamily: FONT,
            textShadow: SHADOW_SM,
          }}
        >
          {msg.playerName}
        </span>
        <span className="text-white/40 text-sm">:</span>
        {!isMedia && (
          <span
            className="text-base text-white/95 font-bold break-words"
            style={{ fontFamily: FONT }}
          >
            {msg.content}
          </span>
        )}
        {msg.messageType === 'voice' && (
          <span className="italic text-white/60 text-sm" style={{ fontFamily: FONT }}>
            🎤 message vocal
          </span>
        )}
      </div>
      {isMedia && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 15 }}
          className="mt-1.5 ml-3 inline-block"
        >
          <img
            src={msg.content}
            alt="gif"
            className="rounded-xl max-h-32 max-w-[220px]"
            style={{
              border: '2.5px solid #0a0810',
              boxShadow: '0 3px 0 #0a0810',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
});
ChatLine.displayName = 'ChatLine';

/* ============================================================
   GIF Picker — cartoon graffiti modal
============================================================ */
const GifPicker = memo(function GifPicker({
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

  const categories = useMemo(() => Object.entries(CATEGORY_LABELS) as [GifCategory, typeof CATEGORY_LABELS[GifCategory]][], []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
        border: '3px solid #0a0810',
        boxShadow: '0 6px 0 #0a0810, 0 12px 30px rgba(0,0,0,0.6)',
        height: '320px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
            GIFs
          </span>
          <span className="text-xs text-white/40 font-mono">({CHAT_GIFS.length})</span>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-7 pr-2 py-1.5 rounded-lg text-sm font-bold text-white placeholder:text-white/30 outline-none"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.1)',
              fontFamily: FONT,
            }}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '2px solid #0a0810',
            boxShadow: '0 2px 0 #0a0810',
          }}
        >
          <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </motion.button>
      </div>

      {/* Categories */}
      {!search.trim() && (
        <div className="flex gap-1.5 px-2 py-2 overflow-x-auto custom-scrollbar flex-shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-black transition-all',
              activeCategory === 'all' ? 'scale-105' : 'opacity-60 hover:opacity-100',
            )}
            style={{
              background: activeCategory === 'all' ? 'linear-gradient(180deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.06)',
              border: '2px solid #0a0810',
              boxShadow: activeCategory === 'all' ? '0 2px 0 #0a0810' : 'none',
              color: 'white',
              fontFamily: FONT,
              textShadow: activeCategory === 'all' ? SHADOW_SM : 'none',
            }}
          >
            ✨ Tout
          </button>
          {categories.map(([key, info]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap',
                activeCategory === key ? 'scale-105' : 'opacity-60 hover:opacity-100',
              )}
              style={{
                background: activeCategory === key
                  ? `linear-gradient(180deg, ${info.color}, ${info.color}cc)`
                  : 'rgba(255,255,255,0.06)',
                border: '2px solid #0a0810',
                boxShadow: activeCategory === key ? '0 2px 0 #0a0810' : 'none',
                color: 'white',
                fontFamily: FONT,
                textShadow: activeCategory === key ? SHADOW_SM : 'none',
              }}
            >
              {info.emoji} {info.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="grid grid-cols-3 gap-2">
          {visibleGifs.map((gif, i) => (
            <motion.button
              key={`${gif.url}-${i}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: Math.min(i * 0.01, 0.2) }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playInkSound('cartoonPop', 0.3);
                onSelect(gif.url);
              }}
              className="relative aspect-square rounded-lg overflow-hidden"
              style={{
                border: '2px solid #0a0810',
                boxShadow: '0 2px 0 #0a0810',
              }}
            >
              <img
                src={gif.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.button>
          ))}
          {visibleGifs.length === 0 && (
            <div className="col-span-3 py-8 text-center">
              <span className="text-5xl">🤷</span>
              <p className="text-sm text-white/50 mt-2 font-bold" style={{ fontFamily: FONT }}>
                Aucun GIF trouvé
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

/* ============================================================
   MAIN CHAT
============================================================ */
export const TwitchStyleLobbyChat = memo(function TwitchStyleLobbyChat({
  lobbyId,
  playerId,
  playerName,
  className,
}: TwitchStyleLobbyChatProps) {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(lobbyId, playerId, playerName);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    playInkSound('cartoonPop', 0.25);
    sendMessage(trimmed, 'text');
    setInput('');
    setAutoScroll(true);
  }, [input, isSending, sendMessage]);

  const handleSendGif = useCallback(
    (url: string) => {
      sendMessage(url, 'gif');
      setShowGifPicker(false);
      setAutoScroll(true);
    },
    [sendMessage],
  );

  return (
    <div
      className={cn('relative flex flex-col rounded-2xl overflow-hidden', className)}
      style={{
        background: 'linear-gradient(180deg, rgba(20,15,30,0.92), rgba(10,8,16,0.92))',
        border: '3px solid #0a0810',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 0 #0a0810',
      }}
    >
      {/* Decorative graffiti corner sparkles */}
      <Sparkles
        className="absolute top-1.5 right-2 w-3 h-3 text-amber-400 pointer-events-none"
        style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0 relative"
        style={{ borderBottom: '2.5px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ boxShadow: '0 0 6px #34d39988' }}
          />
          <span
            className="text-base font-black uppercase text-white"
            style={{
              fontFamily: FONT,
              textShadow: SHADOW_SM,
              letterSpacing: '0.05em',
            }}
          >
            💬 CHAT LIVE
          </span>
        </div>
        <span
          className="text-xs font-black px-1.5 py-0.5 rounded-md text-white"
          style={{
            background: 'rgba(168,85,247,0.25)',
            border: '1.5px solid #0a0810',
            fontFamily: FONT,
          }}
        >
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-1 min-h-0"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 rounded-full"
              style={{
                border: '3px solid #a855f7',
                borderTopColor: 'transparent',
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center"
          >
            <motion.div
              animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl mb-3"
            >
              💬
            </motion.div>
            <p
              className="text-base font-black text-white/70 mb-1"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              Aucun message !
            </p>
            <p
              className="text-sm text-white/40 italic font-bold"
              style={{ fontFamily: FONT }}
            >
              Sois le premier à écrire ✨
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <ChatLine key={msg.id} msg={msg} isOwn={msg.playerId === playerId} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New messages button */}
      {!autoScroll && (
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="mx-2 mb-1 py-1.5 rounded-lg text-xs font-black text-white"
          style={{
            background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
            border: '2px solid #0a0810',
            boxShadow: '0 2px 0 #0a0810',
            fontFamily: FONT,
            textShadow: SHADOW_SM,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ↓ Nouveaux messages
        </motion.button>
      )}

      {/* GIF Picker overlay */}
      <AnimatePresence>
        {showGifPicker && <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
      </AnimatePresence>

      {/* Input bar */}
      <div
        className="p-2 flex-shrink-0 relative"
        style={{ borderTop: '2.5px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex gap-1.5 items-center">
          {/* GIF button */}
          <motion.button
            type="button"
            onClick={() => setShowGifPicker((v) => !v)}
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 px-2 py-2 rounded-xl flex items-center gap-1"
            style={{
              background: showGifPicker
                ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                : 'rgba(251,191,36,0.2)',
              border: '2px solid #0a0810',
              boxShadow: '0 2px 0 #0a0810',
            }}
            title="GIFs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            <span
              className="text-xs font-black text-white leading-none"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              GIF
            </span>
          </motion.button>

          {/* Text input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ton message…"
            maxLength={300}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-bold text-white placeholder:text-white/30 outline-none"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '2.5px solid #0a0810',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
              fontFamily: FONT,
            }}
          />

          {/* Send button */}
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            whileHover={input.trim() && !isSending ? { scale: 1.1, rotate: -5 } : undefined}
            whileTap={input.trim() && !isSending ? { scale: 0.9 } : undefined}
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-opacity',
              (!input.trim() || isSending) && 'opacity-40 cursor-not-allowed',
            )}
            style={{
              background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
              border: '2.5px solid #0a0810',
              boxShadow: '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
});
