import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X, Loader2, Send, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
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
  /**
   * When true, render the friends list directly without the slots grid +
   * second modal. Useful when the panel is already inside its own modal/drawer
   * (e.g. the InkLobbyScreen invite drawer) so we don't stack a second modal
   * on top.
   */
  inlineMode?: boolean;
}

/* ============================================================
   GRAFFITI CARTOON PALETTE — used when isInkMode is active
============================================================ */
const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';

const LobbyInvitePanelComponent = ({
  lobbyCode,
  lobbyId,
  players,
  maxPlayers = 8,
  isHost,
  inlineMode = false,
}: LobbyInvitePanelProps) => {
  const { isInkMode } = useInkMode();
  const { user, profile } = useAuth();
  const { friends, isLoading: friendsLoading } = useFriends();
  const { getUserStatus } = useOnlinePresence(lobbyCode);
  const { sendInvitation, isLoading: invitationLoading } = useGameInvitations();
  const { playSound } = useSoundEffects();

  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!showInvitePanel) {
      setTimeout(() => setInvitedFriends(new Set()), 300);
    }
  }, [showInvitePanel]);

  // The secondary invite modal had no keyboard exit.
  useEscapeKey(showInvitePanel, useCallback(() => setShowInvitePanel(false), []));

  const handleInvite = async (friendUserId: string, _friendName: string) => {
    if (!profile?.display_name) {
      toast.error('Profil non chargé');
      return;
    }
    playSound('messageSend', 0.4);
    await sendInvitation(friendUserId, lobbyCode, profile.display_name);
    setInvitedFriends((prev) => new Set(prev).add(friendUserId));
  };

  const togglePanel = () => {
    playSound('click', 0.3);
    setShowInvitePanel(!showInvitePanel);
  };

  const playerIds = players.map((p) => p.id);
  const availableFriends = friends.filter(
    (friend) =>
      !playerIds.includes(friend.user_id) &&
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const emptySlots = Math.max(0, maxPlayers - players.length);

  if (!isHost || !user) return null;

  /* =========================================================
     GRAFFITI / CARTOON RENDER (when in ink mode)
  ========================================================= */
  if (isInkMode) {
    /* When the panel is rendered inline (e.g. inside the InkLobbyScreen
       invite drawer), skip the slots grid + extra modal and just show the
       search bar + friends list. The drawer is already a modal — stacking a
       second modal on top was confusing and broke clicks. */
    if (inlineMode) {
      return (
        <div className="flex flex-col gap-3">
          <p
            className="text-sm text-purple-200/80 font-bold"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            {emptySlots} place{emptySlots > 1 ? 's' : ''} dispo
            {emptySlots > 1 ? 's' : ''} dans le lobby !
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300 z-[1] pointer-events-none" />
            <Input
              placeholder="Cherche un ami…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 text-white placeholder:text-purple-200/40 font-bold rounded-xl h-11"
              style={{
                fontFamily: "'Caveat', cursive",
                border: '3px solid #0a0810',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
              }}
            />
          </div>

          <div className="space-y-2">
            {friendsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
              </div>
            ) : availableFriends.length === 0 ? (
              <div className="text-center py-10">
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-6xl mb-3 inline-block"
                >
                  🥺
                </motion.div>
                <p
                  className="text-lg font-black text-white/80"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  {searchQuery ? 'Aucun résultat…' : 'Aucun ami dispo !'}
                </p>
                {!searchQuery && (
                  <p
                    className="text-sm text-white/50 mt-1"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Ajoute-en depuis le panneau Amis 👋
                  </p>
                )}
              </div>
            ) : (
              availableFriends.map((friend, idx) => {
                const status = getUserStatus(friend.user_id);
                const isOnline = status.online;
                const isInvited = invitedFriends.has(friend.user_id);
                const isInGame = !!status.lobbyCode;

                return (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -20, rotate: -3 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      rotate: idx % 2 === 0 ? -0.6 : 0.6,
                    }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))',
                      border: '2.5px solid #0a0810',
                      boxShadow:
                        '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11 ring-2 ring-[#0a0810]">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback
                          className="font-black text-white text-base"
                          style={{
                            background:
                              'linear-gradient(135deg, #a855f7, #6b21a8)',
                          }}
                        >
                          {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0810]',
                          isInGame
                            ? 'bg-amber-400'
                            : isOnline
                              ? 'bg-emerald-400'
                              : 'bg-zinc-500',
                        )}
                        style={{
                          boxShadow:
                            isOnline && !isInGame
                              ? '0 0 8px rgba(52,211,153,0.7)'
                              : 'none',
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="font-black text-lg text-white truncate leading-none"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {friend.display_name || 'Joueur'}
                      </div>
                      <div
                        className={cn(
                          'text-xs font-bold mt-0.5 flex items-center gap-1',
                          isInGame
                            ? 'text-amber-300'
                            : isOnline
                              ? 'text-emerald-300'
                              : 'text-white/40',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isInGame
                              ? 'bg-amber-400'
                              : isOnline
                                ? 'bg-emerald-400'
                                : 'bg-zinc-500',
                          )}
                        />
                        {isInGame
                          ? 'EN PARTIE'
                          : isOnline
                            ? 'EN LIGNE'
                            : 'HORS LIGNE'}
                      </div>
                    </div>

                    <motion.button
                      whileHover={!isInvited ? { scale: 1.05, rotate: -2 } : undefined}
                      whileTap={!isInvited ? { scale: 0.95 } : undefined}
                      disabled={isInvited || invitationLoading}
                      onClick={() =>
                        handleInvite(friend.user_id, friend.display_name || 'Joueur')
                      }
                      className={cn(
                        'h-10 min-w-[90px] px-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 transition-opacity',
                        isInvited && 'opacity-60',
                      )}
                      style={{
                        background: isInvited
                          ? 'linear-gradient(180deg, #34d399, #059669)'
                          : 'linear-gradient(180deg, #fbbf24, #d97706)',
                        border: '2.5px solid #0a0810',
                        boxShadow: '0 3px 0 #0a0810',
                        color: 'white',
                        fontFamily: "'Caveat', cursive",
                        textShadow:
                          '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                      }}
                    >
                      {isInvited ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                          <span className="text-base">Envoyé</span>
                        </>
                      ) : invitationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" strokeWidth={2.5} />
                          <span className="text-base">Inviter</span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* SLOTS GRID — graffiti style */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span
              className="text-base font-black text-white/90"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              ÉQUIPE ({players.length}/{maxPlayers})
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Filled slots */}
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: index % 2 === 0 ? -2 : 2 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 220 }}
                className="relative aspect-square rounded-2xl overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(126,34,206,0.4))',
                  border: '3px solid #0a0810',
                  boxShadow:
                    '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.08)',
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                  <Avatar className="h-8 w-8 mb-1 ring-2 ring-[#0a0810]">
                    <AvatarFallback
                      className="text-xs font-black text-white"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="text-[11px] font-black text-center line-clamp-1 w-full text-white"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {player.name}
                  </span>
                </div>
                {/* Connection dot */}
                <div
                  className={cn(
                    'absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0a0810]',
                    player.isDisconnected
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400',
                  )}
                />
              </motion.div>
            ))}

            {/* Empty slots */}
            {[...Array(emptySlots)].map((_, index) => (
              <motion.button
                key={`empty-${index}`}
                initial={{ opacity: 0, scale: 0.8, rotate: 6 }}
                animate={{ opacity: 1, scale: 1, rotate: index % 2 === 0 ? 2 : -2 }}
                whileHover={{ scale: 1.06, rotate: 0 }}
                whileTap={{ scale: 0.94 }}
                transition={{ delay: (players.length + index) * 0.05 }}
                onClick={togglePanel}
                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  background: 'rgba(168,85,247,0.05)',
                  border: '3px dashed rgba(168,85,247,0.5)',
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                    style={{
                      background: 'rgba(168,85,247,0.15)',
                      border: '2px solid rgba(168,85,247,0.5)',
                    }}
                  >
                    <UserPlus className="h-4 w-4 text-purple-300 group-hover:text-purple-200" />
                  </div>
                  <span
                    className="text-[11px] mt-1 font-black text-purple-300 group-hover:text-white transition-colors"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Inviter
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ============== GRAFFITI MODAL ============== */}
        <AnimatePresence>
          {showInvitePanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowInvitePanel(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
                exit={{ opacity: 0, scale: 0.85, y: 30, rotate: 2 }}
                transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col px-4"
              >
                <div
                  className="relative rounded-3xl overflow-hidden flex flex-col min-h-0 max-h-full"
                  style={{
                    background:
                      'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                    border: '4px solid #0a0810',
                    boxShadow:
                      '0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Inner accent border */}
                  <div
                    className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
                    style={{
                      border: '2px solid rgba(168,85,247,0.4)',
                    }}
                  />

                  {/* Decorative graffiti stars */}
                  <Sparkles
                    className="absolute top-3 left-3 w-4 h-4 text-amber-400 z-10 select-none pointer-events-none"
                    style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
                  />
                  <Sparkles
                    className="absolute top-3 right-12 w-3.5 h-3.5 text-pink-400 z-10 select-none pointer-events-none"
                    style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
                  />

                  {/* HEADER */}
                  <div
                    className="relative px-5 py-4 flex items-center justify-between"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                      borderBottom: '3px solid #0a0810',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                          border: '3px solid #0a0810',
                          boxShadow:
                            '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                        }}
                      >
                        <Users className="h-6 w-6 text-white" strokeWidth={2.5} />
                      </motion.div>
                      <div>
                        <h3
                          className="font-black text-2xl leading-none text-white"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW,
                          }}
                        >
                          Inviter des amis
                        </h3>
                        <p
                          className="text-sm text-purple-200/80 font-bold mt-0.5"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          {emptySlots} place{emptySlots > 1 ? 's' : ''} dispo
                          {emptySlots > 1 ? 's' : ''} !
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowInvitePanel(false)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{
                        background: 'rgba(239,68,68,0.2)',
                        border: '2.5px solid #0a0810',
                        boxShadow: '0 3px 0 #0a0810',
                      }}
                    >
                      <X className="h-5 w-5" strokeWidth={3} />
                    </motion.button>
                  </div>

                  {/* SEARCH */}
                  <div
                    className="px-5 py-3 relative z-[1]"
                    style={{ borderBottom: '2px solid rgba(168,85,247,0.2)' }}
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300 z-[1] pointer-events-none" />
                      <Input
                        placeholder="Cherche un ami…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-black/40 text-white placeholder:text-purple-200/40 font-bold rounded-xl h-11"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          border: '3px solid #0a0810',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                        }}
                      />
                    </div>
                  </div>

                  {/* FRIENDS LIST */}
                  <ScrollArea className="h-[300px] relative z-[1]">
                    <div className="p-4 space-y-2">
                      {friendsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
                        </div>
                      ) : availableFriends.length === 0 ? (
                        <div className="text-center py-10">
                          <motion.div
                            animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
                            transition={{
                              duration: 2.4,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="text-6xl mb-3 inline-block"
                          >
                            🥺
                          </motion.div>
                          <p
                            className="text-lg font-black text-white/80"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW,
                            }}
                          >
                            {searchQuery
                              ? 'Aucun résultat…'
                              : 'Aucun ami dispo !'}
                          </p>
                        </div>
                      ) : (
                        availableFriends.map((friend, idx) => {
                          const status = getUserStatus(friend.user_id);
                          const isOnline = status.online;
                          const isInvited = invitedFriends.has(friend.user_id);
                          const isInGame = !!status.lobbyCode;

                          return (
                            <motion.div
                              key={friend.id}
                              initial={{ opacity: 0, x: -20, rotate: -3 }}
                              animate={{
                                opacity: 1,
                                x: 0,
                                rotate: idx % 2 === 0 ? -0.6 : 0.6,
                              }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex items-center gap-3 p-3 rounded-2xl"
                              style={{
                                background:
                                  'linear-gradient(180deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))',
                                border: '2.5px solid #0a0810',
                                boxShadow:
                                  '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.06)',
                              }}
                            >
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-11 w-11 ring-2 ring-[#0a0810]">
                                  <AvatarImage src={friend.avatar_url || undefined} />
                                  <AvatarFallback
                                    className="font-black text-white text-base"
                                    style={{
                                      background:
                                        'linear-gradient(135deg, #a855f7, #6b21a8)',
                                    }}
                                  >
                                    {friend.display_name?.charAt(0)?.toUpperCase() ||
                                      '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className={cn(
                                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0810]',
                                    isInGame
                                      ? 'bg-amber-400'
                                      : isOnline
                                        ? 'bg-emerald-400'
                                        : 'bg-zinc-500',
                                  )}
                                  style={{
                                    boxShadow:
                                      isOnline && !isInGame
                                        ? '0 0 8px rgba(52,211,153,0.7)'
                                        : 'none',
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div
                                  className="font-black text-lg text-white truncate leading-none"
                                  style={{ fontFamily: "'Caveat', cursive" }}
                                >
                                  {friend.display_name || 'Joueur'}
                                </div>
                                <div
                                  className={cn(
                                    'text-xs font-bold mt-0.5 flex items-center gap-1',
                                    isInGame
                                      ? 'text-amber-300'
                                      : isOnline
                                        ? 'text-emerald-300'
                                        : 'text-white/40',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      isInGame
                                        ? 'bg-amber-400'
                                        : isOnline
                                          ? 'bg-emerald-400'
                                          : 'bg-zinc-500',
                                    )}
                                  />
                                  {isInGame
                                    ? 'EN PARTIE'
                                    : isOnline
                                      ? 'EN LIGNE'
                                      : 'HORS LIGNE'}
                                </div>
                              </div>

                              <motion.button
                                whileHover={
                                  !isInvited
                                    ? { scale: 1.05, rotate: -2 }
                                    : undefined
                                }
                                whileTap={
                                  !isInvited ? { scale: 0.95 } : undefined
                                }
                                disabled={isInvited || invitationLoading}
                                onClick={() =>
                                  handleInvite(
                                    friend.user_id,
                                    friend.display_name || 'Joueur',
                                  )
                                }
                                className={cn(
                                  'h-10 min-w-[90px] px-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 transition-opacity',
                                  isInvited && 'opacity-60',
                                )}
                                style={{
                                  background: isInvited
                                    ? 'linear-gradient(180deg, #34d399, #059669)'
                                    : 'linear-gradient(180deg, #fbbf24, #d97706)',
                                  border: '2.5px solid #0a0810',
                                  boxShadow: '0 3px 0 #0a0810',
                                  color: 'white',
                                  fontFamily: "'Caveat', cursive",
                                  textShadow:
                                    '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                                }}
                              >
                                {isInvited ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                                    <span className="text-base">Envoyé</span>
                                  </>
                                ) : invitationLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                    <span className="text-base">Inviter</span>
                                  </>
                                )}
                              </motion.button>
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
  }

  /* =========================================================
     LEGACY (NON-INK) RENDER — kept for compatibility
  ========================================================= */
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'relative aspect-square rounded-xl border-2 overflow-hidden',
              'bg-gradient-to-br from-primary/20 to-accent/10',
              player.isDisconnected ? 'border-warning/50' : 'border-primary/40',
            )}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
              <Avatar className="h-8 w-8 mb-1 border-2 border-primary/30">
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-accent text-white">
                  {player.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-center line-clamp-1 w-full text-foreground">
                {player.name}
              </span>
            </div>
            <div
              className={cn(
                'absolute top-1 right-1 w-2 h-2 rounded-full',
                player.isDisconnected ? 'bg-warning animate-pulse' : 'bg-success',
              )}
            />
          </motion.div>
        ))}

        {[...Array(emptySlots)].map((_, index) => (
          <motion.button
            key={`empty-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (players.length + index) * 0.05 }}
            onClick={togglePanel}
            className="relative aspect-square rounded-xl border-2 border-dashed border-border/40 bg-background/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-background/60 border border-border/50 group-hover:border-primary/50 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                <UserPlus className="h-4 w-4 text-foreground-muted group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[9px] mt-1 text-foreground-muted group-hover:text-primary transition-colors">
                Inviter
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {showInvitePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvitePanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col px-4"
            >
              <div className="rounded-2xl shadow-2xl overflow-hidden bg-card/95 backdrop-blur-xl border border-border/30 flex flex-col min-h-0 max-h-full">
                <div className="px-5 py-4 border-b border-border/20 bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-accent">
                        <Users className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">
                          Inviter des amis
                        </h3>
                        <p className="text-xs text-foreground-muted">
                          {emptySlots} place{emptySlots > 1 ? 's' : ''} disponible
                          {emptySlots > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowInvitePanel(false)}
                      className="h-9 w-9 rounded-xl"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 border-b border-border/20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                    <Input
                      placeholder="Rechercher un ami..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50"
                    />
                  </div>
                </div>

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
                            className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/20 hover:border-primary/30 transition-all"
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={friend.avatar_url || undefined} />
                                <AvatarFallback className="font-bold bg-gradient-to-br from-primary to-accent text-white">
                                  {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-foreground">
                                {friend.display_name || 'Joueur'}
                              </div>
                              <div
                                className={cn(
                                  'text-xs',
                                  isInGame
                                    ? 'text-warning'
                                    : isOnline
                                      ? 'text-success'
                                      : 'text-foreground-muted',
                                )}
                              >
                                {isInGame
                                  ? 'En partie'
                                  : isOnline
                                    ? 'En ligne'
                                    : 'Hors ligne'}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isInvited ? 'outline' : 'default'}
                              disabled={isInvited || invitationLoading || !isOnline}
                              onClick={() =>
                                handleInvite(
                                  friend.user_id,
                                  friend.display_name || 'Joueur',
                                )
                              }
                              className={cn(
                                'h-9 min-w-[90px]',
                                isInvited && 'border-success/50 text-success',
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
