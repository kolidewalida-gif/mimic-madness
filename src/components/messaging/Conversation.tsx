import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Check, CheckCheck, LoaderCircle, MessageCircle, Send, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useGroupMessages } from '@/hooks/useMessageGroups';
import type { MessageGroup } from '@/lib/messagingClient';
import { cn } from '@/lib/utils';
import styles from './Messenger.module.css';

export interface Contact { user_id: string; display_name: string | null; avatar_url: string | null }
interface Row { id: string; sender_id: string; content: string; created_at: string; read_at?: string | null }
interface Controller {
  messages: Row[]; loading: boolean; error: string; hasMore: boolean; loadingOlder: boolean; loadOlder: () => Promise<void>;
  send: (content: string) => Promise<{ error: unknown; data: unknown }>;
  markRead: (until: string) => Promise<unknown>;
}
interface Props { name: string; avatar?: string | null; subtitle: string; group?: MessageGroup; draft: string; onDraft: (text: string) => void; onBack?: () => void; onInfo?: () => void }
export function Portrait({ name, src, group = false }: { name: string; src?: string | null; group?: boolean }) {
  return <span aria-hidden="true" className={cn(styles.portrait, group && styles.groupPortrait)}>{group ? <Users /> : src ? <img src={src} alt="" /> : name.slice(0, 2).toUpperCase()}</span>;
}
function Conversation({ controller, name, avatar, subtitle, group, draft, onDraft, onBack, onInfo }: Props & { controller: Controller }) {
  const { user } = useAuth();
  const { messages, loading, error, send, markRead, hasMore, loadingOlder, loadOlder } = controller;
  const [sending, setSending] = useState(false); const [sendError, setSendError] = useState('');
  const [atBottom, setAtBottom] = useState(true); const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const input = useRef<HTMLTextAreaElement>(null); const scroll = useRef<HTMLDivElement>(null); const lock = useRef(false);
  const snapshot = useRef({ first: '', last: '', height: 0 }); const read = useRef('');
  const latestDraft = useRef(draft); latestDraft.current = draft;
  const onDraftRef = useRef(onDraft); onDraftRef.current = onDraft;
  const last = messages.at(-1);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useLayoutEffect(() => {
    const node = scroll.current; if (!node) return;
    const previous = snapshot.current;
    if (previous.first && previous.first !== messages[0]?.id && previous.last === last?.id) node.scrollTop += node.scrollHeight - previous.height;
    else if (atBottom) node.scrollTop = node.scrollHeight;
    snapshot.current = { first: messages[0]?.id ?? '', last: last?.id ?? '', height: node.scrollHeight };
  }, [messages, last?.id, atBottom]);
  useEffect(() => {
    if (!last || !atBottom || !visible || loading || read.current === last.id) return;
    read.current = last.id;
    void markRead(last.created_at).catch(() => { read.current = ''; });
  }, [last, atBottom, visible, loading, markRead]);
  const submit = async () => {
    const text = draft.trim(); if (!text || lock.current) return;
    lock.current = true; setSending(true); setSendError('');
    try {
      const result = await send(text);
      if (result.error) { setSendError('Message non envoyé. Ton brouillon est conservé, réessaie.'); return; }
      if (latestDraft.current.trim() === text) onDraftRef.current('');
      setAtBottom(true); input.current?.focus({ preventScroll: true });
    } catch { setSendError('Connexion interrompue. Ton brouillon est conservé.'); }
    finally { lock.current = false; setSending(false); }
  };
  return <section className={styles.conversation} aria-label={`Conversation avec ${name}`}>
    <header className={styles.conversationHeader}>{onBack && <button type="button" className={styles.back} aria-label="Retour aux conversations" onClick={onBack}><ArrowLeft /></button>}<Portrait name={name} src={avatar} group={!!group} /><div><h3>{name}</h3><p>{subtitle}</p></div>{onInfo && <button type="button" className={styles.softButton} onClick={onInfo}><Users />Membres</button>}</header>
    <div className={styles.historyWrap}>
      <div ref={scroll} className={styles.history} role="log" aria-label="Messages de la conversation" aria-live="polite" aria-relevant="additions" aria-busy={loading} tabIndex={0} onScroll={event => { const el = event.currentTarget; setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48); }}>
        {hasMore && <button type="button" className={styles.older} disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? 'Chargement…' : 'Voir les messages précédents'}</button>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {loading && !messages.length ? <div className={styles.empty}><LoaderCircle className={styles.spin} /><p>On retrouve vos messages…</p></div> : !messages.length ? <div className={styles.empty}><span className={styles.heroIcon}><MessageCircle /></span><h3>Le premier mot est à toi.</h3><p>{group ? 'Toute la bande recevra tes messages ici.' : `Envoie un petit bonjour à ${name}.`}</p></div> :
          <ol>{messages.map((message, index) => {
            const mine = message.sender_id === user?.id;
            const author = group?.members.find(member => member.user_id === message.sender_id);
            const previous = messages[index - 1]; const day = new Date(message.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
            const firstOfDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
            const grouped = !firstOfDay && previous?.sender_id === message.sender_id && Date.parse(message.created_at) - Date.parse(previous.created_at) < 120000;
            return <li key={message.id} className={styles.row}>{firstOfDay && <div className={styles.day}>{day}</div>}<article className={cn(styles.message, mine && styles.mine, grouped && styles.grouped)}>
              {group && !mine && !grouped && <strong className={styles.sender}>{author?.display_name ?? 'Ancien membre'}</strong>}
              <p>{message.content}</p><div className={styles.messageMeta}><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>{mine && (message.read_at ? <span aria-label="Lu"><CheckCheck />Lu</span> : <span aria-label="Envoyé"><Check />Envoyé</span>)}</div>
            </article></li>;
          })}</ol>}
      </div>
      {!atBottom && <button type="button" className={styles.jump} onClick={() => setAtBottom(true)}><ArrowDown />Derniers messages</button>}
    </div>
    <footer className={styles.composer}>{sendError && <p className={styles.error} role="alert">{sendError}</p>}<form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <textarea ref={input} value={draft} onChange={event => onDraft(event.target.value)} maxLength={1000} rows={2} aria-label={`Message à ${name}`} placeholder="Écris ton message…" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} />
      <button type="submit" className={styles.send} disabled={!draft.trim() || sending} aria-label={sending ? 'Envoi en cours' : 'Envoyer le message'}>{sending ? <LoaderCircle className={styles.spin} /> : <Send />}</button>
    </form><small>Entrée pour envoyer · Maj + Entrée pour aller à la ligne{draft.length > 800 && ` · ${draft.length}/1000`}</small></footer>
  </section>;
}
export function DirectConversation({ friend, ...props }: Omit<Props, 'name' | 'avatar' | 'group'> & { friend: Contact }) {
  const controller = useDirectMessages(friend.user_id);
  return <Conversation {...props} name={friend.display_name || 'Ami'} avatar={friend.avatar_url} controller={controller} />;
}
export function GroupConversation({ group, ...props }: Omit<Props, 'name' | 'avatar'> & { group: MessageGroup }) {
  const controller = useGroupMessages(group.id);
  return <Conversation {...props} name={group.name} group={group} controller={controller} />;
}
