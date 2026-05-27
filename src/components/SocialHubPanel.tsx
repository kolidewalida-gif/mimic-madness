import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  MessageCircle,
  Mail,
  UserPlus,
  Copy,
  Send,
  Check,
  Loader2,
  Play,
  Sparkles,
  Hash,
  Bell,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { InkSocialFeed } from '@/components/InkSocialFeed';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DirectMessageDialog } from '@/components/DirectMessageDialog';
import { toast } from 'sonner';

interface SocialHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentLobbyCode?: string;
  onJoinFriend?: (lobbyCode: string) => void;
}

type Tab = 'friends' | 'messages' | 'requests' | 'invitations' | 'social';

const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

const TAB_COLORS: Record<Tab, { bg: string; accent: string; glow: string }> = {
  friends: { bg: '#06b6d4', accent: '#22d3ee', glow: 'rgba(6,182,212,0.5)' },
  messages: { bg: '#a855f7', accent: '#c084fc', glow: 'rgba(168,85,247,0.5)' },
  requests: { bg: '#fbbf24', accent: '#fde047', glow: 'rgba(251,191,36,0.5)' },
  invitations: { bg: '#34d399', accent: '#6ee7b7', glow: 'rgba(52,211,153,0.5)' },
  social: { bg: '#ef4444', accent: '#fb7185', glow: 'rgba(239,68,68,0.5)' },
};

