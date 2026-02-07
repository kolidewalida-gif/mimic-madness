import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { Users, Copy, Send, Check, X, Loader2, LogIn, UserPlus, Play, Circle, Mail, Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface InkFriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
  currentLobbyCode?: string;
}

const InkFriendsSidebarComponent = ({ onJoinFriend, currentLobbyCode }: InkFriendsSidebarProps) => {
  const { user, profile, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const { getUserStatus } = useOnlinePresence(currentLobbyCode);
  const { pendingInvitations, sendInvitation, acceptInvitation, declineInvitation } = useGameInvitations();
  
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

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
      toast.error(error.message || 'Erreur lors de l\'envoi');
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
    if (onJoinFriend) {
      onJoinFriend(lobbyCode);
    }
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
    if (lobbyCode && onJoinFriend) {
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

  // Non connecté
  if (!user && !authLoading) {
    return (
      <motion.div 
        className="w-[280px] bg-card/80 backdrop-blur-sm border-2 border-primary/30 rounded-xl overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
              Mes Amis
            </h2>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <Users className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
              Connectez-vous pour ajouter des amis et jouer ensemble
            </p>
            <motion.button
              onClick={() => {
                playInkSound('inkClick', 0.4);
                signInWithGoogle();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Connexion Google
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading
  if (authLoading) {
    return (
      <motion.div 
        className="w-[280px] bg-card/80 backdrop-blur-sm border-2 border-border/30 rounded-xl overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </motion.div>
    );
  }

  const totalNotifications = pendingRequests.length + pendingInvitations.length;

  return (
    <motion.div 
      className="w-[280px] bg-card/80 backdrop-blur-sm border-2 border-primary/30 rounded-xl overflow-hidden max-h-[580px] flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                Mes Amis
              </h2>
              <p className="text-[10px] text-muted-foreground">{friends.length} ami(s)</p>
            </div>
          </div>
          {totalNotifications > 0 && (
            <motion.div 
              className="relative"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Bell className="h-5 w-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {totalNotifications}
              </span>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-3">
          {/* Friend code */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Votre Code Ami
            </label>
            <motion.div 
              className="relative group cursor-pointer"
              onClick={copyFriendCode}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="bg-primary/10 rounded-lg p-3 pr-12 font-mono text-sm font-bold text-primary tracking-[0.3em] border border-primary/30 group-hover:border-primary/50 transition-colors">
                {friendCode || '...'}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-primary" />}
              </div>
            </motion.div>
          </div>

          {/* Add friend */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-3 w-3" />
              Ajouter un ami
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="CODE AMI..."
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                className="flex-1 h-10 text-xs font-mono uppercase tracking-wider bg-background/50 border-primary/30 focus:border-primary placeholder:text-muted-foreground/50"
              />
              <motion.button
                onClick={handleSendRequest}
                disabled={!friendCodeInput.trim() || isSending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </motion.button>
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
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Invitations ({pendingInvitations.length})
                </h3>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <motion.div
                      key={invitation.id}
                      className="flex items-center gap-2 p-2.5 bg-primary/10 rounded-lg border border-primary/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-primary truncate">{invitation.sender_name}</div>
                        <div className="text-[10px] text-muted-foreground">vous invite à jouer</div>
                      </div>
                      <motion.button 
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="h-8 w-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                      >
                        <Check className="h-4 w-4" />
                      </motion.button>
                      <motion.button 
                        onClick={() => declineInvitation(invitation.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="h-8 w-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30"
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
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
                <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
                  Demandes ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      className="flex items-center gap-2 p-2.5 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-yellow-500/30">
                        <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-xs font-bold">
                          {request.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-xs font-semibold text-foreground truncate">
                        {request.requesterProfile?.display_name || 'Inconnu'}
                      </span>
                      <motion.button 
                        onClick={() => handleAccept(request.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="h-7 w-7 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.button>
                      <motion.button 
                        onClick={() => handleReject(request.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="h-7 w-7 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center"
                      >
                        <X className="h-3.5 w-3.5" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Friends list */}
          <div className="flex-1 overflow-hidden space-y-2 min-h-0">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Amis en ligne
            </h3>
            <ScrollArea className="h-full max-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun ami pour le moment</p>
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
                          "flex items-center gap-2.5 p-2.5 rounded-lg",
                          "bg-background/50 border transition-all duration-300",
                          isOnline 
                            ? "border-green-500/30 hover:border-green-500/50" 
                            : "border-border/30 hover:border-border/50"
                        )}
                        whileHover={{ x: 3 }}
                      >
                        <div className="relative">
                          <Avatar className={cn(
                            "h-9 w-9 ring-2 transition-all",
                            isOnline ? "ring-green-500/50" : "ring-muted/30"
                          )}>
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                              {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Circle
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3",
                              isOnline ? "text-green-500 fill-green-500" : "text-muted-foreground/50 fill-muted-foreground/50"
                            )}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {friend.display_name}
                          </div>
                          <div className={cn(
                            "text-[10px]",
                            isOnline ? "text-green-500" : "text-muted-foreground"
                          )}>
                            {lobbyCode ? 'En partie' : isOnline ? 'En ligne' : 'Hors ligne'}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          {lobbyCode && (
                            <motion.button
                              onClick={() => handleJoinFriend(lobbyCode)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="h-7 w-7 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                              title="Rejoindre"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </motion.button>
                          )}
                          {currentLobbyCode && isOnline && !lobbyCode && (
                            <motion.button
                              onClick={() => handleInviteFriend(friend.user_id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30"
                              title="Inviter"
                            >
                              <Send className="h-3.5 w-3.5" />
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
      </div>
    </motion.div>
  );
};

export const InkFriendsSidebar = memo(InkFriendsSidebarComponent);
