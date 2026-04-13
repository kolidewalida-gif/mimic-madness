import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import {
  Eye, EyeOff, MessageCircle, Vote, Skull, Crown, Shield,
  UserX, AlertTriangle, ArrowRight, Send, Timer, Users,
  CheckCircle2, Sparkles, Fingerprint, Search, Lock
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

const roleConfig = {
  civilian: { label: 'Civil', emoji: '🛡️', icon: Shield, gradient: 'from-blue-500 to-cyan-500', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  undercover: { label: 'Undercover', emoji: '🕵️', icon: UserX, gradient: 'from-red-500 to-orange-500', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
  mr_white: { label: 'Mr. White', emoji: '👻', icon: AlertTriangle, gradient: 'from-gray-300 to-white', text: 'text-gray-200', bg: 'bg-white/5', border: 'border-white/20', glow: 'shadow-white/10' },
};

const phaseLabels: Record<string, { label: string; emoji: string }> = {
  word_reveal: { label: 'Révélation', emoji: '👁️' },
  clue_giving: { label: 'Indices', emoji: '💬' },
  discussion: { label: 'Discussion', emoji: '🗣️' },
  voting: { label: 'Vote', emoji: '🗳️' },
  vote_result: { label: 'Résultat', emoji: '⚖️' },
  game_over: { label: 'Fin', emoji: '🏆' },
};

// Floating particle background
const FloatingParticle = ({ delay, size }: { delay: number; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-primary/10 pointer-events-none"
    style={{ width: size, height: size }}
    initial={{ opacity: 0, x: Math.random() * 100 - 50, y: '110%' }}
    animate={{
      opacity: [0, 0.6, 0],
      y: '-10%',
      x: Math.random() * 200 - 100,
    }}
    transition={{
      duration: 8 + Math.random() * 6,
      delay,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// Vote progress ring
const VoteProgressRing = ({ voted, total }: { voted: number; total: number }) => {
  const pct = total > 0 ? (voted / total) * 100 : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" opacity={0.3} />
        <motion.circle
          cx="32" cy="32" r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-primary">{voted}/{total}</span>
      </div>
    </div>
  );
};

// Discussion timer
const DiscussionTimer = ({ onExpire }: { onExpire?: () => void }) => {
  const DURATION = 60;
  const [seconds, setSeconds] = useState(DURATION);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onExpire]);

  const pct = (seconds / DURATION) * 100;
  const urgent = seconds <= 10;

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full border',
        urgent ? 'border-red-500/50 bg-red-500/10' : 'border-primary/30 bg-primary/5'
      )}
      animate={urgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
    >
      <Timer className={cn('w-4 h-4', urgent ? 'text-red-400' : 'text-primary')} />
      <div className="w-24 h-2 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', urgent ? 'bg-red-500' : 'bg-primary')}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className={cn('text-sm font-mono font-bold min-w-[2ch]', urgent ? 'text-red-400' : 'text-primary')}>
        {seconds}s
      </span>
    </motion.div>
  );
};

export const UndercoverGameScreen = memo(({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
  const {
    game, gamePlayers, myPlayer, loading, alivePlayers,
    currentTurnPlayerId, isMyTurn, hasSeenWord,
    submitClue, submitVote, startVoting, nextRound,
    confirmWordSeen, startCluePhase,
  } = useUndercoverGame(lobbyId, currentPlayer, players);

  const [clueInput, setClueInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const [wordRevealed, setWordRevealed] = useState(false);

  const handleSubmitClue = useCallback(() => {
    if (clueInput.trim()) {
      submitClue(clueInput.trim());
      setClueInput('');
    }
  }, [clueInput, submitClue]);

  const handleVote = useCallback(() => {
    if (selectedVote) {
      submitVote(selectedVote);
      setHasVoted(true);
    }
  }, [selectedVote, submitVote]);

  const handleRevealWord = useCallback(() => {
    setShowWord(true);
    setWordRevealed(true);
    setTimeout(() => setShowWord(false), 4000);
  }, []);

  // Reset vote state on phase change
  useEffect(() => {
    if (game?.phase === 'voting') {
      setHasVoted(false);
      setSelectedVote(null);
    }
  }, [game?.phase]);

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-24 h-24 mx-auto rounded-full border-4 border-primary/30 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <div className="space-y-2">
            <p className="text-xl font-bold">🕵️ Undercover</p>
            <p className="text-muted-foreground text-sm">Préparation de la partie...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const phase = game.phase;
  const myRole = myPlayer?.role as keyof typeof roleConfig;
  const myRoleConfig = myRole ? roleConfig[myRole] : null;
  const phaseInfo = phaseLabels[phase] || { label: phase, emoji: '🎮' };
  const votedCount = alivePlayers.filter(p => p.vote_target !== null).length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <FloatingParticle key={i} delay={i * 1.5} size={4 + Math.random() * 8} />
        ))}
      </div>

      <div className="relative z-10 p-4 pb-32 max-w-lg mx-auto space-y-4">
        {/* Header compact */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">
              🕵️
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">UNDERCOVER</h1>
              <p className="text-xs text-muted-foreground">Manche {game.current_round}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 font-semibold">
              {phaseInfo.emoji} {phaseInfo.label}
            </span>
          </div>
        </motion.div>

        {/* Player status strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        >
          {gamePlayers.map((p, i) => {
            const isCurrent = currentTurnPlayerId === p.player_id;
            const isMe = p.player_id === currentPlayer.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  !p.is_alive && 'opacity-30 line-through',
                  isCurrent && p.is_alive && 'bg-primary/20 border-primary text-primary ring-2 ring-primary/30',
                  !isCurrent && p.is_alive && 'bg-card/50 border-border/30',
                  isMe && p.is_alive && !isCurrent && 'border-primary/40',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black',
                  isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted/40'
                )}>
                  {!p.is_alive ? '💀' : p.player_name[0]?.toUpperCase()}
                </div>
                {p.player_name.length > 8 ? p.player_name.slice(0, 7) + '…' : p.player_name}
                {isMe && <span className="text-primary/60">(moi)</span>}
              </motion.div>
            );
          })}
        </motion.div>

        {/* My role card - always visible */}
        {myPlayer && myRoleConfig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className={cn(
              'relative overflow-hidden rounded-2xl border-2 p-3',
              myRoleConfig.border, myRoleConfig.bg
            )}
          >
            <div className={cn('absolute inset-0 opacity-5 bg-gradient-to-br', myRoleConfig.gradient)} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{myRoleConfig.emoji}</span>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Votre rôle</p>
                  <p className={cn('text-sm font-black', myRoleConfig.text)}>{myRoleConfig.label}</p>
                </div>
              </div>
              {myPlayer.is_alive ? (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  En vie
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <Skull className="w-3 h-3" /> Éliminé
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main content phases */}
        <AnimatePresence mode="wait">
          {/* ═══ WORD REVEAL ═══ */}
          {phase === 'word_reveal' && myPlayer && (
            <motion.div
              key="word-reveal"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center space-y-5 shadow-xl shadow-primary/5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                >
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    {myPlayer.role === 'mr_white' ? (
                      <AlertTriangle className="w-10 h-10 text-white/60" />
                    ) : (
                      <Fingerprint className="w-10 h-10 text-primary" />
                    )}
                  </div>
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-xl font-black">
                    {myPlayer.role === 'mr_white' ? "Vous êtes Mr. White" : "Votre mot secret"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {myPlayer.role === 'mr_white'
                      ? "Vous n'avez aucun mot. Bluffez et essayez de deviner le mot des civils grâce aux indices donnés !"
                      : "Mémorisez-le bien. Donnez des indices subtils sans le révéler directement !"}
                  </p>
                </div>

                {myPlayer.role !== 'mr_white' && (
                  <>
                    {!showWord && !wordRevealed && (
                      <motion.button
                        onClick={handleRevealWord}
                        className="mx-auto flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 rounded-2xl transition-all border border-primary/30 group"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Eye className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-primary">Révéler mon mot</span>
                      </motion.button>
                    )}

                    {showWord && myPlayer.word && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotateX: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        className="relative py-6"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl blur-xl" />
                        <div className="relative">
                          <p className="text-4xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            {myPlayer.word}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                            <EyeOff className="w-3 h-3" /> Disparaît dans quelques secondes...
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {!showWord && wordRevealed && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        <p className="text-sm text-green-400 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> Mot caché
                        </p>
                        <button
                          onClick={handleRevealWord}
                          className="text-xs text-muted-foreground underline hover:text-primary transition-colors"
                        >
                          Revoir le mot
                        </button>
                      </motion.div>
                    )}
                  </>
                )}

                {!hasSeenWord ? (
                  <motion.button
                    onClick={confirmWordSeen}
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl font-black text-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> J'ai mémorisé !
                    </span>
                  </motion.button>
                ) : (
                  <div className="space-y-3">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-green-400 text-sm font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mot mémorisé
                    </motion.div>
                    {currentPlayer.isHost ? (
                      <motion.button
                        onClick={startCluePhase}
                        className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl font-black hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Commencer les indices <ArrowRight className="w-5 h-5" />
                        </span>
                      </motion.button>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center animate-pulse">
                        ⏳ En attente de l'hôte...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ CLUE GIVING ═══ */}
          {phase === 'clue_giving' && (
            <motion.div
              key="clue-giving"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 p-5 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-black">Tour d'indices</h2>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded-full">
                    <Users className="w-3 h-3" />
                    {gamePlayers.filter(p => p.is_alive && p.current_clue).length}/{alivePlayers.length}
                  </div>
                </div>

                {/* Current player spotlight */}
                {currentTurnPlayerId && (
                  <motion.div
                    key={currentTurnPlayerId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'text-center py-4 rounded-2xl border',
                      isMyTurn
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/10 border-border/20'
                    )}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">C'est au tour de</p>
                    <p className={cn('text-2xl font-black mt-1', isMyTurn ? 'text-primary' : '')}>
                      {isMyTurn ? '🎯 Vous !' : gamePlayers.find(p => p.player_id === currentTurnPlayerId)?.player_name}
                    </p>
                  </motion.div>
                )}

                {/* Clues list */}
                {gamePlayers.filter(p => p.is_alive && p.current_clue).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Indices donnés</p>
                    {gamePlayers
                      .filter(p => p.is_alive && p.current_clue)
                      .map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-border/10"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                            {p.player_name[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm text-muted-foreground">{p.player_name}</span>
                          <span className="ml-auto text-sm font-bold text-primary">« {p.current_clue} »</span>
                        </motion.div>
                      ))}
                  </div>
                )}

                {/* Input */}
                {isMyTurn && myPlayer?.is_alive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-center text-primary font-semibold">
                      💡 Donnez un indice en UN mot
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={clueInput}
                        onChange={e => setClueInput(e.target.value)}
                        placeholder="Votre indice..."
                        className="flex-1 h-12 rounded-xl text-base border-primary/30 focus:border-primary bg-background/50"
                        maxLength={30}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSubmitClue()}
                      />
                      <motion.button
                        onClick={handleSubmitClue}
                        disabled={!clueInput.trim()}
                        className="h-12 w-12 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-30 hover:brightness-110 transition-all flex items-center justify-center"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {!isMyTurn && (
                  <div className="text-center py-3">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-sm text-muted-foreground"
                    >
                      ⏳ En attente de l'indice...
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ DISCUSSION ═══ */}
          {phase === 'discussion' && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 p-5 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black flex items-center gap-2">
                    🗣️ Discussion
                  </h2>
                  <DiscussionTimer />
                </div>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <p className="text-sm text-center font-medium">
                    <Search className="w-4 h-4 inline mr-1 text-yellow-400" />
                    Discutez et trouvez l'Undercover ! Qui est suspect ?
                  </p>
                </div>

                {/* All clues recap */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Récap des indices</p>
                  {gamePlayers
                    .filter(p => p.is_alive && p.current_clue)
                    .map((p, i) => {
                      const isMe = p.player_id === currentPlayer.id;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border',
                            isMe
                              ? 'bg-primary/5 border-primary/20'
                              : 'bg-muted/5 border-border/10'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black',
                            isMe ? 'bg-primary/20 text-primary' : 'bg-muted/20'
                          )}>
                            {p.player_name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{p.player_name}{isMe ? ' (moi)' : ''}</p>
                            <p className="font-bold text-sm">« {p.current_clue} »</p>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                {currentPlayer.isHost && (
                  <motion.button
                    onClick={startVoting}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black hover:brightness-110 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Vote className="w-5 h-5" /> Passer au vote
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ VOTING ═══ */}
          {phase === 'voting' && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-red-500/20 p-5 space-y-5 shadow-xl shadow-red-500/5">
                <div className="text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <VoteProgressRing voted={votedCount} total={alivePlayers.length} />
                  </motion.div>
                  <h2 className="text-lg font-black">🗳️ Vote d'élimination</h2>
                  <p className="text-sm text-muted-foreground">Qui voulez-vous éliminer ?</p>
                </div>

                {!myPlayer?.is_alive ? (
                  <div className="text-center py-6 space-y-2">
                    <Skull className="w-8 h-8 mx-auto text-red-400/50" />
                    <p className="text-muted-foreground text-sm">Vous êtes éliminé, vous observez.</p>
                  </div>
                ) : hasVoted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-3 py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.6 }}
                    >
                      <CheckCircle2 className="w-12 h-12 mx-auto text-green-400" />
                    </motion.div>
                    <p className="text-green-400 font-black">Vote soumis !</p>
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-sm text-muted-foreground"
                    >
                      En attente des autres joueurs...
                    </motion.p>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {alivePlayers
                      .filter(p => p.player_id !== currentPlayer.id)
                      .map((p, i) => (
                        <motion.button
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => setSelectedVote(p.player_id)}
                          className={cn(
                            'w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 group',
                            selectedVote === p.player_id
                              ? 'border-red-500 bg-red-500/15 shadow-lg shadow-red-500/10'
                              : 'border-border/20 bg-muted/5 hover:bg-muted/10 hover:border-border/40'
                          )}
                        >
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all',
                            selectedVote === p.player_id
                              ? 'bg-red-500 text-white scale-110'
                              : 'bg-muted/20 group-hover:bg-muted/30'
                          )}>
                            {p.player_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold flex-1">{p.player_name}</span>
                          {selectedVote === p.player_id && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Skull className="w-5 h-5 text-red-400" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}

                    <motion.button
                      onClick={handleVote}
                      disabled={!selectedVote}
                      className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black disabled:opacity-30 disabled:grayscale hover:brightness-110 transition-all shadow-lg shadow-red-500/20 mt-3"
                      whileHover={{ scale: selectedVote ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Vote className="w-5 h-5" /> Confirmer le vote
                      </span>
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ VOTE RESULT ═══ */}
          {phase === 'vote_result' && (
            <motion.div
              key="vote-result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center space-y-5 shadow-xl">
                {game.eliminated_player_id ? (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                    >
                      <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center">
                        <Skull className="w-10 h-10 text-red-400" />
                      </div>
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black">
                        {gamePlayers.find(p => p.player_id === game.eliminated_player_id)?.player_name}
                      </h2>
                      <p className="text-muted-foreground">a été éliminé !</p>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className={cn(
                        'inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-black text-lg',
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.bg,
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.border,
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.text,
                      )}
                    >
                      <span>{roleConfig[game.eliminated_role as keyof typeof roleConfig]?.emoji}</span>
                      {roleConfig[game.eliminated_role as keyof typeof roleConfig]?.label}
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                    >
                      <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-yellow-400" />
                      </div>
                    </motion.div>
                    <h2 className="text-2xl font-black">Égalité !</h2>
                    <p className="text-muted-foreground">Personne n'est éliminé ce tour.</p>
                  </>
                )}

                {currentPlayer.isHost && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={() => {
                      nextRound();
                      setHasVoted(false);
                      setSelectedVote(null);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl font-black hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Manche suivante <ArrowRight className="w-5 h-5" />
                    </span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ GAME OVER ═══ */}
          {phase === 'game_over' && (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="space-y-4"
            >
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-primary/30 p-6 text-center space-y-6 shadow-xl shadow-primary/10">
                {/* Confetti-like sparkles */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="relative"
                >
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-2 border-yellow-500/30 flex items-center justify-center">
                    <Crown className="w-12 h-12 text-yellow-400" />
                  </div>
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black">Partie terminée !</h2>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      'text-xl font-black py-4 px-6 rounded-2xl inline-block',
                      game.winner_role === 'civilian'
                        ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                        : 'text-red-400 bg-red-500/10 border border-red-500/20'
                    )}
                  >
                    {game.winner_role === 'civilian' ? '🛡️ Les Civils gagnent !' : '🕵️ Les Undercovers gagnent !'}
                  </motion.div>
                </div>

                {/* All roles reveal */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tous les rôles</h3>
                  {gamePlayers.map((p, i) => {
                    const cfg = roleConfig[p.role as keyof typeof roleConfig];
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border',
                          cfg?.bg, cfg?.border,
                          !p.is_alive && 'opacity-40'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{cfg?.emoji}</span>
                          <span className="font-semibold text-sm">{p.player_name}</span>
                          {!p.is_alive && <Skull className="w-3 h-3 text-red-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-black', cfg?.text)}>{cfg?.label}</span>
                          {p.word && <span className="text-[10px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">{p.word}</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Words reveal */}
                <div className="flex gap-3 justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex-1 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mot Civil</p>
                    <p className="text-lg font-black text-blue-400 mt-1">{game.civilian_word}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex-1 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mot Undercover</p>
                    <p className="text-lg font-black text-red-400 mt-1">{game.undercover_word}</p>
                  </motion.div>
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  onClick={onEndGame}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl font-black hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Retour au menu
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';
