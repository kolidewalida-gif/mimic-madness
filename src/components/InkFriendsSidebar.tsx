import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import {
  Users,
  Copy,
  Send,
  Check,
  X,
  Loader2,
  LogIn,
  UserPlus,
  Play,
  Mail,
  Bell,
  MessageCircle,
  Sparkles,
  Hash,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { DirectMessageDialog } from '@/components/DirectMessageDialog';

interface InkFriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
  currentLobbyCode?: string;
}

const GRAFFITI_TEXT_SHADOW =
  'none';
const GRAFFITI_TEXT_SHADOW_SM =
  'none';

const SectionLabel = ({
  icon: Icon,
  children,
  color = '#a855f7',
}: {
  icon?: any;
  children: React.ReactNode;
  color?: string;
}) => (
  <div className="flex items-center gap-1.5 px-1">
    {Icon && <Icon className="h-3.5 w-3.5" style={{ color }} />}
    <span
      className="text-base font-black uppercase tracking-wider"
      style={{
        fontFamily: "'Outfit', sans-serif",
        color,
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {children}
    </span>
  </div>
);

const InkFriendsSidebarComponent = ({
  onJoinFriend,
  currentLobbyCode,
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

  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatFriend, setChatFriend] = useState<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const unreadCounts = useUnreadCounts();

  const handleSendRequest = async () => {
    if (!friendCodeInput.trim()) return;
    setIsSending(true);
    playInkSound('brushTap', 0.4);
    try {
      await sendFriendRequest(friendCodeInput.trim());
      setFriendCodeInput('');
      toast.success('Demande envoyée !');
      playInkSound('inkSuccess', 0.5);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (id: string) => {
    playInkSound('inkSuccess', 0.4);
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajouté !');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id: string) => {
    playInkSound('inkClick', 0.3);
    try {
      await rejectFriendRequest(id);
    } catch {
      toast.error('Erreur');
    }
  };

  const handleJoinFriend = (lobbyCode: string) => {
    playInkSound('inkSuccess', 0.5);
    if (onJoinFriend) onJoinFriend(lobbyCode);
  };

  const handleInviteFriend = async (friendUserId: string) => {
    if (!currentLobbyCode || !profile?.display_name) {
      toast.error('Vous devez être dans un lobby pour inviter');
      return;
    }
    playInkSound('brushTap', 0.4);
    await sendInvitation(friendUserId, currentLobbyCode, profile.display_name);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    playInkSound('inkSuccess', 0.5);
    const lobbyCode = await acceptInvitation(invitationId);
    if (lobbyCode && onJoinFriend) onJoinFriend(lobbyCode);
  };

  const copyFriendCode = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    playInkSound('inkSuccess', 0.4);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  /* =========================================================
     NOT CONNECTED
  ========================================================= */
  if (!user && !authLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '1px solid var(--ink-line)',
          boxShadow:
            'none',
        }}
      >
        <div
          className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
          style={{ border: '2px solid rgba(6,182,212,0.4)' }}
        />
        <div className="relative p-6 text-center space-y-4">
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #0e7490)',
              border: '1px solid var(--ink-line)',
              boxShadow:
                'none',
            }}
          >
            <Users className="h-12 w-12 text-white" strokeWidth={2.5} />
          </motion.div>
          <p
            className="text-base text-white/80 font-bold leading-snug px-2"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Connecte-toi pour ajouter des amis et jouer ensemble !
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, rotate: -1.5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playInkSound('inkClick', 0.4);
              signInWithGoogle();
            }}
            className="menu-focus w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xl font-black text-white"
            style={{
              background: 'linear-gradient(180deg, #06b6d4, #0e7490)',
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <LogIn className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Connexion Google
          </motion.button>
        </div>
      </motion.div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */
  if (authLoading) {
    return (
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <div className="p-5 space-y-4 animate-pulse">
          <div className="h-12 w-32 bg-white/10 rounded-2xl" />
          <div className="h-12 bg-white/10 rounded-2xl" />
          <div className="h-12 bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totalNotifications = pendingRequests.length + pendingInvitations.length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
          border: '1px solid var(--ink-line)',
          boxShadow:
            'none',
        }}
      >
        {/* Inner accent border */}
        <div
          className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none z-[1]"
          style={{ border: '2px solid rgba(6,182,212,0.4)' }}
        />

        {/* Decorative graffiti stars */}
        <Sparkles
          className="absolute top-3 right-3 w-4 h-4 text-amber-400 z-[2] select-none pointer-events-none"
          style={{ filter: 'none' }}
        />
        <Sparkles
          className="absolute bottom-4 left-4 w-3.5 h-3.5 text-pink-400 z-[2] select-none pointer-events-none"
          style={{ filter: 'none' }}
        />

        {/* HEADER STRIP */}
        <div
          className="relative px-4 py-3 flex items-center justify-between z-[2]"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,182,212,0.18), rgba(6,182,212,0.05))',
            borderBottom: '1px solid var(--ink-line)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <Users className="h-4 w-4 text-white" strokeWidth={2.5} />
            </motion.div>
            <div>
              <h2
                className="text-2xl font-black text-white leading-none"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                Mes Amis
              </h2>
              <p
                className="text-xs text-white/55 font-bold mt-0.5"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {friends.length} ami{friends.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {totalNotifications > 0 && (
            <motion.div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center"
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <Bell className="h-5 w-5 text-white" strokeWidth={2.5} />
              <span
                className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
                  color: 'white',
                  border: '1px solid var(--ink-line)',
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                {totalNotifications}
              </span>
            </motion.div>
          )}
        </div>

        <div className="relative p-4 space-y-4 z-[2]">
          {/* FRIEND CODE */}
          <div className="space-y-2">
            <SectionLabel icon={Hash} color="#06b6d4">
              Votre Code Ami
            </SectionLabel>
            <motion.button
              type="button"
              onClick={copyFriendCode}
              whileHover={{ scale: 1.02, rotate: -0.4 }}
              whileTap={{ scale: 0.98 }}
              aria-label={
                friendCode
                  ? `Copier le code ami ${friendCode}`
                  : 'Copier le code ami'
              }
              className="menu-focus relative w-full rounded-2xl p-3 pr-14 text-left overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, rgba(6,182,212,0.18), rgba(6,182,212,0.05))',
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <div
                className="font-mono text-2xl font-black tracking-[0.25em] text-cyan-300"
                style={{ textShadow: GRAFFITI_TEXT_SHADOW_SM }}
              >
                {friendCode || '...'}
              </div>
              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: copied
                    ? 'linear-gradient(180deg, #34d399, #059669)'
                    : 'linear-gradient(180deg, #06b6d4, #0e7490)',
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden="true" />
                )}
              </div>
            </motion.button>
          </div>

          {/* ADD FRIEND */}
          <div className="space-y-2">
            <SectionLabel icon={UserPlus} color="#a855f7">
              Ajouter un ami
            </SectionLabel>
            <div className="flex gap-2">
              <Input
                placeholder="CODE AMI..."
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                className="flex-1 h-11 text-base font-black uppercase tracking-[0.2em] bg-black/40 text-white rounded-xl placeholder:text-white/30"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                }}
              />
              <motion.button
                whileHover={
                  friendCodeInput.trim() && !isSending
                    ? { scale: 1.06, rotate: -3 }
                    : undefined
                }
                whileTap={
                  friendCodeInput.trim() && !isSending
                    ? { scale: 0.94 }
                    : undefined
                }
                type="button"
                onClick={handleSendRequest}
                disabled={!friendCodeInput.trim() || isSending}
                aria-label="Envoyer la demande d'ami"
                aria-busy={isSending}
                className={cn(
                  'menu-icon-control menu-focus h-11 w-11 rounded-xl flex items-center justify-center text-white transition-opacity',
                  (!friendCodeInput.trim() || isSending) && 'opacity-50',
                )}
                style={{
                  background:
                    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                  border: '1px solid var(--ink-line)',
                  boxShadow:
                    'none',
                }}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                )}
              </motion.button>
            </div>
          </div>

          {/* GAME INVITATIONS */}
          <AnimatePresence>
            {pendingInvitations.length > 0 && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <SectionLabel icon={Mail} color="#fbbf24">
                  Invitations ({pendingInvitations.length})
                </SectionLabel>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation, idx) => (
                    <motion.div
                      key={invitation.id}
                      initial={{ opacity: 0, x: -20, rotate: -2 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        rotate: idx % 2 === 0 ? -0.6 : 0.6,
                      }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 p-3 rounded-2xl"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(251,191,36,0.18), rgba(217,119,6,0.05))',
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            'linear-gradient(180deg, #fbbf24, #d97706)',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <Mail className="h-4 w-4 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-base font-black text-white truncate leading-none"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {invitation.sender_name}
                        </div>
                        <div
                          className="text-[11px] text-amber-200/80 font-bold mt-0.5"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          t'invite à jouer !
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        aria-label={`Accepter l'invitation de ${invitation.sender_name}`}
                        className="menu-icon-control menu-focus h-9 w-9 rounded-xl flex items-center justify-center text-white"
                        style={{
                          background:
                            'linear-gradient(180deg, #34d399, #059669)',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => declineInvitation(invitation.id)}
                        aria-label={`Refuser l'invitation de ${invitation.sender_name}`}
                        className="menu-icon-control menu-focus h-9 w-9 rounded-xl flex items-center justify-center text-white"
                        style={{
                          background:
                            'linear-gradient(180deg, #ef4444, #b91c1c)',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PENDING FRIEND REQUESTS */}
          <AnimatePresence>
            {pendingRequests.length > 0 && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <SectionLabel icon={UserPlus} color="#fbbf24">
                  Demandes ({pendingRequests.length})
                </SectionLabel>
                <div className="space-y-2">
                  {pendingRequests.map((request, idx) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20, rotate: -2 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        rotate: idx % 2 === 0 ? -0.6 : 0.6,
                      }}
                      className="flex items-center gap-2 p-3 rounded-2xl"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(251,191,36,0.14), rgba(217,119,6,0.05))',
                        border: '1px solid var(--ink-line)',
                        boxShadow: 'none',
                      }}
                    >
                      <Avatar
                        className="h-10 w-10"
                        style={{
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <AvatarImage
                          src={request.requesterProfile?.avatar_url || undefined}
                        />
                        <AvatarFallback
                          className="text-white text-base font-black"
                          style={{
                            background:
                              'linear-gradient(135deg, #fbbf24, #d97706)',
                            fontFamily: "'Outfit', sans-serif",
                          }}
                        >
                          {request.requesterProfile?.display_name
                            ?.charAt(0)
                            ?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="flex-1 text-base font-black text-white truncate"
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {request.requesterProfile?.display_name || 'Inconnu'}
                      </span>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAccept(request.id)}
                        aria-label={`Accepter la demande d'ami de ${request.requesterProfile?.display_name || 'joueur inconnu'}`}
                        className="menu-icon-control menu-focus h-8 w-8 rounded-lg flex items-center justify-center text-white"
                        style={{
                          background:
                            'linear-gradient(180deg, #34d399, #059669)',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReject(request.id)}
                        aria-label={`Refuser la demande d'ami de ${request.requesterProfile?.display_name || 'joueur inconnu'}`}
                        className="menu-icon-control menu-focus h-8 w-8 rounded-lg flex items-center justify-center text-white"
                        style={{
                          background:
                            'linear-gradient(180deg, #ef4444, #b91c1c)',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FRIENDS LIST */}
          <div className="space-y-2 min-h-0">
            <SectionLabel icon={Users} color="#34d399">
              Amis
            </SectionLabel>
            <ScrollArea className="max-h-[280px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-cyan-300 animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="text-5xl mb-3 inline-block"
                  >
                    🤷
                  </motion.div>
                  <p
                    className="text-lg font-black text-white/70"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    Aucun ami pour le moment !
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {friends.map((friend, idx) => {
                    const status = getUserStatus(friend.user_id);
                    const isOnline = status.online;
                    const lobbyCode = status.lobbyCode;
                    const unread = unreadCounts[friend.user_id] || 0;

                    return (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, x: -20, rotate: -2 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          rotate: idx % 2 === 0 ? -0.6 : 0.6,
                        }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ x: 3, rotate: 0 }}
                        className="flex items-center gap-2.5 p-2.5 rounded-2xl"
                        style={{
                          background: isOnline
                            ? 'linear-gradient(180deg, rgba(52,211,153,0.14), rgba(5,150,105,0.04))'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                          border: '1px solid var(--ink-line)',
                          boxShadow: 'none',
                        }}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar
                            className="h-11 w-11"
                            style={{
                              border: '1px solid var(--ink-line)',
                              boxShadow: 'none',
                            }}
                          >
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback
                              className="text-white text-base font-black"
                              style={{
                                background: isOnline
                                  ? 'linear-gradient(135deg, #34d399, #059669)'
                                  : 'linear-gradient(135deg, #6b7280, #374151)',
                                fontFamily: "'Outfit', sans-serif",
                              }}
                            >
                              {friend.display_name?.charAt(0)?.toUpperCase() ||
                                '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--ink-line)]',
                              lobbyCode
                                ? 'bg-amber-400'
                                : isOnline
                                  ? 'bg-emerald-400'
                                  : 'bg-zinc-500',
                            )}
                            style={{
                              boxShadow:
                                isOnline && !lobbyCode
                                  ? '0 0 8px rgba(52,211,153,0.7)'
                                  : lobbyCode
                                    ? '0 0 8px rgba(251,191,36,0.7)'
                                    : 'none',
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div
                            className="text-base font-black text-white truncate leading-none"
                            style={{
                              fontFamily: "'Outfit', sans-serif",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            {friend.display_name}
                          </div>
                          <div
                            className={cn(
                              'text-[11px] font-bold mt-0.5 flex items-center gap-1',
                              lobbyCode
                                ? 'text-amber-300'
                                : isOnline
                                  ? 'text-emerald-300'
                                  : 'text-white/40',
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                lobbyCode
                                  ? 'bg-amber-400'
                                  : isOnline
                                    ? 'bg-emerald-400'
                                    : 'bg-zinc-500',
                              )}
                            />
                            {lobbyCode
                              ? 'EN PARTIE'
                              : isOnline
                                ? 'EN LIGNE'
                                : 'HORS LIGNE'}
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              playInkSound('brushTap', 0.3);
                              setChatFriend({
                                user_id: friend.user_id,
                                display_name: friend.display_name,
                                avatar_url: friend.avatar_url,
                              });
                            }}
                            aria-label={`Envoyer un message à ${friend.display_name || 'cet ami'}`}
                            className="menu-icon-control menu-focus relative w-8 h-8 rounded-xl flex items-center justify-center text-white"
                            style={{
                              background:
                                'linear-gradient(180deg, #6b7280, #374151)',
                              border: '1px solid var(--ink-line)',
                              boxShadow: 'none',
                            }}
                            title="Envoyer un message"
                          >
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                            {unread > 0 && (
                              <span
                                className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                                style={{
                                  background:
                                    'linear-gradient(180deg, #ef4444, #b91c1c)',
                                  color: 'white',
                                  border: '1px solid var(--ink-line)',
                                  fontFamily: "'Outfit', sans-serif",
                                }}
                              >
                                {unread}
                              </span>
                            )}
                          </motion.button>
                          {lobbyCode && (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1, rotate: -5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleJoinFriend(lobbyCode)}
                              aria-label={`Rejoindre la partie de ${friend.display_name || 'cet ami'}`}
                              className="menu-icon-control menu-focus w-8 h-8 rounded-xl flex items-center justify-center text-white"
                              style={{
                                background:
                                  'linear-gradient(180deg, #34d399, #059669)',
                                border: '1px solid var(--ink-line)',
                                boxShadow: 'none',
                              }}
                              title="Rejoindre"
                            >
                              <Play className="h-3.5 w-3.5" strokeWidth={2.5} fill="white" aria-hidden="true" />
                            </motion.button>
                          )}
                          {currentLobbyCode && !lobbyCode && (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1, rotate: -5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleInviteFriend(friend.user_id)}
                              aria-label={`Inviter ${friend.display_name || 'cet ami'} dans le lobby`}
                              className="menu-icon-control menu-focus w-8 h-8 rounded-xl flex items-center justify-center text-white"
                              style={{
                                background:
                                  'linear-gradient(180deg, #fbbf24, #d97706)',
                                border: '1px solid var(--ink-line)',
                                boxShadow: 'none',
                                opacity: isOnline ? 1 : 0.7,
                              }}
                              title={isOnline ? 'Inviter' : 'Inviter (statut hors-ligne, mais l\'invitation sera envoyée)'}
                            >
                              <Send className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </motion.div>

      <DirectMessageDialog
        open={!!chatFriend}
        onOpenChange={(o) => !o && setChatFriend(null)}
        friend={chatFriend}
      />
    </>
  );
};

export const InkFriendsSidebar = memo(InkFriendsSidebarComponent);
