import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Gamepad2, LoaderCircle, LogIn, MessageCircle, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useDirectMessages, useUnreadCounts, type DirectMessage } from '@/hooks/useDirectMessages';
import { useMessageGroups } from '@/hooks/useMessageGroups';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { DirectConversation, GroupConversation, Portrait } from './Conversation';
import { cn } from '@/lib/utils';
import styles from './Messenger.module.css';

interface Props {
  currentLobbyCode?: string;
  onJoinFriend?: (code: string) => void | Promise<void>;
  onAcceptGameInvitation?: (id: string) => void | Promise<void>;
  onDeclineGameInvitation?: (id: string) => void | Promise<void>;
}
export function FriendsMessenger({ currentLobbyCode, onJoinFriend, onAcceptGameInvitation, onDeclineGameInvitation }: Props) {
  const { user, profile, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useFriends();
  const { getUserStatus } = useOnlinePresence(currentLobbyCode);
  const { pendingInvitations, sendInvitation, acceptInvitation, declineInvitation } = useGameInvitations();
  const counts = useUnreadCounts(); const inbox = useDirectMessages(); const groups = useMessageGroups();
  const [tab, setTab] = useState<'messages' | 'friends' | 'requests'>('messages');
  const [search, setSearch] = useState(''); const [selected, setSelected] = useState<{ kind: 'direct' | 'group'; id: string } | null>(null);
  const [panel, setPanel] = useState<'add' | 'group' | 'manage' | null>(null);
  const [code, setCode] = useState(''); const [groupName, setGroupName] = useState(''); const [members, setMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState(''); const [confirmLeave, setConfirmLeave] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({}); const lock = useRef(false);
  useEffect(() => { setDrafts({}); setSelected(null); setPanel(null); setActionError(''); }, [user?.id]);
  const friend = selected?.kind === 'direct' ? friends.find(item => item.user_id === selected.id) : null;
  const group = selected?.kind === 'group' ? groups.groups.find(item => item.id === selected.id) : null;
  const draftKey = selected ? `${selected.kind}:${selected.id}` : '';
  const latest = useMemo(() => {
    const map = new Map<string, DirectMessage>();
    inbox.messages.forEach(message => map.set(message.sender_id === user?.id ? message.receiver_id : message.sender_id, message));
    return map;
  }, [inbox.messages, user?.id]);
  const query = search.trim().toLocaleLowerCase();
  const entries = useMemo(() => [
    ...friends.map(item => ({ id: item.user_id, kind: 'direct' as const, name: item.display_name || 'Ami', avatar: item.avatar_url, preview: latest.get(item.user_id)?.content || 'Écrire un message', date: latest.get(item.user_id)?.created_at || '', count: counts[item.user_id] || 0 })),
    ...groups.groups.map(item => ({ id: item.id, kind: 'group' as const, name: item.name, avatar: null, preview: item.last_message?.content || `${item.members.length} membres · Nouveau groupe`, date: item.last_message?.created_at || item.created_at, count: item.unread_count })),
  ].filter(item => item.name.toLocaleLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)), [friends, groups.groups, latest, counts, query]);
  const attention = pendingRequests.length + pendingInvitations.length;
  const unread = Object.values(counts).reduce((sum, count) => sum + count, 0) + groups.groups.reduce((sum, item) => sum + item.unread_count, 0);
  const select = (kind: 'direct' | 'group', id: string) => { setSelected({ kind, id }); setPanel(null); setActionError(''); setConfirmLeave(false); };
  const showPanel = (next: 'add' | 'group' | 'manage') => { setPanel(next); setActionError(''); setMembers([]); setGroupName(next === 'manage' ? group?.name ?? '' : ''); setConfirmLeave(false); };
  const action = async (task: () => Promise<unknown>, done?: () => void) => {
    if (lock.current) return; lock.current = true; setBusy(true); setActionError('');
    try { await task(); done?.(); }
    catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      const known = ['Code ami invalide', 'Vous ne pouvez pas vous ajouter vous-même', 'Vous êtes déjà amis', 'Une demande est déjà en attente'];
      setActionError(known.includes(message) ? message : 'Impossible de terminer cette action. Réessaie dans un instant.');
    }
    finally { lock.current = false; setBusy(false); }
  };
  const setDraft = (text: string) => setDrafts(previous => ({ ...previous, [draftKey]: text }));
  if (authLoading) return <div className={styles.empty}><LoaderCircle className={styles.spin} /><p>On retrouve ta bande…</p></div>;
  if (!user) return <div className={cn(styles.root, styles.guest)}><span className={styles.heroIcon}><Users /></span><h3>Retrouve ta bande.</h3><p>Connecte-toi pour discuter avec tes amis et créer vos groupes.</p><button type="button" className={styles.primary} onClick={() => void signInWithGoogle()}><LogIn />Connexion Google</button></div>;
  return <div className={cn(styles.root, (selected || panel) && styles.hasSelection)}>
    <aside className={styles.sidebar} aria-label="Amis et conversations">
      <header className={styles.sidebarHeader}><div><h3>Ta messagerie</h3><small>Les amis, au même endroit.</small></div><button type="button" className={styles.iconButton} aria-label="Ajouter un ami" onClick={() => showPanel('add')}><UserPlus /></button><button type="button" className={styles.iconButton} aria-label="Créer un groupe" disabled={groups.available !== true || friends.length < 2} title={groups.available === false ? 'Les groupes nécessitent la mise à jour du serveur' : 'Choisis au moins deux amis'} onClick={() => showPanel('group')}><Plus /></button></header>
      <label className={styles.search}><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher…" aria-label="Rechercher un ami ou un groupe" /></label>
      <nav className={styles.tabs} aria-label="Sections de la messagerie">{([['messages', 'Messages', unread], ['friends', 'Amis', friends.length], ['requests', 'Demandes', attention]] as const).map(([key, label, count]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}{count > 0 && <b>{count > 99 ? '99+' : count}</b>}</button>)}</nav>
      <div className={styles.contactList}>
        {isLoading ? <p className={styles.listHint}>Chargement des amis…</p> : tab === 'messages' ? <>
          {entries.map(item => <button type="button" key={`${item.kind}:${item.id}`} className={cn(styles.contact, selected?.id === item.id && selected.kind === item.kind && styles.selected)} onClick={() => select(item.kind, item.id)} aria-label={`Ouvrir ${item.kind === 'group' ? 'le groupe' : 'la conversation avec'} ${item.name}`} aria-current={selected?.id === item.id && selected.kind === item.kind ? 'true' : undefined}><Portrait name={item.name} src={item.avatar} group={item.kind === 'group'} /><span className={styles.contactCopy}><strong>{item.name}</strong><small>{item.preview}</small></span><span className={styles.contactMeta}>{item.date && <time>{new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>}{item.count > 0 && <b aria-label={`${item.count} messages non lus`}>{item.count}</b>}</span></button>)}
          {!entries.length && <div className={styles.listHint}><MessageCircle /><p>{query ? 'Aucune conversation trouvée.' : 'Ajoute un ami pour lancer la discussion.'}</p></div>}
        </> : tab === 'friends' ? friends.filter(item => (item.display_name || '').toLocaleLowerCase().includes(query)).map(item => {
          const status = getUserStatus(item.user_id);
          return <div className={styles.friendRow} key={item.user_id}><button type="button" className={styles.contact} onClick={() => select('direct', item.user_id)}><Portrait name={item.display_name || 'Ami'} src={item.avatar_url} /><span className={styles.contactCopy}><strong>{item.display_name || 'Ami'}</strong><small className={status.online ? styles.online : undefined}>{status.lobbyCode ? 'En partie' : status.online ? 'En ligne' : 'Hors ligne'}</small></span><MessageCircle /></button>{status.lobbyCode && onJoinFriend ? <button type="button" className={styles.friendAction} disabled={busy} onClick={() => void action(async () => onJoinFriend(status.lobbyCode!))}><Gamepad2 />Rejoindre</button> : currentLobbyCode && <button type="button" className={styles.friendAction} disabled={busy} onClick={() => void action(() => sendInvitation(item.user_id, currentLobbyCode, profile?.display_name || 'Joueur'))}><Gamepad2 />Inviter à jouer</button>}</div>;
        }) : <div className={styles.requests}>
          {!attention && <div className={styles.listHint}><Check /><p>Tout est à jour.<br />Les nouvelles demandes arrivent ici.</p></div>}
          {pendingRequests.map(request => <article key={request.id}><Portrait name={request.requesterProfile?.display_name || 'Joueur'} src={request.requesterProfile?.avatar_url} /><strong>{request.requesterProfile?.display_name || 'Joueur'}</strong><small>Veut t’ajouter en ami</small><div><button type="button" className={styles.primary} disabled={busy} onClick={() => void action(() => acceptFriendRequest(request.id))}>Accepter</button><button type="button" className={styles.softButton} disabled={busy} onClick={() => void action(() => rejectFriendRequest(request.id))}>Refuser</button></div></article>)}
          {pendingInvitations.map(invitation => <article key={invitation.id}><Gamepad2 /><strong>{invitation.sender_name}</strong><small>T’invite au salon {invitation.lobby_code}</small><div><button type="button" className={styles.primary} disabled={busy} onClick={() => void action(async () => { if (onAcceptGameInvitation) return onAcceptGameInvitation(invitation.id); const room = await acceptInvitation(invitation.id); if (room && onJoinFriend) await onJoinFriend(room); })}>Rejoindre</button><button type="button" className={styles.softButton} disabled={busy} onClick={() => void action(() => onDeclineGameInvitation ? Promise.resolve(onDeclineGameInvitation(invitation.id)) : declineInvitation(invitation.id))}>Décliner</button></div></article>)}
        </div>}
      </div>
      <footer className={styles.sidebarFooter}><button type="button" onClick={() => showPanel('add')}><UserPlus />Ajouter un ami</button><button type="button" disabled={groups.available !== true || friends.length < 2} onClick={() => showPanel('group')}><Users />Nouveau groupe</button>{groups.available === false && <small>Groupes indisponibles pour le moment.</small>}</footer>
    </aside>
    <div className={styles.detail}>
      {panel ? <section className={styles.setup} aria-label={panel === 'add' ? 'Ajouter un ami' : panel === 'manage' ? 'Gérer le groupe' : 'Créer un groupe'}>
        <header><span className={styles.heroIcon}>{panel === 'add' ? <UserPlus /> : <Users />}</span><button type="button" className={styles.iconButton} aria-label="Fermer ce panneau" onClick={() => { setPanel(null); setActionError(''); }}><X /></button></header>
        <h3>{panel === 'add' ? 'La bande s’agrandit.' : panel === 'manage' ? group?.name : 'Votre coin à vous.'}</h3><p>{panel === 'add' ? 'Partage ton code ou entre celui de ton ami.' : panel === 'manage' ? `${group?.members.length} membres · Un espace réservé à votre groupe.` : 'Donne un nom au groupe et choisis au moins deux amis.'}</p>
        {panel === 'add' ? <><button type="button" className={styles.code} onClick={() => { if (friendCode) void action(() => navigator.clipboard.writeText(friendCode), () => toast.success('Code copié')); }}><span>Ton code ami<strong>{friendCode || '—'}</strong></span><Copy />Copier</button><form onSubmit={event => { event.preventDefault(); void action(() => sendFriendRequest(code.trim()), () => { setCode(''); toast.success('Demande envoyée'); }); }}><label>Le code de ton ami<input value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} maxLength={8} autoComplete="off" placeholder="XXXXXXXX" /></label><button type="submit" className={styles.primary} disabled={busy || code.length !== 8}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button></form></> : <>
          {panel === 'manage' && <ul className={styles.members}>{group?.members.map(member => <li key={member.user_id}><Portrait name={member.display_name || 'Joueur'} src={member.avatar_url} /><span>{member.display_name || 'Joueur'}{member.user_id === user.id && ' · toi'}</span>{member.user_id === group.owner_id && <small>Admin</small>}</li>)}</ul>}
          {(panel === 'group' || group?.owner_id === user.id) && <form onSubmit={event => { event.preventDefault(); void action(async () => { if (panel === 'manage' && group) await groups.update(group.id, groupName, members); else { const id = await groups.create(groupName, members); if (id) setSelected({ kind: 'group', id }); } }, () => setPanel(null)); }}>
            <label>Nom du groupe<input value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="La bande du vendredi" maxLength={60} /></label><fieldset><legend>{panel === 'manage' ? 'Inviter d’autres amis' : 'Qui vient avec toi ?'}</legend>{friends.filter(item => !group?.members.some(member => panel === 'manage' && member.user_id === item.user_id)).map(item => <label key={item.user_id} className={styles.memberChoice}><input type="checkbox" checked={members.includes(item.user_id)} disabled={!members.includes(item.user_id) && members.length >= (panel === 'manage' ? 32 - (group?.members.length ?? 0) : 31)} onChange={event => setMembers(current => event.target.checked ? [...current, item.user_id] : current.filter(id => id !== item.user_id))} /><Portrait name={item.display_name || 'Ami'} src={item.avatar_url} /><span>{item.display_name || 'Ami'}</span></label>)}</fieldset><small>{panel === 'group' ? `${members.length + 1} membres avec toi · 32 maximum` : `${members.length} ami(s) à inviter`}</small><button type="submit" className={styles.primary} disabled={busy || !groupName.trim() || (panel === 'group' && members.length < 2)}>{busy ? 'Un instant…' : panel === 'group' ? 'Créer le groupe' : 'Enregistrer'}</button>
          </form>}
          {panel === 'manage' && group && <div className={styles.leave}><p>{confirmLeave ? 'Quitter ce groupe ? Tu ne recevras plus ses messages. Son historique restera conservé.' : 'Tu peux quitter le groupe quand tu veux.'}</p><button type="button" className={styles.softButton} disabled={busy} onClick={() => { if (!confirmLeave) setConfirmLeave(true); else void action(() => groups.leave(group.id), () => { setPanel(null); setSelected(null); }); }}>{confirmLeave ? 'Confirmer mon départ' : 'Quitter le groupe'}</button>{confirmLeave && <button type="button" className={styles.softButton} onClick={() => setConfirmLeave(false)}>Rester</button>}</div>}
        </>}
      </section> : friend ? <DirectConversation key={draftKey} friend={friend} subtitle={getUserStatus(friend.user_id).online ? 'En ligne · Conversation privée' : 'Conversation privée · Tes messages restent disponibles hors ligne'} draft={drafts[draftKey] || ''} onDraft={setDraft} onBack={() => setSelected(null)} /> : group ? <GroupConversation key={draftKey} group={group} subtitle={`${group.members.length} membres · Groupe privé`} draft={drafts[draftKey] || ''} onDraft={setDraft} onBack={() => setSelected(null)} onInfo={() => showPanel('manage')} /> : <div className={styles.empty}><span className={styles.heroIcon}><MessageCircle /></span><h3>Un petit mot,<br />une grande bande.</h3><p>Choisis un ami à gauche ou crée un groupe.<br />Vos messages restent ici, même entre les parties.</p><button type="button" className={styles.primary} onClick={() => showPanel('add')}><UserPlus />Ajouter un ami</button></div>}
      {actionError && <p role="alert" className={styles.actionError}>{actionError}</p>}
    </div>
  </div>;
}
