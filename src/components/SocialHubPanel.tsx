import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageCircle, Mail, UserPlus, Copy, Send, Check, Loader2, Play, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

type Tab = 'friends' | 'messages' | 'requests' | 'invitations';

const SocialHubPanelComponent = ({ isOpen, onClose, currentLobbyCode, onJoinFriend }: SocialHubPanelProps) => {
  const { user, profile, friendCode } = useAuth();
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useFriends();
  const { getUserStatus } = useOnlinePresence(currentLobbyCode);
  const { pendingInvitations, sendInvitation, acceptInvitation, declineInvitation } = useGameInvitations();
  const unreadCounts = useUnreadCounts();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatFriend, setChatFriend] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null } | null>(null);

  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'friends', label: 'Amis', icon: <Users className="w-4 h-4" />, badge: friends.length },
    { id: 'messages', label: 'Messages', icon: <MessageCircle className="w-4 h-4" />, badge: totalUnreadMessages || undefined },
    { id: 'requests', label: 'Demandes', icon: <UserPlus className="w-4 h-4" />, badge: pendingRequests.length || undefined },
    { id: 'invitations', label: 'Invitations', icon: <Mail className="w-4 h-4" />, badge: pendingInvitations.length || undefined },
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
    if (onJoinFriend) {
      onJoinFriend(lobbyCode);
    }
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-primary/30 shadow-2xl z-[56] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/40 bg-gradient-to-r from-primary/10 to-background">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                      Réseau Social
                    </h2>
                    <p className="text-xs text-muted-foreground">Connectez-vous avec vos amis</p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border/40 bg-card/50">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      playInkSound('brushTap', 0.3);
                      setActiveTab(tab.id);
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 px-2 relative transition-colors',
                      activeTab === tab.id
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tab.icon}
                    <span className="text-xs font-semibold hidden sm:inline">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Friend Code Section - visible sur tous les onglets */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Votre Code Ami
                    </label>
                    <motion.div
                      className="relative group cursor-pointer"
                      onClick={copyFriendCode}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="bg-primary/10 rounded-lg p-3 pr-12 font-mono text-base font-bold text-primary tracking-[0.3em] border border-primary/30 group-hover:border-primary/50 transition-colors text-center">
                        {friendCode || '...'}
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                      </div>
                    </motion.div>
                  </div>

                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'friends' && (
                      <motion.div
                        key="friends"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        {/* Add friend */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <UserPlus className="h-3.5 w-3.5" />
                            Ajouter un ami
                          </label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="CODE AMI..."
                              value={friendCodeInput}
                              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                              className="flex-1 h-11 text-sm font-mono uppercase tracking-wider bg-background/50 border-primary/30 focus:border-primary"
                            />
                            <motion.button
                              onClick={handleSendRequest}
                              disabled={!friendCodeInput.trim() || isSending}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                            >
                              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </motion.button>
                          </div>
                        </div>

                        {/* Friends list */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Mes Amis ({friends.length})
                          </h3>
                          {friends.length === 0 ? (
                            <div className="text-center py-8">
                              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">Aucun ami pour le moment</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Ajoutez des amis avec leur code</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {friends.map((friend) => {
                                const status = getUserStatus(friend.user_id);
                                const isOnline = status.online;
                                const lobbyCode = status.lobbyCode;
                                const unread = unreadCounts[friend.user_id] || 0;

                                return (
                                  <motion.div
                                    key={friend.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                      isOnline
                                        ? "bg-green-500/5 border-green-500/30 hover:border-green-500/50"
                                        : "bg-background/50 border-border/30 hover:border-border/50"
                                    )}
                                    whileHover={{ x: 3 }}
                                  >
                                    <div className="relative">
                                      <Avatar className={cn(
                                        "h-11 w-11 ring-2",
                                        isOnline ? "ring-green-500/50" : "ring-muted/30"
                                      )}>
                                        <AvatarImage src={friend.avatar_url || undefined} />
                                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                          {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <Circle
                                        className={cn(
                                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5",
                                          isOnline ? "text-green-500 fill-green-500" : "text-muted-foreground/50 fill-muted-foreground/50"
                                        )}
                                      />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-foreground truncate">
                                        {friend.display_name}
                                      </div>
                                      <div className={cn(
                                        "text-xs",
                                        isOnline ? "text-green-500" : "text-muted-foreground"
                                      )}>
                                        {lobbyCode ? 'En partie' : isOnline ? 'En ligne' : 'Hors ligne'}
                                      </div>
                                    </div>

                                    <div className="flex gap-1.5">
                                      <motion.button
                                        onClick={() => {
                                          playInkSound('brushTap', 0.3);
                                          setChatFriend({
                                            user_id: friend.user_id,
                                            display_name: friend.display_name,
                                            avatar_url: friend.avatar_url,
                                          });
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="relative h-9 w-9 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center hover:bg-foreground/20"
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                        {unread > 0 && (
                                          <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                            {unread}
                                          </span>
                                        )}
                                      </motion.button>
                                      {lobbyCode && (
                                        <motion.button
                                          onClick={() => handleJoinFriend(lobbyCode)}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          className="h-9 w-9 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                                        >
                                          <Play className="h-4 w-4" />
                                        </motion.button>
                                      )}
                                      {currentLobbyCode && isOnline && !lobbyCode && (
                                        <motion.button
                                          onClick={() => handleInviteFriend(friend.user_id)}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          className="h-9 w-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30"
                                        >
                                          <Send className="h-4 w-4" />
                                        </motion.button>
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
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Conversations
                        </h3>
                        {friends.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Aucune conversation</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Ajoutez des amis pour discuter</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {friends.map((friend) => {
                              const unread = unreadCounts[friend.user_id] || 0;
                              return (
                                <motion.button
                                  key={friend.id}
                                  onClick={() => {
                                    playInkSound('brushTap', 0.3);
                                    setChatFriend({
                                      user_id: friend.user_id,
                                      display_name: friend.display_name,
                                      avatar_url: friend.avatar_url,
                                    });
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                                    unread > 0
                                      ? "bg-primary/10 border-primary/30 hover:border-primary/50"
                                      : "bg-background/50 border-border/30 hover:border-border/50"
                                  )}
                                  whileHover={{ x: 3 }}
                                >
                                  <Avatar className="h-11 w-11 ring-2 ring-muted/30">
                                    <AvatarImage src={friend.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                      {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                      {friend.display_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {unread > 0 ? `${unread} nouveau${unread > 1 ? 'x' : ''} message${unread > 1 ? 's' : ''}` : 'Aucun nouveau message'}
                                    </div>
                                  </div>
                                  {unread > 0 && (
                                    <div className="min-w-[24px] h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
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
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Demandes d'amis ({pendingRequests.length})
                        </h3>
                        {pendingRequests.length === 0 ? (
                          <div className="text-center py-8">
                            <UserPlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pendingRequests.map((request) => (
                              <motion.div
                                key={request.id}
                                className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <Avatar className="h-11 w-11 ring-2 ring-yellow-500/30">
                                  <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-yellow-500/20 text-yellow-500 font-bold">
                                    {request.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">
                                    {request.requesterProfile?.display_name || 'Inconnu'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Demande d'ami</div>
                                </div>
                                <div className="flex gap-1.5">
                                  <motion.button
                                    onClick={() => handleAcceptRequest(request.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="h-9 w-9 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                                  >
                                    <Check className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleRejectRequest(request.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="h-9 w-9 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30"
                                  >
                                    <X className="h-4 w-4" />
                                  </motion.button>
                                </div>
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
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Invitations de jeu ({pendingInvitations.length})
                        </h3>
                        {pendingInvitations.length === 0 ? (
                          <div className="text-center py-8">
                            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Aucune invitation</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pendingInvitations.map((invitation) => (
                              <motion.div
                                key={invitation.id}
                                className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                  <Play className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-primary truncate">
                                    {invitation.sender_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">vous invite à jouer</div>
                                </div>
                                <div className="flex gap-1.5">
                                  <motion.button
                                    onClick={() => handleAcceptInvitation(invitation.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="h-9 w-9 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                                  >
                                    <Check className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => declineInvitation(invitation.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="h-9 w-9 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30"
                                  >
                                    <X className="h-4 w-4" />
                                  </motion.button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Direct Message Dialog */}
      <DirectMessageDialog
        open={!!chatFriend}
        onOpenChange={(o) => !o && setChatFriend(null)}
        friend={chatFriend}
      />
    </>
  );
};

export const SocialHubPanel = memo(SocialHubPanelComponent);
