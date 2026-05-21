import { useState, memo, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { useUndercoverSfx } from '@/hooks/useUndercoverSfx';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  Send,
  Skull,
  Timer,
  UserX,
  Vote,
  HelpCircle,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface UndercoverGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

/* ============================================================
   CARTOON GRAFFITI PALETTE
============================================================ */
const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

// Role/word data is intentionally NOT exposed in the UI:
// - Civilians know their word (just a regular word)
// - Undercover get a *different* word but are NEVER told "you are undercover"
// - Mr White gets no word and just sees "???" without being labelled
// The phase tinting and final word reveal are the only public signals.
const PHASE_LABELS: Record<string, string> = {
  word_reveal: 'Découverte du mot',
  clue_giving: "Phase d'indices",
  discussion: 'Discussion',
  voting: 'Vote',
  vote_result: 'Résultat',
  game_over: 'Fin de partie',
};

// Phase accent — keeps the lobby/menu cartoon palette
const PHASE_THEME: Record<string, string> = {
  word_reveal: '#a855f7', // purple
  clue_giving: '#06b6d4', // cyan
  discussion: '#34d399', // green
  voting: '#ef4444', // red
  vote_result: '#fbbf24', // yellow
  game_over: '#fbbf24', // yellow
};

/* ============================================================
   Reusable cartoon primitives
============================================================ */

/** Cartoon card with 3D black shadow + optional inner accent border. */
const CartoonCard = ({
  className,
  accent,
  children,
  rotate = 0,
  innerAccent = true,
}: {
  className?: string;
  accent?: string;
  children: React.ReactNode;
  rotate?: number;
  innerAccent?: boolean;
}) => (
  <div
    className={cn('relative rounded-3xl overflow-hidden', className)}
    style={{
      background:
        'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
      border: '4px solid #0a0810',
      boxShadow:
        '0 8px 0 #0a0810, 0 14px 30px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.06)',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
    }}
  >
    {innerAccent && accent && (
      <div
        className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
        style={{ border: `2px solid ${accent}66` }}
      />
    )}
    {children}
  </div>
);

/** Cartoon button with bold 3D shadow. */
const CartoonButton = ({
  children,
  onClick,
  color = '#a855f7',
  disabled = false,
  variant = 'filled',
  className = '',
  compact = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  className?: string;
  compact?: boolean;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.04, rotate: -1.5 } : undefined}
    whileTap={!disabled ? { scale: 0.96 } : undefined}
    className={cn(
      'relative inline-flex items-center justify-center gap-2 rounded-2xl transition-opacity',
      compact ? 'px-3 py-2' : 'px-5 py-3',
      disabled && 'opacity-50 cursor-not-allowed',
      className,
    )}
    style={{
      background:
        variant === 'filled'
          ? `linear-gradient(180deg, ${color}, ${color}cc)`
          : 'transparent',
      border:
        variant === 'filled' ? '3px solid #0a0810' : `3px solid ${color}`,
      boxShadow:
        variant === 'filled'
          ? '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)'
          : 'none',
      color: 'white',
      fontFamily: "'Caveat', cursive",
      textShadow: variant === 'filled' ? GRAFFITI_TEXT_SHADOW_SM : undefined,
    }}
  >
    <span
      className={cn(
        'relative font-black leading-none',
        compact ? 'text-base' : 'text-xl',
      )}
    >
      {children}
    </span>
  </motion.button>
);

/** Cartoon stamp badge (for "À TOI", "Suspect", etc.). */
const StampBadge = ({
  color,
  children,
  rotate = -8,
}: {
  color: string;
  children: React.ReactNode;
  rotate?: number;
}) => (
  <div
    className="relative px-2.5 py-1 inline-flex items-center justify-center rounded-lg"
    style={{
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      border: '2.5px solid #0a0810',
      boxShadow: '0 3px 0 #0a0810',
      transform: `rotate(${rotate}deg)`,
    }}
  >
    <span
      className="text-xs font-black uppercase tracking-wider text-white leading-none"
      style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
    >
      {children}
    </span>
  </div>
);

