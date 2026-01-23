import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X, Loader2, Circle, Send, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useInkMode } from '@/hooks/useInkMode';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
}

interface LobbyInvitePanelProps {
  lobbyCode: string;
  lobbyId: string;
  players: Player[];
  maxPlayers?: number;
  isHost: boolean;
}

const LobbyInvitePanelComponent = ({
  lobbyCode,
  lobbyId,
  players,
  maxPlayers = 8,
  isHost
}: LobbyInvitePanelProps) => {
  const { isInkMode, inkFont } = useInkMode();
  const { user, profile } = useAuth();
  const { friends, isLoading: friendsLoading } = useFriends();
  const { getUserStatus } = useOnlinePresence(lobbyCode);
  const { sendInvitation, isLoading: invitationLoading } = useGameInvitations();
  const { playSound } = useSoundEffects();
  
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Reset invited friends when panel closes
  useEffect(() => {
    if (!showInvitePanel) {
      setTimeout(() => setInvitedFriends(new Set()), 300);
    }
  }, [showInvitePanel]);

  const handleInvite = async (friendUserId: string, friendName: string) => {
    if (!profile?.display_name) {
      toast.error('Profil non chargé');
      return;
    }
    
    playSound('messageSend', 0.4);
    await sendInvitation(friendUserId, lobbyCode, profile.display_name);
    setInvitedFriends(prev => new Set(prev).add(friendUserId));
  };

  const togglePanel = () => {
    playSound('click', 0.3);
    setShowInvitePanel(!showInvitePanel);
  };

  // Filter friends who are not already in the lobby
  const playerIds = players.map(p => p.id);
  const availableFriends = friends.filter(friend => 
    !playerIds.includes(friend.user_id) &&
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Empty slots
  const emptySlots = Math.max(0, maxPlayers - players.length);

  if (!isHost || !user) return null;

  return (
    <div className="space-y-3">
      {/* Slots Grid - Fortnite Style */}
      <div className="grid grid-cols-4 gap-2">
        {/* Filled player slots */}
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative aspect-square rounded-xl border-2 overflow-hidden",
              isInkMode 
                ? "bg-background border-primary/60" 
                : "bg-gradient-to-br from-primary/20 to-accent/10",
              player.isDisconnected 
                ? "border-warning/50" 
                : isInkMode ? "border-primary/60" : "border-primary/40"
            )}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
              <Avatar className={cn(
                "h-8 w-8 mb-1 border-2",
                isInkMode ? "border-primary/50" : "border-primary/30"
              )}>
                <AvatarFallback className={cn(
                  "text-xs font-bold",
                  isInkMode 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-gradient-to-br from-primary to-accent text-white"
                )}>
                  {player.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-center line-clamp-1 w-full text-foreground">
                {player.name}
              </span>
            </div>
            {/* Connection indicator */}
            <div className={cn(
              "absolute top-1 right-1 w-2 h-2 rounded-full",
              player.isDisconnected 
                ? "bg-warning animate-pulse" 
                : isInkMode ? "bg-primary" : "bg-success"
            )} />
          </motion.div>
        ))}

        {/* Empty slots with invite button */}
        {[...Array(emptySlots)].map((_, index) => (
          <motion.button
            key={`empty-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (players.length + index) * 0.05 }}
            onClick={togglePanel}
            className={cn(
              "relative aspect-square rounded-xl border-2 border-dashed overflow-hidden",
              "transition-all duration-200 group cursor-pointer",
              isInkMode
                ? "border-border bg-background hover:border-primary hover:bg-primary/10"
                : "border-border/40 bg-background/30 hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                isInkMode
                  ? "bg-background border-border group-hover:border-primary group-hover:bg-primary/20"
                  : "bg-background/60 border-border/50 group-hover:border-primary/50 group-hover:bg-primary/10"
              )}>
                <UserPlus className={cn(
                  "h-4 w-4 transition-colors",
                  isInkMode 
                    ? "text-muted-foreground group-hover:text-primary" 
                    : "text-foreground-muted group-hover:text-primary"
                )} />
              </div>
              <span className={cn(
                "text-[9px] mt-1 transition-colors",
                isInkMode 
                  ? "text-muted-foreground group-hover:text-primary" 
                  : "text-foreground-muted group-hover:text-primary"
              )}>
                Inviter
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Invite Panel Modal - Portal style for proper layering */}
      <AnimatePresence>
        {showInvitePanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvitePanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              style={{ pointerEvents: 'auto' }}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md px-4"
              style={{ pointerEvents: 'auto' }}
            >
              <div className={cn(
                "rounded-2xl shadow-2xl overflow-hidden",
                isInkMode 
                  ? "bg-card border-2 border-primary" 
                  : "bg-card/95 backdrop-blur-xl border border-border/30"
              )}>
                {/* Header */}
                <div className={cn(
                  "px-5 py-4 border-b",
                  isInkMode 
                    ? "border-border bg-background" 
                    : "border-border/20 bg-gradient-to-r from-primary/10 to-accent/10"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isInkMode 
                          ? "bg-primary" 
                          : "bg-gradient-to-br from-primary to-accent"
                      )}>
                        <Users className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">Inviter des amis</h3>
                        <p className={cn(
                          "text-xs",
                          isInkMode ? "text-muted-foreground" : "text-foreground-muted"
                        )}>
                          {emptySlots} place{emptySlots > 1 ? 's' : ''} disponible{emptySlots > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowInvitePanel(false)}
                      className={cn(
                        "h-9 w-9 rounded-xl",
                        isInkMode && "hover:bg-primary/20 hover:text-primary"
                      )}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className={cn(
                  "p-4 border-b",
                  isInkMode ? "border-border" : "border-border/20"
                )}>
                  <div className="relative">
                    <Search className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                      isInkMode ? "text-muted-foreground" : "text-foreground-muted"
                    )} />
                    <Input
                      placeholder="Rechercher un ami..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "pl-10",
                        isInkMode ? "bg-background border-2 border-border focus:border-primary" : "bg-background/50"
                      )}
                    />
                  </div>
                </div>

                {/* Friends List */}
                <ScrollArea className="h-[300px]">
                  <div className="p-4 space-y-2">
                    {friendsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : availableFriends.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto mb-3 text-foreground-muted/30" />
                        <p className="text-foreground-muted text-sm">
                          {searchQuery ? 'Aucun résultat' : 'Aucun ami disponible'}
                        </p>
                      </div>
                    ) : (
                      availableFriends.map((friend) => {
                        const status = getUserStatus(friend.user_id);
                        const isOnline = status.online;
                        const isInvited = invitedFriends.has(friend.user_id);
                        const isInGame = !!status.lobbyCode;

                        return (
                          <motion.div
                            key={friend.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl transition-all",
                              isInkMode
                                ? "bg-background border-2 border-border hover:border-primary/50"
                                : "bg-background/40 border border-border/20 hover:border-primary/30"
                            )}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={friend.avatar_url || undefined} />
                                <AvatarFallback className={cn(
                                  "font-bold",
                                  isInkMode 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-gradient-to-br from-primary to-accent text-white"
                                )}>
                                  {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <Circle
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5",
                                  isOnline 
                                    ? isInkMode ? "text-primary fill-primary" : "text-success fill-success" 
                                    : "text-muted-foreground fill-muted-foreground"
                                )}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-foreground">{friend.display_name || 'Joueur'}</div>
                              <div className={cn(
                                "text-xs",
                                isInGame 
                                  ? "text-warning" 
                                  : isOnline 
                                    ? isInkMode ? "text-primary" : "text-success" 
                                    : isInkMode ? "text-muted-foreground" : "text-foreground-muted"
                              )}>
                                {isInGame ? 'En partie' : isOnline ? 'En ligne' : 'Hors ligne'}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isInvited ? "outline" : "default"}
                              disabled={isInvited || invitationLoading || !isOnline}
                              onClick={() => handleInvite(friend.user_id, friend.display_name || 'Joueur')}
                              className={cn(
                                "h-9 min-w-[90px]",
                                isInkMode && !isInvited && "bg-primary text-primary-foreground hover:bg-primary-hover",
                                isInvited && (isInkMode ? "border-primary/50 text-primary" : "border-success/50 text-success")
                              )}
                            >
                              {isInvited ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                  Envoyé
                                </>
                              ) : invitationLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1.5" />
                                  Inviter
                                </>
                              )}
                            </Button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LobbyInvitePanel = memo(LobbyInvitePanelComponent);
