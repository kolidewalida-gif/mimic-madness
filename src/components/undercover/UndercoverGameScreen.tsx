import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Send,
  Shield,
  Skull,
  Timer,
  UserX,
  Vote,
  HelpCircle,
  X,
  Sparkles,
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

const ROLE_CONFIG = {
  civilian: { label: 'Civil', icon: Shield, color: '#0ea5e9' },
  undercover: { label: 'Undercover', icon: UserX, color: '#ff5050' },
  mr_white: { label: 'Mr White', icon: HelpCircle, color: '#f59e0b' },
} as const;

const PHASE_LABELS: Record<string, string> = {
  word_reveal: 'Découverte du mot',
  clue_giving: 'Phase d\'indices',
  discussion: 'Discussion',
  voting: 'Vote',
  vote_result: 'Résultat',
  game_over: 'Fin de partie',
};

// Cartoon palette per phase
const PHASE_THEME: Record<string, string> = {
  word_reveal: '#a855f7',
  clue_giving: '#0ea5e9',
  discussion: '#10b981',
  voting: '#ff5050',
  vote_result: '#f59e0b',
  game_over: '#fbbf24',
};

/* ---------- helpers / hand-drawn shapes ----------- */

// Squiggly border SVG that wraps a child — gives the doodle look from the sketch.
const DoodleBorder = ({
  color,
  className,
  filled = false,
  rotation = 0,
}: {
  color: string;
  className?: string;
  filled?: boolean;
  rotation?: number;
}) => (
  <svg
    className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    {/* Wobbly rounded rectangle */}
    <path
      d="M5,12
         Q3,8 7,5
         Q15,3 25,4
         Q40,2 55,5
         Q70,3 85,5
         Q95,4 96,12
         Q98,30 96,50
         Q98,70 95,88
         Q96,95 88,96
         Q70,98 50,96
         Q30,98 12,96
         Q4,97 4,90
         Q3,70 5,50
         Q3,30 5,12 Z"
      fill={filled ? color : 'none'}
      fillOpacity={filled ? 0.08 : 0}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// Wobbly oval (avatar)
const DoodleOval = ({
  color,
  className,
  filled = false,
}: {
  color: string;
  className?: string;
  filled?: boolean;
}) => (
  <svg
    className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <path
      d="M50,8
         Q70,7 82,18
         Q94,32 92,52
         Q90,72 76,86
         Q60,96 42,92
         Q24,90 12,76
         Q4,60 8,40
         Q14,20 30,12
         Q40,8 50,8 Z"
      fill={filled ? color : 'none'}
      fillOpacity={filled ? 0.12 : 0}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

// Hand-drawn arrow between players
const DoodleArrow = ({ color, className }: { color: string; className?: string }) => (
  <svg
    className={cn('w-10 h-10 flex-shrink-0', className)}
    viewBox="0 0 40 40"
    fill="none"
  >
    <path
      d="M4,20 Q12,18 24,20 Q30,21 33,20"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28,14 L34,20 L28,26"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Stamp — used for "À TOI" badge
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
    className="relative px-3 py-1 inline-flex items-center justify-center"
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <DoodleBorder color={color} filled rotation={2} />
    <span
      className="relative text-[10px] font-black uppercase tracking-[0.2em]"
      style={{ color, fontFamily: "'Caveat', cursive", letterSpacing: '0.15em' }}
    >
      {children}
    </span>
  </div>
);

/* ---------- Top timer (only on discussion) ----------- */

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

  return (
    <div className="relative px-5 py-3">
      <DoodleBorder color={urgent ? '#ff5050' : accent} />
      <div className="relative flex items-center gap-3">
        <Timer className={cn('w-4 h-4', urgent && 'animate-pulse')} style={{ color: urgent ? '#ff5050' : accent }} />
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: urgent ? '#ff5050' : accent, width: `${pct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
        <span
          className={cn('font-mono font-black text-base tabular-nums', urgent && 'animate-pulse')}
          style={{
            color: urgent ? '#ff5050' : 'white',
            fontFamily: "'Caveat', cursive",
          }}
        >
          {seconds}s
        </span>
      </div>
    </div>
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

    if (loading || !game) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0810]">
          <div className="text-center space-y-4">
            <motion.div
              className="mx-auto w-16 h-16 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            >
              <DoodleOval color="#a855f7" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
            </motion.div>
            <p className="text-white/60 text-sm" style={{ fontFamily: "'Caveat', cursive" }}>
              Préparation du chaos…
            </p>
          </div>
        </div>
      );
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;

    // Order players by speaking order
    const orderedPlayers = (() => {
      const byId = new Map(gamePlayers.map((p) => [p.player_id, p]));
      const ordered = game.player_order
        .map((id) => byId.get(id))
        .filter(Boolean) as typeof gamePlayers;
      gamePlayers.forEach((p) => {
        if (!ordered.find((o) => o.player_id === p.player_id)) ordered.push(p);
      });
      return ordered;
    })();

    return (
      <div className="min-h-screen bg-[#0a0810] text-white relative overflow-x-hidden">
        {/* Background — phase-tinted halos */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c0813] via-[#0a0810] to-[#0c0814]" />
          <AnimatePresence mode="sync">
            <motion.div
              key={game.phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <div
                className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full opacity-20"
                style={{
                  background: `radial-gradient(ellipse, ${accent}55 0%, transparent 70%)`,
                  filter: 'blur(80px)',
                }}
              />
              <div
                className="absolute bottom-0 right-1/4 w-[400px] h-[250px] rounded-full opacity-15"
                style={{
                  background: `radial-gradient(ellipse, ${accent}44 0%, transparent 70%)`,
                  filter: 'blur(70px)',
                }}
              />
            </motion.div>
          </AnimatePresence>
          {/* Doodle scribble pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
            <defs>
              <pattern id="scribble" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path
                  d="M10,30 Q30,10 50,30 T90,30 M20,80 Q40,60 60,80 T100,80"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#scribble)" />
          </svg>
        </div>

        {/* HEADER — phase + stats */}
        <header className="relative z-10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <DoodleOval color={accent} filled />
              <UserX className="relative w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold">
                Manche {game.current_round}
              </p>
              <h1
                className="text-2xl font-black tracking-tight leading-none"
                style={{ fontFamily: "'Caveat', cursive", color: accent }}
              >
                {PHASE_LABELS[game.phase] ?? game.phase}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Vivants */}
            <div className="relative px-3 py-1.5">
              <DoodleBorder color="#10b981" />
              <div className="relative flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Vivants
                </span>
                <span
                  className="text-base font-black"
                  style={{ fontFamily: "'Caveat', cursive", color: '#10b981' }}
                >
                  {alivePlayers.length}/{players.length}
                </span>
              </div>
            </div>

            {game.phase === 'voting' && (
              <div className="relative px-3 py-1.5">
                <DoodleBorder color="#ff5050" />
                <div className="relative flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                    Votes
                  </span>
                  <span
                    className="text-base font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: '#ff5050' }}
                  >
                    {votedCount}/{alivePlayers.length}
                  </span>
                </div>
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

        {/* PLAYERS RELAY — clue bubble + oval avatar + arrow */}
        <div className="relative z-10 mb-6 overflow-x-auto pb-4 px-5 custom-scrollbar">
          <div className="flex min-w-max items-center justify-center gap-4 py-6">
            {orderedPlayers.map((player, idx) => {
              const isCurrent =
                currentTurnPlayerId === player.player_id && game.phase === 'clue_giving';
              const isMe = player.player_id === currentPlayer.id;
              const isEliminated = !player.is_alive;
              const canVote =
                game.phase === 'voting' &&
                Boolean(myPlayer?.is_alive) &&
                !hasVoted &&
                player.player_id !== currentPlayer.id &&
                player.is_alive;
              const isSelected = selectedVote === player.player_id;
              const history = (player as { clue_history?: string[] }).clue_history ?? [];
              const lastClue = history[history.length - 1] ?? player.current_clue;
              const isLiveTyping =
                isMe &&
                isMyTurn &&
                game.phase === 'clue_giving' &&
                Boolean(myPlayer?.is_alive) &&
                clueInput.trim().length > 0;
              const displayClue = isLiveTyping ? clueInput.trim() : lastClue;
              const revealedRole = isGameOver
                ? ROLE_CONFIG[player.role as keyof typeof ROLE_CONFIG]
                : null;

              const playerColor = revealedRole?.color ?? (isMe ? '#0ea5e9' : '#a855f7');

              return (
                <div key={player.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-3 w-32">
                    {/* MOT bubble (above) */}
                    <div className="relative h-16 w-full flex items-end justify-center">
                      <AnimatePresence mode="wait">
                        {displayClue ? (
                          <motion.div
                            key={isLiveTyping ? `live-${isMe}` : `final-${displayClue}`}
                            initial={{ scale: 0.3, y: 20, opacity: 0, rotate: -8 }}
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
                                : { type: 'spring', stiffness: 360, damping: 14 }
                            }
                            className="relative px-3 py-1.5 max-w-full"
                          >
                            <DoodleBorder
                              color={isLiveTyping ? '#0ea5e9' : isCurrent ? accent : 'white'}
                              filled
                              rotation={idx % 2 === 0 ? -1 : 1}
                            />
                            <span
                              className="relative block truncate max-w-[7rem] text-base font-black"
                              style={{
                                fontFamily: "'Caveat', cursive",
                                color: isLiveTyping
                                  ? '#0ea5e9'
                                  : isCurrent
                                  ? accent
                                  : 'white',
                              }}
                            >
                              {displayClue}
                              {isLiveTyping && (
                                <motion.span
                                  className="ml-0.5 inline-block"
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ duration: 0.8, repeat: Infinity }}
                                >
                                  |
                                </motion.span>
                              )}
                            </span>
                          </motion.div>
                        ) : (
                          <div className="relative px-3 py-1.5">
                            <DoodleBorder color="rgba(255,255,255,0.15)" rotation={idx % 2 === 0 ? -1 : 1} />
                            <span
                              className="relative text-xs font-bold text-white/30 italic"
                              style={{ fontFamily: "'Caveat', cursive" }}
                            >
                              mot…
                            </span>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Doodle oval avatar */}
                    <motion.button
                      type="button"
                      whileHover={canVote ? { y: -3, scale: 1.05 } : undefined}
                      whileTap={canVote ? { scale: 0.97 } : undefined}
                      onClick={canVote ? () => setSelectedVote(player.player_id) : undefined}
                      disabled={!canVote}
                      className={cn(
                        'relative w-24 h-24 flex items-center justify-center transition-all',
                        canVote && 'cursor-pointer',
                        !canVote && 'cursor-default',
                        isEliminated && 'opacity-40 saturate-0',
                      )}
                      animate={
                        isCurrent
                          ? {
                              y: [0, -4, 0],
                            }
                          : undefined
                      }
                      transition={
                        isCurrent
                          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                          : undefined
                      }
                    >
                      <DoodleOval
                        color={
                          isSelected
                            ? '#ff5050'
                            : isCurrent
                            ? accent
                            : isMe
                            ? '#0ea5e9'
                            : playerColor
                        }
                        filled={isCurrent || isSelected || isMe}
                      />
                      {/* Avatar content */}
                      <div className="relative flex flex-col items-center justify-center">
                        {isEliminated ? (
                          <Skull className="w-10 h-10 text-white/50" />
                        ) : (
                          <span
                            className="text-3xl font-black"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              color: isSelected
                                ? '#ff5050'
                                : isCurrent
                                ? accent
                                : isMe
                                ? '#0ea5e9'
                                : 'white',
                              textShadow: `0 2px 8px ${
                                isCurrent ? accent : 'rgba(0,0,0,0.4)'
                              }`,
                            }}
                          >
                            {player.player_name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* "À TOI" stamp */}
                      {isCurrent && (
                        <motion.div
                          initial={{ scale: 0, rotate: 0 }}
                          animate={{ scale: 1, rotate: -10 }}
                          className="absolute -top-2 -right-1 z-10"
                        >
                          <StampBadge color={accent}>À toi !</StampBadge>
                        </motion.div>
                      )}

                      {/* Selected stamp */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 8 }}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10"
                        >
                          <StampBadge color="#ff5050" rotate={6}>
                            Suspect
                          </StampBadge>
                        </motion.div>
                      )}

                      {/* Crown for the host */}
                      {player.player_id === currentPlayer.id && currentPlayer.isHost && (
                        <Crown
                          className="absolute -top-3 -left-2 w-5 h-5 text-amber-400"
                          fill="currentColor"
                          style={{ transform: 'rotate(-15deg)' }}
                        />
                      )}
                    </motion.button>

                    {/* Name */}
                    <div className="text-center">
                      <p
                        className="text-sm font-black text-white truncate max-w-[8rem]"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {player.player_name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-cyan-400">
                          Vous
                        </span>
                      )}
                      {revealedRole && (
                        <div
                          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{
                            background: `${revealedRole.color}20`,
                            border: `1px solid ${revealedRole.color}60`,
                            color: revealedRole.color,
                          }}
                        >
                          <revealedRole.icon className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{revealedRole.label}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow between players */}
                  {idx < orderedPlayers.length - 1 && (
                    <DoodleArrow
                      color={
                        game.phase === 'clue_giving' && lastClue
                          ? accent
                          : 'rgba(255,255,255,0.15)'
                      }
                      className="-mt-4"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION ZONE — INDICE field / discussion / vote / etc */}
        <div className="relative z-10 mx-auto max-w-2xl px-5 pb-[200px]">
          <div className="relative px-5 py-5 min-h-[120px]">
            <DoodleBorder color={accent} filled />

            <div className="relative">
              {/* WORD REVEAL */}
              {game.phase === 'word_reveal' && (
                <div className="text-center space-y-3">
                  {hasSeenWord ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: '#10b981' }} />
                      <p
                        className="text-lg font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                      >
                        Mot vu !
                      </p>
                      <p className="text-xs text-white/50">En attente des autres joueurs…</p>
                      {currentPlayer.isHost && (
                        <DoodleButton onClick={startCluePhase} color={accent}>
                          Lancer la phase d'indices
                          <ArrowRight className="w-4 h-4" />
                        </DoodleButton>
                      )}
                    </>
                  ) : (
                    <>
                      <Eye className="w-10 h-10 mx-auto animate-pulse" style={{ color: accent }} />
                      <p
                        className="text-2xl font-black leading-tight"
                        style={{ fontFamily: "'Caveat', cursive", color: accent }}
                      >
                        Découvre ton mot
                      </p>
                      <p className="text-xs text-white/50">
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
                        className="text-center text-2xl font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: accent }}
                      >
                        À ton tour !
                      </p>
                      <p className="text-xs text-center text-white/50">
                        Donne un indice (un seul mot, sois subtil)
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DoodleBorder color="rgba(255,255,255,0.3)" />
                          <Input
                            value={clueInput}
                            onChange={(e) => setClueInput(e.target.value)}
                            placeholder="ex: rond, sucré…"
                            maxLength={30}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                            className="relative bg-transparent border-0 text-center text-lg font-black focus:ring-0 placeholder:text-white/25"
                            style={{ fontFamily: "'Caveat', cursive" }}
                          />
                        </div>
                        <DoodleButton
                          onClick={handleSubmitClue}
                          color={accent}
                          disabled={!clueInput.trim()}
                          compact
                        >
                          <Send className="w-4 h-4" />
                        </DoodleButton>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-center text-xl font-black leading-tight"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      <span className="text-white/50">Au tour de</span>{' '}
                      <span style={{ color: accent }}>
                        {gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ??
                          '…'}
                      </span>
                    </p>
                  )}
                </>
              )}

              {/* DISCUSSION */}
              {game.phase === 'discussion' && (
                <div className="space-y-3 text-center">
                  <p
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: accent }}
                  >
                    Trouvez l'imposteur !
                  </p>
                  <p className="text-xs text-white/50">
                    Discutez ensemble et démasquez l'undercover.
                  </p>
                  {currentPlayer.isHost && (
                    <DoodleButton onClick={startVoting} color="#ff5050">
                      Passer au vote
                      <Vote className="w-4 h-4" />
                    </DoodleButton>
                  )}
                </div>
              )}

              {/* VOTING */}
              {game.phase === 'voting' && (
                <>
                  {!myPlayer?.is_alive ? (
                    <div className="text-center space-y-2">
                      <Skull className="w-10 h-10 mx-auto text-white/40" />
                      <p
                        className="text-lg font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                      >
                        Vous êtes éliminé
                      </p>
                      <p className="text-xs text-white/50">Vous observez le vote.</p>
                    </div>
                  ) : hasVoted ? (
                    <div className="text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                      <p
                        className="text-lg font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: '#10b981' }}
                      >
                        Vote enregistré !
                      </p>
                      <p className="text-xs text-white/50">En attente des autres…</p>
                    </div>
                  ) : selectedVote ? (
                    <div className="space-y-3 text-center">
                      <p
                        className="text-lg font-black"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        Éliminer{' '}
                        <span style={{ color: '#ff5050' }}>
                          {gamePlayers.find((p) => p.player_id === selectedVote)?.player_name}
                        </span>{' '}
                        ?
                      </p>
                      <div className="flex gap-2">
                        <DoodleButton
                          onClick={() => setSelectedVote(null)}
                          color="rgba(255,255,255,0.4)"
                          variant="outline"
                          className="flex-1"
                        >
                          Annuler
                        </DoodleButton>
                        <DoodleButton
                          onClick={handleVote}
                          color="#ff5050"
                          className="flex-1"
                        >
                          Confirmer
                        </DoodleButton>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-center text-lg font-black"
                      style={{ fontFamily: "'Caveat', cursive", color: accent }}
                    >
                      Clique sur un joueur pour voter
                    </p>
                  )}
                </>
              )}

              {/* VOTE RESULT */}
              {game.phase === 'vote_result' && (
                <VoteResultBlock
                  game={game}
                  gamePlayers={gamePlayers}
                  isHost={currentPlayer.isHost}
                  accent={accent}
                  onNext={() => {
                    nextRound();
                    setHasVoted(false);
                    setSelectedVote(null);
                  }}
                />
              )}

              {/* GAME OVER */}
              {isGameOver && (
                <div className="text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                    className="mx-auto w-20 h-20 relative"
                  >
                    <DoodleOval color="#fbbf24" filled />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Crown className="w-9 h-9 text-amber-400" fill="currentColor" />
                    </div>
                  </motion.div>
                  <h3
                    className="text-3xl font-black leading-tight"
                    style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
                  >
                    {game.winner_role === 'civilian'
                      ? 'Victoire des Civils !'
                      : 'Victoire des Infiltrés !'}
                  </h3>
                  <div className="text-xs text-white/60 space-y-0.5">
                    <p>
                      Mot civil :{' '}
                      <span className="font-black text-white">{game.civilian_word}</span>
                    </p>
                    <p>
                      Mot undercover :{' '}
                      <span className="font-black text-white">{game.undercover_word}</span>
                    </p>
                  </div>
                  <DoodleButton onClick={onEndGame} color="#fbbf24">
                    Retour au lobby
                  </DoodleButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* "VOIR MON MOT" — fixed bottom button (above music bar) */}
        {!isGameOver && (
          <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-[min(92vw,500px)]">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full px-6 py-4"
            >
              <DoodleBorder color={accent} filled rotation={-1} />
              <div className="relative flex items-center justify-center gap-3">
                <Eye className="w-5 h-5" style={{ color: accent }} />
                <span
                  className="text-2xl font-black"
                  style={{ fontFamily: "'Caveat', cursive", color: accent }}
                >
                  Voir mon mot
                </span>
              </div>
            </motion.button>
          </div>
        )}

        {/* WORD MODAL */}
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
                className="relative w-full max-w-md px-8 py-10 text-center"
              >
                <DoodleBorder color={accent} filled rotation={-2} />

                <div className="relative space-y-4">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Ton mot secret
                  </div>

                  <div className="py-4">
                    {myPlayer?.word ? (
                      <motion.div
                        key={showWord ? 'shown' : 'hidden'}
                        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        className="text-5xl md:text-6xl font-black tracking-wide"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: accent,
                          textShadow: `0 4px 20px ${accent}88`,
                        }}
                      >
                        {myPlayer.word.toUpperCase()}
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        <HelpCircle className="w-12 h-12 mx-auto text-amber-400" />
                        <div
                          className="text-3xl font-black"
                          style={{ fontFamily: "'Caveat', cursive", color: '#f59e0b' }}
                        >
                          ???
                        </div>
                        <p className="text-xs text-white/50">
                          Tu es Mr White. Improvise !
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWordModal(false);
                        if (game.phase === 'word_reveal' && !hasSeenWord) {
                          confirmWordSeen();
                        }
                      }}
                      className="relative px-6 py-3"
                    >
                      <DoodleBorder color="white" />
                      <span
                        className="relative text-base font-black"
                        style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                      >
                        {game.phase === 'word_reveal' && !hasSeenWord ? "J'ai vu, c'est bon !" : 'Cacher'}
                      </span>
                    </button>
                  </div>

                  <p className="text-[10px] text-white/30 italic">
                    Personne d'autre ne le voit. Garde-le secret.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}</style>
      </div>
    );
  },
);

UndercoverGameScreen.displayName = 'UndercoverGameScreen';

/* ---------- DoodleButton helper ---------- */

const DoodleButton = ({
  children,
  onClick,
  color,
  disabled = false,
  variant = 'filled',
  className = '',
  compact = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color: string;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  className?: string;
  compact?: boolean;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.02, y: -1 } : undefined}
    whileTap={!disabled ? { scale: 0.98 } : undefined}
    className={cn(
      'relative px-5 py-3 inline-flex items-center justify-center gap-2 transition-opacity',
      compact && 'px-3 py-2',
      disabled && 'opacity-40 cursor-not-allowed',
      className,
    )}
  >
    <DoodleBorder color={color} filled={variant === 'filled'} rotation={-1} />
    <span
      className="relative text-base font-black"
      style={{
        fontFamily: "'Caveat', cursive",
        color: variant === 'filled' ? color : color,
      }}
    >
      {children}
    </span>
  </motion.button>
);

/* ---------- VoteResultBlock ---------- */

const VoteResultBlock = ({
  game,
  gamePlayers,
  isHost,
  accent,
  onNext,
}: {
  game: any;
  gamePlayers: any[];
  isHost: boolean;
  accent: string;
  onNext: () => void;
}) => {
  const eliminatedName = gamePlayers.find(
    (p) => p.player_id === game.eliminated_player_id,
  )?.player_name;
  const eliminatedRole = game.eliminated_role
    ? ROLE_CONFIG[game.eliminated_role as keyof typeof ROLE_CONFIG]
    : null;

  return (
    <div className="text-center space-y-3">
      {game.eliminated_player_id ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="mx-auto w-16 h-16 relative"
          >
            <DoodleOval color="#ff5050" filled />
            <div className="absolute inset-0 flex items-center justify-center">
              <Skull className="w-7 h-7 text-rose-400" />
            </div>
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold">Éliminé</p>
            <h3
              className="text-2xl font-black leading-tight"
              style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
            >
              {eliminatedName}
            </h3>
            {eliminatedRole && (
              <div
                className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full"
                style={{
                  background: `${eliminatedRole.color}20`,
                  border: `1px solid ${eliminatedRole.color}60`,
                  color: eliminatedRole.color,
                }}
              >
                <eliminatedRole.icon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{eliminatedRole.label}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto w-16 h-16 relative">
            <DoodleOval color="rgba(255,255,255,0.3)" />
            <div className="absolute inset-0 flex items-center justify-center">
              <X className="w-7 h-7 text-white/50" />
            </div>
          </div>
          <h3
            className="text-xl font-black"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Égalité — personne éliminé
          </h3>
        </>
      )}
      {isHost && (
        <DoodleButton onClick={onNext} color={accent}>
          Manche suivante
          <ArrowRight className="w-4 h-4" />
        </DoodleButton>
      )}
    </div>
  );
};
