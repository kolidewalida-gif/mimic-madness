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
  Zap,
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
   CARTOON GRAFFITI PALETTE — Bold, vibrant, dynamic
============================================================ */
const SHADOW = '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810';
const SHADOW_SM = '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810';

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  word_reveal: { label: '👁️ Découverte', color: '#a855f7', bg: 'from-purple-600 to-violet-700', emoji: '👁️' },
  clue_giving: { label: '💬 Indices', color: '#06b6d4', bg: 'from-cyan-500 to-teal-600', emoji: '💬' },
  discussion: { label: '🔥 Débat', color: '#f59e0b', bg: 'from-amber-500 to-orange-600', emoji: '🔥' },
  voting: { label: '⚡ Vote', color: '#ef4444', bg: 'from-red-500 to-rose-600', emoji: '⚡' },
  vote_result: { label: '💀 Résultat', color: '#fbbf24', bg: 'from-yellow-500 to-amber-600', emoji: '💀' },
  game_over: { label: '🏆 Victoire', color: '#fbbf24', bg: 'from-yellow-400 to-orange-500', emoji: '🏆' },
};

/* ============================================================
   Cartoon Card — 3D shadow, thick border, inner glow
============================================================ */
const CartoonCard = ({ accent, children, className, glow = false }: {
  accent: string; children: React.ReactNode; className?: string; glow?: boolean;
}) => (
  <div className={cn('relative rounded-3xl overflow-hidden', className)} style={{
    background: 'linear-gradient(180deg, #1a0d2e 0%, #14101f 60%, #0f0820 100%)',
    border: '4px solid #0a0810',
    boxShadow: glow
      ? `0 8px 0 #0a0810, 0 0 30px ${accent}44, 0 14px 30px rgba(0,0,0,0.5)`
      : '0 8px 0 #0a0810, 0 14px 30px rgba(0,0,0,0.5)',
  }}>
    <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${accent}44` }} />
    {children}
  </div>
);

/* ============================================================
   Cartoon Button — Bold, bouncy, 3D
============================================================ */
const CartoonBtn = ({ children, onClick, color = '#a855f7', disabled = false, className = '', size = 'md' }: {
  children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean; className?: string; size?: 'sm' | 'md' | 'lg';
}) => (
  <motion.button
    type="button" onClick={onClick} disabled={disabled}
    whileHover={!disabled ? { scale: 1.05, rotate: -1.5 } : undefined}
    whileTap={!disabled ? { scale: 0.95 } : undefined}
    className={cn(
      'relative inline-flex items-center justify-center gap-2 rounded-2xl font-black text-white transition-opacity',
      size === 'sm' && 'px-3 py-2 text-sm',
      size === 'md' && 'px-5 py-3 text-lg',
      size === 'lg' && 'px-7 py-4 text-xl',
      disabled && 'opacity-40 cursor-not-allowed',
      className,
    )}
    style={{
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      border: '3px solid #0a0810',
      boxShadow: '0 5px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
      fontFamily: "'Caveat', cursive",
      textShadow: SHADOW_SM,
    }}
  >{children}</motion.button>
);

/* ============================================================
   Player Card — Cartoon avatar with speech bubble
============================================================ */
const PlayerCard = ({ player, isCurrent, isMe, isEliminated, isSelected, canVote, accent, clue, avatar, onSelect }: {
  player: { player_id: string; player_name: string; is_alive: boolean };
  isCurrent: boolean; isMe: boolean; isEliminated: boolean; isSelected: boolean;
  canVote: boolean; accent: string; clue: string | null;
  avatar: { type: string; imageUrl?: string }; onSelect: () => void;
}) => (
  <motion.div
    layout
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: isEliminated ? 0.4 : 1 }}
    className="flex flex-col items-center gap-1.5"
  >
    {/* Speech bubble */}
    <AnimatePresence mode="wait">
      {clue && (
        <motion.div
          key={clue}
          initial={{ scale: 0, y: 10, rotate: -8 }}
          animate={{ scale: 1, y: 0, rotate: isCurrent ? -2 : 2 }}
          exit={{ scale: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative px-3 py-1.5 rounded-xl max-w-[100px]"
          style={{
            background: isCurrent ? `linear-gradient(180deg, ${accent}, ${accent}cc)` : 'linear-gradient(180deg, #fff, #e5e7eb)',
            border: '2.5px solid #0a0810',
            boxShadow: '0 3px 0 #0a0810',
          }}
        >
          <span className={cn('block truncate text-sm font-black text-center', isCurrent ? 'text-white' : 'text-[#0a0810]')}
            style={{ fontFamily: "'Caveat', cursive" }}>
            {clue}
          </span>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
            style={{ background: isCurrent ? accent : '#e5e7eb', border: '2px solid #0a0810', borderTop: 'none', borderLeft: 'none' }} />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Avatar */}
    <motion.button
      type="button"
      onClick={canVote ? onSelect : undefined}
      disabled={!canVote}
      whileHover={canVote ? { scale: 1.1, y: -4 } : undefined}
      whileTap={canVote ? { scale: 0.95 } : undefined}
      animate={isCurrent ? { y: [0, -5, 0] } : undefined}
      transition={isCurrent ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
      className={cn('relative w-16 h-16 rounded-full flex items-center justify-center', canVote && 'cursor-pointer')}
      style={{
        background: isSelected ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
          : isCurrent ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
          : isMe ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
          : 'linear-gradient(135deg, #a855f7, #7c3aed)',
        border: '4px solid #0a0810',
        boxShadow: isCurrent ? `0 5px 0 #0a0810, 0 0 20px ${accent}66` : isSelected ? '0 5px 0 #0a0810, 0 0 16px #ef444466' : '0 4px 0 #0a0810',
      }}
    >
      {isEliminated ? (
        <Skull className="w-7 h-7 text-white/70" />
      ) : avatar.type === 'image' && avatar.imageUrl ? (
        <img src={avatar.imageUrl} alt={player.player_name} className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <span className="text-2xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>
          {player.player_name[0]?.toUpperCase()}
        </span>
      )}

      {/* Current turn badge */}
      {isCurrent && !isEliminated && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [-5, 5, -5] }}
          transition={{ rotate: { duration: 1.5, repeat: Infinity } }}
          className="absolute -top-3 -right-2 px-1.5 py-0.5 rounded-lg"
          style={{ background: accent, border: '2px solid #0a0810', boxShadow: '0 2px 0 #0a0810' }}
        >
          <span className="text-[10px] font-black text-white" style={{ fontFamily: "'Caveat', cursive" }}>À TOI</span>
        </motion.div>
      )}

      {/* Vote target X */}
      {isSelected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 border-2 border-[#0a0810] flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>

    {/* Name */}
    <span className={cn('text-xs font-black truncate max-w-[70px]', isMe ? 'text-cyan-300' : 'text-white/80')}
      style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>
      {isMe ? '👤 Toi' : player.player_name}
    </span>
  </motion.div>
);

/* ============================================================
   Discussion Timer — Animated countdown bar
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
    <motion.div
      animate={urgent ? { scale: [1, 1.02, 1] } : undefined}
      transition={{ duration: 0.5, repeat: Infinity }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
      style={{ background: 'rgba(0,0,0,0.4)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}
    >
      <motion.div
        animate={urgent ? { rotate: [0, -10, 10, 0] } : undefined}
        transition={{ duration: 0.4, repeat: Infinity }}
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, border: '2px solid #0a0810', boxShadow: '0 2px 0 #0a0810' }}
      >
        <Timer className="w-4 h-4 text-white" strokeWidth={2.5} />
      </motion.div>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid #0a0810' }}>
        <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'linear' }}
          style={{ background: urgent ? 'linear-gradient(90deg, #fbbf24, #ef4444)' : `linear-gradient(90deg, ${color}, ${color}88)` }} />
      </div>
      <span className={cn('text-2xl font-black tabular-nums', urgent && 'text-red-400 animate-pulse')}
        style={{ fontFamily: "'Caveat', cursive", color: urgent ? '#ef4444' : 'white', textShadow: SHADOW_SM }}>
        {seconds}s
      </span>
    </motion.div>
  );
};

/* ============================================================
   MAIN GAME SCREEN
============================================================ */
export const UndercoverGameScreen = memo(
  ({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
    const {
      game, gamePlayers, myPlayer, loading, alivePlayers,
      currentTurnPlayerId, isMyTurn, hasSeenWord,
      submitClue, submitVote, startVoting, nextRound,
      confirmWordSeen, startCluePhase, lockSettings,
    } = useUndercoverGame(lobbyId, currentPlayer, players);

    const [clueInput, setClueInput] = useState('');
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [showWordModal, setShowWordModal] = useState(false);

    const phase = game ? PHASE_STYLE[game.phase] ?? PHASE_STYLE.word_reveal : PHASE_STYLE.word_reveal;
    const accent = phase.color;

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

    useEffect(() => { if (game?.phase === 'voting') { setHasVoted(false); setSelectedVote(null); } }, [game?.phase]);
    useEffect(() => { if (game?.phase === 'word_reveal' && !hasSeenWord) setShowWordModal(true); }, [game?.phase, hasSeenWord]);

    const orderedPlayers = useMemo(() => {
      if (!game) return [] as typeof gamePlayers;
      const byId = new Map(gamePlayers.map((p) => [p.player_id, p]));
      const ordered = game.player_order.map((id) => byId.get(id)).filter(Boolean) as typeof gamePlayers;
      gamePlayers.forEach((p) => { if (!ordered.find((o) => o.player_id === p.player_id)) ordered.push(p); });
      return ordered;
    }, [game, gamePlayers]);

    const playerIds = useMemo(() => orderedPlayers.map((p) => p.player_id), [orderedPlayers]);
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    if (loading || !game) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0810]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)', border: '4px solid #0a0810', boxShadow: '0 5px 0 #0a0810' }}>
            <Loader2 className="w-7 h-7 text-white" />
          </motion.div>
        </div>
      );
    }

    if (game.phase === 'settings') {
      return <UndercoverPreGameSettings totalPlayers={players.length} isHost={currentPlayer.isHost}
        initialNumUndercover={game.num_undercover} initialTotalRounds={game.total_rounds} initialEnableMrWhite={game.enable_mr_white}
        onConfirm={({ numUndercover, totalRounds, enableMrWhite }) => lockSettings({ numUndercover, totalRounds, enableMrWhite })} />;
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;

    return (
      <div className="min-h-screen text-white relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f0820, #0a0510, #160a26)' }}>
        {/* Animated background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)`, filter: 'blur(80px)' }} />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: `radial-gradient(circle, #f472b644, transparent 70%)`, filter: 'blur(60px)' }} />
          {/* Graffiti decorations */}
          <Sparkles className="absolute top-[15%] right-[8%] w-6 h-6 text-amber-400/30" />
          <Sparkles className="absolute bottom-[25%] left-[5%] w-5 h-5 text-pink-400/25" />
          <Zap className="absolute top-[40%] right-[3%] w-4 h-4 text-cyan-400/20" />
        </div>

        {/* ═══════ HEADER — Phase + Stats ═══════ */}
        <header className="relative z-10 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {/* Phase badge */}
            <motion.div key={game.phase} initial={{ x: -20, opacity: 0, rotate: -5 }} animate={{ x: 0, opacity: 1, rotate: 0 }}
              className="flex items-center gap-2.5">
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br', phase.bg)}
                style={{ border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
                <span className="text-lg">{phase.emoji}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black" style={{ fontFamily: "'Caveat', cursive" }}>
                  Manche {game.current_round}
                </p>
                <h1 className="text-2xl font-black leading-none" style={{ fontFamily: "'Caveat', cursive", color: accent, textShadow: SHADOW_SM }}>
                  {phase.label}
                </h1>
              </div>
            </motion.div>

            {/* Stats pills */}
            <div className="flex items-center gap-2">
              {game.phase === 'voting' && (
                <div className="px-2.5 py-1 rounded-xl text-xs font-black" style={{ background: '#ef444422', border: '2px solid #0a0810', boxShadow: '0 2px 0 #0a0810', color: '#ef4444', fontFamily: "'Caveat', cursive" }}>
                  ⚡ {votedCount}/{alivePlayers.length}
                </div>
              )}
              <div className="px-2.5 py-1 rounded-xl text-xs font-black" style={{ background: '#34d39922', border: '2px solid #0a0810', boxShadow: '0 2px 0 #0a0810', color: '#34d399', fontFamily: "'Caveat', cursive" }}>
                💀 {alivePlayers.length}/{players.length}
              </div>
            </div>
          </div>
        </header>

        {/* Timer */}
        {game.phase === 'discussion' && (
          <div className="relative z-10 mx-auto max-w-xl px-4 mb-3">
            <DiscussionTimer accent={accent} />
          </div>
        )}

        {/* ═══════ PLAYERS CIRCLE ═══════ */}
        <div className="relative z-10 py-4 px-4">
          <div className="flex items-end justify-center gap-4 flex-wrap">
            {orderedPlayers.map((player) => {
              const isCurrent = currentTurnPlayerId === player.player_id && game.phase === 'clue_giving';
              const isMe = player.player_id === currentPlayer.id;
              const isEliminated = !player.is_alive;
              const canVotePlayer = game.phase === 'voting' && Boolean(myPlayer?.is_alive) && !hasVoted && player.player_id !== currentPlayer.id && player.is_alive;
              const isSelected = selectedVote === player.player_id;
              const history = (player as { clue_history?: string[] }).clue_history ?? [];
              const lastClue = history[history.length - 1] ?? player.current_clue;

              return (
                <PlayerCard key={player.id} player={player} isCurrent={isCurrent} isMe={isMe}
                  isEliminated={isEliminated} isSelected={isSelected} canVote={canVotePlayer}
                  accent={accent} clue={lastClue} avatar={getAvatar(player.player_id)}
                  onSelect={() => setSelectedVote(player.player_id)} />
              );
            })}
          </div>
        </div>

        {/* ═══════ ACTION ZONE — Big central card ═══════ */}
        <div className="relative z-10 mx-auto max-w-xl px-4 pb-32">
          <CartoonCard accent={accent} glow className="p-6">
            <Sparkles className="absolute top-3 left-3 w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }} />
            <Sparkles className="absolute top-3 right-3 w-3.5 h-3.5 text-pink-400" style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }} />

            <AnimatePresence mode="wait">
              {/* WORD REVEAL */}
              {game.phase === 'word_reveal' && (
                <motion.div key="wr" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-4 relative">
                  {hasSeenWord ? (
                    <>
                      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }}
                        className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #34d399, #059669)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </motion.div>
                      <p className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW }}>Mot mémorisé ! ✅</p>
                      <p className="text-sm text-white/50" style={{ fontFamily: "'Caveat', cursive" }}>En attente des autres…</p>
                      {currentPlayer.isHost && <CartoonBtn onClick={startCluePhase} color={accent}>Lancer les indices 🚀</CartoonBtn>}
                    </>
                  ) : (
                    <>
                      <motion.div animate={{ rotate: [-5, 5, -5], scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
                        className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
                        <Eye className="w-8 h-8 text-white" />
                      </motion.div>
                      <p className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW }}>Découvre ton mot ! 🔮</p>
                      <p className="text-sm text-white/50" style={{ fontFamily: "'Caveat', cursive" }}>Appuie sur le bouton en bas</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* CLUE GIVING */}
              {game.phase === 'clue_giving' && (
                <motion.div key="cg" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="relative">
                  {isMyTurn && myPlayer?.is_alive ? (
                    <div className="space-y-4 text-center">
                      <motion.p animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", color: accent, textShadow: SHADOW }}>
                        C'est à toi ! 🎤
                      </motion.p>
                      <p className="text-sm text-white/60" style={{ fontFamily: "'Caveat', cursive" }}>Donne un indice subtil (un seul mot)</p>
                      <div className="flex gap-2">
                        <Input value={clueInput} onChange={(e) => setClueInput(e.target.value)} placeholder="ex: rond, sucré…"
                          maxLength={30} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                          className="flex-1 h-12 bg-black/40 text-center text-xl font-black text-white placeholder:text-white/30 rounded-2xl"
                          style={{ fontFamily: "'Caveat', cursive", border: '3px solid #0a0810', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }} />
                        <CartoonBtn onClick={handleSubmitClue} color={accent} disabled={!clueInput.trim()} size="sm">
                          <Send className="w-5 h-5" />
                        </CartoonBtn>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-white/50 text-base" style={{ fontFamily: "'Caveat', cursive" }}>Au tour de</p>
                      <p className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", color: accent, textShadow: `0 0 12px ${accent}66` }}>
                        {gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '…'}
                      </p>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-4xl">💭</motion.div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* DISCUSSION */}
              {game.phase === 'discussion' && (
                <motion.div key="disc" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-4 relative">
                  <p className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW }}>Qui est l'imposteur ? 🕵️</p>
                  <p className="text-sm text-white/60" style={{ fontFamily: "'Caveat', cursive" }}>Accusez, bluffez, défendez-vous !</p>
                  {currentPlayer.isHost && <CartoonBtn onClick={startVoting} color="#ef4444">Passer au vote ⚡</CartoonBtn>}
                </motion.div>
              )}

              {/* VOTING */}
              {game.phase === 'voting' && (
                <motion.div key="vote" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                  className="text-center space-y-4 relative">
                  {!myPlayer?.is_alive ? (
                    <>
                      <Skull className="w-12 h-12 mx-auto text-white/40" />
                      <p className="text-xl font-black text-white/60" style={{ fontFamily: "'Caveat', cursive" }}>Tu observes… 👻</p>
                    </>
                  ) : hasVoted ? (
                    <>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                        className="text-5xl">✅</motion.div>
                      <p className="text-xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>Vote enregistré !</p>
                    </>
                  ) : selectedVote ? (
                    <>
                      <p className="text-xl font-black" style={{ fontFamily: "'Caveat', cursive" }}>
                        Éliminer <span style={{ color: '#ef4444' }}>{gamePlayers.find((p) => p.player_id === selectedVote)?.player_name}</span> ?
                      </p>
                      <div className="flex gap-3 justify-center">
                        <CartoonBtn onClick={() => setSelectedVote(null)} color="#6b7280" size="sm">Annuler</CartoonBtn>
                        <CartoonBtn onClick={handleVote} color="#ef4444" size="sm">Confirmer 💀</CartoonBtn>
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-4xl">🎯</motion.div>
                      <p className="text-xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>
                        Clique sur un joueur !
                      </p>
                    </>
                  )}
                </motion.div>
              )}

              {/* VOTE RESULT */}
              {game.phase === 'vote_result' && (
                <motion.div key="vr" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-4 relative">
                  <VoteResult game={game} gamePlayers={gamePlayers} isHost={currentPlayer.isHost} accent={accent}
                    onNext={() => { nextRound(); setHasVoted(false); setSelectedVote(null); }} />
                </motion.div>
              )}

              {/* GAME OVER */}
              {isGameOver && (
                <motion.div key="go" initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10 }} className="text-center space-y-4 relative">
                  <motion.div animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl">🏆</motion.div>
                  <h3 className="text-4xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW }}>
                    {game.winner_role === 'civilian' ? 'Civils gagnent ! 🎉' : 'Infiltrés gagnent ! 😈'}
                  </h3>
                  {game.total_rounds > 1 && (
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-green-400 font-black text-xl" style={{ fontFamily: "'Caveat', cursive" }}>{game.civilian_wins ?? 0} Civils</span>
                      <span className="text-white/30 font-black">vs</span>
                      <span className="text-red-400 font-black text-xl" style={{ fontFamily: "'Caveat', cursive" }}>{game.undercover_wins ?? 0} Infiltrés</span>
                    </div>
                  )}
                  <div className="text-sm text-white/60 space-y-1" style={{ fontFamily: "'Caveat', cursive" }}>
                    <p>Mot civil : <span className="text-white font-black">{game.civilian_word}</span></p>
                    <p>Mot undercover : <span className="text-white font-black">{game.undercover_word}</span></p>
                  </div>
                  <CartoonBtn onClick={onEndGame} color="#fbbf24">Retour au lobby 🏠</CartoonBtn>
                </motion.div>
              )}
            </AnimatePresence>
          </CartoonCard>
        </div>

        {/* ═══════ BOTTOM: "See my word" button ═══════ */}
        {!isGameOver && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(90vw,380px)]">
            <motion.button type="button" onClick={() => setShowWordModal(true)}
              whileHover={{ scale: 1.04, rotate: -1 }} whileTap={{ scale: 0.96 }}
              animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full px-5 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xl text-white"
              style={{
                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                border: '4px solid #0a0810',
                boxShadow: `0 6px 0 #0a0810, 0 0 24px ${accent}44, inset 0 2px 0 rgba(255,255,255,0.25)`,
                fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM,
              }}>
              <Eye className="w-6 h-6" /> Voir mon mot 👁️
            </motion.button>
          </div>
        )}

        {/* ═══════ WORD MODAL ═══════ */}
        <AnimatePresence>
          {showWordModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}>
              <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: -1 }} exit={{ scale: 0.7, rotate: 8 }}
                transition={{ type: 'spring', damping: 14 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
                <CartoonCard accent={accent} glow className="p-8 text-center">
                  <Sparkles className="absolute top-3 left-4 w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }} />
                  <Sparkles className="absolute top-3 right-4 w-4 h-4 text-pink-400" style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }} />
                  <div className="relative space-y-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-black" style={{ fontFamily: "'Caveat', cursive" }}>
                      🤫 Ton mot secret
                    </p>
                    {myPlayer?.word ? (
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', damping: 12 }}>
                        <p className="text-5xl font-black text-white break-words" style={{ fontFamily: "'Caveat', cursive", textShadow: `${SHADOW}, 0 0 30px ${accent}66` }}>
                          {myPlayer.word.toUpperCase()}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-5xl font-black text-white/50" style={{ fontFamily: "'Caveat', cursive" }}>???</p>
                        <p className="text-sm text-white/50" style={{ fontFamily: "'Caveat', cursive" }}>Aucun mot — improvise ! 🎭</p>
                      </div>
                    )}
                    <CartoonBtn onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}
                      color={accent} size="lg" className="w-full">
                      <EyeOff className="w-5 h-5" />
                      {game.phase === 'word_reveal' && !hasSeenWord ? "C'est noté ! 👍" : 'Cacher 🙈'}
                    </CartoonBtn>
                    <p className="text-[11px] text-white/30 italic" style={{ fontFamily: "'Caveat', cursive" }}>
                      Personne d'autre ne voit ton mot. 🤐
                    </p>
                  </div>
                </CartoonCard>
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
   Vote Result Sub-component
