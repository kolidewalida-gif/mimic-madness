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
import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Image as ImageIcon, Search, Sparkles, Volume2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { playSample } from '@/lib/sfx/samples';
import { CHAT_GIFS, CATEGORY_LABELS, searchGifs, type GifCategory } from '@/lib/chatGifs';

interface LobbyChatProps {
  variant?: 'default' | 'inkBeta';
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
  // `sample` prime sur `sound` quand le fichier existe. « Applause » jouait un
  // carillon de succès débloqué faute de mieux ; il a maintenant de vrais
  // applaudissements, sans élargir l'union `SoundType` pour autant.
  { id: 'applause', emoji: '👏', label: 'Applause', sound: 'achievementEarned' as const, sample: 'applause', color: '#fbbf24' },
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

/**
 * Play a soundboard sound by ID.
 *
 * `sample` désigne un fichier généré, `sound` l'ancien son synthétisé qui sert
 * de repli. Certaines cases n'avaient pas de son juste — « Applause » jouait le
 * carillon des succès débloqués — d'où la possibilité de les dissocier sans
 * élargir l'union `SoundType`.
 */
export const playSoundboardSound = (soundId: string) => {
  const item = SOUNDBOARD_ITEMS.find((s) => s.id === soundId);
  if (!item) return;
  const sample = (item as { sample?: string }).sample ?? item.sound;
  if (playSample(sample, 0.7)) return;
  playSoundEffect(item.sound, 0.7);
};

/* ============================================================
   Single chat line
============================================================ */
const ChatLine = memo(({
  msg,
  isOwn,
  isInkBeta,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isInkBeta: boolean;
}) => {
  const color = colorFor(msg.playerId || msg.playerName);
  const isMedia = msg.messageType === 'gif' || msg.messageType === 'image';
  const isSoundboard = msg.messageType === 'soundboard';
  const soundItem = isSoundboard ? SOUNDBOARD_ITEMS.find((s) => s.id === msg.content) : null;

  return (
    <motion.article
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        isInkBeta
          ? 'ik-chat-message'
          : 'px-2 py-1 rounded-lg break-words hover:bg-white/[0.04] transition-colors',
        isOwn && (isInkBeta ? 'is-own' : 'bg-white/[0.02]'),
      )}
    >
      <div className={isInkBeta ? 'ik-chat-message-line' : 'flex items-baseline gap-1.5 flex-wrap'}>
        <time className={isInkBeta ? 'ik-chat-message-time' : 'text-[10px] text-white/30 font-mono flex-shrink-0'}>
          {formatTime(msg.createdAt)}
        </time>
        <strong
          className={isInkBeta ? 'ik-chat-message-author' : 'font-black text-base flex-shrink-0'}
          style={{ color, fontFamily: FONT, textShadow: SHADOW_SM }}
        >
          {msg.playerName}
        </strong>
        <span className={isInkBeta ? 'ik-chat-message-separator' : 'text-white/40 text-sm'} aria-hidden="true">:</span>
        {!isMedia && !isSoundboard && msg.messageType !== 'voice' && (
          <span className={isInkBeta ? 'ik-chat-message-copy' : 'text-base text-white/95 font-bold break-words'} style={{ fontFamily: FONT }}>
            {msg.content}
          </span>
        )}
        {msg.messageType === 'voice' && (
          <span className={isInkBeta ? 'ik-chat-message-voice' : 'italic text-white/60 text-sm'} style={{ fontFamily: FONT }}>
            🎤 message vocal
          </span>
        )}
        {isSoundboard && soundItem && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => playSoundboardSound(msg.content)}
            className={isInkBeta ? 'ik-chat-sound' : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-sm font-black text-white'}
            style={{
              background: `${soundItem.color}22`,
              border: `2px solid ${soundItem.color}55`,
              boxShadow: 'none',
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
        <motion.figure
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={isInkBeta ? 'ik-chat-message-media' : 'mt-1.5 ml-3'}
        >
          <img
            src={msg.content}
            alt={msg.messageType === 'gif' ? 'GIF envoyé dans le chat' : 'Image envoyée dans le chat'}
            className={isInkBeta ? undefined : 'rounded-xl max-h-32 max-w-[200px]'}
            style={isInkBeta ? undefined : { border: '1px solid var(--ink-line)', boxShadow: 'none' }}
          />
        </motion.figure>
      )}
    </motion.article>
  );
});
ChatLine.displayName = 'ChatLine';

