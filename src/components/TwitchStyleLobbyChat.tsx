import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface TwitchStyleLobbyChatProps {
  lobbyId: string;
  playerId: string;
  playerName: string;
  className?: string;
}

/* ============================================================
   Cartoon graffiti palette of pseudo colors (Twitch-style)
============================================================ */
const PSEUDO_COLORS = [
  '#a855f7', '#06b6d4', '#fbbf24', '#34d399', '#ef4444',
  '#f472b6', '#60a5fa', '#fb923c', '#c084fc', '#22d3ee',
  '#a3e635', '#f87171', '#e879f9',
];

/** Hash a player ID/name to a stable color index */
const colorFor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return PSEUDO_COLORS[Math.abs(h) % PSEUDO_COLORS.length];
};

const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/* ============================================================
   Single chat message — Twitch IRC look
============================================================ */
const ChatLine = memo(({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) => {
  const color = colorFor(msg.playerId || msg.playerName);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="px-2 py-1 hover:bg-white/5 rounded-md break-words"
    >
      <span className="text-[10px] text-white/30 mr-1.5" style={{ fontFamily: 'monospace' }}>
        {formatTime(msg.createdAt)}
      </span>
      <span
        className="font-black text-sm mr-1.5"
        style={{
          color,
          fontFamily: "'Caveat', cursive",
          textShadow: '1px 1px 0 #0a0810',
        }}
      >
        {msg.playerName}
        <span className="text-white/50 mx-0.5">:</span>
      </span>
      <span className={cn('text-sm', isOwn ? 'text-white font-semibold' : 'text-white/85')}
        style={{ fontFamily: "'Caveat', cursive" }}>
        {renderContent(msg)}
      </span>
    </motion.div>
  );
});
ChatLine.displayName = 'ChatLine';

const renderContent = (msg: ChatMessage) => {
  if (msg.messageType === 'gif' || msg.messageType === 'image') {
    return (
      <img
        src={msg.content}
        alt="media"
        className="inline-block max-h-24 rounded-lg ml-1 align-middle"
        style={{ maxWidth: '180px' }}
      />
    );
  }
  if (msg.messageType === 'voice') {
    return <span className="italic text-white/60">🎤 message vocal</span>;
  }
  return msg.content;
};

/* ============================================================
   Main Twitch-style chat
============================================================ */
export const TwitchStyleLobbyChat = memo(function TwitchStyleLobbyChat({
  lobbyId,
  playerId,
  playerName,
  className,
}: TwitchStyleLobbyChatProps) {
  const { messages, isLoading, sendMessage, isSending } = useLobbyChat(
    lobbyId,
    playerId,
    playerName,
  );
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll on new messages (only if user is at the bottom)
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, autoScroll]);

  // Detect when user scrolls up — disable auto-scroll
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
    sendMessage(trimmed);
    setInput('');
    setAutoScroll(true);
  }, [input, isSending, sendMessage]);

  return (
    <div
      className={cn('flex flex-col rounded-2xl overflow-hidden', className)}
      style={{
        background: 'linear-gradient(180deg, rgba(10,8,16,0.85), rgba(20,15,30,0.85))',
        border: '3px solid #0a0810',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 0 #0a0810',
      }}
    >
      {/* Header — Twitch style */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span
            className="text-sm font-black uppercase tracking-wider text-white/90"
            style={{ fontFamily: "'Caveat', cursive", textShadow: '1px 1px 0 #0a0810' }}
          >
            CHAT
          </span>
        </div>
        <span className="text-[10px] text-white/40 font-mono">{messages.length}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-1.5 min-h-0"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-white/40 text-sm" style={{ fontFamily: "'Caveat', cursive" }}>
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm text-white/40 font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
              Aucun message
            </p>
            <p className="text-xs text-white/30 italic" style={{ fontFamily: "'Caveat', cursive" }}>
              Sois le premier à écrire !
            </p>
          </div>
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

      {/* "New messages" indicator when user scrolled up */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="mx-2 mb-1 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/40 text-xs text-white font-semibold"
        >
          ↓ Nouveaux messages
        </button>
      )}

      {/* Input */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Envoyer un message"
            maxLength={300}
            className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:outline-none"
            style={{
              background: 'rgba(0,0,0,0.45)',
              border: '2px solid rgba(255,255,255,0.1)',
              fontFamily: "'Caveat', cursive",
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={cn(
              'px-3 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !isSending ? 'hover:scale-105' : 'opacity-40 cursor-not-allowed',
            )}
            style={{
              background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
              border: '2px solid #0a0810',
              boxShadow: '0 2px 0 #0a0810',
            }}
          >
            <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
});
