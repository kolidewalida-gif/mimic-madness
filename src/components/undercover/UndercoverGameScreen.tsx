import { useState, memo, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { UndercoverPreGameSettings } from './UndercoverPreGameSettings';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Send,
  Skull,
  Timer,
  UserX,
  Vote,
  X,
  Sparkles,
  Loader2,
  MessageCircle,
  AlertTriangle,
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
   INK PALETTE — Dark, moody, high contrast
============================================================ */
const INK = {
  bg: '#0c0a14',
  card: 'linear-gradient(180deg, #1c1528 0%, #14101f 50%, #0c0a14 100%)',
  border: '#1a1525',
  borderHard: '#0a0810',
  text: '#f0edf5',
  textMuted: 'rgba(240,237,245,0.55)',
  accent: {
    purple: '#a855f7',
    cyan: '#06b6d4',
    green: '#34d399',
    red: '#ef4444',
    yellow: '#fbbf24',
    pink: '#f472b6',
  },
};

const PHASE_CONFIG: Record<string, { label: string; color: string; icon: typeof UserX }> = {
  word_reveal: { label: 'Découverte', color: INK.accent.purple, icon: Eye },
  clue_giving: { label: 'Indices', color: INK.accent.cyan, icon: MessageCircle },
  discussion: { label: 'Discussion', color: INK.accent.green, icon: AlertTriangle },
  voting: { label: 'Vote', color: INK.accent.red, icon: Vote },
  vote_result: { label: 'Résultat', color: INK.accent.yellow, icon: Skull },
  game_over: { label: 'Fin', color: INK.accent.yellow, icon: Crown },
};

/* ============================================================
   Reusable UI Primitives — Ink Style
============================================================ */

const InkCard = ({
  className,
  accent,
  children,
  glow = false,
}: {
  className?: string;
  accent?: string;
  children: React.ReactNode;
  glow?: boolean;
}) => (
  <div
    className={cn('relative rounded-2xl overflow-hidden', className)}
    style={{
      background: INK.card,
      border: `2px solid ${accent ? `${accent}44` : INK.border}`,
      boxShadow: glow && accent
        ? `0 0 20px ${accent}22, 0 4px 16px rgba(0,0,0,0.4)`
        : '0 4px 16px rgba(0,0,0,0.4)',
    }}
  >
    {children}
  </div>
);

const InkButton = ({
  children,
  onClick,
  color = INK.accent.purple,
  disabled = false,
  size = 'md',
  variant = 'filled',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'ghost';
  className?: string;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.02 } : undefined}
    whileTap={!disabled ? { scale: 0.97 } : undefined}
    className={cn(
      'relative inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all',
      size === 'sm' && 'px-3 py-2 text-sm',
      size === 'md' && 'px-5 py-3 text-base',
      size === 'lg' && 'px-6 py-4 text-lg',
      disabled && 'opacity-40 cursor-not-allowed',
      className,
    )}
    style={{
      background: variant === 'filled'
        ? `linear-gradient(135deg, ${color}, ${color}cc)`
        : 'transparent',
      border: variant === 'filled'
        ? `2px solid ${color}`
        : `2px solid ${color}66`,
      color: INK.text,
      boxShadow: variant === 'filled' ? `0 0 12px ${color}33` : 'none',
    }}
  >
    {children}
  </motion.button>
);

