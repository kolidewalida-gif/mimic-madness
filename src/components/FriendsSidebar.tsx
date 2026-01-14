import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { Users, Copy, Send, Check, X, UserMinus, Loader2, LogIn, UserPlus, Play, Circle, Mail, Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
      <div className="w-[260px] bg-card/40 backdrop-blur-xl border border-border/20 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/20 bg-background/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="font-semibold text-sm">Mes Amis</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center border border-border/20">
              <Users className="h-10 w-10 text-foreground-muted/50" />
            </div>
            <p className="text-xs text-foreground-muted px-4 leading-relaxed">
              Connectez-vous pour ajouter des amis
            </p>
            <Button
              onClick={signInWithGoogle}
              size="sm"
              className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5 mr-2" />
              Connexion Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (authLoading) {
    return (
      <div className="w-[260px] bg-card/40 backdrop-blur-xl border border-border/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-border/20 bg-background/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const totalNotifications = pendingRequests.length + pendingInvitations.length;

  return (
    <div className="w-[260px] bg-card/40 backdrop-blur-xl border border-border/20 rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[520px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-background/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm">Mes Amis</span>
              <p className="text-[10px] text-foreground-muted">{friends.length} ami(s)</p>
            </div>
          </div>
          {totalNotifications > 0 && (
            <div className="relative">
              <Bell className="h-4 w-4 text-primary" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {totalNotifications}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 space-y-3">
        {/* Friend code */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            Votre Code Ami
          </label>
          <div className="relative">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-2.5 pr-10 font-mono text-sm font-bold text-primary tracking-widest border border-primary/10">
              {friendCode || '...'}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyFriendCode}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Add friend */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1">
            <UserPlus className="h-2.5 w-2.5" />
            Ajouter un ami
          </label>
          <div className="flex gap-1.5">
            <Input
              placeholder="CODE AMI..."
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              className="flex-1 h-9 text-xs font-mono uppercase tracking-wider bg-background/50"
            />
            <Button
              size="icon"
              onClick={handleSendRequest}
              disabled={!friendCodeInput.trim() || isSending}
              className="h-9 w-9 bg-gradient-to-r from-primary to-accent shrink-0"
            >
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Game invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1">
              <Mail className="h-2.5 w-2.5" />
              Invitations ({pendingInvitations.length})
            </h3>
            <div className="space-y-1.5">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20 animate-pulse-slow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{invitation.sender_name}</div>
                    <div className="text-[10px] text-foreground-muted">vous invite à jouer</div>
                  </div>
                  <Button 
                    size="icon" 
                    onClick={() => handleAcceptInvitation(invitation.id)} 
                    className="h-7 w-7 bg-green-500 hover:bg-green-600"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => declineInvitation(invitation.id)} 
                    className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending friend requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
              Demandes ({pendingRequests.length})
            </h3>
            <div className="space-y-1.5">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-2 p-2 bg-background/40 rounded-lg border border-primary/20"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-[10px]">
                      {request.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-xs font-medium truncate">
                    {request.requesterProfile?.display_name || 'Inconnu'}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => handleAccept(request.id)} className="h-6 w-6">
                    <Check className="h-3 w-3 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleReject(request.id)} className="h-6 w-6">
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="flex-1 overflow-hidden space-y-1.5 min-h-0">
          <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            Amis
          </h3>
          <ScrollArea className="h-full max-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-4 text-foreground-muted text-xs">
                Aucun ami pour le moment
              </div>
            ) : (
              <div className="space-y-1.5 pr-2">
                {friends.map((friend) => {
                  const status = getUserStatus(friend.user_id);
                  const isOnline = status.online;
                  const lobbyCode = status.lobbyCode;
                  
                  return (
                    <div
                      key={friend.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl",
                        "bg-background/30 border border-border/10",
                        "hover:border-primary/20 transition-colors group"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                            {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Circle
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3",
                            isOnline ? "text-green-500 fill-green-500" : "text-gray-500 fill-gray-500"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{friend.display_name || 'Joueur'}</div>
                        <div className={cn(
                          "text-[10px]",
                          lobbyCode ? "text-primary" : isOnline ? "text-green-500" : "text-foreground-muted"
                        )}>
                          {lobbyCode ? 'En partie' : isOnline ? 'En ligne' : 'Hors ligne'}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        {lobbyCode && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleJoinFriend(lobbyCode)}
                            className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            title="Rejoindre"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {currentLobbyCode && !lobbyCode && isOnline && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleInviteFriend(friend.user_id)}
                            disabled={invitationLoading}
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            title="Inviter"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemove(friend.id)}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                          title="Supprimer"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export const FriendsSidebar = memo(FriendsSidebarComponent);