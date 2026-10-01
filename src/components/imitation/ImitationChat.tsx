import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowLeft, ImageIcon, LoaderCircle, MessageCircle, Mic, Send, Volume2, VolumeX, X } from 'lucide-react';
import { useLobbyChat, type ChatMessage } from '@/hooks/useLobbyChat';
import { CHAT_GIFS, CATEGORY_LABELS, searchGifs, type GifCategory } from '@/lib/chatGifs';
import { SOUNDBOARD_ITEMS, playSoundboardSound } from '@/components/LobbyChat';
import { cn } from '@/lib/utils';
import styles from './ImitationChat.module.css';

interface Props {
  lobbyId: string;
  playerId: string;
  playerName: string;
  players: { id: string; name: string }[];
  phase: string;
  contextLabel?: string;
  children: (chat: { button: ReactNode; panel: ReactNode }) => ReactNode;
}

const timeLabel = (date: string) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function Message({ message, own, grouped, quiet }: { message: ChatMessage; own: boolean; grouped: boolean; quiet: boolean }) {
  const sound = SOUNDBOARD_ITEMS.find(item => item.id === message.content);
  return <li className={cn(styles.message, own && styles.own, grouped && styles.grouped)}>
    {!grouped && <div className={styles.author}><span className={styles.avatar} aria-hidden="true">{message.playerName.slice(0, 2).toUpperCase()}</span><strong>{own ? 'Toi' : message.playerName}</strong><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div>}
    <div className={styles.bubble}>
      {message.messageType === 'text' ? <p>{message.content}</p> :
        message.messageType === 'gif' || message.messageType === 'image' ? <img src={message.content} alt={message.messageType === 'gif' ? `GIF envoyé par ${message.playerName}` : `Image envoyée par ${message.playerName}`} loading="lazy" /> :
          message.messageType === 'soundboard' ? <button type="button" disabled={quiet} onClick={() => playSoundboardSound(message.content)} aria-label={`Écouter ${sound?.label ?? 'le son'}`}><span>{sound?.emoji ?? '🔊'}</span>{sound?.label ?? 'Son'}<Volume2 /></button> : <span>Message vocal</span>}
    </div>
  </li>;
}

