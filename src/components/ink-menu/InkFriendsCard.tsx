import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, UserPlus, Check, X, MessageCircle, LogIn, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useUnreadCounts } from '@/hooks/useDirectMessages';
import { DirectMessageDialog } from '@/components/DirectMessageDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { playInkSound } from '@/hooks/useInkSoundEffects';

const InkFriendsCardComponent = () => {
  const { user, friendCode } = useAuth();
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useFriends();
  const { getUserStatus } = useOnlinePresence();
  const { counts: unreadCounts } = useUnreadCounts();
  const [addCode, setAddCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [dmFriend, setDmFriend] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [dmOpen, setDmOpen] = useState(false);

  const handleCopy = useCallback(() => {
    if (!friendCode) return;
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    playInkSound('inkSuccess', 0.3);
    setTimeout(() => setCopied(false), 2000);
  }, [friendCode]);

  const handleSendRequest = useCallback(async () => {
    if (!addCode.trim() || sending) return;
    setSending(true);
    playInkSound('brushTap', 0.3);
    try {
      await sendFriendRequest(addCode.trim());
      setAddCode('');
    } catch (err) {
      console.error('Friend request error:', err);
      playInkSound('inkError', 0.3);
    } finally {
      setSending(false);
    }
  }, [addCode, sending, sendFriendRequest]);

  const handleAccept = useCallback(async (id: string) => {
    playInkSound('inkSuccess', 0.3);
    await acceptFriendRequest(id);
  }, [acceptFriendRequest]);

  const handleReject = useCallback(async (id: string) => {
    playInkSound('paperSlide', 0.3);
    await rejectFriendRequest(id);
  }, [rejectFriendRequest]);

  const handleOpenDm = useCallback((friend: { user_id: string; display_name: string | null; avatar_url: string | null }) => {
    playInkSound('brushTap', 0.3);
    setDmFriend(friend);
    setDmOpen(true);
  }, []);

  if (!user) {
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
        <Users className="w-8 h-8 text-white/20" />
        <p className="text-white/40 text-xs text-center">Connectez-vous pour voir vos amis</p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-white">Amis</span>
        <span className="text-xs text-white/30 ml-auto">{friends.length} ami{friends.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Friend Code Section */}
      <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
        <div className="text-[10px] text-white/40 mb-1">Mon code ami</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-red-400 tracking-wider">{friendCode || '...'}</code>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </motion.div>
              ) : (
                <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Copy className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Add Friend Input */}
      <div className="flex items-center gap-1.5">
        <Input
          value={addCode}
          onChange={(e) => setAddCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest(); }}
          placeholder="Code ami..."
          className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
          maxLength={10}
        />
        <motion.button
          onClick={handleSendRequest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!addCode.trim() || sending}
          className="h-8 px-2.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium disabled:opacity-40 flex items-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Pending Requests */}
      <AnimatePresence>
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <div className="text-[10px] text-yellow-400/80 font-medium">Demandes en attente</div>
            {pendingRequests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 bg-yellow-500/5 rounded-lg p-2 border border-yellow-500/10"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={req.requesterProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                    {req.requesterProfile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/80 flex-1 truncate">{req.requesterProfile?.display_name || 'Player'}</span>
                <motion.button
                  onClick={() => handleAccept(req.id)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"
                >
                  <Check className="w-3 h-3" />
                </motion.button>
                <motion.button
                  onClick={() => handleReject(req.id)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"
                >
                  <X className="w-3 h-3" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends List */}
      <ScrollArea className="max-h-[180px]">
        <div className="space-y-1">
          {friends.length === 0 ? (
            <p className="text-center text-xs text-white/30 py-3">Aucun ami pour le moment</p>
          ) : (
            friends.map((friend) => {
              const status = getUserStatus(friend.user_id);
              const unread = unreadCounts[friend.user_id] || 0;
              return (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="relative">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-white/10 text-white/60 text-[10px]">
                        {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black/80 ${status.online ? 'bg-green-400' : 'bg-white/20'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/80 truncate">{friend.display_name || 'Player'}</div>
                    {status.online && status.lobbyCode && (
                      <div className="text-[10px] text-green-400/70">En partie</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => handleOpenDm(friend)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="relative w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </motion.button>
                    {status.online && status.lobbyCode && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"
                      >
                        <LogIn className="w-3 h-3" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* DM Dialog */}
      <DirectMessageDialog open={dmOpen} onOpenChange={setDmOpen} friend={dmFriend} />
    </div>
  );
};

export const InkFriendsCard = memo(InkFriendsCardComponent);