/* ============================================================
   Player Avatar Component
============================================================ */
const PlayerBubble = ({
  player,
  isCurrent,
  isMe,
  isEliminated,
  isSelected,
  canVote,
  accent,
  clue,
  avatar,
  onSelect,
}: {
  player: { player_id: string; player_name: string; is_alive: boolean };
  isCurrent: boolean;
  isMe: boolean;
  isEliminated: boolean;
  isSelected: boolean;
  canVote: boolean;
  accent: string;
  clue: string | null;
  avatar: { type: string; imageUrl?: string };
  onSelect: () => void;
}) => {
  const borderColor = isSelected
    ? INK.accent.red
    : isCurrent
      ? accent
      : isMe
        ? INK.accent.cyan
        : INK.border;

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-1.5 w-[72px] flex-shrink-0"
      animate={isEliminated ? { opacity: 0.35, scale: 0.9 } : { opacity: 1, scale: 1 }}
    >
      {/* Clue bubble */}
      <AnimatePresence mode="wait">
        {clue && (
          <motion.div
            key={clue}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.8 }}
            className="px-2 py-1 rounded-lg max-w-[80px] text-center"
            style={{
              background: isCurrent ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: `1.5px solid ${isCurrent ? `${accent}55` : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <span className="text-xs font-semibold text-white/90 truncate block">
              {clue}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar circle */}
      <motion.button
        type="button"
        onClick={canVote ? onSelect : undefined}
        disabled={!canVote}
        whileHover={canVote ? { scale: 1.08 } : undefined}
        whileTap={canVote ? { scale: 0.95 } : undefined}
        animate={isCurrent ? { y: [0, -3, 0] } : undefined}
        transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center',
          canVote && 'cursor-pointer',
          !canVote && 'cursor-default',
        )}
        style={{
          background: isEliminated
            ? 'rgba(100,100,100,0.3)'
            : `linear-gradient(135deg, ${borderColor}33, ${borderColor}11)`,
          border: `2.5px solid ${borderColor}`,
          boxShadow: isCurrent ? `0 0 12px ${accent}44` : isSelected ? `0 0 12px ${INK.accent.red}44` : 'none',
        }}
      >
        {isEliminated ? (
          <Skull className="w-6 h-6 text-white/50" />
        ) : avatar.type === 'image' && avatar.imageUrl ? (
          <img src={avatar.imageUrl} alt={player.player_name} className="w-11 h-11 rounded-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-white/90">
            {player.player_name[0]?.toUpperCase()}
          </span>
        )}

        {/* Current turn indicator */}
        {isCurrent && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: accent, border: `1.5px solid ${INK.bg}` }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <MessageCircle className="w-2.5 h-2.5 text-white" fill="white" />
          </motion.div>
        )}

        {/* Vote target indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: INK.accent.red, border: `1.5px solid ${INK.bg}` }}
          >
            <X className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </motion.button>

      {/* Name */}
      <span className={cn(
        'text-[11px] font-semibold truncate max-w-[70px] text-center leading-tight',
        isMe ? 'text-cyan-300' : 'text-white/70',
      )}>
        {isMe ? 'Toi' : player.player_name}
      </span>
    </motion.div>
  );
};

/* ============================================================
   Discussion Timer
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
  const color = urgent ? INK.accent.red : accent;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <motion.div
        animate={urgent ? { scale: [1, 1.1, 1] } : undefined}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <Timer className="w-4 h-4" style={{ color }} strokeWidth={2.5} />
      </motion.div>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/5">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
      <span className={cn(
        'text-sm font-bold tabular-nums',
        urgent ? 'text-red-400' : 'text-white/60',
      )}>
        {seconds}s
      </span>
    </div>
  );
};

/* ============================================================
   MAIN GAME SCREEN
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
      lockSettings,
    } = useUndercoverGame(lobbyId, currentPlayer, players);

    const [clueInput, setClueInput] = useState('');
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [showWordModal, setShowWordModal] = useState(false);

    const phaseConfig = game ? PHASE_CONFIG[game.phase] ?? PHASE_CONFIG.word_reveal : PHASE_CONFIG.word_reveal;
    const accent = phaseConfig.color;

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

    useEffect(() => {
      if (game?.phase === 'word_reveal' && !hasSeenWord) {
        setShowWordModal(true);
      }
    }, [game?.phase, hasSeenWord]);

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

    const playerIds = useMemo(() => orderedPlayers.map((p) => p.player_id), [orderedPlayers]);
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    // Loading state
    if (loading || !game) {
      return (
        <div className="flex min-h-screen items-center justify-center" style={{ background: INK.bg }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="w-8 h-8 text-purple-400" />
          </motion.div>
        </div>
      );
    }

    // Settings phase
    if (game.phase === 'settings') {
      return (
        <UndercoverPreGameSettings
          totalPlayers={players.length}
          isHost={currentPlayer.isHost}
          initialNumUndercover={game.num_undercover}
          initialTotalRounds={game.total_rounds}
          initialEnableMrWhite={game.enable_mr_white}
          onConfirm={({ numUndercover, totalRounds, enableMrWhite }) =>
            lockSettings({ numUndercover, totalRounds, enableMrWhite })
          }
        />
      );
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;
    const PhaseIcon = phaseConfig.icon;

    return (
      <div className="min-h-screen text-white relative overflow-hidden" style={{ background: INK.bg }}>
        {/* Background gradient glow */}
        <div className="fixed inset-0 pointer-events-none">
          <AnimatePresence mode="sync">
            <motion.div
              key={game.phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
                style={{
                  background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`,
                  filter: 'blur(80px)',
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══════ HEADER ═══════ */}
        <header className="relative z-10 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {/* Phase indicator */}
            <div className="flex items-center gap-2.5">
              <motion.div
                key={game.phase}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${accent}22`, border: `1.5px solid ${accent}44` }}
              >
                <PhaseIcon className="w-4 h-4" style={{ color: accent }} strokeWidth={2.5} />
              </motion.div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                  Manche {game.current_round}
                </p>
                <motion.h1
                  key={phaseConfig.label}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg font-bold leading-tight"
                  style={{ color: accent }}
                >
                  {phaseConfig.label}
                </motion.h1>
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-2">
              {game.phase === 'voting' && (
                <div className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: `${INK.accent.red}15`, border: `1px solid ${INK.accent.red}33`, color: INK.accent.red }}>
                  {votedCount}/{alivePlayers.length} votes
                </div>
              )}
              <div className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: `${INK.accent.green}15`, border: `1px solid ${INK.accent.green}33`, color: INK.accent.green }}>
                {alivePlayers.length} en vie
              </div>
            </div>
          </div>
        </header>

        {/* Timer */}
        {game.phase === 'discussion' && (
          <div className="relative z-10 mx-auto max-w-lg">
            <DiscussionTimer accent={accent} />
          </div>
        )}

        {/* ═══════ PLAYERS ROW ═══════ */}
        <div className="relative z-10 py-4 px-4 overflow-x-auto">
          <div className="flex items-end justify-center gap-3 min-w-max mx-auto">
            {orderedPlayers.map((player) => {
              const isCurrent = currentTurnPlayerId === player.player_id && game.phase === 'clue_giving';
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

              return (
                <PlayerBubble
                  key={player.id}
                  player={player}
                  isCurrent={isCurrent}
                  isMe={isMe}
                  isEliminated={isEliminated}
                  isSelected={isSelected}
                  canVote={canVote}
                  accent={accent}
                  clue={lastClue}
                  avatar={getAvatar(player.player_id)}
                  onSelect={() => setSelectedVote(player.player_id)}
                />
              );
            })}
          </div>
        </div>

        {/* ═══════ ACTION ZONE ═══════ */}
        <div className="relative z-10 mx-auto max-w-lg px-4 pb-32">
          <InkCard accent={accent} glow className="p-5">
            <AnimatePresence mode="wait">
              {/* WORD REVEAL */}
              {game.phase === 'word_reveal' && (
                <motion.div
                  key="word_reveal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-4"
                >
                  {hasSeenWord ? (
                    <>
                      <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center"
                        style={{ background: `${INK.accent.green}22`, border: `1.5px solid ${INK.accent.green}44` }}>
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="text-lg font-bold text-white/80">Mot mémorisé !</p>
                      <p className="text-sm text-white/50">En attente des autres joueurs…</p>
                      {currentPlayer.isHost && (
                        <InkButton onClick={startCluePhase} color={accent}>
                          Lancer les indices <ArrowRight className="w-4 h-4" />
                        </InkButton>
                      )}
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center"
                        style={{ background: `${accent}22`, border: `1.5px solid ${accent}44` }}
                      >
                        <Eye className="w-6 h-6" style={{ color: accent }} />
                      </motion.div>
                      <p className="text-lg font-bold">Découvre ton mot secret</p>
                      <p className="text-sm text-white/50">Appuie sur le bouton en bas</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* CLUE GIVING */}
              {game.phase === 'clue_giving' && (
                <motion.div
                  key="clue_giving"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isMyTurn && myPlayer?.is_alive ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: accent }}>À ton tour !</p>
                        <p className="text-sm text-white/50 mt-1">Donne un indice lié à ton mot (un seul mot)</p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={clueInput}
                          onChange={(e) => setClueInput(e.target.value)}
                          placeholder="Ton indice…"
                          maxLength={30}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                          className="flex-1 h-11 bg-white/5 text-center text-base font-semibold text-white placeholder:text-white/30 rounded-xl border-white/10"
                        />
                        <InkButton onClick={handleSubmitClue} color={accent} disabled={!clueInput.trim()} size="sm">
                          <Send className="w-4 h-4" />
                        </InkButton>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-white/50 text-sm">Au tour de</p>
                      <p className="text-xl font-bold" style={{ color: accent }}>
                        {gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '…'}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* DISCUSSION */}
              {game.phase === 'discussion' && (
                <motion.div
                  key="discussion"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-4"
                >
                  <p className="text-lg font-bold">Qui est l'imposteur ?</p>
                  <p className="text-sm text-white/50">Discutez, accusez, bluffez…</p>
                  {currentPlayer.isHost && (
                    <InkButton onClick={startVoting} color={INK.accent.red}>
                      Passer au vote <Vote className="w-4 h-4" />
                    </InkButton>
                  )}
                </motion.div>
              )}

              {/* VOTING */}
              {game.phase === 'voting' && (
                <motion.div
                  key="voting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center space-y-4"
                >
                  {!myPlayer?.is_alive ? (
                    <>
                      <Skull className="w-8 h-8 mx-auto text-white/40" />
                      <p className="text-base font-semibold text-white/60">Tu observes le vote</p>
                    </>
                  ) : hasVoted ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 mx-auto text-green-400" />
                      <p className="text-base font-semibold text-white/80">Vote enregistré</p>
                      <p className="text-sm text-white/40">En attente des autres…</p>
                    </>
                  ) : selectedVote ? (
                    <>
                      <p className="text-base">
                        Éliminer{' '}
                        <span className="font-bold" style={{ color: INK.accent.red }}>
                          {gamePlayers.find((p) => p.player_id === selectedVote)?.player_name}
                        </span>{' '}
                        ?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <InkButton onClick={() => setSelectedVote(null)} color="#6b7280" variant="ghost" size="sm">
                          Annuler
                        </InkButton>
                        <InkButton onClick={handleVote} color={INK.accent.red} size="sm">
                          Confirmer
                        </InkButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-semibold">Clique sur un joueur pour voter</p>
                      <p className="text-sm text-white/40">Choisis qui tu veux éliminer</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* VOTE RESULT */}
              {game.phase === 'vote_result' && (
                <motion.div
                  key="vote_result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <VoteResultContent
                    game={game}
                    gamePlayers={gamePlayers}
                    isHost={currentPlayer.isHost}
                    accent={accent}
                    onNext={() => { nextRound(); setHasVoted(false); setSelectedVote(null); }}
                  />
                </motion.div>
              )}

              {/* GAME OVER */}
              {isGameOver && (
                <motion.div
                  key="game_over"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                    style={{ background: `${INK.accent.yellow}22`, border: `2px solid ${INK.accent.yellow}44` }}
                  >
                    <Crown className="w-8 h-8 text-yellow-400" fill="currentColor" />
                  </motion.div>
                  <h3 className="text-2xl font-bold">
                    {game.winner_role === 'civilian' ? 'Victoire des Civils !' : 'Victoire des Infiltrés !'}
                  </h3>

                  {game.total_rounds > 1 && (
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className="text-green-400 font-bold">{game.civilian_wins ?? 0} Civils</span>
                      <span className="text-white/30">vs</span>
                      <span className="text-red-400 font-bold">{game.undercover_wins ?? 0} Infiltrés</span>
                    </div>
                  )}

                  <div className="text-sm text-white/60 space-y-1">
                    <p>Mot civil : <span className="text-white font-semibold">{game.civilian_word}</span></p>
                    <p>Mot undercover : <span className="text-white font-semibold">{game.undercover_word}</span></p>
                  </div>

                  <InkButton onClick={onEndGame} color={INK.accent.yellow}>
                    Retour au lobby
                  </InkButton>
                </motion.div>
              )}
            </AnimatePresence>
          </InkCard>
        </div>

        {/* ═══════ BOTTOM: "See my word" button ═══════ */}
        {!isGameOver && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(90vw,400px)]">
            <motion.button
              type="button"
              onClick={() => setShowWordModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full px-5 py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-bold"
              style={{
                background: `linear-gradient(135deg, ${accent}dd, ${accent}99)`,
                border: `2px solid ${accent}`,
                boxShadow: `0 0 20px ${accent}33, 0 4px 12px rgba(0,0,0,0.3)`,
                color: 'white',
              }}
            >
              <Eye className="w-5 h-5" />
              <span>Voir mon mot</span>
            </motion.button>
          </div>
        )}

        {/* ═══════ WORD MODAL ═══════ */}
        <AnimatePresence>
          {showWordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => {
                setShowWordModal(false);
                if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm"
              >
                <InkCard accent={accent} glow className="p-8 text-center">
                  <div className="space-y-5">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">
                      Ton mot secret
                    </p>

                    {myPlayer?.word ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                      >
                        <p className="text-4xl font-black text-white leading-tight break-words"
                          style={{ textShadow: `0 0 30px ${accent}44` }}>
                          {myPlayer.word.toUpperCase()}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-4xl font-black text-white/60">???</p>
                        <p className="text-sm text-white/50">Aucun mot — improvise !</p>
                      </div>
                    )}

                    <InkButton
                      onClick={() => {
                        setShowWordModal(false);
                        if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen();
                      }}
                      color={accent}
                      size="lg"
                      className="w-full"
                    >
                      <EyeOff className="w-4 h-4" />
                      {game.phase === 'word_reveal' && !hasSeenWord ? "C'est noté !" : 'Cacher'}
                    </InkButton>

                    <p className="text-[11px] text-white/30 italic">
                      Personne d'autre ne voit ton mot.
                    </p>
                  </div>
                </InkCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

UndercoverGameScreen.displayName = 'UndercoverGameScreen';

/* ============================================================
   Vote Result Content
============================================================ */
const VoteResultContent = ({
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

  const alive = gamePlayers.filter((p) => p.is_alive);
  const remainingUndercover = alive.filter((p) => p.role === 'undercover');
  const remainingMrWhite = alive.filter((p) => p.role === 'mr_white');
  const remainingCivilians = alive.filter((p) => p.role === 'civilian');
  const allBadOut = remainingUndercover.length === 0 && remainingMrWhite.length === 0;
  const undercoverParity =
    remainingUndercover.length + remainingMrWhite.length >= remainingCivilians.length;
  const roundWinner: 'civilian' | 'undercover' | null = allBadOut
    ? 'civilian'
    : undercoverParity
      ? 'undercover'
      : null;
  const isLastRound = game.current_round >= game.total_rounds;

  const buttonLabel =
    roundWinner !== null
      ? isLastRound ? 'Résultat final' : 'Manche suivante'
      : 'Continuer';

  return (
    <>
      {roundWinner && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3 py-1.5 inline-block rounded-lg text-sm font-bold"
          style={{
            background: roundWinner === 'civilian' ? `${INK.accent.green}22` : `${INK.accent.red}22`,
            border: `1.5px solid ${roundWinner === 'civilian' ? INK.accent.green : INK.accent.red}44`,
            color: roundWinner === 'civilian' ? INK.accent.green : INK.accent.red,
          }}
        >
          {roundWinner === 'civilian' ? 'Civils gagnent la manche !' : 'Infiltrés gagnent la manche !'}
        </motion.div>
      )}

      {game.eliminated_player_id ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center"
            style={{ background: `${INK.accent.red}22`, border: `2px solid ${INK.accent.red}44` }}
          >
            <Skull className="w-7 h-7 text-red-400" />
          </motion.div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Éliminé</p>
            <p className="text-xl font-bold text-white">{eliminatedName}</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
            <X className="w-7 h-7 text-white/50" />
          </div>
          <p className="text-base font-semibold text-white/70">Égalité — personne éliminé</p>
        </>
      )}

      {isHost && (
        <InkButton onClick={onNext} color={accent}>
          {buttonLabel} <ArrowRight className="w-4 h-4" />
        </InkButton>
      )}
    </>
  );
};
