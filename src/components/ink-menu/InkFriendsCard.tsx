import { memo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
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
  Circle,
  MessageCircle,
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

interface InkFriendsCardProps {
  onJoinFriend?: (lobbyCode: string) => void;
}

const InkFriendsCardComponent = ({ onJoinFriend }: InkFriendsCardProps) => {
  const { user, friendCode, isLoading: authLoading, signInWithGoogle } = useAuth();
  const {
    friends,
    pendingRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useFriends();
  const { getUserStatus } = useOnlinePresence();

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
      toast.success('Demande envoyee !');
      playInkSound('inkSuccess', 0.5);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Erreur lors de l'envoi";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (id: string) => {
    playInkSound('inkSuccess', 0.4);
    try {
      await acceptFriendRequest(id);
      toast.success('Ami ajoute !');
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
    onJoinFriend?.(lobbyCode);
  };

  const copyFriendCode = async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCopied(true);
    playInkSound('inkSuccess', 0.4);
    toast.success('Code copie !');
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
            <Users className="h-8 w-8 text-red-500/50" />
          </div>
          <p className="text-xs text-white/50">
            Connectez-vous pour ajouter des amis
          </p>
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.4);
              signInWithGoogle();
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Se connecter avec Google"
            className="w-full py-3 px-4 bg-red-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-500/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Connexion Google
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-red-500" />
          <h2
            className="text-base font-bold text-red-500"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Mes Amis
          </h2>
          <span className="text-[10px] text-white/40 ml-auto">
            {friends.length} ami(s)
          </span>
        </div>

        {/* Friend Code */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Votre Code Ami
          </label>
          <motion.div
            className="relative group cursor-pointer"
            onClick={copyFriendCode}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="bg-red-500/10 rounded-lg p-2.5 pr-10 font-mono text-xs font-bold text-red-500 tracking-[0.2em] border border-red-500/30 group-hover:border-red-500/50 transition-colors">
              {friendCode || '...'}
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy className="h-3 w-3 text-red-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Add friend */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
            <UserPlus className="h-3 w-3" />
            Ajouter un ami
          </label>
          <div className="flex gap-1.5">
            <Input
              placeholder="CODE AMI..."
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              className="flex-1 h-9 text-xs font-mono uppercase tracking-wider bg-white/5 border-white/10 focus:border-red-500 text-white placeholder:text-white/20"
            />
            <motion.button
              onClick={handleSendRequest}
              disabled={!friendCodeInput.trim() || isSending}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Envoyer une demande d'ami"
              className="h-9 w-9 rounded-lg bg-red-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Pending requests */}
        <AnimatePresence>
          {pendingRequests.length > 0 && (
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
                Demandes ({pendingRequests.length})
              </h3>
              <div className="space-y-1.5">
                {pendingRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-yellow-500/30">
                      <AvatarImage
                        src={request.requesterProfile?.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold">
                        {request.requesterProfile?.display_name
                          ?.charAt(0)
                          ?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-xs font-semibold text-white truncate">
                      {request.requesterProfile?.display_name || 'Inconnu'}
                    </span>
                    <motion.button
                      onClick={() => handleAccept(request.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Accepter la demande"
                      className="h-6 w-6 rounded bg-green-500/20 text-green-500 flex items-center justify-center"
                    >
                      <Check className="h-3 w-3" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleReject(request.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Rejeter la demande"
                      className="h-6 w-6 rounded bg-red-500/20 text-red-500 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends list */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Amis en ligne
          </h3>
          <ScrollArea className="max-h-[180px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 text-red-500 animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-4">
                <Users className="h-6 w-6 text-white/20 mx-auto mb-1" />
                <p className="text-[10px] text-white/30">Aucun ami pour le moment</p>
              </div>
            ) : (
              <div className="space-y-1.5 pr-1">
                {friends.map((friend) => {
                  const status = getUserStatus(friend.user_id);
                  const isOnline = status.online;
                  const lobbyCode = status.lobbyCode;

                  return (
                    <motion.div
                      key={friend.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg',
                        'bg-white/5 border transition-all duration-300',
                        isOnline
                          ? 'border-green-500/20 hover:border-green-500/40'
                          : 'border-white/5 hover:border-white/10',
                      )}
                      whileHover={{ scale: 1.01, x: 2 }}
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            'h-7 w-7 ring-1 transition-all',
                            isOnline ? 'ring-green-500/50' : 'ring-white/10',
                          )}
                        >
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-red-500/20 text-red-500 text-[10px] font-bold">
                            {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <Circle
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5',
                            isOnline
                              ? 'text-green-500 fill-green-500'
                              : 'text-white/30 fill-white/30',
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-white truncate">
                          {friend.display_name}
                        </div>
                        <div
                          className={cn(
                            'text-[9px]',
                            isOnline ? 'text-green-500' : 'text-white/30',
                          )}
                        >
                          {lobbyCode
                            ? 'En partie'
                            : isOnline
                              ? 'En ligne'
                              : 'Hors ligne'}
                        </div>
                      </div>

                      <div className="flex gap-1">
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
                          aria-label={`Message ${friend.display_name}`}
                          className="relative h-6 w-6 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {unreadCounts[friend.user_id] > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                              {unreadCounts[friend.user_id]}
                            </span>
                          )}
                        </motion.button>
                        {lobbyCode && (
                          <motion.button
                            onClick={() => handleJoinFriend(lobbyCode)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label={`Rejoindre ${friend.display_name}`}
                            className="h-6 w-6 rounded bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/30"
                          >
                            <Play className="h-3 w-3" />
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

      <DirectMessageDialog
        open={!!chatFriend}
        onOpenChange={(o) => !o && setChatFriend(null)}
        friend={chatFriend}
      />
    </>
  );
};

export const InkFriendsCard = memo(InkFriendsCardComponent);
