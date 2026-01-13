import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Users, Copy, Send, Check, X, UserMinus, Loader2, LogIn, UserPlus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FriendsSidebarProps {
  onJoinFriend?: (lobbyCode: string) => void;
}

const FriendsSidebarComponent = ({ onJoinFriend }: FriendsSidebarProps) => {
  const { user, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  
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
      <div className="fixed right-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-l border-border/50 z-40 flex flex-col">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Mes Amis</h2>
              <p className="text-xs text-foreground-muted">Non connecté</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
              <Users className="h-10 w-10 text-foreground-muted" />
            </div>
            <p className="text-sm text-foreground-muted">
              Connectez-vous pour ajouter des amis
            </p>
            <Button
              onClick={signInWithGoogle}
              className="w-full bg-gradient-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/30"
            >
              <LogIn className="h-4 w-4 mr-2" />
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
      <div className="fixed right-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-l border-border/50 z-40">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-72 bg-card/80 backdrop-blur-xl border-l border-border/50 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Mes Amis</h2>
            <p className="text-xs text-foreground-muted">{friends.length} ami(s)</p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
        {/* Code ami */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Votre Code Ami
          </label>
          <div className="relative">
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 pr-10 font-mono text-lg font-bold text-primary tracking-wider">
              {friendCode || '...'}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyFriendCode}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Ajouter un ami */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="h-3 w-3" />
            Ajouter un ami
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="CODE AMI..."
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              className="flex-1 h-10 font-mono uppercase tracking-wider"
            />
            <Button
              size="icon"
              onClick={handleSendRequest}
              disabled={!friendCodeInput.trim() || isSending}
              className="h-10 w-10 bg-gradient-to-r from-primary to-accent"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Demandes en attente */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Demandes ({pendingRequests.length})
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-primary/30"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                      {request.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate">
                    {request.requesterProfile?.display_name || 'Inconnu'}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => handleAccept(request.id)} className="h-7 w-7">
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleReject(request.id)} className="h-7 w-7">
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste d'amis */}
        <div className="flex-1 overflow-hidden space-y-2">
          <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Amis
          </h3>
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-foreground-muted text-sm">
                Aucun ami pour le moment
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl",
                      "bg-background/50 border border-border/30",
                      "hover:border-primary/30 transition-colors group"
                    )}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                        {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{friend.display_name || 'Joueur'}</div>
                      <div className="text-xs text-foreground-muted">En ligne</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(friend.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserMinus className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export const FriendsSidebar = memo(FriendsSidebarComponent);