/** Hand-drawn arrow between players. */
const DoodleArrow = ({ color, glow = false }: { color: string; glow?: boolean }) => (
  <svg
    className="w-8 h-10 flex-shrink-0"
    viewBox="0 0 40 40"
    fill="none"
    style={{ filter: glow ? `drop-shadow(0 0 6px ${color})` : undefined }}
  >
    <path
      d="M4,20 Q12,18 24,20 Q30,21 33,20"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M27,13 L34,20 L27,27"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ============================================================
   Discussion timer
============================================================ */

const DiscussionTimer = ({ accent }: { accent: string }) => {
  const total = 60;
  const [seconds, setSeconds] = useState(total);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  const pct = (seconds / total) * 100;
  const urgent = seconds <= 10;
  const color = urgent ? '#ef4444' : accent;

  return (
    <CartoonCard accent={color} className="px-5 py-3" innerAccent={false}>
      <div className="relative flex items-center gap-3">
        <motion.div
          animate={urgent ? { scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            border: '2.5px solid #0a0810',
            boxShadow: '0 3px 0 #0a0810',
          }}
        >
          <Timer className="w-4 h-4 text-white" strokeWidth={2.5} />
        </motion.div>
        <div
          className="flex-1 h-3 rounded-full overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid #0a0810',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            style={{
              background: urgent
                ? 'linear-gradient(90deg, #fbbf24, #ef4444)'
                : `linear-gradient(90deg, ${color}, ${color}cc)`,
              boxShadow: `0 0 8px ${color}88`,
            }}
          />
        </div>
        <span
          className={cn(
            'font-black text-2xl tabular-nums leading-none',
            urgent && 'animate-pulse',
          )}
          style={{
            color: 'white',
            fontFamily: "'Caveat', cursive",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          {seconds}s
        </span>
      </div>
    </CartoonCard>
  );
};

/* ============================================================
   Main screen
============================================================ */

export const UndercoverGameScreen = memo(
  ({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
    const {
      game,
      gamePlayers,
      myPlayer,
      loading,
      alivePlayers,
      currentTurnPlayerId,
      isMyTurn,
      hasSeenWord,
      submitClue,
      submitVote,
      startVoting,
      nextRound,
      confirmWordSeen,
      startCluePhase,
    } = useUndercoverGame(lobbyId, currentPlayer, players);

    const [clueInput, setClueInput] = useState('');
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [showWord, setShowWord] = useState(false);
    const [showWordModal, setShowWordModal] = useState(false);

    const accent = game ? PHASE_THEME[game.phase] ?? '#a855f7' : '#a855f7';

    const handleSubmitClue = useCallback(() => {
      const trimmed = clueInput.trim();
      if (!trimmed) return;
      submitClue(trimmed);
      setClueInput('');
    }, [clueInput, submitClue]);

    const handleVote = useCallback(() => {
      if (!selectedVote) return;
      submitVote(selectedVote);
      setHasVoted(true);
    }, [selectedVote, submitVote]);

    useEffect(() => {
      if (game?.phase === 'voting') {
        setHasVoted(false);
        setSelectedVote(null);
      }
    }, [game?.phase]);

    // ⚠️ HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN
    const orderedPlayers = useMemo(() => {
      if (!game) return [] as typeof gamePlayers;
      const byId = new Map(gamePlayers.map((p) => [p.player_id, p]));
      const ordered = game.player_order
        .map((id) => byId.get(id))
        .filter(Boolean) as typeof gamePlayers;
      gamePlayers.forEach((p) => {
        if (!ordered.find((o) => o.player_id === p.player_id)) ordered.push(p);
      });
      return ordered;
    }, [game, gamePlayers]);

    const playerIds = useMemo(
      () => orderedPlayers.map((p) => p.player_id),
      [orderedPlayers],
    );
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    // Flashlight reveal animation state
    const [revealAnimDone, setRevealAnimDone] = useState(false);

    // Reset reveal animation when entering vote_result
    useEffect(() => {
      if (game?.phase === 'vote_result') {
        setRevealAnimDone(false);
        // Animation lasts 3.5s then reveals the result
        const timer = setTimeout(() => setRevealAnimDone(true), 3500);
        return () => clearTimeout(timer);
      }
    }, [game?.phase, game?.eliminated_player_id]);

    // Undercover SFX — auto-plays music at key moments
    useUndercoverSfx({
      phase: game?.phase ?? '',
      round: game?.current_round ?? 1,
      eliminatedRole: game?.eliminated_role ?? null,
      isVoteResult: game?.phase === 'vote_result' && !!game?.eliminated_player_id,
      isRevealAnimationDone: revealAnimDone,
    });

    if (loading || !game) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0810]">
          <div className="text-center space-y-4">
            <motion.div
              className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              style={{
                background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                border: '4px solid #0a0810',
                boxShadow:
                  '0 5px 0 #0a0810, 0 10px 24px rgba(168,85,247,0.5)',
              }}
            >
              <Loader2 className="w-8 h-8 text-white" strokeWidth={2.5} />
            </motion.div>
            <p
              className="text-2xl font-black text-white/85"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              Préparation du chaos…
            </p>
          </div>
        </div>
      );
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;

    return (
      <div className="min-h-screen bg-[#0a0510] text-white relative overflow-x-hidden">
        {/* ============= BACKGROUND ============= */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0820] via-[#0a0510] to-[#160a26]" />
          <AnimatePresence mode="sync">
            <motion.div
              key={game.phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <div
                className="absolute top-0 left-1/3 w-[700px] h-[400px] rounded-full opacity-25"
                style={{
                  background: `radial-gradient(ellipse, ${accent}66 0%, transparent 70%)`,
                  filter: 'blur(100px)',
                }}
              />
              <div
                className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
                style={{
                  background: `radial-gradient(ellipse, ${accent}55 0%, transparent 70%)`,
                  filter: 'blur(80px)',
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ============= HEADER ============= */}
        <header className="relative z-10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                border: '3px solid #0a0810',
                boxShadow:
                  '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
              }}
            >
              <UserX className="w-5 h-5 text-white" strokeWidth={2.5} />
            </motion.div>
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-white/55 font-black"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Manche {game.current_round}
              </p>
              <h1
                className="text-3xl font-black tracking-tight leading-none text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                {PHASE_LABELS[game.phase] ?? game.phase}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Vivants pill */}
            <div
              className="px-3 py-1.5 rounded-2xl flex items-center gap-2"
              style={{
                background:
                  'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))',
                border: '2.5px solid #0a0810',
                boxShadow: '0 3px 0 #0a0810',
              }}
            >
              <span
                className="text-[10px] uppercase tracking-wider text-white/60 font-black"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Vivants
              </span>
              <span
                className="text-base font-black leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#34d399',
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                {alivePlayers.length}/{players.length}
              </span>
            </div>

            {game.phase === 'voting' && (
              <div
                className="px-3 py-1.5 rounded-2xl flex items-center gap-2"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(127,29,29,0.05))',
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-wider text-white/60 font-black"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Votes
                </span>
                <span
                  className="text-base font-black leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#ef4444',
                    textShadow: GRAFFITI_TEXT_SHADOW_SM,
                  }}
                >
                  {votedCount}/{alivePlayers.length}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* TIMER (only on discussion) */}
        {game.phase === 'discussion' && (
          <div className="relative z-10 mx-auto max-w-2xl px-5 mb-4">
            <DiscussionTimer accent={accent} />
          </div>
        )}

        {/* ============= PLAYERS RELAY ============= */}
        <div className="relative z-10 mb-6 overflow-x-auto pb-4 px-5 custom-scrollbar">
          <div className="flex min-w-max items-center justify-center gap-3 py-6">
            {orderedPlayers.map((player, idx) => {
              const isCurrent =
                currentTurnPlayerId === player.player_id &&
                game.phase === 'clue_giving';
              const isMe = player.player_id === currentPlayer.id;
              const isEliminated = !player.is_alive;
              const canVote =
                game.phase === 'voting' &&
                Boolean(myPlayer?.is_alive) &&
                !hasVoted &&
                player.player_id !== currentPlayer.id &&
                player.is_alive;
              const isSelected = selectedVote === player.player_id;
              const history =
                (player as { clue_history?: string[] }).clue_history ?? [];
              const lastClue = history[history.length - 1] ?? player.current_clue;
              const isLiveTyping =
                isMe &&
                isMyTurn &&
                game.phase === 'clue_giving' &&
                Boolean(myPlayer?.is_alive) &&
                clueInput.trim().length > 0;
              const displayClue = isLiveTyping ? clueInput.trim() : lastClue;
              // Roles are NEVER revealed on the player relay — even at game over.
              // Only the dominant words are shown in the game-over panel.
              const playerColor = isMe ? '#06b6d4' : '#a855f7';

              return (
                <div key={player.id} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-2 w-32">
                    {/* MOT bubble (above) */}
                    <div className="relative h-14 w-full flex items-end justify-center">
                      <AnimatePresence mode="wait">
                        {displayClue ? (
                          <motion.div
                            key={
                              isLiveTyping
                                ? `live-${isMe}`
                                : `final-${displayClue}`
                            }
                            initial={{
                              scale: 0.3,
                              y: 20,
                              opacity: 0,
                              rotate: -8,
                            }}
                            animate={{
                              scale: isLiveTyping ? [1, 1.06, 1] : 1,
                              y: 0,
                              opacity: 1,
                              rotate: idx % 2 === 0 ? -3 : 3,
                            }}
                            exit={{ scale: 0.3, opacity: 0, y: -10 }}
                            transition={
                              isLiveTyping
                                ? { duration: 0.18 }
                                : {
                                    type: 'spring',
                                    stiffness: 360,
                                    damping: 14,
                                  }
                            }
                            className="relative px-3 py-1.5 max-w-full rounded-xl"
                            style={{
                              background: isLiveTyping
                                ? 'linear-gradient(180deg, #06b6d4, #0e7490)'
                                : isCurrent
                                  ? `linear-gradient(180deg, ${accent}, ${accent}cc)`
                                  : 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))',
                              border: '2.5px solid #0a0810',
                              boxShadow: '0 3px 0 #0a0810',
                            }}
                          >
                            <span
                              className="block truncate max-w-[7rem] text-base font-black leading-none"
                              style={{
                                fontFamily: "'Caveat', cursive",
                                color:
                                  isLiveTyping || isCurrent ? 'white' : '#0a0810',
                                textShadow:
                                  isLiveTyping || isCurrent
                                    ? GRAFFITI_TEXT_SHADOW_SM
                                    : 'none',
                              }}
                            >
                              {displayClue}
                              {isLiveTyping && (
                                <motion.span
                                  className="ml-0.5 inline-block"
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                  }}
                                >
                                  |
                                </motion.span>
                              )}
                            </span>
                          </motion.div>
                        ) : (
                          <div
                            className="px-3 py-1 rounded-xl"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '2.5px dashed rgba(255,255,255,0.2)',
                            }}
                          >
                            <span
                              className="text-xs font-bold text-white/40 italic leading-none"
                              style={{ fontFamily: "'Caveat', cursive" }}
                            >
                              mot…
                            </span>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Cartoon avatar */}
                    <motion.button
                      type="button"
                      whileHover={canVote ? { y: -3, scale: 1.05 } : undefined}
                      whileTap={canVote ? { scale: 0.97 } : undefined}
                      onClick={
                        canVote
                          ? () => setSelectedVote(player.player_id)
                          : undefined
                      }
                      disabled={!canVote}
                      className={cn(
                        'relative w-20 h-20 rounded-full flex items-center justify-center transition-all',
                        canVote && 'cursor-pointer',
                        !canVote && 'cursor-default',
                        isEliminated && 'opacity-40 saturate-50',
                      )}
                      animate={
                        isCurrent ? { y: [0, -4, 0] } : undefined
                      }
                      transition={
                        isCurrent
                          ? {
                              duration: 1.6,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }
                          : undefined
                      }
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                          : isCurrent
                            ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                            : `linear-gradient(135deg, ${playerColor}, ${playerColor}cc)`,
                        border: '4px solid #0a0810',
                        boxShadow: isCurrent
                          ? `0 5px 0 #0a0810, 0 0 16px ${accent}99`
                          : isSelected
                            ? '0 5px 0 #0a0810, 0 0 16px rgba(239,68,68,0.7)'
                            : '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      {/* Avatar content */}
                      <div className="relative flex items-center justify-center">
                        {isEliminated ? (
                          <Skull className="w-9 h-9 text-white/70" />
                        ) : (() => {
                          const av = getAvatar(player.player_id);
                          if (av.type === 'image' && av.imageUrl) {
                            return (
                              <img
                                src={av.imageUrl}
                                alt={player.player_name}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#0a0810]"
                              />
                            );
                          }
                          return (
                            <span
                              className="text-3xl font-black leading-none text-white"
                              style={{
                                fontFamily: "'Caveat', cursive",
                                textShadow: GRAFFITI_TEXT_SHADOW,
                              }}
                            >
                              {player.player_name[0]?.toUpperCase()}
                            </span>
                          );
                        })()}
                      </div>

                      {/* "À TOI" stamp */}
                      {isCurrent && (
                        <motion.div
                          initial={{ scale: 0, rotate: 0 }}
                          animate={{ scale: 1, rotate: -10 }}
                          className="absolute -top-3 -right-2 z-10"
                        >
                          <StampBadge color={accent}>À toi !</StampBadge>
                        </motion.div>
                      )}

                      {/* Selected stamp */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 8 }}
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10"
                        >
                          <StampBadge color="#ef4444" rotate={6}>
                            Suspect
                          </StampBadge>
                        </motion.div>
                      )}

                      {/* Crown for the host */}
                      {player.player_id === currentPlayer.id &&
                        currentPlayer.isHost && (
                          <Crown
                            className="absolute -top-3 -left-2 w-5 h-5 text-amber-400"
                            fill="currentColor"
                            style={{
                              transform: 'rotate(-15deg)',
                              filter: 'drop-shadow(1.5px 1.5px 0 #0a0810)',
                            }}
                          />
                        )}
                    </motion.button>

                    {/* Name */}
                    <div className="text-center">
                      <p
                        className="text-base font-black text-white truncate max-w-[8rem] leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {player.player_name}
                      </p>
                      {isMe && (
                        <span
                          className="text-[9px] uppercase tracking-[0.2em] font-black text-cyan-300 leading-none"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          Vous
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow between players */}
                  {idx < orderedPlayers.length - 1 && (
                    <DoodleArrow
                      color={
                        game.phase === 'clue_giving' && lastClue
                          ? accent
                          : 'rgba(255,255,255,0.18)'
                      }
                      glow={Boolean(
                        game.phase === 'clue_giving' && lastClue,
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ============= ACTION ZONE ============= */}
        <div className="relative z-10 mx-auto max-w-2xl px-5 pb-[200px]">
          <CartoonCard accent={accent} className="px-5 py-5 min-h-[140px]">
            <Sparkles
              className="absolute top-3 left-3 w-4 h-4 z-10"
              style={{
                color: accent,
                filter: 'drop-shadow(1px 1px 0 #0a0810)',
              }}
            />
            <Sparkles
              className="absolute top-3 right-3 w-3.5 h-3.5 z-10"
              style={{
                color: '#fbbf24',
                filter: 'drop-shadow(1px 1px 0 #0a0810)',
              }}
            />
            <div className="relative">
              {/* WORD REVEAL */}
              {game.phase === 'word_reveal' && (
                <div className="text-center space-y-3">
                  {hasSeenWord ? (
                    <>
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 280,
                          damping: 16,
                        }}
                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, #34d399, #059669)',
                          border: '3px solid #0a0810',
                          boxShadow: '0 4px 0 #0a0810',
                        }}
                      >
                        <CheckCircle2
                          className="w-7 h-7 text-white"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      <p
                        className="text-3xl font-black text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        Mot vu !
                      </p>
                      <p
                        className="text-sm text-white/60 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        En attente des autres joueurs…
                      </p>
                      {currentPlayer.isHost && (
                        <CartoonButton
                          onClick={startCluePhase}
                          color={accent}
                        >
                          Lancer la phase d'indices
                          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                        </CartoonButton>
                      )}
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{
                          rotate: [-5, 5, -5],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 1.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                          border: '3px solid #0a0810',
                          boxShadow: '0 4px 0 #0a0810',
                        }}
                      >
                        <Eye className="w-7 h-7 text-white" strokeWidth={2.5} />
                      </motion.div>
                      <p
                        className="text-3xl font-black leading-none text-white"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        Découvre ton mot
                      </p>
                      <p
                        className="text-sm text-white/60 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Clique sur le bouton en bas pour le révéler.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* CLUE GIVING */}
              {game.phase === 'clue_giving' && (
                <>
                  {isMyTurn && myPlayer?.is_alive ? (
                    <div className="space-y-3">
                      <p
                        className="text-center text-3xl font-black leading-none text-white"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        À ton tour !
                      </p>
                      <p
                        className="text-sm text-center text-white/60 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Donne un indice (un seul mot, sois subtil)
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={clueInput}
                          onChange={(e) => setClueInput(e.target.value)}
                          placeholder="ex: rond, sucré…"
                          maxLength={30}
                          autoFocus
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleSubmitClue()
                          }
                          className="flex-1 h-12 bg-black/40 text-center text-xl font-black text-white placeholder:text-white/30 rounded-2xl"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            border: '3px solid #0a0810',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                          }}
                        />
                        <CartoonButton
                          onClick={handleSubmitClue}
                          color={accent}
                          disabled={!clueInput.trim()}
                          compact
                        >
                          <Send className="w-4 h-4" strokeWidth={2.5} />
                        </CartoonButton>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-center text-2xl font-black leading-tight"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      <span className="text-white/55">Au tour de</span>{' '}
                      <span
                        style={{
                          color: accent,
                          textShadow: `0 2px 8px ${accent}66`,
                        }}
                      >
                        {gamePlayers.find(
                          (p) => p.player_id === currentTurnPlayerId,
                        )?.player_name ?? '…'}
                      </span>
                    </p>
                  )}
                </>
              )}

              {/* DISCUSSION */}
              {game.phase === 'discussion' && (
                <div className="space-y-3 text-center">
                  <p
                    className="text-3xl font-black leading-none text-white"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    Trouvez l'imposteur !
                  </p>
                  <p
                    className="text-sm text-white/60 font-bold"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Discutez ensemble et démasquez l'undercover.
                  </p>
                  {currentPlayer.isHost && (
                    <CartoonButton onClick={startVoting} color="#ef4444">
                      Passer au vote
                      <Vote className="w-4 h-4" strokeWidth={2.5} />
                    </CartoonButton>
                  )}
                </div>
              )}

              {/* VOTING */}
              {game.phase === 'voting' && (
                <>
                  {!myPlayer?.is_alive ? (
                    <div className="text-center space-y-2">
                      <motion.div
                        animate={{ rotate: [-3, 3, -3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, #6b7280, #374151)',
                          border: '3px solid #0a0810',
                          boxShadow: '0 4px 0 #0a0810',
                        }}
                      >
                        <Skull
                          className="w-7 h-7 text-white"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      <p
                        className="text-2xl font-black text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        Tu es éliminé
                      </p>
                      <p
                        className="text-sm text-white/60 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Tu observes le vote.
                      </p>
                    </div>
                  ) : hasVoted ? (
                    <div className="text-center space-y-2">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background:
                            'linear-gradient(135deg, #34d399, #059669)',
                          border: '3px solid #0a0810',
                          boxShadow: '0 4px 0 #0a0810',
                        }}
                      >
                        <CheckCircle2
                          className="w-7 h-7 text-white"
                          strokeWidth={2.5}
                        />
                      </motion.div>
                      <p
                        className="text-2xl font-black text-white leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW,
                        }}
                      >
                        Vote enregistré !
                      </p>
                      <p
                        className="text-sm text-white/60 font-bold"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        En attente des autres…
                      </p>
                    </div>
                  ) : selectedVote ? (
                    <div className="space-y-3 text-center">
                      <p
                        className="text-2xl font-black leading-tight"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        <span className="text-white/85">Éliminer</span>{' '}
                        <span
                          style={{
                            color: '#ef4444',
                            textShadow: '0 2px 8px rgba(239,68,68,0.4)',
                          }}
                        >
                          {gamePlayers.find(
                            (p) => p.player_id === selectedVote,
                          )?.player_name}
                        </span>{' '}
                        <span className="text-white/85">?</span>
                      </p>
                      <div className="flex gap-2">
                        <CartoonButton
                          onClick={() => setSelectedVote(null)}
                          color="#6b7280"
                          className="flex-1"
                        >
                          Annuler
                        </CartoonButton>
                        <CartoonButton
                          onClick={handleVote}
                          color="#ef4444"
                          className="flex-1"
                        >
                          Confirmer
                        </CartoonButton>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-center text-2xl font-black leading-none text-white"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow: GRAFFITI_TEXT_SHADOW,
                      }}
                    >
                      Clique sur un joueur pour voter
                    </p>
                  )}
                </>
              )}

              {/* VOTE RESULT — flashlight animation then reveal */}
              {game.phase === 'vote_result' && (
                <>
                  {!revealAnimDone ? (
                    <FlashlightRevealAnimation />
                  ) : (
                    <VoteResultBlock
                      game={game}
                      gamePlayers={gamePlayers}
                      isHost={currentPlayer.isHost}
                      accent={accent}
                      getAvatar={getAvatar}
                      onNext={() => {
                        nextRound();
                        setHasVoted(false);
                        setSelectedVote(null);
                      }}
                    />
                  )}
                </>
              )}

              {/* GAME OVER */}
              {isGameOver && (
                <div className="text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 220,
                      damping: 14,
                    }}
                    className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, #fbbf24, #d97706)',
                      border: '4px solid #0a0810',
                      boxShadow:
                        '0 5px 0 #0a0810, 0 10px 24px rgba(251,191,36,0.5)',
                    }}
                  >
                    <Crown
                      className="w-10 h-10 text-white"
                      fill="currentColor"
                      strokeWidth={2}
                    />
                  </motion.div>
                  <h3
                    className="text-4xl font-black leading-none text-white"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow: GRAFFITI_TEXT_SHADOW,
                    }}
                  >
                    {game.winner_role === 'civilian'
                      ? 'Victoire des Civils !'
                      : 'Victoire des Infiltrés !'}
                  </h3>
                  <div
                    className="space-y-1 text-base font-bold text-white/80"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    <p>
                      Mot civil :{' '}
                      <span className="text-white">{game.civilian_word}</span>
                    </p>
                    <p>
                      Mot undercover :{' '}
                      <span className="text-white">
                        {game.undercover_word}
                      </span>
                    </p>
                  </div>
                  <CartoonButton onClick={onEndGame} color="#fbbf24">
                    Retour au lobby
                  </CartoonButton>
                </div>
              )}
            </div>
          </CartoonCard>
        </div>

        {/* ============= "VOIR MON MOT" — fixed bottom button ============= */}
        {!isGameOver && (
          <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-[min(92vw,500px)] px-4">
            <motion.button
              type="button"
              onClick={() => {
                if (game.phase === 'word_reveal' && !hasSeenWord) {
                  setShowWordModal(true);
                  return;
                }
                setShowWord((v) => !v);
                if (!showWord) setShowWordModal(true);
              }}
              whileHover={{ scale: 1.03, rotate: -1 }}
              whileTap={{ scale: 0.97 }}
              className="relative w-full px-6 py-4 rounded-2xl"
              style={{
                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                border: '4px solid #0a0810',
                boxShadow:
                  '0 6px 0 #0a0810, 0 10px 24px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.25)',
              }}
            >
              <div className="relative flex items-center justify-center gap-3">
                <Eye className="w-6 h-6 text-white" strokeWidth={2.5} />
                <span
                  className="text-2xl font-black text-white leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  Voir mon mot
                </span>
              </div>
            </motion.button>
          </div>
        )}

        {/* ============= WORD MODAL ============= */}
        <AnimatePresence>
          {showWordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowWordModal(false);
                if (game.phase === 'word_reveal' && !hasSeenWord) {
                  confirmWordSeen();
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -2 }}
                exit={{ opacity: 0, scale: 0.7, rotate: 8 }}
                transition={{ type: 'spring', damping: 16, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md"
              >
                <CartoonCard accent={accent} className="px-8 py-10 text-center">
                  <Sparkles
                    className="absolute top-3 left-4 w-4 h-4 z-10"
                    style={{
                      color: '#fbbf24',
                      filter: 'drop-shadow(1px 1px 0 #0a0810)',
                    }}
                  />
                  <Sparkles
                    className="absolute top-3 right-4 w-4 h-4 z-10"
                    style={{
                      color: '#f472b6',
                      filter: 'drop-shadow(1px 1px 0 #0a0810)',
                    }}
                  />
                  <div className="relative space-y-4">
                    <div
                      className="text-[10px] uppercase tracking-[0.3em] text-white/55 font-black"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Ton mot secret
                    </div>

                    <div className="py-4">
                      {myPlayer?.word ? (
                        <motion.div
                          key={showWord ? 'shown' : 'hidden'}
                          initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          className="text-6xl md:text-7xl font-black tracking-wide leading-none text-white"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: `${GRAFFITI_TEXT_SHADOW}, 0 4px 20px ${accent}88`,
                          }}
                        >
                          {myPlayer.word.toUpperCase()}
                        </motion.div>
                      ) : (
                        <div className="space-y-2">
                          <motion.div
                            animate={{ rotate: [-5, 5, -5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{
                              background:
                                'linear-gradient(135deg, #a855f7, #6b21a8)',
                              border: '3px solid #0a0810',
                              boxShadow: '0 4px 0 #0a0810',
                            }}
                          >
                            <HelpCircle
                              className="w-7 h-7 text-white"
                              strokeWidth={2.5}
                            />
                          </motion.div>
                          <div
                            className="text-4xl font-black leading-none text-white"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow: GRAFFITI_TEXT_SHADOW,
                            }}
                          >
                            ???
                          </div>
                          <p
                            className="text-sm text-white/70 font-bold"
                            style={{ fontFamily: "'Caveat', cursive" }}
                          >
                            Aucun mot pour toi… À toi d'improviser !
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <CartoonButton
                        onClick={() => {
                          setShowWordModal(false);
                          if (game.phase === 'word_reveal' && !hasSeenWord) {
                            confirmWordSeen();
                          }
                        }}
                        color={accent}
                      >
                        {game.phase === 'word_reveal' && !hasSeenWord
                          ? "J'ai vu, c'est bon !"
                          : 'Cacher'}
                      </CartoonButton>
                    </div>

                    <p
                      className="text-xs text-white/40 italic font-bold"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Personne d'autre ne le voit. Garde-le secret.
                    </p>
                  </div>
                </CartoonCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }
        `}</style>
      </div>
    );
  },
);

UndercoverGameScreen.displayName = 'UndercoverGameScreen';

/* ============================================================
   VoteResultBlock
============================================================ */

const VoteResultBlock = ({
  game,
  gamePlayers,
  isHost,
  accent,
  getAvatar,
  onNext,
}: {
  game: any;
  gamePlayers: any[];
  isHost: boolean;
  accent: string;
  getAvatar: (id: string) => { type: string; imageUrl?: string };
  onNext: () => void;
}) => {
  const eliminatedName = gamePlayers.find(
    (p) => p.player_id === game.eliminated_player_id,
  )?.player_name;
  // Eliminated role is intentionally NOT shown — keeps the suspense intact.

  return (
    <div className="text-center space-y-3">
      {game.eliminated_player_id ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: '4px solid #0a0810',
              boxShadow:
                '0 5px 0 #0a0810, 0 10px 24px rgba(239,68,68,0.5)',
            }}
          >
            <Skull className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.2em] text-white/55 font-black"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Éliminé
            </p>
            <h3
              className="text-3xl font-black leading-none text-white"
              style={{
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW,
              }}
            >
              {eliminatedName}
            </h3>
            <p
              className="mt-2 text-sm text-white/55 italic font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Son rôle reste secret…
            </p>
          </div>
        </>
      ) : (
        <>
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6b7280, #374151)',
              border: '3px solid #0a0810',
              boxShadow: '0 4px 0 #0a0810',
            }}
          >
            <X className="w-8 h-8 text-white" strokeWidth={3} />
          </motion.div>
          <h3
            className="text-2xl font-black leading-none text-white"
            style={{
              fontFamily: "'Caveat', cursive",
              textShadow: GRAFFITI_TEXT_SHADOW,
            }}
          >
            Égalité — personne éliminé
          </h3>
        </>
      )}
      {isHost && (
        <CartoonButton onClick={onNext} color={accent}>
          Manche suivante
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </CartoonButton>
      )}
    </div>
  );
};

/* ============================================================
   Flashlight Reveal Animation — suspense before showing who was eliminated
   A "police flashlight" sweeps across the screen searching for the suspect.
============================================================ */
const FlashlightRevealAnimation = () => (
  <div className="text-center space-y-4 py-6">
    {/* Flashlight beam sweeping */}
    <motion.div
      className="relative w-full h-40 overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(0,0,0,0.8)',
        border: '3px solid #0a0810',
        boxShadow: '0 4px 0 #0a0810',
      }}
    >
      {/* Sweeping cone of light */}
      <motion.div
        className="absolute top-0 h-full"
        style={{
          width: '120px',
          background:
            'radial-gradient(ellipse at center, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.2) 40%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{
          left: ['-120px', 'calc(100% + 120px)', '-120px', 'calc(100% + 120px)'],
        }}
        transition={{
          duration: 3,
          ease: 'easeInOut',
          times: [0, 0.4, 0.6, 1],
        }}
      />
      {/* Silhouette figures */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 opacity-30">
        {'🕵️ 👤 👤 👤 🕵️'.split(' ').map((emoji, i) => (
          <motion.span
            key={i}
            className="text-4xl"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-3xl font-black text-amber-300 leading-none"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow:
              '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 0 0 20px rgba(251,191,36,0.6)',
          }}
        >
          Recherche en cours…
        </motion.p>
      </div>
    </motion.div>

    {/* Suspense dots */}
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 rounded-full bg-amber-400"
          animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.3,
          }}
          style={{ boxShadow: '0 0 8px rgba(251,191,36,0.6)' }}
        />
      ))}
    </div>

    <p
      className="text-lg font-black text-white/70 leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow:
          '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
      }}
    >
      Qui sera éliminé ?
    </p>
  </div>
);