const SocialHubPanelComponent = ({
  isOpen,
  onClose,
  currentLobbyCode,
  onJoinFriend,
}: SocialHubPanelProps) => {
  const { profile, friendCode } = useAuth();
  const {
    friends,
    pendingRequests,
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

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatFriend, setChatFriend] = useState<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const totalUnreadMessages = Object.values(unreadCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  const tabs: {
    id: Tab;
    label: string;
    icon: any;
    badge?: number;
  }[] = [
    { id: 'friends', label: 'Amis', icon: Users, badge: friends.length },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageCircle,
      badge: totalUnreadMessages || undefined,
    },
    {
      id: 'requests',
      label: 'Demandes',
      icon: UserPlus,
      badge: pendingRequests.length || undefined,
    },
    {
      id: 'invitations',
      label: 'Invits',
      icon: Mail,
      badge: pendingInvitations.length || undefined,
    },
    { id: 'social', label: 'Social', icon: Share2 },
  ];

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
      toast.error(error.message || 'Erreur');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    playInkSound('inkSuccess', 0.4);
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajouté !');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleRejectRequest = async (id: string) => {
    playInkSound('inkClick', 0.3);
    try {
      await rejectFriendRequest(id);
    } catch {
      toast.error('Erreur');
    }
  };

  const handleJoinFriend = (lobbyCode: string) => {
    playInkSound('inkSuccess', 0.5);
    onClose();
    if (onJoinFriend) onJoinFriend(lobbyCode);
  };

  const handleInviteFriend = async (friendUserId: string) => {
    if (!currentLobbyCode || !profile?.display_name) {
      toast.error('Vous devez être dans un lobby');
      return;
    }
    playInkSound('brushTap', 0.4);
    await sendInvitation(friendUserId, currentLobbyCode, profile.display_name);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    playInkSound('inkSuccess', 0.5);
    const lobbyCode = await acceptInvitation(invitationId);
    if (lobbyCode && onJoinFriend) {
      onClose();
      onJoinFriend(lobbyCode);
    }
  };

  const copyFriendCode = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    playInkSound('inkSuccess', 0.4);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55]"
            />

            {/* PANEL */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[56] flex flex-col"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                borderLeft: '4px solid #0a0810',
                boxShadow: '-12px 0 30px rgba(0,0,0,0.5)',
              }}
            >
              {/* Inner accent line */}
              <div
                className="absolute inset-y-0 left-1.5 w-0.5 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(168,85,247,0.4), transparent)',
                }}
              />

              {/* Decorative graffiti stars */}
              <Sparkles
                className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10 select-none pointer-events-none"
                style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
              />
              <Sparkles
                className="absolute bottom-4 right-6 w-3.5 h-3.5 text-pink-400 z-10 select-none pointer-events-none"
                style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
              />

              {/* HEADER */}
              <div
                className="relative flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                  borderBottom: '3px solid #0a0810',
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                      border: '3px solid #0a0810',
                      boxShadow:
                        '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                    }}
                  >
                    <Bell
                      className="h-5 w-5 text-white"
                      strokeWidth={2.5}
                    />
                  </motion.div>
                  <div>
                    <h2
                      className="text-3xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Réseau Social
                    </h2>
                    <p
                      className="text-sm text-purple-200/80 font-bold mt-0.5"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Reste connecté à tes amis !
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background: 'rgba(239,68,68,0.25)',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 3px 0 #0a0810',
                  }}
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </motion.button>
              </div>

              {/* TABS — graffiti pills */}
              <div
                className="relative flex gap-1.5 px-3 py-2.5 flex-shrink-0"
                style={{ borderBottom: '3px solid #0a0810' }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const colors = TAB_COLORS[tab.id];
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => {
                        playInkSound('brushTap', 0.3);
                        setActiveTab(tab.id);
                      }}
                      whileHover={{ scale: isActive ? 1 : 1.04, y: isActive ? 0 : -2 }}
                      whileTap={{ scale: 0.96 }}
                      animate={isActive ? { rotate: -2 } : { rotate: 0 }}
                      className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl"
                      style={{
                        background: isActive
                          ? `linear-gradient(180deg, ${colors.bg}, ${colors.bg}cc)`
                          : 'rgba(255,255,255,0.04)',
                        border: '2.5px solid #0a0810',
                        boxShadow: isActive ? '0 4px 0 #0a0810' : '0 2px 0 #0a0810',
                      }}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          isActive ? 'text-white' : 'text-white/60',
                        )}
                        strokeWidth={2.5}
                      />
                      <span
                        className={cn(
                          'text-sm font-black hidden sm:inline leading-none',
                          isActive ? 'text-white' : 'text-white/60',
                        )}
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: isActive
                            ? GRAFFITI_TEXT_SHADOW_SM
                            : 'none',
                        }}
                      >
                        {tab.label}
                      </span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                          style={{
                            background:
                              'linear-gradient(180deg, #ef4444, #b91c1c)',
                            color: 'white',
                            border: '2px solid #0a0810',
                            fontFamily: "'Caveat', cursive",
                          }}
                        >
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* CONTENT */}
              <ScrollArea className="flex-1 relative">
                <div className="p-4 space-y-4">
                  {/* FRIEND CODE — visible on all tabs */}
                  <div className="space-y-2">
                    <SectionLabel icon={Hash} color="#06b6d4">
                      Votre Code Ami
                    </SectionLabel>
                    <motion.button
                      onClick={copyFriendCode}
                      whileHover={{ scale: 1.02, rotate: -0.4 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full rounded-2xl p-3 pr-14 text-center overflow-hidden"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(6,182,212,0.18), rgba(6,182,212,0.05))',
                        border: '3px solid #0a0810',
                        boxShadow:
                          '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.08)',
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
                          border: '2.5px solid #0a0810',
                          boxShadow: '0 3px 0 #0a0810',
                        }}
                      >
                        {copied ? (
                          <Check
                            className="h-4 w-4 text-white"
                            strokeWidth={3}
                          />
                        ) : (
                          <Copy
                            className="h-4 w-4 text-white"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                    </motion.button>
                  </div>

                  {/* TAB CONTENT */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'friends' && (
                      <motion.div
                        key="friends"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        {/* ADD FRIEND */}
                        <div className="space-y-2">
                          <SectionLabel icon={UserPlus} color="#a855f7">
                            Ajouter un ami
                          </SectionLabel>
                          <div className="flex gap-2">
                            <Input
                              placeholder="CODE AMI..."
                              value={friendCodeInput}
                              onChange={(e) =>
                                setFriendCodeInput(e.target.value.toUpperCase())
                              }
                              onKeyDown={(e) =>
                                e.key === 'Enter' && handleSendRequest()
                              }
                              className="flex-1 h-11 text-base font-black uppercase tracking-[0.2em] bg-black/40 text-white rounded-xl placeholder:text-white/30"
                              style={{
                                fontFamily: "'Caveat', cursive",
                                border: '3px solid #0a0810',
                                boxShadow:
                                  'inset 0 2px 4px rgba(0,0,0,0.4)',
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
                              onClick={handleSendRequest}
                              disabled={!friendCodeInput.trim() || isSending}
                              className={cn(
                                'h-11 w-11 rounded-xl flex items-center justify-center text-white transition-opacity',
                                (!friendCodeInput.trim() || isSending) &&
                                  'opacity-50',
                              )}
                              style={{
                                background:
                                  'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                                border: '3px solid #0a0810',
                                boxShadow:
                                  '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)',
                              }}
                            >
                              {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send
                                  className="h-4 w-4"
                                  strokeWidth={2.5}
                                />
                              )}
                            </motion.button>
                          </div>
                        </div>

                        {/* FRIENDS LIST */}
                        <div className="space-y-2">
                          <SectionLabel icon={Users} color="#34d399">
                            Mes Amis ({friends.length})
                          </SectionLabel>
                          {friends.length === 0 ? (
                            <EmptyState
                              emoji="🤷"
                              text="Aucun ami pour le moment !"
                              subtext="Ajoute des amis avec leur code"
                            />
                          ) : (
                            <div className="space-y-2">
                              {friends.map((friend, idx) => {
                                const status = getUserStatus(friend.user_id);
                                const isOnline = status.online;
                                const lobbyCode = status.lobbyCode;
                                const unread =
                                  unreadCounts[friend.user_id] || 0;

                                return (
                                  <motion.div
                                    key={friend.id}
                                    initial={{
                                      opacity: 0,
                                      x: -20,
                                      rotate: -2,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                      rotate: idx % 2 === 0 ? -0.6 : 0.6,
                                    }}
                                    transition={{ delay: idx * 0.04 }}
                                    whileHover={{ x: 3, rotate: 0 }}
                                    className="flex items-center gap-2.5 p-3 rounded-2xl"
                                    style={{
                                      background: isOnline
                                        ? 'linear-gradient(180deg, rgba(52,211,153,0.14), rgba(5,150,105,0.04))'
                                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                                      border: '3px solid #0a0810',
                                      boxShadow: '0 3px 0 #0a0810',
                                    }}
                                  >
                                    <div className="relative flex-shrink-0">
                                      <Avatar
                                        className="h-11 w-11"
                                        style={{
                                          border: '2.5px solid #0a0810',
                                          boxShadow: '0 2px 0 #0a0810',
                                        }}
                                      >
                                        <AvatarImage
                                          src={friend.avatar_url || undefined}
                                        />
                                        <AvatarFallback
                                          className="text-white text-base font-black"
                                          style={{
                                            background: isOnline
                                              ? 'linear-gradient(135deg, #34d399, #059669)'
                                              : 'linear-gradient(135deg, #6b7280, #374151)',
                                            fontFamily: "'Caveat', cursive",
                                          }}
                                        >
                                          {friend.display_name
                                            ?.charAt(0)
                                            ?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div
                                        className={cn(
                                          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0810]',
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
                                          fontFamily: "'Caveat', cursive",
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
                                        {lobbyCode
                                          ? 'EN PARTIE'
                                          : isOnline
                                            ? 'EN LIGNE'
                                            : 'HORS LIGNE'}
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                      <CartoonIconButton
                                        icon={MessageCircle}
                                        bg="linear-gradient(180deg, #6b7280, #374151)"
                                        badge={unread}
                                        onClick={() => {
                                          playInkSound('brushTap', 0.3);
                                          setChatFriend({
                                            user_id: friend.user_id,
                                            display_name: friend.display_name,
                                            avatar_url: friend.avatar_url,
                                          });
                                        }}
                                      />
                                      {lobbyCode && (
                                        <CartoonIconButton
                                          icon={Play}
                                          bg="linear-gradient(180deg, #34d399, #059669)"
                                          fill
                                          onClick={() =>
                                            handleJoinFriend(lobbyCode)
                                          }
                                        />
                                      )}
                                      {currentLobbyCode &&
                                        isOnline &&
                                        !lobbyCode && (
                                          <CartoonIconButton
                                            icon={Send}
                                            bg="linear-gradient(180deg, #fbbf24, #d97706)"
                                            onClick={() =>
                                              handleInviteFriend(friend.user_id)
                                            }
                                          />
                                        )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'messages' && (
                      <motion.div
                        key="messages"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                      >
                        <SectionLabel icon={MessageCircle} color="#a855f7">
                          Conversations
                        </SectionLabel>
                        {friends.length === 0 ? (
                          <EmptyState
                            emoji="💬"
                            text="Aucune conversation"
                            subtext="Ajoute des amis pour discuter"
                          />
                        ) : (
                          <div className="space-y-2">
                            {friends.map((friend, idx) => {
                              const unread =
                                unreadCounts[friend.user_id] || 0;
                              return (
                                <motion.button
                                  key={friend.id}
                                  initial={{
                                    opacity: 0,
                                    x: -20,
                                    rotate: -2,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    x: 0,
                                    rotate: idx % 2 === 0 ? -0.6 : 0.6,
                                  }}
                                  whileHover={{ x: 3, rotate: 0 }}
                                  onClick={() => {
                                    playInkSound('brushTap', 0.3);
                                    setChatFriend({
                                      user_id: friend.user_id,
                                      display_name: friend.display_name,
                                      avatar_url: friend.avatar_url,
                                    });
                                  }}
                                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                                  style={{
                                    background:
                                      unread > 0
                                        ? 'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(126,34,206,0.05))'
                                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                                    border: '3px solid #0a0810',
                                    boxShadow: '0 3px 0 #0a0810',
                                  }}
                                >
                                  <Avatar
                                    className="h-11 w-11"
                                    style={{
                                      border: '2.5px solid #0a0810',
                                      boxShadow: '0 2px 0 #0a0810',
                                    }}
                                  >
                                    <AvatarImage
                                      src={friend.avatar_url || undefined}
                                    />
                                    <AvatarFallback
                                      className="text-white text-base font-black"
                                      style={{
                                        background:
                                          'linear-gradient(135deg, #a855f7, #6b21a8)',
                                        fontFamily: "'Caveat', cursive",
                                      }}
                                    >
                                      {friend.display_name
                                        ?.charAt(0)
                                        ?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className="text-base font-black text-white truncate leading-none"
                                      style={{
                                        fontFamily: "'Caveat', cursive",
                                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                      }}
                                    >
                                      {friend.display_name}
                                    </div>
                                    <div
                                      className={cn(
                                        'text-[11px] font-bold mt-0.5',
                                        unread > 0
                                          ? 'text-purple-200'
                                          : 'text-white/45',
                                      )}
                                    >
                                      {unread > 0
                                        ? `${unread} nouveau${unread > 1 ? 'x' : ''} message${unread > 1 ? 's' : ''}`
                                        : 'Aucun nouveau message'}
                                    </div>
                                  </div>
                                  {unread > 0 && (
                                    <div
                                      className="min-w-[28px] h-7 px-2 rounded-xl text-base font-black flex items-center justify-center"
                                      style={{
                                        background:
                                          'linear-gradient(180deg, #ef4444, #b91c1c)',
                                        color: 'white',
                                        border: '2.5px solid #0a0810',
                                        boxShadow: '0 2px 0 #0a0810',
                                        fontFamily: "'Caveat', cursive",
                                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                      }}
                                    >
                                      {unread}
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'requests' && (
                      <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                      >
                        <SectionLabel icon={UserPlus} color="#fbbf24">
                          Demandes ({pendingRequests.length})
                        </SectionLabel>
                        {pendingRequests.length === 0 ? (
                          <EmptyState
                            emoji="📭"
                            text="Aucune demande !"
                            subtext="Vous serez notifié quand quelqu'un vous ajoute"
                          />
                        ) : (
                          <div className="space-y-2">
                            {pendingRequests.map((request, idx) => (
                              <motion.div
                                key={request.id}
                                initial={{
                                  opacity: 0,
                                  x: -20,
                                  rotate: -2,
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                  rotate: idx % 2 === 0 ? -0.6 : 0.6,
                                }}
                                className="flex items-center gap-3 p-3 rounded-2xl"
                                style={{
                                  background:
                                    'linear-gradient(180deg, rgba(251,191,36,0.18), rgba(217,119,6,0.05))',
                                  border: '3px solid #0a0810',
                                  boxShadow: '0 3px 0 #0a0810',
                                }}
                              >
                                <Avatar
                                  className="h-11 w-11"
                                  style={{
                                    border: '2.5px solid #0a0810',
                                    boxShadow: '0 2px 0 #0a0810',
                                  }}
                                >
                                  <AvatarImage
                                    src={
                                      request.requesterProfile?.avatar_url ||
                                      undefined
                                    }
                                  />
                                  <AvatarFallback
                                    className="text-white text-base font-black"
                                    style={{
                                      background:
                                        'linear-gradient(135deg, #fbbf24, #d97706)',
                                      fontFamily: "'Caveat', cursive",
                                    }}
                                  >
                                    {request.requesterProfile?.display_name
                                      ?.charAt(0)
                                      ?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-base font-black text-white truncate leading-none"
                                    style={{
                                      fontFamily: "'Caveat', cursive",
                                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                    }}
                                  >
                                    {request.requesterProfile?.display_name ||
                                      'Inconnu'}
                                  </div>
                                  <div
                                    className="text-[11px] text-amber-200/80 font-bold mt-0.5"
                                    style={{ fontFamily: "'Caveat', cursive" }}
                                  >
                                    veut être ton ami !
                                  </div>
                                </div>
                                <CartoonIconButton
                                  icon={Check}
                                  bg="linear-gradient(180deg, #34d399, #059669)"
                                  onClick={() =>
                                    handleAcceptRequest(request.id)
                                  }
                                />
                                <CartoonIconButton
                                  icon={X}
                                  bg="linear-gradient(180deg, #ef4444, #b91c1c)"
                                  onClick={() =>
                                    handleRejectRequest(request.id)
                                  }
                                />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'invitations' && (
                      <motion.div
                        key="invitations"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                      >
                        <SectionLabel icon={Mail} color="#34d399">
                          Invitations ({pendingInvitations.length})
                        </SectionLabel>
                        {pendingInvitations.length === 0 ? (
                          <EmptyState
                            emoji="🎮"
                            text="Aucune invitation !"
                            subtext="Tes amis te le feront savoir"
                          />
                        ) : (
                          <div className="space-y-2">
                            {pendingInvitations.map((invitation, idx) => (
                              <motion.div
                                key={invitation.id}
                                initial={{
                                  opacity: 0,
                                  x: -20,
                                  rotate: -2,
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                  rotate: idx % 2 === 0 ? -0.6 : 0.6,
                                }}
                                className="flex items-center gap-3 p-3 rounded-2xl"
                                style={{
                                  background:
                                    'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))',
                                  border: '3px solid #0a0810',
                                  boxShadow: '0 3px 0 #0a0810',
                                }}
                              >
                                <motion.div
                                  animate={{ rotate: [-5, 5, -5] }}
                                  transition={{
                                    duration: 1.6,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background:
                                      'linear-gradient(180deg, #34d399, #059669)',
                                    border: '2.5px solid #0a0810',
                                    boxShadow: '0 3px 0 #0a0810',
                                  }}
                                >
                                  <Play
                                    className="h-5 w-5 text-white"
                                    strokeWidth={2.5}
                                    fill="white"
                                  />
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-base font-black text-white truncate leading-none"
                                    style={{
                                      fontFamily: "'Caveat', cursive",
                                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                                    }}
                                  >
                                    {invitation.sender_name}
                                  </div>
                                  <div
                                    className="text-[11px] text-emerald-200/80 font-bold mt-0.5"
                                    style={{ fontFamily: "'Caveat', cursive" }}
                                  >
                                    t'invite à jouer !
                                  </div>
                                </div>
                                <CartoonIconButton
                                  icon={Check}
                                  bg="linear-gradient(180deg, #34d399, #059669)"
                                  onClick={() =>
                                    handleAcceptInvitation(invitation.id)
                                  }
                                />
                                <CartoonIconButton
                                  icon={X}
                                  bg="linear-gradient(180deg, #ef4444, #b91c1c)"
                                  onClick={() =>
                                    declineInvitation(invitation.id)
                                  }
                                />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'social' && (
                      <motion.div
                        key="social"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full"
                      >
                        <InkSocialFeed />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DirectMessageDialog
        open={!!chatFriend}
        onOpenChange={(o) => !o && setChatFriend(null)}
        friend={chatFriend}
      />
    </>
  );
};

/* ============================================================
   Helpers
============================================================ */

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
        fontFamily: "'Caveat', cursive",
        color,
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {children}
    </span>
  </div>
);

const EmptyState = ({
  emoji,
  text,
  subtext,
}: {
  emoji: string;
  text: string;
  subtext?: string;
}) => (
  <div className="text-center py-8">
    <motion.div
      animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      className="text-5xl mb-3 inline-block"
    >
      {emoji}
    </motion.div>
    <p
      className="text-lg font-black text-white/80"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {text}
    </p>
    {subtext && (
      <p
        className="text-sm text-white/50 font-bold mt-1 px-4"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        {subtext}
      </p>
    )}
  </div>
);

const CartoonIconButton = ({
  icon: Icon,
  bg,
  badge,
  fill,
  onClick,
}: {
  icon: any;
  bg: string;
  badge?: number;
  fill?: boolean;
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.1, rotate: -5 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
    style={{
      background: bg,
      border: '2.5px solid #0a0810',
      boxShadow: '0 3px 0 #0a0810',
    }}
  >
    <Icon
      className="h-3.5 w-3.5"
      strokeWidth={2.5}
      fill={fill ? 'white' : undefined}
    />
    {badge !== undefined && badge > 0 && (
      <span
        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
          color: 'white',
          border: '2px solid #0a0810',
          fontFamily: "'Caveat', cursive",
        }}
      >
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </motion.button>
);

export const SocialHubPanel = memo(SocialHubPanelComponent);