/* ============================================================
   MAIN LOBBY CHAT
============================================================ */
export const LobbyChat = memo(function LobbyChat({ lobbyId, playerId, playerName, variant = 'default' }: LobbyChatProps) {
  /*
   * En beta, le chat n'est plus une vignette posée dans un coin : c'est une
   * colonne ancrée à gauche, de la barre de marque au bas de l'écran. Un jeu de
   * soirée se joue en parlant — la discussion doit être lisible sans clic.
   */
  const isInkBeta = variant === 'inkBeta';
  /*
   * Le chat beta est monté dans `document.body`.
   *
   * Il vivait dans l'arbre de l'écran, et un seul ancêtre transformé — une
   * transition d'écran, un panneau à couche de composition — suffisait à en
   * faire le référent de son positionnement fixe, voire à le rogner. Le portail
   * supprime cette classe entière de disparitions.
   */
  const mountInBody = isInkBeta && typeof document !== 'undefined';
  const { messages, allMessages, isLoading, sendMessage, isSending } = useLobbyChat(lobbyId, playerId, playerName);
  /*
   * La colonne reste ouverte sur grand écran. Sur laptop et mobile elle démarre
   * repliée : l’utilisateur choisit quand superposer la conversation à la
   * scène, au lieu de perdre en permanence un quart de son écran.
   */
  const [isExpanded, setIsExpanded] = useState(() => {
    if (!isInkBeta) return false;
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1180px)').matches;
  });
  const [isMobileSheet, setIsMobileSheet] = useState(() => (
    isInkBeta
    && typeof window !== 'undefined'
    && window.matchMedia('(max-width: 680px)').matches
  ));
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [panel, setPanel] = useState<'none' | 'gif' | 'soundboard'>('none');
  const [unreadCount, setUnreadCount] = useState(0);
  const [gifSearch, setGifSearch] = useState('');
  const [gifCategory, setGifCategory] = useState<GifCategory | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatDockRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const soundboardPickerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusTargetRef = useRef<'panel' | 'trigger' | null>(null);
  const messageTrackerRef = useRef({
    lobbyId,
    initialized: false,
    knownIds: new Set<string>(),
  });

  const visibleGifs = useMemo(() => {
    if (gifSearch.trim()) return searchGifs(gifSearch);
    if (gifCategory === 'all') return CHAT_GIFS;
    return CHAT_GIFS.filter((g) => g.category === gifCategory);
  }, [gifSearch, gifCategory]);

  useEffect(() => {
    if (!isInkBeta || typeof window === 'undefined') {
      setIsMobileSheet(false);
      return;
    }

    const mobileSheetQuery = window.matchMedia('(max-width: 680px)');
    const syncMobileSheet = () => setIsMobileSheet(mobileSheetQuery.matches);
    syncMobileSheet();
    mobileSheetQuery.addEventListener('change', syncMobileSheet);
    return () => mobileSheetQuery.removeEventListener('change', syncMobileSheet);
  }, [isInkBeta]);

  /*
   * L'historique chargé sert de baseline : il ne doit ni remplir le badge de
   * non-lus, ni rejouer tous les sons du salon. Les ajouts Realtime sont
   * ensuite suivis par ID indépendamment du montage visuel de la colonne.
   */
  useEffect(() => {
    const tracker = messageTrackerRef.current;
    if (tracker.lobbyId !== lobbyId) {
      tracker.lobbyId = lobbyId;
      tracker.initialized = false;
      tracker.knownIds.clear();
      setUnreadCount(0);
      return;
    }
    if (isLoading) return;

    if (!tracker.initialized) {
      allMessages.forEach((message) => tracker.knownIds.add(message.id));
      tracker.initialized = true;
      return;
    }

    const newMessages = allMessages.filter((message) => !tracker.knownIds.has(message.id));
    newMessages.forEach((message) => tracker.knownIds.add(message.id));
    if (newMessages.length === 0) return;

    const visibleIds = new Set(messages.map((message) => message.id));
    const visibleNewMessages = newMessages.filter((message) => visibleIds.has(message.id));
    if (!isExpanded && visibleNewMessages.length > 0) {
      setUnreadCount((count) => count + visibleNewMessages.length);
    }
    visibleNewMessages.forEach((message) => {
      if (message.messageType === 'soundboard' && message.playerId !== playerId) {
        playSoundboardSound(message.content);
      }
    });
  }, [allMessages, isExpanded, isLoading, lobbyId, messages, playerId]);

  useEffect(() => {
    if (isExpanded) setUnreadCount(0);
  }, [isExpanded]);

  useEffect(() => {
    const target = focusTargetRef.current;
    if (target === 'panel' && isExpanded) {
      closeButtonRef.current?.focus();
      focusTargetRef.current = null;
    } else if (target === 'trigger' && !isExpanded) {
      openButtonRef.current?.focus();
      focusTargetRef.current = null;
    }
  }, [isExpanded]);

  useEffect(() => {
    if (panel === 'none') {
      panelTriggerRef.current?.focus();
      panelTriggerRef.current = null;
      return;
    }
    const activePicker = panel === 'gif' ? gifPickerRef.current : soundboardPickerRef.current;
    activePicker?.querySelector<HTMLElement>('input, button')?.focus();
  }, [panel]);

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

  const handleOpenChat = useCallback(() => {
    focusTargetRef.current = 'panel';
    setIsExpanded(true);
    playSoundEffect('pop', 0.3);
  }, []);

  const handleCloseChat = useCallback(() => {
    focusTargetRef.current = 'trigger';
    setPanel('none');
    setIsExpanded(false);
  }, []);

  const handleTogglePanel = useCallback((nextPanel: 'gif' | 'soundboard', trigger: HTMLButtonElement) => {
    panelTriggerRef.current = trigger;
    setPanel((currentPanel) => currentPanel === nextPanel ? 'none' : nextPanel);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanel('none');
  }, []);

  const handleChatKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (panel !== 'none') {
        handleClosePanel();
      } else {
        handleCloseChat();
      }
      return;
    }
    if (!isMobileSheet || event.key !== 'Tab') return;

    const focusScope = panel === 'gif'
      ? gifPickerRef.current
      : panel === 'soundboard'
        ? soundboardPickerRef.current
        : chatDockRef.current;
    if (!focusScope) return;
    const focusable = Array.from(focusScope.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) return;

    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const shouldWrapBackward = event.shiftKey && activeIndex <= 0;
    const shouldWrapForward = !event.shiftKey && activeIndex === focusable.length - 1;
    if (!shouldWrapBackward && !shouldWrapForward && activeIndex !== -1) return;

    event.preventDefault();
    focusable[event.shiftKey ? focusable.length - 1 : 0]?.focus();
  }, [handleCloseChat, handleClosePanel, isMobileSheet, panel]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    // Envoi de message : son dédié, plus le son de clic générique.
    playSoundEffect('messageSend', 0.3);
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

  const tree = (
    <div className={isInkBeta ? 'ik-chat-slot' : 'fixed bottom-28 left-4 z-40'}>
      {isExpanded && isInkBeta && (
        <button
          type="button"
          className="ik-chat-backdrop"
          onClick={handleCloseChat}
          tabIndex={-1}
          aria-label="Fermer le chat"
        />
      )}

      {/* Collapsed button */}
      {!isExpanded && (
        <motion.button
          ref={openButtonRef}
          type="button"
          onClick={handleOpenChat}
          whileHover={{ scale: 1.06, rotate: -2 }}
          whileTap={{ scale: 0.94 }}
          className={isInkBeta ? 'ik-chat-open menu-focus' : 'relative flex items-center gap-2 px-4 py-2.5 rounded-2xl'}
          style={isInkBeta ? undefined : { background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
          aria-label={unreadCount > 0 ? `Ouvrir le chat, ${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}` : 'Ouvrir le chat'}
          aria-expanded="false"
          aria-controls="lobby-live-chat"
        >
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
        <motion.div
          ref={chatDockRef}
          id="lobby-live-chat"
          role={isMobileSheet ? 'dialog' : 'region'}
          aria-modal={isMobileSheet || undefined}
          aria-label="Chat de la partie"
          onKeyDown={handleChatKeyDown}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className={isInkBeta ? 'ik-chat-dock' : 'relative flex flex-col rounded-2xl overflow-hidden'}
          style={isInkBeta ? undefined : { width: '320px', height: '420px', background: 'linear-gradient(180deg, rgba(20,15,30,0.97), rgba(10,8,16,0.97))', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
        >
          <Sparkles className={isInkBeta ? 'ik-chat-sparkle' : 'absolute top-2 right-8 w-3 h-3 text-amber-400/60 pointer-events-none'} />

          {/* Header */}
          <header
            className={cn('flex items-center justify-between flex-shrink-0', isInkBeta ? 'ik-chat-head' : 'px-3 py-2.5')}
            style={isInkBeta ? undefined : { borderBottom: '2.5px solid rgba(255,255,255,0.1)' }}
          >
            <div className={isInkBeta ? 'ik-chat-head-copy' : 'flex items-center gap-2'}>
              <motion.span
                className={isInkBeta ? 'ik-chat-live-dot' : 'w-2 h-2 rounded-full bg-emerald-400'}
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={isInkBeta ? undefined : { boxShadow: '0 0 6px #34d39988' }}
                aria-hidden="true"
              />
              <div className={isInkBeta ? 'ik-chat-heading' : undefined}>
                <span className={isInkBeta ? 'ik-chat-title' : 'text-base font-black text-white uppercase'} style={isInkBeta ? undefined : { fontFamily: FONT, textShadow: SHADOW_SM, letterSpacing: '0.05em' }}>
                  Chat joueurs
                </span>
                {isInkBeta && <small>En direct avec les joueurs</small>}
              </div>
              <span className={isInkBeta ? 'ik-chat-count' : 'text-xs font-black px-1.5 py-0.5 rounded-md text-white'}
                style={isInkBeta ? undefined : { background: 'var(--ink-accent-soft)', border: '1px solid var(--ink-line)', fontFamily: FONT }}>
                {messages.length}
              </span>
            </div>
            <motion.button
              ref={closeButtonRef}
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCloseChat}
              className={isInkBeta ? 'ik-chat-close menu-focus' : 'w-7 h-7 rounded-lg flex items-center justify-center'}
              style={isInkBeta ? undefined : { background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
              aria-label="Replier le chat"
              aria-expanded="true"
              aria-controls="lobby-live-chat"
            >
              <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </motion.button>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={isInkBeta ? 'ik-chat-messages custom-scrollbar' : 'flex-1 overflow-y-auto py-1.5 px-1 min-h-0'}
            style={isInkBeta ? undefined : { scrollbarWidth: 'thin', scrollbarColor: 'var(--ink-accent-soft) transparent' }}
            role="log"
            aria-label="Messages du chat"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div className={isInkBeta ? 'ik-chat-loading' : 'flex items-center justify-center py-8'}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className={isInkBeta ? undefined : 'w-6 h-6 rounded-full'} style={{ border: '3px solid var(--ink-accent)', borderTopColor: 'transparent' }} />
                <span className="sr-only">Chargement des messages</span>
              </div>
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={isInkBeta ? 'ik-chat-empty' : 'flex flex-col items-center justify-center py-10 px-4 text-center'}
              >
                <motion.div animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden="true">
                  <MessageCircle />
                </motion.div>
                <p style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>La discussion est ouverte</p>
                <small style={{ fontFamily: FONT }}>Lance le premier message à la troupe.</small>
              </motion.div>
            ) : (
              <div className={isInkBeta ? 'ik-chat-message-list' : 'flex flex-col gap-0.5'}>
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <ChatLine
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.playerId === playerId}
                      isInkBeta={isInkBeta}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* New messages button */}
          {!autoScroll && (
            <motion.button initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
              className={isInkBeta ? 'ik-chat-jump' : 'mx-2 mb-1 py-1.5 rounded-lg text-xs font-black text-white'}
              style={isInkBeta ? undefined : { background: 'var(--ink-accent)', border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <span aria-hidden="true">↓</span> Nouveaux messages
            </motion.button>
          )}

          {/* GIF Panel — inside chat */}
          <AnimatePresence>
            {panel === 'gif' && (
              <motion.div ref={gifPickerRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                className={isInkBeta ? 'ik-chat-picker ik-chat-picker--gif' : 'absolute inset-x-0 bottom-[56px] top-[44px] z-20 flex flex-col rounded-xl overflow-hidden'}
                style={isInkBeta ? undefined : { background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                {/* GIF Header */}
                <div className={isInkBeta ? 'ik-chat-picker-head' : 'flex items-center gap-2 px-3 py-2 flex-shrink-0'} style={isInkBeta ? undefined : { borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>GIFs</span>
                  <span className="text-xs text-white/40 font-mono">({CHAT_GIFS.length})</span>
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} placeholder="Rechercher…"
                      className="w-full pl-7 pr-2 py-1.5 rounded-lg text-sm font-bold text-white placeholder:text-white/30 outline-none"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)', fontFamily: FONT }} />
                  </div>
                  <motion.button type="button" aria-label="Fermer le sélecteur" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={handleClosePanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.button>
                </div>
                {/* Categories */}
                {!gifSearch.trim() && (
                  <div className={isInkBeta ? 'ik-chat-gif-categories custom-scrollbar' : 'flex gap-1.5 px-2 py-1.5 overflow-x-auto flex-shrink-0'} style={isInkBeta ? undefined : { borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                <div className={isInkBeta ? 'ik-chat-gif-results custom-scrollbar' : 'flex-1 overflow-y-auto p-2'}>
                  <div className={isInkBeta ? 'ik-chat-gif-grid' : 'grid grid-cols-3 gap-2'}>
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
                      <div className="col-span-full py-8 text-center">
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
              <motion.div ref={soundboardPickerRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                className={isInkBeta ? 'ik-chat-picker ik-chat-picker--soundboard' : 'absolute inset-x-0 bottom-[56px] z-20 rounded-xl overflow-hidden'}
                style={isInkBeta ? undefined : { background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <div className={isInkBeta ? 'ik-chat-picker-head' : 'flex items-center justify-between px-3 py-2'} style={isInkBeta ? undefined : { borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--ink-text-dim)]" />
                    <span className="text-base font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Soundboard</span>
                    <span className="text-xs text-white/40" style={{ fontFamily: FONT }}>— tout le monde entend !</span>
                  </div>
                  <motion.button type="button" aria-label="Fermer le sélecteur" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={handleClosePanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.button>
                </div>
                <div className={isInkBeta ? 'ik-chat-sound-grid custom-scrollbar' : 'grid grid-cols-4 gap-2 p-3'}>
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
          <div className={isInkBeta ? 'ik-chat-composer' : 'p-2 flex-shrink-0'} style={isInkBeta ? undefined : { borderTop: '2.5px solid rgba(255,255,255,0.1)' }}>
            <div className={isInkBeta ? 'ik-chat-composer-row' : 'flex gap-1.5 items-center'}>
              {/* GIF button */}
              <motion.button type="button" onClick={(event) => handleTogglePanel('gif', event.currentTarget)}
                whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.9 }}
                className={isInkBeta ? 'ik-chat-tool ik-chat-tool--gif' : 'flex-shrink-0 px-2 py-2 rounded-xl flex items-center gap-1'}
                style={{ background: panel === 'gif' ? 'linear-gradient(180deg, #fbbf24, #d97706)' : 'rgba(251,191,36,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                aria-pressed={panel === 'gif'}
                title="GIFs">
                <ImageIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span className="text-xs font-black text-white leading-none" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>GIF</span>
              </motion.button>

              {/* Soundboard button */}
              <motion.button type="button" onClick={(event) => handleTogglePanel('soundboard', event.currentTarget)}
                whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
                className={isInkBeta ? 'ik-chat-tool ik-chat-tool--sound' : 'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center'}
                style={{ background: panel === 'soundboard' ? 'linear-gradient(180deg, var(--ink-text-dim), var(--ink-text-dim))' : 'rgba(6,182,212,0.2)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                aria-pressed={panel === 'soundboard'}
                title="Soundboard — tout le monde entend !">
                <Volume2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>

              {/* Text input */}
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ton message…" aria-label="Message à envoyer" maxLength={300}
                className={isInkBeta ? 'ik-chat-input' : 'flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-bold text-white placeholder:text-white/30 outline-none'}
                style={isInkBeta ? undefined : { background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ink-line)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)', fontFamily: FONT }} />

              {/* Send button */}
              <motion.button type="button" onClick={handleSend} disabled={!input.trim() || isSending}
                whileHover={input.trim() && !isSending ? { scale: 1.1, rotate: -5 } : undefined}
                whileTap={input.trim() && !isSending ? { scale: 0.9 } : undefined}
                className={cn(
                  isInkBeta ? 'ik-chat-send' : 'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
                  (!input.trim() || isSending) && (isInkBeta ? 'is-disabled' : 'opacity-40 cursor-not-allowed'),
                )}
                style={isInkBeta ? undefined : { background: 'var(--ink-accent)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                aria-label={isSending ? 'Envoi en cours' : 'Envoyer le message'}>
                <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  return mountInBody ? createPortal(tree, document.body) : tree;
});
