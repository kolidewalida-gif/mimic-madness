import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { Users, Copy, Send, Check, X, UserMinus, Loader2, LogIn, UserPlus, Play, Circle, Mail, Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Premium UI imports
import { HolographicCard } from '@/components/premium/HolographicCard';
import { NeonText } from '@/components/premium/NeonText';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { InteractiveWrapper } from '@/components/premium/InteractiveWrapper';

interface FriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
  currentLobbyCode?: string;
}

const FriendsSidebarComponent = ({ onJoinFriend, currentLobbyCode }: FriendsSidebarProps) => {
  const { user, profile, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const { getUserStatus } = useOnlinePresence(currentLobbyCode);
  const { pendingInvitations, sendInvitation, acceptInvitation, declineInvitation, isLoading: invitationLoading } = useGameInvitations();
  
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendRequest = async () => {
    if (!friendCodeInput.trim()) return;
    setIsSending(true);
    try {
      await sendFriendRequest(friendCodeInput.trim());
      setFriendCodeInput('');
      toast.success('Demande envoyée !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajouté !');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
    } catch {
      toast.error('Erreur');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFriend(id);
      toast.success('Ami supprimé');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleJoinFriend = (lobbyCode: string) => {
    if (onJoinFriend) {
      onJoinFriend(lobbyCode);
    }
  };

  const handleInviteFriend = async (friendUserId: string) => {
    if (!currentLobbyCode || !profile?.display_name) {
      toast.error('Vous devez être dans un lobby pour inviter');
      return;
    }
    await sendInvitation(friendUserId, currentLobbyCode, profile.display_name);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    const lobbyCode = await acceptInvitation(invitationId);
    if (lobbyCode && onJoinFriend) {
      onJoinFriend(lobbyCode);
    }
  };

  const copyFriendCode = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Non connecté
  if (!user && !authLoading) {
    return (
      <HolographicCard className="w-[280px] overflow-hidden" glowColor="rainbow" intensity="medium">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border border-primary/30">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <NeonText color="primary" size="lg">Mes Amis</NeonText>
          </div>
          
          {/* Content */}
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <motion.div 
              className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Users className="h-12 w-12 text-primary/50" />
            </motion.div>
            <p className="text-xs text-foreground-muted text-center px-4 leading-relaxed">
              Connectez-vous pour ajouter des amis et jouer ensemble
            </p>
            <InteractiveWrapper magnetic glow glowColor="hsl(var(--primary))">
              <PremiumButton
                onClick={signInWithGoogle}
                variant="cyber"
                size="md"
                color="primary"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Connexion Google
              </PremiumButton>
            </InteractiveWrapper>
          </div>
        </div>
      </HolographicCard>
    );
  }

  // Loading
  if (authLoading) {
    return (
      <HolographicCard className="w-[280px] overflow-hidden" glowColor="primary" intensity="low">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </HolographicCard>
    );
  }

  const totalNotifications = pendingRequests.length + pendingInvitations.length;

  return (
    <HolographicCard className="w-[280px] overflow-hidden max-h-[580px] flex flex-col" glowColor="primary" intensity="medium">
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Users className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <NeonText color="primary" size="md">Mes Amis</NeonText>
              <p className="text-[10px] text-primary/70">{friends.length} ami(s)</p>
            </div>
          </div>
          {totalNotifications > 0 && (
            <motion.div 
              className="relative"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Bell className="h-5 w-5 text-primary" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-pink-500 to-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-pink-500/50">
                {totalNotifications}
              </span>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-3">
          {/* Friend code */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              Votre Code Ami
            </label>
            <InteractiveWrapper magnetic>
              <div 
                className="relative group cursor-pointer"
                onClick={copyFriendCode}
              >
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-3 pr-12 font-mono text-sm font-bold text-primary tracking-[0.3em] border border-primary/30 group-hover:border-primary/50 transition-colors">
                  {friendCode || '...'}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-primary" />}
                </div>
              </div>
            </InteractiveWrapper>
          </div>

          {/* Add friend */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest flex items-center gap-1.5">
              <UserPlus className="h-3 w-3" />
              Ajouter un ami
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="CODE AMI..."
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                className="flex-1 h-10 text-xs font-mono uppercase tracking-wider bg-black/30 border-primary/30 focus:border-primary placeholder:text-primary/30"
              />
              <InteractiveWrapper magnetic>
                <PremiumButton
                  onClick={handleSendRequest}
                  disabled={!friendCodeInput.trim() || isSending}
                  variant="glow"
                  size="sm"
                  color="primary"
                  className="h-10 w-10 p-0"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </PremiumButton>
              </InteractiveWrapper>
            </div>
          </div>

          {/* Game invitations */}
          <AnimatePresence>
            {pendingInvitations.length > 0 && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-[10px] font-bold text-accent/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Invitations ({pendingInvitations.length})
                </h3>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <motion.div
                      key={invitation.id}
                      className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-accent/10 to-primary/10 rounded-xl border border-accent/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-accent truncate">{invitation.sender_name}</div>
                        <div className="text-[10px] text-accent/70">vous invite à jouer</div>
                      </div>
                      <InteractiveWrapper>
                        <PremiumButton 
                          onClick={() => handleAcceptInvitation(invitation.id)} 
                          variant="glow"
                          size="sm"
                          color="success"
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </PremiumButton>
                      </InteractiveWrapper>
                      <InteractiveWrapper>
                        <PremiumButton 
                          onClick={() => declineInvitation(invitation.id)} 
                          variant="glow"
                          size="sm"
                          color="warning"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </PremiumButton>
                      </InteractiveWrapper>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pending friend requests */}
          <AnimatePresence>
            {pendingRequests.length > 0 && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-[10px] font-bold text-warning/80 uppercase tracking-widest">
                  Demandes ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-warning/10 to-accent/10 rounded-xl border border-warning/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-warning/30">
                        <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-warning to-accent text-white text-xs font-bold">
                          {request.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-xs font-semibold text-warning truncate">
                        {request.requesterProfile?.display_name || 'Inconnu'}
                      </span>
                      <InteractiveWrapper>
                        <PremiumButton 
                          onClick={() => handleAccept(request.id)}
                          variant="glow"
                          size="sm"
                          color="success"
                          className="h-7 w-7 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </PremiumButton>
                      </InteractiveWrapper>
                      <InteractiveWrapper>
                        <PremiumButton 
                          onClick={() => handleReject(request.id)}
                          variant="glow"
                          size="sm"
                          color="warning"
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-3 w-3" />
                        </PremiumButton>
                      </InteractiveWrapper>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Friends list */}
          <div className="flex-1 overflow-hidden space-y-2 min-h-0">
            <h3 className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              Amis en ligne
            </h3>
            <ScrollArea className="h-full max-h-[220px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="h-6 w-6 text-primary" />
                  </motion.div>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-xs text-primary/50">Aucun ami pour le moment</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {friends.map((friend) => {
                    const status = getUserStatus(friend.user_id);
                    const isOnline = status.online;
                    const lobbyCode = status.lobbyCode;
                    
                    return (
                      <motion.div
                        key={friend.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-xl",
                          "bg-black/20 border transition-all duration-300 group",
                          isOnline 
                            ? "border-success/30 hover:border-success/50" 
                            : "border-muted/20 hover:border-muted/30"
                        )}
                        whileHover={{ scale: 1.02, x: 4 }}
                      >
                        <div className="relative">
                          <Avatar className={cn(
                            "h-9 w-9 ring-2 transition-all",
                            isOnline ? "ring-success/50" : "ring-muted/30"
                          )}>
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                              {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <motion.div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                              isOnline ? "bg-success" : "bg-muted"
                            )}
                            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{friend.display_name || 'Joueur'}</div>
                          <div className={cn(
                            "text-[10px] font-medium",
                            lobbyCode ? "text-primary" : isOnline ? "text-success" : "text-muted-foreground"
                          )}>
                            {lobbyCode ? '🎮 En partie' : isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {lobbyCode && (
                            <InteractiveWrapper magnetic>
                              <PremiumButton
                                onClick={() => handleJoinFriend(lobbyCode)}
                                variant="glow"
                                size="sm"
                                color="success"
                                className="h-8 w-8 p-0"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </PremiumButton>
                            </InteractiveWrapper>
                          )}
                          {currentLobbyCode && !lobbyCode && isOnline && (
                            <InteractiveWrapper magnetic>
                              <PremiumButton
                                onClick={() => handleInviteFriend(friend.user_id)}
                                disabled={invitationLoading}
                                variant="glow"
                                size="sm"
                                color="accent"
                                className="h-8 w-8 p-0"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </PremiumButton>
                            </InteractiveWrapper>
                          )}
                          <InteractiveWrapper>
                            <PremiumButton
                              onClick={() => handleRemove(friend.id)}
                              variant="glow"
                              size="sm"
                              color="warning"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </PremiumButton>
                          </InteractiveWrapper>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </HolographicCard>
  );
};

export const FriendsSidebar = memo(FriendsSidebarComponent);