import { memo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { Users, Copy, Send, Check, X, UserMinus, Loader2, LogIn, UserPlus, Play, Circle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
}

interface OnlineStatus {
  [userId: string]: {
    online: boolean;
    lobbyCode?: string | null;
  };
}

const FriendsSidebarComponent = ({ onJoinFriend }: FriendsSidebarProps) => {
  const { user, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});

  // Track online status of friends via presence
  useEffect(() => {
    if (!user || friends.length === 0) return;

    const channel = supabase.channel('online-friends');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newStatus: OnlineStatus = {};
        
        friends.forEach(friend => {
          const friendPresence = state[friend.user_id];
          if (friendPresence && friendPresence.length > 0) {
            const presence = friendPresence[0] as any;
            newStatus[friend.user_id] = {
              online: true,
              lobbyCode: presence.lobbyCode || null
            };
          } else {
            newStatus[friend.user_id] = { online: false };
          }
        });
        
        setOnlineStatus(newStatus);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friends]);

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
      <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-border/30 bg-background/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-accent" />
            </div>
            <span className="font-semibold text-sm">Mes Amis</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
              <Users className="h-8 w-8 text-foreground-muted" />
            </div>
            <p className="text-xs text-foreground-muted px-2">
              Connectez-vous pour ajouter des amis
            </p>
            <Button
              onClick={signInWithGoogle}
              size="sm"
              className="w-full bg-gradient-to-r from-accent to-primary"
            >
              <LogIn className="h-3 w-3 mr-2" />
              Connexion Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chargement
  if (authLoading) {
    return (
      <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden h-[500px]">
        <div className="p-4 border-b border-border/30 bg-background/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-background/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm">Mes Amis</span>
            <p className="text-[10px] text-foreground-muted">{friends.length} ami(s)</p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 space-y-3">
        {/* Code ami */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            Votre Code Ami
          </label>
          <div className="relative">
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-2.5 pr-8 font-mono text-sm font-bold text-primary tracking-wider">
              {friendCode || '...'}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyFriendCode}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Ajouter un ami */}
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
              className="flex-1 h-8 text-xs font-mono uppercase tracking-wider"
            />
            <Button
              size="icon"
              onClick={handleSendRequest}
              disabled={!friendCodeInput.trim() || isSending}
              className="h-8 w-8 bg-gradient-to-r from-primary to-accent"
            >
              {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Demandes en attente */}
        {pendingRequests.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
              Demandes ({pendingRequests.length})
            </h3>
            <div className="space-y-1.5">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-primary/30"
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

        {/* Liste d'amis */}
        <div className="flex-1 overflow-hidden space-y-1.5">
          <h3 className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            Amis
          </h3>
          <ScrollArea className="h-full">
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
                  const status = onlineStatus[friend.user_id];
                  const isOnline = status?.online || false;
                  const lobbyCode = status?.lobbyCode;
                  
                  return (
                    <div
                      key={friend.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl",
                        "bg-background/40 border border-border/20",
                        "hover:border-primary/30 transition-colors group"
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
                          isOnline ? "text-green-500" : "text-foreground-muted"
                        )}>
                          {lobbyCode ? 'En partie' : isOnline ? 'En ligne' : 'Hors ligne'}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {lobbyCode && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleJoinFriend(lobbyCode)}
                            className="h-6 w-6 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemove(friend.id)}
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        >
                          <UserMinus className="h-3 w-3" />
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
