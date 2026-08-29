import {
  memo,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  Gamepad2,
  Hash,
  Inbox,
  Loader2,
  LogIn,
  Mail,
  MessageCircle,
  Play,
  Send,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { DirectMessageDialog } from '@/components/DirectMessageDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { cn } from '@/lib/utils';

interface InkFriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void | Promise<void>;
  onAcceptGameInvitation?: (invitationId: string) => void | Promise<void>;
  onDeclineGameInvitation?: (invitationId: string) => void | Promise<void>;
  currentLobbyCode?: string;
  mode?: 'drawer' | 'hub';
}

type FriendsView = 'friends' | 'requests' | 'activity';

type FriendSummary = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

interface FriendsTab {
  id: FriendsView;
  label: string;
  description: string;
  icon: LucideIcon;
}

const FRIENDS_TABS: FriendsTab[] = [
  { id: 'friends', label: 'Amis', description: 'Ta troupe', icon: Users },
  { id: 'requests', label: 'Demandes', description: 'Nouveaux contacts', icon: UserPlus },
  { id: 'activity', label: 'Activité', description: 'Invitations et messages', icon: Inbox },
];

const copyText = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Le repli par sélection fonctionne notamment hors contexte HTTPS.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
};

const EmptyState = ({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) => (
  <div className="ink-friends-empty">
    <span aria-hidden="true">{icon}</span>
    <strong>{title}</strong>
    <p>{copy}</p>
  </div>
);

const InkFriendsSidebarComponent = ({
  onJoinFriend,
  onAcceptGameInvitation,
  onDeclineGameInvitation,
  currentLobbyCode,
  mode = 'drawer',
}: InkFriendsSidebarProps) => {
  const {
    user,
    profile,
    friendCode,
    isLoading: authLoading,
    signInWithGoogle,
  } = useAuth();
  const {
    friends,
    pendingRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useFriends();
  const { getUserStatus } = useOnlinePresence(currentLobbyCode);
  const {
    pendingInvitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
  } = useGameInvitations();
  const unreadCounts = useUnreadCounts();

  const [view, setView] = useState<FriendsView>('friends');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatFriend, setChatFriend] = useState<FriendSummary | null>(null);

  const unreadMessageCount = useMemo(
    () => Object.values(unreadCounts).reduce((total, count) => total + count, 0),
    [unreadCounts],
  );
  const conversationFriends = useMemo(
    () => friends.filter((friend) => (unreadCounts[friend.user_id] || 0) > 0),
    [friends, unreadCounts],
  );
  const onlineCount = friends.reduce(
    (count, friend) => count + (getUserStatus(friend.user_id).online ? 1 : 0),
    0,
  );
  const viewCounts: Record<FriendsView, number> = {
    friends: friends.length,
    requests: pendingRequests.length,
    activity: pendingInvitations.length + unreadMessageCount,
  };

  const handleSendRequest = async () => {
    const code = friendCodeInput.trim();
    if (!code || busyAction) return;

    setBusyAction('send-request');
    playInkSound('brushTap', 0.4);
    try {
      await sendFriendRequest(code);
      setFriendCodeInput('');
      toast.success('Demande envoyée !');
      playInkSound('inkSuccess', 0.5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    setBusyAction(`request:${id}`);
    playInkSound('inkSuccess', 0.4);
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajouté !');
    } catch {
      toast.error("Impossible d'accepter cette demande");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    setBusyAction(`request:${id}`);
    playInkSound('inkClick', 0.3);
    try {
      await rejectFriendRequest(id);
    } catch {
      toast.error('Impossible de refuser cette demande');
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinFriend = async (lobbyCode: string) => {
    if (!onJoinFriend || busyAction) return;
    setBusyAction(`join:${lobbyCode}`);
    playInkSound('inkSuccess', 0.5);
    try {
      await onJoinFriend(lobbyCode);
    } catch {
      toast.error('Impossible de rejoindre cette partie');
    } finally {
      setBusyAction(null);
    }
  };

  const handleInviteFriend = async (friendUserId: string) => {
    if (!currentLobbyCode || busyAction) return;

    let senderName = profile?.display_name || '';
    try {
      senderName ||= localStorage.getItem('playerName') || '';
    } catch {
      // Le profil reste le repli lorsque le stockage local est indisponible.
    }
    if (!senderName) senderName = 'Joueur';

    setBusyAction(`invite:${friendUserId}`);
    playInkSound('brushTap', 0.4);
    try {
      await sendInvitation(friendUserId, currentLobbyCode, senderName);
    } finally {
      setBusyAction(null);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (busyAction) return;
    setBusyAction(`invitation:${invitationId}`);
    playInkSound('inkSuccess', 0.5);
    try {
      if (onAcceptGameInvitation) {
        await onAcceptGameInvitation(invitationId);
        return;
      }
      const lobbyCode = await acceptInvitation(invitationId);
      if (lobbyCode && onJoinFriend) await onJoinFriend(lobbyCode);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    if (busyAction) return;
    setBusyAction(`invitation:${invitationId}`);
    playInkSound('inkClick', 0.3);
    try {
      if (onDeclineGameInvitation) await onDeclineGameInvitation(invitationId);
      else await declineInvitation(invitationId);
    } finally {
      setBusyAction(null);
    }
  };

  const copyFriendCode = async () => {
    if (!friendCode) return;
    const didCopy = await copyText(friendCode);
    if (!didCopy) {
      toast.error('Impossible de copier automatiquement le code');
      return;
    }
    setCopied(true);
    playInkSound('inkSuccess', 0.4);
    toast.success('Code copié !');
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!user && !authLoading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('ink-friends-sidebar ink-friends-guest', mode === 'hub' && 'is-hub')}
      >
        <span className="ink-friends-guest-icon" aria-hidden="true"><Users /></span>
        <div>
          <h4>Retrouve ta troupe</h4>
          <p>Connecte-toi pour ajouter des amis, discuter et rejoindre leurs parties.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            playInkSound('inkClick', 0.4);
            void signInWithGoogle();
          }}
          className="ik-primary-action menu-focus"
        >
          <LogIn aria-hidden="true" /> Connexion Google
        </button>
      </motion.section>
    );
  }

  if (authLoading) {
    return (
      <div className={cn('ink-friends-sidebar ink-friends-loading', mode === 'hub' && 'is-hub')} aria-label="Chargement des amis">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span>Connexion à ta troupe…</span>
      </div>
    );
  }

  if (mode === 'hub') {
    return (
      <>
        <div className="ink-friends-sidebar ink-friends-dashboard">
          <section className="ink-friends-dashboard-connect" aria-label="Ajouter et partager un code ami">
            <button
              type="button"
              onClick={() => void copyFriendCode()}
              className="ink-friends-dashboard-code menu-focus"
              aria-label={friendCode ? `Copier le code ami ${friendCode}` : 'Code ami en chargement'}
            >
              <span><Hash aria-hidden="true" /> Ton code</span>
              <strong>{friendCode || '••••••'}</strong>
              <small>{copied ? <><Check aria-hidden="true" /> Copié</> : <><Copy aria-hidden="true" /> Copier</>}</small>
            </button>

            <form
              className="ink-friends-dashboard-add"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendRequest();
              }}
            >
              <label htmlFor="ink-friend-code-hub"><UserPlus aria-hidden="true" /> Ajouter un ami</label>
              <div>
                <Input
                  id="ink-friend-code-hub"
                  placeholder="Saisis son code"
                  value={friendCodeInput}
                  onChange={(event) => setFriendCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  autoComplete="off"
                  spellCheck={false}
                  className="ink-friends-input"
                />
                <button
                  type="submit"
                  disabled={!friendCodeInput.trim() || busyAction === 'send-request'}
                  aria-busy={busyAction === 'send-request'}
                  className="menu-focus"
                >
                  {busyAction === 'send-request' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                  <span>Envoyer</span>
                </button>
              </div>
            </form>

            <dl className="ink-friends-dashboard-stats">
              <div><dt>Amis</dt><dd>{friends.length}</dd></div>
              <div><dt>En ligne</dt><dd>{onlineCount}</dd></div>
              <div><dt>À traiter</dt><dd>{pendingRequests.length + pendingInvitations.length + unreadMessageCount}</dd></div>
            </dl>
          </section>

          <div className="ink-friends-dashboard-layout">
            <section className="ink-friends-dashboard-roster" aria-labelledby="ink-friends-roster-title">
              <header className="ink-friends-dashboard-heading">
                <div><span>Roster</span><h4 id="ink-friends-roster-title">Ta troupe</h4></div>
                <p><i aria-hidden="true" /> {onlineCount} en ligne sur {friends.length}</p>
              </header>

              {isLoading ? (
                <div className="ink-friends-loading"><Loader2 className="animate-spin" aria-hidden="true" /><span>Chargement des amis…</span></div>
              ) : friends.length === 0 ? (
                <EmptyState icon={<Users />} title="Ta troupe t’attend" copy="Partage ton code ou ajoute un ami pour commencer." />
              ) : (
                <div className="ink-friends-dashboard-list">
                  {friends.map((friend, index) => {
                    const status = getUserStatus(friend.user_id);
                    const lobbyCode = status.lobbyCode;
                    const isCurrentLobby = Boolean(lobbyCode && lobbyCode === currentLobbyCode);
                    const unread = unreadCounts[friend.user_id] || 0;
                    const friendName = friend.display_name || 'Joueur';
                    return (
                      <motion.article
                        key={friend.id}
                        className={cn('ink-friends-dashboard-person', status.online && 'is-online', lobbyCode && 'is-playing')}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index, 10) * 0.025 }}
                      >
                        <div className="ink-friends-avatar-wrap">
                          <Avatar className="ink-friends-avatar">
                            <AvatarImage src={friend.avatar_url || undefined} alt={`Avatar de ${friendName}`} />
                            <AvatarFallback>{friendName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <i aria-label={lobbyCode ? 'En partie' : status.online ? 'En ligne' : 'Hors ligne'} />
                        </div>
                        <div className="ink-friends-person-copy">
                          <strong>{friendName}</strong>
                          <small>{isCurrentLobby ? 'Dans ton salon' : lobbyCode ? `En partie · ${lobbyCode}` : status.online ? 'Disponible' : 'Hors ligne'}</small>
                        </div>
                        <div className="ink-friends-person-actions">
                          <button type="button" className="menu-focus" onClick={() => { playInkSound('brushTap', 0.3); setChatFriend(friend); }} aria-label={`Envoyer un message à ${friendName}`}>
                            <MessageCircle aria-hidden="true" />
                            {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
                          </button>
                          {lobbyCode && !isCurrentLobby && (
                            <button type="button" className="menu-focus is-primary" disabled={busyAction === `join:${lobbyCode}`} onClick={() => void handleJoinFriend(lobbyCode)} aria-label={`Rejoindre la partie de ${friendName}`}>
                              {busyAction === `join:${lobbyCode}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                            </button>
                          )}
                          {currentLobbyCode && !lobbyCode && (
                            <button type="button" className="menu-focus is-invite" disabled={busyAction === `invite:${friend.user_id}`} onClick={() => void handleInviteFriend(friend.user_id)} aria-label={`Inviter ${friendName} dans le salon`}>
                              {busyAction === `invite:${friend.user_id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                            </button>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="ink-friends-dashboard-attention" aria-labelledby="ink-friends-attention-title">
              <header className="ink-friends-dashboard-heading">
                <div><span>À traiter</span><h4 id="ink-friends-attention-title">Ton attention</h4></div>
                <b>{pendingRequests.length + pendingInvitations.length + unreadMessageCount}</b>
              </header>

              {pendingRequests.length === 0 && pendingInvitations.length === 0 && conversationFriends.length === 0 ? (
                <EmptyState icon={<Inbox />} title="Tout est calme" copy="Demandes, invitations et messages apparaîtront ici." />
              ) : (
                <div className="ink-friends-dashboard-attention-list">
                  {pendingRequests.length > 0 && (
                    <section aria-labelledby="ink-friends-requests-title">
                      <h5 id="ink-friends-requests-title"><UserPlus aria-hidden="true" /> Demandes <b>{pendingRequests.length}</b></h5>
                      {pendingRequests.map((request) => {
                        const requesterName = request.requesterProfile?.display_name || 'Joueur inconnu';
                        const isBusy = busyAction === `request:${request.id}`;
                        return (
                          <article key={request.id} className="ink-friends-dashboard-attention-row">
                            <Avatar className="ink-friends-avatar"><AvatarImage src={request.requesterProfile?.avatar_url || undefined} alt={`Avatar de ${requesterName}`} /><AvatarFallback>{requesterName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="ink-friends-person-copy"><strong>{requesterName}</strong><small>Demande d’ami</small></div>
                            <div className="ink-friends-person-actions">
                              <button type="button" className="menu-focus is-primary" disabled={isBusy} onClick={() => void handleAcceptRequest(request.id)} aria-label={`Accepter la demande de ${requesterName}`}>{isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}</button>
                              <button type="button" className="menu-focus is-danger" disabled={isBusy} onClick={() => void handleRejectRequest(request.id)} aria-label={`Refuser la demande de ${requesterName}`}><X aria-hidden="true" /></button>
                            </div>
                          </article>
                        );
                      })}
                    </section>
                  )}

                  {pendingInvitations.length > 0 && (
                    <section aria-labelledby="ink-friends-invitations-title">
                      <h5 id="ink-friends-invitations-title"><Gamepad2 aria-hidden="true" /> Invitations <b>{pendingInvitations.length}</b></h5>
                      {pendingInvitations.map((invitation) => {
                        const isBusy = busyAction === `invitation:${invitation.id}`;
                        return (
                          <article key={invitation.id} className="ink-friends-dashboard-attention-row">
                            <span className="ink-friends-activity-icon"><Mail aria-hidden="true" /></span>
                            <div className="ink-friends-person-copy"><strong>{invitation.sender_name}</strong><small>Salon {invitation.lobby_code}</small></div>
                            <div className="ink-friends-person-actions">
                              <button type="button" className="menu-focus is-primary" disabled={isBusy} onClick={() => void handleAcceptInvitation(invitation.id)} aria-label={`Accepter l'invitation de ${invitation.sender_name}`}>{isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}</button>
                              <button type="button" className="menu-focus is-danger" disabled={isBusy} onClick={() => void handleDeclineInvitation(invitation.id)} aria-label={`Refuser l'invitation de ${invitation.sender_name}`}><X aria-hidden="true" /></button>
                            </div>
                          </article>
                        );
                      })}
                    </section>
                  )}

                  {conversationFriends.length > 0 && (
                    <section aria-labelledby="ink-friends-messages-title">
                      <h5 id="ink-friends-messages-title"><MessageCircle aria-hidden="true" /> Messages <b>{unreadMessageCount}</b></h5>
                      {conversationFriends.map((friend) => {
                        const unread = unreadCounts[friend.user_id] || 0;
                        const friendName = friend.display_name || 'Joueur';
                        return (
                          <button key={friend.id} type="button" className="ink-friends-dashboard-message menu-focus" onClick={() => setChatFriend(friend)}>
                            <Avatar className="ink-friends-avatar"><AvatarImage src={friend.avatar_url || undefined} alt="" /><AvatarFallback>{friendName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                            <span><strong>{friendName}</strong><small>Ouvrir la conversation</small></span>
                            <b>{unread > 99 ? '99+' : unread}</b>
                          </button>
                        );
                      })}
                    </section>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>

        <DirectMessageDialog
          open={Boolean(chatFriend)}
          onOpenChange={(open) => {
            if (!open) setChatFriend(null);
          }}
          friend={chatFriend}
        />
      </>
    );
  }

  return (
    <>
      <div className="ink-friends-sidebar ink-friends-workspace">
        <section className="ink-friends-connect" aria-label="Code ami et ajout">
          <button
            type="button"
            onClick={() => void copyFriendCode()}
            className="ink-friends-code-card menu-focus"
            aria-label={friendCode ? `Copier le code ami ${friendCode}` : 'Code ami en chargement'}
          >
            <span><Hash aria-hidden="true" /> Ton code ami</span>
            <strong>{friendCode || '••••••'}</strong>
            <small>{copied ? <><Check aria-hidden="true" /> Copié</> : <><Copy aria-hidden="true" /> Copier</>}</small>
          </button>

          <form
            className="ink-friends-add-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendRequest();
            }}
          >
            <label htmlFor="ink-friend-code"><UserPlus aria-hidden="true" /> Ajouter avec un code</label>
            <div>
              <Input
                id="ink-friend-code"
                placeholder="CODE AMI"
                value={friendCodeInput}
                onChange={(event) => setFriendCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                autoComplete="off"
                spellCheck={false}
                className="ink-friends-input"
              />
              <button
                type="submit"
                disabled={!friendCodeInput.trim() || busyAction === 'send-request'}
                aria-label="Envoyer la demande d’ami"
                aria-busy={busyAction === 'send-request'}
                className="menu-focus"
              >
                {busyAction === 'send-request' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                <span>Envoyer</span>
              </button>
            </div>
          </form>

          <div className="ink-friends-summary" aria-label="Résumé des amis">
            <span><strong>{friends.length}</strong><small>ami{friends.length > 1 ? 's' : ''}</small></span>
            <span><strong>{onlineCount}</strong><small>en ligne</small></span>
          </div>
        </section>

        <div className="ink-friends-tabs" role="tablist" aria-label="Sections des amis">
          {FRIENDS_TABS.map(({ id, label, description, icon: Icon }) => {
            const count = viewCounts[id];
            return (
              <button
                key={id}
                id={`ink-friends-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={view === id}
                aria-controls={`ink-friends-panel-${id}`}
                className={cn('menu-focus', view === id && 'is-active')}
                onClick={() => {
                  playInkSound('cartoonPop', 0.25);
                  setView(id);
                }}
              >
                <Icon aria-hidden="true" />
                <span><strong>{label}</strong><small>{description}</small></span>
                {count > 0 && <b aria-label={`${count} élément${count > 1 ? 's' : ''}`}>{count > 99 ? '99+' : count}</b>}
              </button>
            );
          })}
        </div>

        <div className="ink-friends-panel-wrap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={view}
              id={`ink-friends-panel-${view}`}
              role="tabpanel"
              aria-labelledby={`ink-friends-tab-${view}`}
              className="ink-friends-panel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {view === 'friends' && (
                <>
                  <header className="ink-friends-panel-heading">
                    <div><span>Ta troupe</span><h4>Amis et présence</h4></div>
                    <p>{onlineCount > 0 ? `${onlineCount} disponible${onlineCount > 1 ? 's' : ''} maintenant` : 'Personne en ligne pour le moment'}</p>
                  </header>

                  {isLoading ? (
                    <div className="ink-friends-loading"><Loader2 className="animate-spin" aria-hidden="true" /><span>Chargement des amis…</span></div>
                  ) : friends.length === 0 ? (
                    <EmptyState icon={<Users />} title="Ta troupe t’attend" copy="Partage ton code ou ajoute un ami avec le sien pour commencer." />
                  ) : (
                    <div className="ink-friends-list">
                      {friends.map((friend, index) => {
                        const status = getUserStatus(friend.user_id);
                        const lobbyCode = status.lobbyCode;
                        const isCurrentLobby = Boolean(lobbyCode && lobbyCode === currentLobbyCode);
                        const unread = unreadCounts[friend.user_id] || 0;
                        const friendName = friend.display_name || 'Joueur';
                        return (
                          <motion.article
                            key={friend.id}
                            className={cn('ink-friends-person', status.online && 'is-online', lobbyCode && 'is-playing')}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index, 10) * 0.025 }}
                          >
                            <div className="ink-friends-avatar-wrap">
                              <Avatar className="ink-friends-avatar">
                                <AvatarImage src={friend.avatar_url || undefined} alt={`Avatar de ${friendName}`} />
                                <AvatarFallback>{friendName.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <i aria-label={lobbyCode ? 'En partie' : status.online ? 'En ligne' : 'Hors ligne'} />
                            </div>
                            <div className="ink-friends-person-copy">
                              <strong>{friendName}</strong>
                              <small>{isCurrentLobby ? 'Dans ton salon' : lobbyCode ? 'En partie' : status.online ? 'En ligne' : 'Hors ligne'}</small>
                            </div>
                            <div className="ink-friends-person-actions">
                              <button
                                type="button"
                                className="menu-focus"
                                onClick={() => {
                                  playInkSound('brushTap', 0.3);
                                  setChatFriend(friend);
                                }}
                                aria-label={`Envoyer un message à ${friendName}`}
                              >
                                <MessageCircle aria-hidden="true" />
                                {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
                              </button>
                              {lobbyCode && !isCurrentLobby && (
                                <button
                                  type="button"
                                  className="menu-focus is-primary"
                                  disabled={busyAction === `join:${lobbyCode}`}
                                  onClick={() => void handleJoinFriend(lobbyCode)}
                                  aria-label={`Rejoindre la partie de ${friendName}`}
                                >
                                  {busyAction === `join:${lobbyCode}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                                </button>
                              )}
                              {currentLobbyCode && !lobbyCode && (
                                <button
                                  type="button"
                                  className="menu-focus is-invite"
                                  disabled={busyAction === `invite:${friend.user_id}`}
                                  onClick={() => void handleInviteFriend(friend.user_id)}
                                  aria-label={`Inviter ${friendName} dans le salon`}
                                >
                                  {busyAction === `invite:${friend.user_id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                                </button>
                              )}
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {view === 'requests' && (
                <>
                  <header className="ink-friends-panel-heading">
                    <div><span>Réseau</span><h4>Demandes reçues</h4></div>
                    <p>Accepte uniquement les personnes que tu reconnais.</p>
                  </header>

                  {pendingRequests.length === 0 ? (
                    <EmptyState icon={<UserPlus />} title="Aucune demande en attente" copy="Les prochaines demandes apparaîtront ici, sans interrompre ta partie." />
                  ) : (
                    <div className="ink-friends-list">
                      {pendingRequests.map((request) => {
                        const requesterName = request.requesterProfile?.display_name || 'Joueur inconnu';
                        const isBusy = busyAction === `request:${request.id}`;
                        return (
                          <article key={request.id} className="ink-friends-person is-request">
                            <Avatar className="ink-friends-avatar">
                              <AvatarImage src={request.requesterProfile?.avatar_url || undefined} alt={`Avatar de ${requesterName}`} />
                              <AvatarFallback>{requesterName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="ink-friends-person-copy"><strong>{requesterName}</strong><small>Veut rejoindre ta troupe</small></div>
                            <div className="ink-friends-person-actions">
                              <button type="button" className="menu-focus is-primary" disabled={isBusy} onClick={() => void handleAcceptRequest(request.id)} aria-label={`Accepter la demande de ${requesterName}`}>
                                {isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                              </button>
                              <button type="button" className="menu-focus is-danger" disabled={isBusy} onClick={() => void handleRejectRequest(request.id)} aria-label={`Refuser la demande de ${requesterName}`}><X aria-hidden="true" /></button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {view === 'activity' && (
                <>
                  <header className="ink-friends-panel-heading">
                    <div><span>Activité</span><h4>Invitations et messages</h4></div>
                    <p>Les actions qui demandent ton attention sont regroupées ici.</p>
                  </header>

                  {pendingInvitations.length === 0 && conversationFriends.length === 0 ? (
                    <EmptyState icon={<Inbox />} title="Tout est calme" copy="Les invitations de partie et nouveaux messages apparaîtront ici." />
                  ) : (
                    <div className="ink-friends-activity-groups">
                      {pendingInvitations.length > 0 && (
                        <section>
                          <h5><Gamepad2 aria-hidden="true" /> Invitations de partie <b>{pendingInvitations.length}</b></h5>
                          <div className="ink-friends-list">
                            {pendingInvitations.map((invitation) => {
                              const isBusy = busyAction === `invitation:${invitation.id}`;
                              return (
                                <article key={invitation.id} className="ink-friends-person is-invitation">
                                  <span className="ink-friends-activity-icon"><Mail aria-hidden="true" /></span>
                                  <div className="ink-friends-person-copy"><strong>{invitation.sender_name}</strong><small>Salon {invitation.lobby_code}</small></div>
                                  <div className="ink-friends-person-actions">
                                    <button type="button" className="menu-focus is-primary" disabled={isBusy} onClick={() => void handleAcceptInvitation(invitation.id)} aria-label={`Accepter l'invitation de ${invitation.sender_name}`}>
                                      {isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
                                    </button>
                                    <button type="button" className="menu-focus is-danger" disabled={isBusy} onClick={() => void handleDeclineInvitation(invitation.id)} aria-label={`Refuser l'invitation de ${invitation.sender_name}`}><X aria-hidden="true" /></button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {conversationFriends.length > 0 && (
                        <section>
                          <h5><MessageCircle aria-hidden="true" /> Messages non lus <b>{unreadMessageCount}</b></h5>
                          <div className="ink-friends-list">
                            {conversationFriends.map((friend) => {
                              const unread = unreadCounts[friend.user_id] || 0;
                              const friendName = friend.display_name || 'Joueur';
                              return (
                                <button key={friend.id} type="button" className="ink-friends-message-row menu-focus" onClick={() => setChatFriend(friend)}>
                                  <Avatar className="ink-friends-avatar"><AvatarImage src={friend.avatar_url || undefined} alt="" /><AvatarFallback>{friendName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                                  <span><strong>{friendName}</strong><small>Ouvrir la conversation</small></span>
                                  <b>{unread > 99 ? '99+' : unread}</b>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>

      <DirectMessageDialog
        open={Boolean(chatFriend)}
        onOpenChange={(open) => {
          if (!open) setChatFriend(null);
        }}
        friend={chatFriend}
      />
    </>
  );
};

export const InkFriendsSidebar = memo(InkFriendsSidebarComponent);