============================================================ */
const VoteResult = ({ game, gamePlayers, isHost, accent, onNext }: {
  game: any; gamePlayers: any[]; isHost: boolean; accent: string; onNext: () => void;
}) => {
  const eliminatedName = gamePlayers.find((p) => p.player_id === game.eliminated_player_id)?.player_name;
  const alive = gamePlayers.filter((p) => p.is_alive);
  const remainingUC = alive.filter((p) => p.role === 'undercover').length;
  const remainingMW = alive.filter((p) => p.role === 'mr_white').length;
  const remainingCiv = alive.filter((p) => p.role === 'civilian').length;
  const allBadOut = remainingUC === 0 && remainingMW === 0;
  const ucParity = remainingUC + remainingMW >= remainingCiv;
  const roundWinner = allBadOut ? 'civilian' : ucParity ? 'undercover' : null;
  const isLastRound = game.current_round >= game.total_rounds;
  const buttonLabel = roundWinner !== null ? (isLastRound ? 'Résultat final 🏆' : 'Manche suivante ➡️') : 'Continuer 🔄';

  return (
    <>
      {roundWinner && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="px-4 py-2 inline-block rounded-2xl"
          style={{ background: roundWinner === 'civilian' ? 'linear-gradient(180deg, #34d399, #059669)' : 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
          <span className="text-base font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>
            {roundWinner === 'civilian' ? '🎉 Civils gagnent !' : '😈 Infiltrés gagnent !'}
          </span>
        </motion.div>
      )}

      {game.eliminated_player_id ? (
        <>
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }}
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: '4px solid #0a0810', boxShadow: '0 5px 0 #0a0810, 0 0 20px #ef444466' }}>
            <Skull className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider" style={{ fontFamily: "'Caveat', cursive" }}>Éliminé</p>
            <p className="text-3xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW }}>{eliminatedName} 💀</p>
          </div>
        </>
      ) : (
        <>
          <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl">🤷</motion.div>
          <p className="text-2xl font-black" style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>Égalité — personne éliminé !</p>
        </>
      )}

      {isHost && <CartoonBtn onClick={onNext} color={accent}>{buttonLabel}</CartoonBtn>}
    </>
  );
};
