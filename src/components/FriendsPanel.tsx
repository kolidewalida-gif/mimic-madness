import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { 
  X, UserPlus, Users, Check, X as XIcon, Trash2, 
  Copy, Loader2, Send, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinFriend?: (lobbyCode: string) => void;
}

const FriendsPanelComponent = ({ isOpen, onClose, onJoinFriend }: FriendsPanelProps) => {
  const { friendCode } = useAuth();
  const { friends, pendingRequests, isLoading, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendRequest = async () => {
    if (!friendCodeInput.trim()) return;
    
    setIsSending(true);
    try {
      await sendFriendRequest(friendCodeInput.trim());
      toast.success('Demande d\'ami envoyée !');
      setFriendCodeInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajouté !');
    } catch (error) {
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
    } catch (error) {
      toast.error('Erreur lors du refus');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFriend(id);
      toast.success('Ami supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const copyFriendCode = () => {
    if (friendCode) {
      navigator.clipboard.writeText(friendCode);
      setCopied(true);
      toast.success('Code ami copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border/50 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Mes Amis</h2>
                    <p className="text-xs text-foreground-muted">{friends.length} ami(s)</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Friend Code Section */}
              <div className="p-4 bg-primary/5 border-b border-border/50">
                <p className="text-xs text-foreground-muted mb-2">Votre Code Ami</p>
                <button
                  onClick={copyFriendCode}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-background rounded-xl border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <span className="font-mono text-xl font-bold text-primary tracking-[0.2em]">
                    {friendCode || '--------'}
                  </span>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500 ml-auto" />
                  ) : (
                    <Copy className="h-4 w-4 text-foreground-muted ml-auto" />
                  )}
                </button>
              </div>

              {/* Add Friend Section */}
              <div className="p-4 border-b border-border/50">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                    <Input
                      placeholder="Code ami..."
                      value={friendCodeInput}
                      onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                      maxLength={8}
                      className="pl-10 uppercase tracking-wider font-mono"
                    />
                  </div>
                  <Button 
                    onClick={handleSendRequest}
                    disabled={!friendCodeInput.trim() || isSending}
                    className="rounded-xl"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="h-4 w-4 text-accent" />
                      <h3 className="font-semibold text-sm">Demandes en attente</h3>
                      <span className="px-1.5 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                        {pendingRequests.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pendingRequests.map((request) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl border border-accent/20"
                        >
                          <Avatar className="h-10 w-10 border border-accent/30">
                            <AvatarImage src={request.requesterProfile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-accent/20 text-accent">
                              {request.requesterProfile?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {request.requesterProfile?.display_name || 'Joueur'}
                            </p>
                            <p className="text-xs text-foreground-muted">Demande d'ami</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleAccept(request.id)}
                              className="h-8 w-8 rounded-lg text-green-500 hover:bg-green-500/20"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleReject(request.id)}
                              className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/20"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Amis</h3>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-foreground-muted/30 mb-3" />
                      <p className="text-foreground-muted text-sm">
                        Pas encore d'amis
                      </p>
                      <p className="text-foreground-muted/70 text-xs mt-1">
                        Partagez votre code ami pour en ajouter
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <motion.div
                          key={friend.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors group"
                        >
                          <Avatar className="h-10 w-10 border border-primary/30">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {friend.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {friend.display_name || 'Joueur'}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemove(friend.id)}
                            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/20 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const FriendsPanel = memo(FriendsPanelComponent);
