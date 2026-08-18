/**
 * LobbyChat — Cartoon graffiti style floating chat.
 * Used across all game screens.
 *
 * Features:
 * - Twitch-style IRC messages with colored pseudos
 * - GIF picker with 200+ GIFs in 18 categories + search
 * - Soundboard: sends real audio messages that ALL players hear
 * - Voice messages
 * - Collapsed/expanded toggle
 */
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Image as ImageIcon, Search, Sparkles, Volume2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { CHAT_GIFS, CATEGORY_LABELS, searchGifs, type GifCategory } from '@/lib/chatGifs';

interface LobbyChatProps {
  lobbyId: string;
  playerId: string;
  playerName: string;
}

const SHADOW_SM = '1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)';
const FONT = "'Outfit', sans-serif";

/* ============================================================
   Pseudo colors
============================================================ */
const PSEUDO_COLORS = [
  'var(--ink-accent)', 'var(--ink-text-dim)', '#fbbf24', '#34d399', '#ef4444',
  '#f472b6', '#60a5fa', '#fb923c', 'var(--ink-accent)', 'var(--ink-text-dim)',
  '#a3e635', '#f87171', 'var(--ink-accent)', '#fde047', 'var(--ink-text-dim)',
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
   Soundboard — real sounds sent to chat (all players hear them)
   content = soundId, messageType = 'soundboard'
============================================================ */
export const SOUNDBOARD_ITEMS = [
  { id: 'airhorn', emoji: '📯', label: 'Air Horn', sound: 'alertUrgent' as const, color: '#ef4444' },
  { id: 'applause', emoji: '👏', label: 'Applause', sound: 'achievementEarned' as const, color: '#fbbf24' },
  { id: 'party', emoji: '🎉', label: 'Fête', sound: 'celebration' as const, color: '#ff5c8a' },
  { id: 'win', emoji: '🏆', label: 'Victoire', sound: 'levelComplete' as const, color: '#f59e0b' },
  { id: 'fail', emoji: '💀', label: 'Fail', sound: 'gameOver' as const, color: '#6b7280' },
  { id: 'wow', emoji: '😱', label: 'Wow', sound: 'transitionMagic' as const, color: '#40c9ff' },
  { id: 'fire', emoji: '🔥', label: 'Fire', sound: 'quizStreak' as const, color: '#f97316' },
  { id: 'zap', emoji: '⚡', label: 'Zap', sound: 'transitionZap' as const, color: '#fbbf24' },
  { id: 'gg', emoji: '🎮', label: 'GG', sound: 'notifySuccess' as const, color: '#34d399' },
  { id: 'nope', emoji: '❌', label: 'Nope', sound: 'notifyError' as const, color: '#ef4444' },
  { id: 'magic', emoji: '✨', label: 'Magic', sound: 'transitionCosmic' as const, color: '#a06bff' },
  { id: 'drum', emoji: '🥁', label: 'Drum', sound: 'quizCombo' as const, color: '#fb923c' },
  { id: 'coin', emoji: '🪙', label: 'Coin', sound: 'coinDrop' as const, color: '#fde047' },
  { id: 'gem', emoji: '💎', label: 'Gem', sound: 'gemCollect' as const, color: '#2fd8c5' },
  { id: 'level', emoji: '⬆️', label: 'Level Up', sound: 'levelComplete' as const, color: '#a3e635' },
  { id: 'suspense', emoji: '😰', label: 'Suspense', sound: 'suspenseBuild' as const, color: '#ff9640' },
] as const;

type SoundboardId = typeof SOUNDBOARD_ITEMS[number]['id'];

/** Play a soundboard sound by ID */
export const playSoundboardSound = (soundId: string) => {
  const item = SOUNDBOARD_ITEMS.find((s) => s.id === soundId);
  if (item) playSoundEffect(item.sound, 0.7);
};

/* ============================================================
   Single chat line
============================================================ */
const ChatLine = memo(({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) => {
  const color = colorFor(msg.playerId || msg.playerName);
  const isMedia = msg.messageType === 'gif' || msg.messageType === 'image';
  const isSoundboard = msg.messageType === 'soundboard';
  const soundItem = isSoundboard ? SOUNDBOARD_ITEMS.find((s) => s.id === msg.content) : null;

  // Auto-play soundboard messages when received
  useEffect(() => {
    if (isSoundboard && !isOwn) {
      playSoundboardSound(msg.content);
    }
  }, [msg.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn('px-2 py-1 rounded-lg break-words hover:bg-white/[0.04] transition-colors', isOwn && 'bg-white/[0.02]')}
    >
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{formatTime(msg.createdAt)}</span>
        <span className="font-black text-base flex-shrink-0" style={{ color, fontFamily: FONT, textShadow: SHADOW_SM }}>
          {msg.playerName}
        </span>
        <span className="text-white/40 text-sm">:</span>
        {!isMedia && !isSoundboard && msg.messageType !== 'voice' && (
          <span className="text-base text-white/95 font-bold break-words" style={{ fontFamily: FONT }}>{msg.content}</span>
        )}
        {msg.messageType === 'voice' && (
          <span className="italic text-white/60 text-sm" style={{ fontFamily: FONT }}>🎤 message vocal</span>
        )}
        {isSoundboard && soundItem && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => playSoundboardSound(msg.content)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-sm font-black text-white"
            style={{
              background: `${soundItem.color}22`,
              border: `2px solid ${soundItem.color}55`,
              boxShadow: `0 0 0 rgba(0,0,0,0)`,
              fontFamily: FONT,
              textShadow: SHADOW_SM,
            }}
            title="Cliquer pour rejouer"
          >
            <span className="text-lg">{soundItem.emoji}</span>
            <span style={{ color: soundItem.color }}>{soundItem.label}</span>
            <Volume2 className="w-3 h-3 opacity-60" style={{ color: soundItem.color }} />
          </motion.button>
        )}
      </div>
      {isMedia && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-1.5 ml-3">
          <img src={msg.content} alt="gif" className="rounded-xl max-h-32 max-w-[200px]"
            style={{ border: '1px solid var(--ink-line)', boxShadow: 'none' }} />
        </motion.div>
      )}
    </motion.div>
  );
});
ChatLine.displayName = 'ChatLine';