/** One subscription lives across phases and collapse/expand. Never port the game itself. */
export function ImitationChat({ lobbyId, playerId, playerName, players, phase, contextLabel = 'Un mot à la bande entre deux prises', children }: Props) {
  const { messages, allMessages, isLoading, isSending, sendMessage } = useLobbyChat(lobbyId, playerId, playerName);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1599px)').matches);
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState<'gif' | 'sound' | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<GifCategory | 'all'>('all');
  const [unread, setUnread] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const pickerInput = useRef<HTMLInputElement>(null);
  const seen = useRef<{ lobby: string; ids: Set<string>; initialized: boolean }>({ lobby: lobbyId, ids: new Set(), initialized: false });
  const sending = useRef(false);
  const quiet = phase === 'imitation';
  const gifs = useMemo(() => search.trim() ? searchGifs(search) : category === 'all' ? CHAT_GIFS : CHAT_GIFS.filter(gif => gif.category === category), [search, category]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1599px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (seen.current.lobby !== lobbyId) {
      seen.current = { lobby: lobbyId, ids: new Set(), initialized: false };
      setUnread(0); setDraft(''); setPicker(null); setError('');
    }
    if (isLoading) return;
    const tracker = seen.current;
    if (!tracker.initialized) {
      tracker.ids = new Set(allMessages.map(message => message.id));
      tracker.initialized = true;
      return;
    }
    const newMessages = messages.filter(message => !tracker.ids.has(message.id) && message.playerId !== playerId);
    tracker.ids = new Set(allMessages.map(message => message.id));
    if (!open || !atBottom || picker) setUnread(count => count + newMessages.length);
    if (sounds && !quiet) newMessages.filter(message => message.messageType === 'soundboard').forEach(message => playSoundboardSound(message.content));
  }, [allMessages, messages, lobbyId, isLoading, open, atBottom, picker, playerId, quiet, sounds]);

  useLayoutEffect(() => {
    if (!open || picker || !atBottom) return;
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    setUnread(0);
  }, [open, messages, picker, atBottom]);

  useEffect(() => {
    if (open && !compact && !picker) input.current?.focus({ preventScroll: true });
    if (open && picker === 'gif') pickerInput.current?.focus();
  }, [open, compact, picker]);

  const changeOpen = (next: boolean) => {
    setOpen(next); setPicker(null);
    if (next) setAtBottom(true);
    else trigger.current?.focus({ preventScroll: true });
  };
  const closePicker = () => { setPicker(null); input.current?.focus({ preventScroll: true }); };
  const send = async (content: string, type: ChatMessage['messageType'] = 'text') => {
    if (!content.trim() || sending.current || isSending) return;
    sending.current = true; setError('');
    try {
      const sent = await sendMessage(content.trim(), type);
      if (!sent) { setError('Message non envoyé. Réessaie dans un instant.'); return; }
      if (type === 'text') setDraft(current => current.trim() === content.trim() ? '' : current);
      setPicker(null); setAtBottom(true); input.current?.focus({ preventScroll: true });
      if (type === 'soundboard' && !quiet) playSoundboardSound(content);
    } catch { setError('Message non envoyé. Ton brouillon est conservé.'); }
    finally { sending.current = false; }
  };

  const panelContent = <>
    <header className={styles.header}>
      <span className={styles.icon}><MessageCircle /></span><div><h2 id="imitation-chat-title">La discussion</h2><small>{players.length} joueur{players.length > 1 ? 's' : ''} dans la partie</small></div>
      <button type="button" onClick={() => changeOpen(false)} aria-label="Fermer le chat"><X /></button>
    </header>
    <div className={styles.context}><span className={styles.liveDot} />{quiet ? <><Mic />Sons coupés pendant l’imitation</> : contextLabel}</div>
    <div className={styles.body}>
      <div ref={scroll} hidden={!!picker} className={styles.messages} role="log" aria-label="Messages de la partie" aria-live="polite" aria-relevant="additions" aria-busy={isLoading} tabIndex={0} onScroll={event => {
        const el = event.currentTarget;
        const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        setAtBottom(bottom); if (bottom) setUnread(0);
      }}>
        {isLoading ? <div className={styles.empty}><LoaderCircle className={styles.loading} /><p>On retrouve la discussion…</p></div> : messages.length ?
          <ul>{messages.map((message, index) => <Message key={message.id} message={message} own={message.playerId === playerId} quiet={quiet} grouped={index > 0 && messages[index - 1].playerId === message.playerId && new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() < 120000} />)}</ul> :
          <div className={styles.empty}><span className={styles.emptyArt}><MessageCircle /><i>Salut !</i></span><h3>Ça se passe aussi ici.</h3><p>Encourage la bande, partage un GIF.<br />Le jeu garde toute la scène.</p></div>}
      </div>
      {!atBottom && !picker && <button type="button" className={styles.jump} onClick={() => { setAtBottom(true); setUnread(0); }}><ArrowDown />{unread ? `${unread} nouveau${unread > 1 ? 'x' : ''} message${unread > 1 ? 's' : ''}` : 'Derniers messages'}</button>}
      {picker && <section className={styles.picker} aria-label={picker === 'gif' ? 'Choisir un GIF' : 'Choisir un son'}>
        <header><button type="button" onClick={closePicker} aria-label="Retour aux messages"><ArrowLeft /></button><strong>{picker === 'gif' ? 'Un GIF pour la bande' : 'Boîte à sons'}</strong></header>
        {picker === 'gif' ? <>
          <input ref={pickerInput} type="search" aria-label="Rechercher un GIF" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rire, bravo, surprise…" />
          {!search.trim() && <div className={styles.categories}><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Tout</button>{Object.entries(CATEGORY_LABELS).map(([key, info]) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key as GifCategory)}>{info.emoji} {info.label}</button>)}</div>}
          <div className={styles.gifGrid}>{gifs.map((gif, index) => <button type="button" key={`${gif.url}-${index}`} disabled={isSending} aria-label={`Envoyer le GIF ${gif.tags[0] || index + 1}`} onClick={() => void send(gif.url, 'gif')}><img src={gif.url} alt="" loading="lazy" /></button>)}{!gifs.length && <p>Aucun GIF trouvé. Essaie un autre mot.</p>}</div>
        </> : <><p className={styles.soundHint}>Le son est envoyé à toute la bande. Chacun peut le couper.</p><div className={styles.soundGrid}>{SOUNDBOARD_ITEMS.map(sound => <button type="button" key={sound.id} disabled={quiet || isSending} onClick={() => void send(sound.id, 'soundboard')}><span>{sound.emoji}</span>{sound.label}</button>)}</div></>}
      </section>}
    </div>
    <footer className={styles.composer}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.composerTools}><button type="button" aria-expanded={picker === 'gif'} onClick={() => setPicker(current => current === 'gif' ? null : 'gif')}><ImageIcon />GIF</button><button type="button" disabled={quiet} aria-expanded={picker === 'sound'} onClick={() => setPicker(current => current === 'sound' ? null : 'sound')}><Volume2 />Sons</button><button type="button" className={styles.soundToggle} disabled={quiet} aria-pressed={sounds} aria-label={sounds ? 'Couper les sons reçus' : 'Activer les sons reçus'} onClick={() => setSounds(current => !current)}>{sounds && !quiet ? <Volume2 /> : <VolumeX />}</button></div>
      <form onSubmit={event => { event.preventDefault(); void send(draft); }}>
        <textarea ref={input} aria-label="Message à la bande" placeholder="Un mot à la bande…" rows={2} maxLength={300} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape') { if (picker) closePicker(); else changeOpen(false); }
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); }
        }} />
        <button type="submit" disabled={!draft.trim() || isSending} aria-label={isSending ? 'Envoi en cours' : 'Envoyer le message'}>{isSending ? <LoaderCircle className={styles.loading} /> : <Send />}</button>
      </form><small>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</small>
    </footer>
  </>;

  const button = <button ref={trigger} type="button" className={styles.trigger} aria-expanded={open} aria-controls="imitation-chat" onClick={() => changeOpen(!open)}><MessageCircle /><span>Chat</span>{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</button>;
  const panel = open && !compact ? <aside id="imitation-chat" className={styles.panel} aria-labelledby="imitation-chat-title" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { if (picker) closePicker(); else changeOpen(false); } }}>{panelContent}</aside> : null;
  return <>{children({ button, panel })}{compact && <Dialog.Root open={open} onOpenChange={changeOpen}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content id="imitation-chat" className={cn(styles.panel, styles.sheet)} onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} onEscapeKeyDown={event => { if (picker) { event.preventDefault(); closePicker(); } }} onKeyDown={event => event.stopPropagation()}><Dialog.Title className="sr-only">Chat de la partie</Dialog.Title><Dialog.Description className="sr-only">Discute avec la bande. Ferme le chat pour retrouver le jeu.</Dialog.Description>{panelContent}</Dialog.Content></Dialog.Portal></Dialog.Root>}</>;
}