/* ============================================================
   MAIN LOBBY CHAT
============================================================ */
export const LobbyChat = memo(function LobbyChat({ lobbyId, playerId, playerName }: LobbyChatProps) {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(lobbyId, playerId, playerName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [panel, setPanel] = useState<'none' | 'gif' | 'soundboard'>('none');
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifSearch, setGifSearch] = useState('');
  const [gifCategory, setGifCategory] = useState<GifCategory | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const visibleGifs = useMemo(() => {
    if (gifSearch.trim()) return searchGifs(gifSearch);
    if (gifCategory === 'all') return CHAT_GIFS;
    return CHAT_GIFS.filter((g) => g.category === gifCategory);
  }, [gifSearch, gifCategory]);

  // Track unread
  useEffect(() => {
    if (!isExpanded && messages.length > lastCountRef.current) {
      setUnreadCount((n) => n + (messages.length - lastCountRef.current));
    }
    lastCountRef.current = messages.length;
  }, [messages.length, isExpanded]);

  useEffect(() => { if (isExpanded) setUnreadCount(0); }, [isExpanded]);

  // Auto-scroll
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
    playSoundEffect('pop', 0.3);
    sendMessage(trimmed, 'text');
    setInput('');
    setAutoScroll(true);
  }, [input, isSending, sendMessage]);

  const handleSendGif = useCallback((url: string) => {
    sendMessage(url, 'gif');
    setPanel('none');
    setAutoScroll(true);
  }, [sendMessage]);

  const handleSendSoundboard = useCallback((soundId: string) => {
    // Play locally immediately
    playSoundboardSound(soundId);
    // Send to chat so others hear it too
    sendMessage(soundId, 'soundboard');
    setPanel('none');
    setAutoScroll(true);
  }, [sendMessage]);

  return (
    <div className="fixed bottom-28 left-4 z-40">
      {/* Collapsed button */}
      {!isExpanded && (
        <motion.button onClick={() => { setIsExpanded(true); playSoundEffect('pop', 0.3); }}
          whileHover={{ scale: 1.06, rotate: -2 }} whileTap={{ scale: 0.94 }}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
          <MessageCircle className="w-4 h-4 text-[var(--ink-accent-text)]" />
          <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Chat</span>
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      )}

      {/* Expanded chat */}
      {isExpanded && (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative flex flex-col rounded-2xl overflow-hidden"
          style={{ width: '320px', height: '420px', background: 'linear-gradient(180deg, rgba(20,15,30,0.97), rgba(10,8,16,0.97))', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
          <Sparkles className="absolute top-2 right-8 w-3 h-3 text-amber-400/60 pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '2.5px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <motion.span className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}
                style={{ boxShadow: '0 0 6px #34d39988' }} />
              <span className="text-base font-black text-white uppercase" style={{ fontFamily: FONT, textShadow: SHADOW_SM, letterSpacing: '0.05em' }}>💬 Chat Live</span>
              <span className="text-xs font-black px-1.5 py-0.5 rounded-md text-white"
                style={{ background: 'var(--ink-accent-soft)', border: '1px solid var(--ink-line)', fontFamily: FONT }}>{messages.length}</span>
            </div>
            <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              onClick={() => { setIsExpanded(false); setPanel('none'); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </motion.button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-1.5 px-1 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ink-accent-soft) transparent' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 rounded-full" style={{ border: '3px solid var(--ink-accent)', borderTopColor: 'transparent' }} />
              </div>
            ) : messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <motion.div animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }} transition={{ duration: 2, repeat: Infinity }}>
                  <span className="text-5xl">💬</span>
                </motion.div>
                <p className="text-base font-black text-white/70 mt-3" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Aucun message !</p>
                <p className="text-sm text-white/40 italic font-bold mt-1" style={{ fontFamily: FONT }}>Sois le premier ✨</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => <ChatLine key={msg.id} msg={msg} isOwn={msg.playerId === playerId} />)}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* New messages button */}
          {!autoScroll && (
            <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
              className="mx-2 mb-1 py-1.5 rounded-lg text-xs font-black text-white"
              style={{ background: 'var(--ink-accent)', border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              ↓ Nouveaux messages
            </motion.button>
          )}

          {/* GIF Panel — inside chat */}
          <AnimatePresence>
            {panel === 'gif' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                className="absolute inset-x-0 bottom-[56px] top-[44px] z-20 flex flex-col rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                {/* GIF Header */}
                <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>GIFs</span>
                  <span className="text-xs text-white/40 font-mono">({CHAT_GIFS.length})</span>
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} placeholder="Rechercher…"
                      className="w-full pl-7 pr-2 py-1.5 rounded-lg text-sm font-bold text-white placeholder:text-white/30 outline-none"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)', fontFamily: FONT }} />
                  </div>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setPanel('none')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.button>
                </div>
                {/* Categories */}
                {!gifSearch.trim() && (
                  <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {[['all', { emoji: '✨', label: 'Tout', color: 'var(--ink-accent)' }] as const, ...Object.entries(CATEGORY_LABELS) as [GifCategory, typeof CATEGORY_LABELS[GifCategory]][]]
                      .map(([key, info]) => (
                        <button key={key} onClick={() => setGifCategory(key as GifCategory | 'all')}
                          className={cn('flex-shrink-0 px-2 py-1 rounded-lg text-xs font-black whitespace-nowrap transition-all', gifCategory === key ? 'scale-105' : 'opacity-60 hover:opacity-100')}
                          style={{ background: gifCategory === key ? `linear-gradient(180deg, ${info.color}, ${info.color}cc)` : 'rgba(255,255,255,0.06)', border: '1px solid var(--ink-line)', boxShadow: gifCategory === key ? '0 0 0 rgba(0,0,0,0)' : 'none', color: 'white', fontFamily: FONT, textShadow: gifCategory === key ? SHADOW_SM : 'none' }}>
                          {info.emoji} {info.label}
                        </button>
                      ))}
                  </div>
                )}
                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {visibleGifs.map((gif, i) => (
                      <motion.button key={`${gif.url}-${i}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.01, 0.15) }} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { playSoundEffect('pop', 0.3); handleSendGif(gif.url); }}
                        className="relative aspect-square rounded-lg overflow-hidden"
                        style={{ border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                        <img src={gif.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </motion.button>
                    ))}
                    {visibleGifs.length === 0 && (
                      <div className="col-span-3 py-8 text-center">
                        <span className="text-4xl">🤷</span>
                        <p className="text-sm text-white/50 mt-2 font-bold" style={{ fontFamily: FONT }}>Aucun GIF</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Soundboard Panel — inside chat */}
          <AnimatePresence>
            {panel === 'soundboard' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                className="absolute inset-x-0 bottom-[56px] z-20 rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--ink-text-dim)]" />
                    <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Soundboard</span>
                    <span className="text-xs text-white/40" style={{ fontFamily: FONT }}>— tout le monde entend !</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setPanel('none')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.button>
                </div>
                <div className="grid grid-cols-4 gap-2 p-3">
                  {SOUNDBOARD_ITEMS.map((item) => (
                    <motion.button key={item.id} whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.92 }}
                      onClick={() => handleSendSoundboard(item.id)}
                      className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl"
                      style={{ background: `${item.color}15`, border: `2.5px solid ${item.color}44`, boxShadow: 'none' }}>
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[10px] font-black leading-none" style={{ fontFamily: FONT, color: item.color }}>{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div className="p-2 flex-shrink-0" style={{ borderTop: '2.5px solid rgba(255,255,255,0.1)' }}>
            <div className="flex gap-1.5 items-center">
              {/* GIF button */}
              <motion.button type="button" onClick={() => setPanel(panel === 'gif' ? 'none' : 'gif')}
                whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 px-2 py-2 rounded-xl flex items-center gap-1"
                style={{ background: panel === 'gif' ? 'linear-gradient(180deg, #fbbf24, #d97706)' : 'rgba(251,191,36,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                title="GIFs">
                <ImageIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span className="text-xs font-black text-white leading-none" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>GIF</span>
              </motion.button>

              {/* Soundboard button */}
              <motion.button type="button" onClick={() => setPanel(panel === 'soundboard' ? 'none' : 'soundboard')}
                whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: panel === 'soundboard' ? 'linear-gradient(180deg, var(--ink-text-dim), var(--ink-text-dim))' : 'rgba(6,182,212,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                title="Soundboard — tout le monde entend !">
                <Volume2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>

              {/* Text input */}
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ton message…" maxLength={300}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-bold text-white placeholder:text-white/30 outline-none"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ink-line)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)', fontFamily: FONT }} />

              {/* Send button */}
              <motion.button type="button" onClick={handleSend} disabled={!input.trim() || isSending}
                whileHover={input.trim() && !isSending ? { scale: 1.1, rotate: -5 } : undefined}
                whileTap={input.trim() && !isSending ? { scale: 0.9 } : undefined}
                className={cn('flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', (!input.trim() || isSending) && 'opacity-40 cursor-not-allowed')}
                style={{ background: 'var(--ink-accent)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});
