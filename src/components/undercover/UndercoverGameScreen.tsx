import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import {
<<<<<<< HEAD
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Skull,
  Timer,
  UserX,
  Users,
  Vote,
  X,
=======
  Eye, EyeOff, MessageCircle, Vote, Skull, Crown, Shield,
  UserX, AlertTriangle, ArrowRight, Send, Timer, Users,
  CheckCircle2, Sparkles, Fingerprint, Search, Lock, X
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
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
<<<<<<< HEAD
  civilian: {
    label: 'Civil',
    title: 'Agent Civil',
    description: 'Protegez votre camp en restant coherent et en lisant les micro-details.',
    icon: Shield,
    badge: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    card: 'from-sky-500/18 via-sky-500/8 to-transparent',
    ring: 'ring-sky-400/30',
    glow: 'shadow-[0_0_60px_rgba(56,189,248,0.18)]',
  },
  undercover: {
    label: 'Undercover',
    title: 'Operateur Infiltre',
    description: 'Semer le doute, survivre au vote et manipuler la lecture collective.',
    icon: UserX,
    badge: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
    card: 'from-rose-500/20 via-red-500/10 to-transparent',
    ring: 'ring-rose-400/30',
    glow: 'shadow-[0_0_60px_rgba(244,63,94,0.2)]',
  },
  mr_white: {
    label: 'Mr White',
    title: 'Fantome',
    description: 'Aucun mot. Tout se joue sur l instinct, le bluff et l improvisation.',
    icon: Fingerprint,
    badge: 'bg-white/10 text-slate-100 border-white/20',
    card: 'from-slate-300/10 via-white/5 to-transparent',
    ring: 'ring-white/20',
    glow: 'shadow-[0_0_60px_rgba(255,255,255,0.12)]',
  },
} as const;

const phaseConfig: Record<string, { label: string; eyebrow: string; detail: string }> = {
  word_reveal: {
    label: 'Briefing secret',
    eyebrow: 'Dossier',
    detail: 'Chaque agent prend connaissance de son mot avant l entree en scene.',
  },
  clue_giving: {
    label: 'Indices en chaine',
    eyebrow: 'Transmission',
    detail: 'Un seul mot. Trop evident et vous grillez votre camp.',
  },
  discussion: {
    label: 'Salle de lecture',
    eyebrow: 'Debrief',
    detail: 'Recoupez les indices, reperez les ruptures de ton et forcez les erreurs.',
  },
  voting: {
    label: 'Decision collective',
    eyebrow: 'Vote',
    detail: 'Chaque balle compte. Visez juste ou ouvrez un boulevard aux infiltrés.',
  },
  vote_result: {
    label: 'Verdict',
    eyebrow: 'Extraction',
    detail: 'Le plateau se nettoie, les rapports changent et la pression monte.',
  },
  game_over: {
    label: 'Resolution',
    eyebrow: 'Fin de mission',
    detail: 'Les roles tombent. On sait enfin qui controlait la table.',
  },
};

const DiscussionTimer = ({ onExpire }: { onExpire?: () => void }) => {
  const durationSeconds = 60;
  const [seconds, setSeconds] = useState(durationSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }

    const timeout = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timeout);
  }, [seconds, onExpire]);

  const progress = (seconds / durationSeconds) * 100;
  const urgent = seconds <= 10;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/55">
        <span>Timer</span>
        <span>{seconds}s</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            urgent ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-cyan-400 to-violet-400'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={cn('flex items-center gap-2 text-sm font-semibold', urgent ? 'text-rose-200' : 'text-white/75')}>
        <Timer className="h-4 w-4" />
        Fenetre d analyse ouverte
      </div>
    </div>
  );
};

const PlayerOperativeCard = ({
  player,
  isMe,
  isCurrent,
  isSelectable,
  isSelected,
  isEliminated,
  hasClue,
  hasVoted,
  onClick,
}: {
  player: { id: string; player_id: string; player_name: string; is_alive: boolean; current_clue: string | null; vote_target: string | null; role: string };
  isMe: boolean;
  isCurrent: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  isEliminated: boolean;
  hasClue: boolean;
  hasVoted: boolean;
  onClick?: () => void;
}) => {
  const playerHistory = (player as { clue_history?: string[] }).clue_history;
  const clues = Array.isArray(playerHistory) && playerHistory.length > 0
    ? playerHistory
    : player.current_clue
      ? [player.current_clue]
      : [];

  return (
    <motion.button
      type="button"
      whileHover={isSelectable ? { y: -3 } : undefined}
      whileTap={isSelectable ? { scale: 0.99 } : undefined}
      onClick={onClick}
      disabled={!isSelectable}
      className={cn(
        'relative overflow-hidden rounded-[28px] border p-4 text-left transition-all duration-300',
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] backdrop-blur-xl',
        isSelected ? 'border-rose-400/60 shadow-[0_0_35px_rgba(244,63,94,0.18)]' : 'border-white/10',
        isMe && 'ring-1 ring-cyan-300/35',
        isSelectable && 'hover:border-cyan-300/35',
        isEliminated && 'opacity-45 saturate-50'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-black',
            isEliminated
              ? 'border-white/10 bg-white/5 text-white/35'
              : 'border-white/15 bg-white/8 text-white'
          )}>
            {isEliminated ? <Skull className="h-5 w-5" /> : player.player_name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={cn('font-display text-base font-bold text-white', isMe && 'text-cyan-200')}>
                {player.player_name}
              </p>
              {isMe && (
                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                  Vous
                </span>
              )}
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              {isEliminated ? 'Hors jeu' : 'Operatif actif'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {isCurrent && !isEliminated && (
            <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100">
              Tour
            </span>
          )}
          {hasClue && !isEliminated && (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
              Indice
            </span>
          )}
          {hasVoted && !isEliminated && (
            <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-100">
              Vote
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {clues.length > 0 ? (
          clues.map((clue, index) => (
            <div
              key={`${player.id}-${index}`}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm font-semibold',
                index === clues.length - 1
                  ? 'border-cyan-300/25 bg-cyan-400/8 text-cyan-100'
                  : 'border-white/10 bg-white/5 text-white/65'
              )}
              title={clue}
            >
              {clue}
            </div>
          ))
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="h-2 rounded-full bg-white/10" />
            <div className="h-2 rounded-full bg-white/8" />
            <div className="h-2 rounded-full bg-white/6" />
          </div>
        )}
      </div>
=======
  civilian: { label: 'Civil', emoji: '🛡️', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', ring: 'ring-blue-500/40' },
  undercover: { label: 'Undercover', emoji: '🕵️', icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', ring: 'ring-red-500/40' },
  mr_white: { label: 'Mr. White', emoji: '👻', icon: AlertTriangle, color: 'text-gray-300', bg: 'bg-white/5', border: 'border-white/20', ring: 'ring-white/20' },
};

const phaseLabels: Record<string, { label: string; emoji: string }> = {
  word_reveal: { label: 'Révélation', emoji: '👁️' },
  clue_giving: { label: 'Indices', emoji: '💬' },
  discussion: { label: 'Discussion', emoji: '🗣️' },
  voting: { label: 'Vote', emoji: '🗳️' },
  vote_result: { label: 'Résultat', emoji: '⚖️' },
  game_over: { label: 'Fin', emoji: '🏆' },
};

// Player circle avatar
const PlayerBubble = ({ 
  player, 
  index, 
  isCurrent, 
  isMe, 
  isEliminated,
  hasClue,
  hasVoted,
  isSelected,
  onClick,
}: {
  player: { player_name: string; player_id: string; is_alive: boolean; current_clue: string | null; role: string };
  index: number;
  isCurrent: boolean;
  isMe: boolean;
  isEliminated: boolean;
  hasClue: boolean;
  hasVoted: boolean;
  isSelected: boolean;
  onClick?: () => void;
}) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-green-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-teal-500 to-cyan-500',
    'from-indigo-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
  ];
  const gradient = colors[index % colors.length];

  return (
    <motion.button
      onClick={onClick}
      disabled={!onClick || isEliminated}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex flex-col items-center gap-1.5 relative group',
        isEliminated && 'opacity-30',
        onClick && !isEliminated && 'cursor-pointer',
      )}
    >
      {/* Selection ring */}
      {isSelected && (
        <motion.div
          layoutId="vote-ring"
          className="absolute -inset-1.5 rounded-full border-2 border-red-500 z-0"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        />
      )}
      
      {/* Current turn indicator */}
      {isCurrent && !isEliminated && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary z-10 flex items-center justify-center"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-[8px]">💬</span>
        </motion.div>
      )}

      {/* Clue/vote check */}
      {(hasClue || hasVoted) && !isEliminated && (
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 z-10 flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      )}

      <div className={cn(
        'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base relative overflow-hidden',
        isEliminated ? 'bg-muted/30' : `bg-gradient-to-br ${gradient}`,
        isMe && !isEliminated && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}>
        {isEliminated ? (
          <Skull className="w-5 h-5 text-muted-foreground" />
        ) : (
          player.player_name[0]?.toUpperCase()
        )}
      </div>
      <span className={cn(
        'text-[10px] sm:text-xs font-semibold max-w-[60px] truncate',
        isMe ? 'text-primary' : 'text-muted-foreground',
        isEliminated && 'line-through',
      )}>
        {isMe ? 'Moi' : player.player_name.split(' ')[0]}
      </span>
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    </motion.button>
  );
};

<<<<<<< HEAD
const TacticalPanel = ({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    'rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,28,0.86),rgba(10,14,28,0.72))] p-5 backdrop-blur-2xl',
    className
  )}>
    <div className="mb-4">
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">{eyebrow}</p>
      <h3 className="mt-2 font-display text-xl font-bold text-white">{title}</h3>
    </div>
    {children}
  </div>
);

export const UndercoverGameScreen = memo(({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
}: UndercoverGameScreenProps) => {
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
=======
// Discussion timer
const DiscussionTimer = ({ onExpire }: { onExpire?: () => void }) => {
  const DURATION = 60;
  const [seconds, setSeconds] = useState(DURATION);

  useEffect(() => {
    if (seconds <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onExpire]);

  const urgent = seconds <= 10;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold',
      urgent ? 'bg-red-500/20 text-red-400' : 'bg-muted/20 text-muted-foreground'
    )}>
      <Timer className="w-3.5 h-3.5" />
      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
    </div>
  );
};

export const UndercoverGameScreen = memo(({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
  const {
    game, gamePlayers, myPlayer, loading, alivePlayers,
    currentTurnPlayerId, isMyTurn, hasSeenWord,
    submitClue, submitVote, startVoting, nextRound,
    confirmWordSeen, startCluePhase,
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
  } = useUndercoverGame(lobbyId, currentPlayer, players);

  const [clueInput, setClueInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showWord, setShowWord] = useState(false);
<<<<<<< HEAD

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

  const handleWordReveal = useCallback(() => {
    setShowWord(true);
=======
  const [wordRevealed, setWordRevealed] = useState(false);

  const handleSubmitClue = useCallback(() => {
    if (clueInput.trim()) { submitClue(clueInput.trim()); setClueInput(''); }
  }, [clueInput, submitClue]);

  const handleVote = useCallback(() => {
    if (selectedVote) { submitVote(selectedVote); setHasVoted(true); }
  }, [selectedVote, submitVote]);

  const handleRevealWord = useCallback(() => {
    setShowWord(true);
    setWordRevealed(true);
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
    setTimeout(() => setShowWord(false), 4000);
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    if (game?.phase === 'voting') {
      setHasVoted(false);
      setSelectedVote(null);
    }
=======
    if (game?.phase === 'voting') { setHasVoted(false); setSelectedVote(null); }
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
  }, [game?.phase]);

  if (loading || !game) {
    return (
<<<<<<< HEAD
      <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_30%),linear-gradient(180deg,#070b16,#04060c)]">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-white/10 bg-black/25 px-10 py-9 text-center backdrop-blur-xl">
            <motion.div
              className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-cyan-300/25 border-t-cyan-300"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="font-display text-xl font-bold text-white">Preparation du theatre Undercover...</p>
            <p className="mt-2 text-sm text-white/55">Synchronisation de la table, des roles et du flux de manche.</p>
          </div>
        </div>
=======
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="text-center space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/30 border-t-primary" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          <p className="text-lg font-bold text-muted-foreground">Préparation...</p>
        </motion.div>
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
      </div>
    );
  }

<<<<<<< HEAD
  const myRole = (myPlayer?.role ?? 'civilian') as keyof typeof roleConfig;
  const myRoleConfig = roleConfig[myRole];
  const phaseInfo = phaseConfig[game.phase] ?? {
    label: game.phase,
    eyebrow: 'Etat',
    detail: 'Sequence de jeu active.',
  };
  const votedCount = alivePlayers.filter((player) => player.vote_target !== null).length;
  const cluesSubmitted = alivePlayers.filter((player) => player.current_clue).length;

  const renderWordDisplay = () => {
    if (myPlayer?.role === 'mr_white') {
      return 'Aucun mot attribue';
    }
    if (showWord && myPlayer?.word) {
      return myPlayer.word;
    }
    if (myPlayer?.word) {
      return myPlayer.word
        .split('')
        .map((character) => (character === ' ' ? '   ' : '_ '))
        .join('');
    }
    return '_ _ _ _ _';
  };

  const phaseActionContent = () => {
    if (game.phase === 'word_reveal') {
      return (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.32em] text-white/45">Mot attribue</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className={cn(
                  'rounded-[24px] border px-5 py-5 text-center font-display text-2xl font-black tracking-[0.28em] sm:text-3xl',
                  showWord ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/5 text-white/55'
                )}>
                  {renderWordDisplay()}
                </div>
                <p className="mt-3 text-sm text-white/55">
                  {myPlayer?.role === 'mr_white'
                    ? 'Vous n avez aucun mot. Construisez votre personnage avec les indices des autres.'
                    : 'Ne forcez pas trop votre indice. Une bonne couverture est souvent subtile.'}
                </p>
              </div>

              {game.phase === 'word_reveal' && !hasSeenWord ? (
                <button
                  type="button"
                  onClick={() => {
                    handleWordReveal();
                    confirmWordSeen();
                  }}
                  className="inline-flex h-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-6 text-sm font-bold uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Confirmer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={showWord ? () => setShowWord(false) : handleWordReveal}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-100"
                >
                  {showWord ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>

          {hasSeenWord && currentPlayer.isHost && (
            <button
              type="button"
              onClick={startCluePhase}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-6 py-4 font-semibold text-cyan-100 transition hover:bg-cyan-400/22"
            >
              Lancer la chaine d indices
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {hasSeenWord && !currentPlayer.isHost && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
              En attente du lancement de manche par l hote.
            </div>
          )}
        </div>
      );
    }

    if (game.phase === 'clue_giving') {
      return (
        <div className="space-y-5">
          <div className={cn(
            'rounded-[28px] border px-5 py-5',
            isMyTurn ? 'border-cyan-300/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'
          )}>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Tour actif</p>
            <h4 className={cn('mt-2 font-display text-2xl font-bold', isMyTurn ? 'text-cyan-100' : 'text-white')}>
              {isMyTurn ? 'A vous de poser le ton' : gamePlayers.find((player) => player.player_id === currentTurnPlayerId)?.player_name}
            </h4>
            <p className="mt-2 text-sm text-white/60">
              Un seul mot. L indice doit aider votre camp sans rendre votre role trop lisible.
            </p>
          </div>

          {isMyTurn && myPlayer?.is_alive && (
            <div className="rounded-[28px] border border-cyan-300/25 bg-black/20 p-4">
              <div className="flex gap-3">
                <Input
                  value={clueInput}
                  onChange={(event) => setClueInput(event.target.value)}
                  placeholder="Indice en un mot"
                  maxLength={30}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitClue();
                    }
                  }}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/30 focus:border-cyan-300/30"
                />
                <button
                  type="button"
                  onClick={handleSubmitClue}
                  disabled={!clueInput.trim()}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 transition hover:bg-cyan-400/22 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {!isMyTurn && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
              Surveillez les formulations. Les bons tells sont souvent minuscules.
            </div>
          )}
        </div>
      );
    }

    if (game.phase === 'discussion') {
      return (
        <div className="space-y-5">
          <DiscussionTimer />
          <div className="rounded-[28px] border border-amber-300/22 bg-amber-400/10 p-5">
            <div className="mb-2 flex items-center gap-2 text-amber-100">
              <Search className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-[0.22em]">Lecture ouverte</span>
            </div>
            <p className="text-sm text-amber-50/85">
              Recadrez les contradictions, relevez les mots trop proches ou trop lointains et preparez le tir collectif.
            </p>
          </div>
          {currentPlayer.isHost && (
            <button
              type="button"
              onClick={startVoting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/30 bg-rose-500/15 px-6 py-4 font-semibold text-rose-100 transition hover:bg-rose-500/22"
            >
              Passer au vote
              <Vote className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    if (game.phase === 'voting') {
      return (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Selection</p>
            <h4 className="mt-2 font-display text-2xl font-bold text-white">Choisissez votre cible</h4>
            <p className="mt-2 text-sm text-white/60">
              Cliquez sur un operatif vivant dans la grille pour le designer. Une erreur peut retourner toute la table.
            </p>
          </div>

          {!myPlayer?.is_alive ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/55">
              Vous etes elimine, vous observez la resolution.
            </div>
          ) : hasVoted ? (
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-5 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-300" />
              <p className="font-semibold text-emerald-100">Vote transmis.</p>
              <p className="mt-1 text-sm text-emerald-50/70">En attente des derniers arbitres de la table.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              {selectedVote ? (
                <div className="space-y-4">
                  <p className="text-sm text-white/70">
                    Confirmer l elimination de{' '}
                    <span className="font-semibold text-rose-100">
                      {gamePlayers.find((player) => player.player_id === selectedVote)?.player_name}
                    </span>{' '}
                    ?
                  </p>
                  <button
                    type="button"
                    onClick={handleVote}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/30 bg-rose-500/15 px-6 py-4 font-semibold text-rose-100 transition hover:bg-rose-500/22"
                  >
                    Confirmer le vote
                    <Vote className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  Selectionnez un joueur dans la grille centrale pour armer votre vote.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (game.phase === 'vote_result') {
      const eliminatedPlayerName = gamePlayers.find((player) => player.player_id === game.eliminated_player_id)?.player_name;
      const eliminatedRole = game.eliminated_role ? roleConfig[game.eliminated_role as keyof typeof roleConfig] : null;

      return (
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-black/20 p-6 text-center">
            {game.eliminated_player_id ? (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-rose-300/30 bg-rose-500/15">
                  <Skull className="h-8 w-8 text-rose-200" />
                </div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Cible extraite</p>
                <h4 className="mt-2 font-display text-3xl font-bold text-white">{eliminatedPlayerName}</h4>
                {eliminatedRole && (
                  <div className={cn('mx-auto mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold', eliminatedRole.badge)}>
                    <eliminatedRole.icon className="h-4 w-4" />
                    {eliminatedRole.label}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <X className="h-8 w-8 text-white/65" />
                </div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Verdict</p>
                <h4 className="mt-2 font-display text-3xl font-bold text-white">Aucune elimination</h4>
                <p className="mt-2 text-sm text-white/55">Egalite parfaite. La manche repart sous haute tension.</p>
              </>
            )}
          </div>

          {currentPlayer.isHost && (
            <button
              type="button"
              onClick={() => {
                nextRound();
                setHasVoted(false);
                setSelectedVote(null);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-6 py-4 font-semibold text-cyan-100 transition hover:bg-cyan-400/22"
            >
              Manche suivante
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    if (game.phase === 'game_over') {
      return (
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-black/20 p-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/15">
              <Crown className="h-8 w-8 text-amber-200" />
            </div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Mission close</p>
            <h4 className="mt-2 font-display text-3xl font-bold text-white">
              {game.winner_role === 'civilian' ? 'Victoire des civils' : 'Victoire des infiltrés'}
            </h4>
            <p className="mt-2 text-sm text-white/55">
              Les roles complets sont visibles dans le tableau tactique. Debrief complet disponible.
            </p>
          </div>

          <button
            type="button"
            onClick={onEndGame}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-6 py-4 font-semibold text-cyan-100 transition hover:bg-cyan-400/22"
          >
            Retour au lobby
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.12),transparent_24%),linear-gradient(180deg,#060913,#05070f_45%,#03050b)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-400/12 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-rose-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-white/55">
              <Lock className="h-3.5 w-3.5" />
              Undercover Protocol
            </div>
            <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
              {phaseInfo.label}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/60 sm:text-base">
              {phaseInfo.detail}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{phaseInfo.eyebrow}</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{game.current_round}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Actifs</p>
              <p className="mt-2 flex items-center gap-2 font-display text-xl font-bold text-white">
                <Users className="h-4 w-4 text-cyan-200" />
                {alivePlayers.length}/{players.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Indices</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{cluesSubmitted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Votes</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{votedCount}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-[1.15fr_1.8fr_1.15fr]">
          <TacticalPanel title={myRoleConfig.title} eyebrow="Votre dossier" className={cn('overflow-hidden', myRoleConfig.glow)}>
            <div className={cn('absolute inset-x-0 top-0 h-28 bg-gradient-to-br opacity-80', myRoleConfig.card)} />
            <div className="relative">
              <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]', myRoleConfig.badge)}>
                <myRoleConfig.icon className="h-4 w-4" />
                {myRoleConfig.label}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/75">{myRoleConfig.description}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Mot visible</p>
                <div className={cn('mt-3 rounded-2xl border px-4 py-4 font-display text-lg font-black tracking-[0.16em]', showWord ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/5 text-white/60')}>
                  {renderWordDisplay()}
                </div>
              </div>
            </div>
          </TacticalPanel>

          <TacticalPanel title="Plateau tactique" eyebrow="Operateurs">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {gamePlayers.map((player) => {
                const isCurrent = currentTurnPlayerId === player.player_id && game.phase === 'clue_giving';
                const isMe = player.player_id === currentPlayer.id;
                const isEliminated = !player.is_alive;
                const isSelectable = game.phase === 'voting' && Boolean(myPlayer?.is_alive) && !hasVoted && player.player_id !== currentPlayer.id && player.is_alive;
                const isSelected = selectedVote === player.player_id;

                return (
                  <PlayerOperativeCard
                    key={player.id}
                    player={player}
                    isMe={isMe}
                    isCurrent={isCurrent}
                    isSelectable={isSelectable}
                    isSelected={isSelected}
                    isEliminated={isEliminated}
                    hasClue={Boolean(player.current_clue) && game.phase === 'clue_giving'}
                    hasVoted={Boolean(player.vote_target) && game.phase === 'voting'}
                    onClick={isSelectable ? () => setSelectedVote(player.player_id) : undefined}
                  />
                );
              })}
            </div>
          </TacticalPanel>

          <TacticalPanel title="Directive active" eyebrow="Action">
            {phaseActionContent()}
          </TacticalPanel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <TacticalPanel title="Journal d indices" eyebrow="Memoire">
            <div className="grid gap-3 md:grid-cols-2">
              {alivePlayers.length > 0 ? (
                gamePlayers
                  .filter((player) => player.is_alive || game.phase === 'game_over')
                  .map((player) => {
                    const playerHistory = (player as { clue_history?: string[] }).clue_history;
                    const clues = Array.isArray(playerHistory) && playerHistory.length > 0
                      ? playerHistory
                      : player.current_clue
                        ? [player.current_clue]
                        : [];

                    return (
                      <div key={`history-${player.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{player.player_name}</p>
                          {!player.is_alive && <Skull className="h-4 w-4 text-rose-200" />}
                        </div>
                        <div className="space-y-2">
                          {clues.length > 0 ? (
                            clues.map((clue, index) => (
                              <div
                                key={`${player.id}-memo-${index}`}
                                className={cn(
                                  'rounded-xl border px-3 py-2 text-sm',
                                  index === clues.length - 1
                                    ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
                                    : 'border-white/10 bg-black/20 text-white/65'
                                )}
                              >
                                {clue}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-white/35">
                              Aucun indice enregistre.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  Le journal se remplit au fil des manches.
                </div>
              )}
            </div>
          </TacticalPanel>

          <TacticalPanel title="Tableau de mission" eyebrow="Intel">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Recommandation</p>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  {game.phase === 'word_reveal' && 'Prenez le mot en photo mentale. Ne surjouez rien au premier indice.'}
                  {game.phase === 'clue_giving' && 'Un bon indice sert votre camp et semble naturel, pas ingenieur.'}
                  {game.phase === 'discussion' && 'Cherchez les glissements de precision, pas seulement les mots suspects.'}
                  {game.phase === 'voting' && 'Validez votre intuition avec les indices precedents avant de tirer.'}
                  {game.phase === 'vote_result' && 'Recalculez les rapports de force avant la manche suivante.'}
                  {game.phase === 'game_over' && 'Le debrief final sert a apprendre les tells qui ont vraiment compte.'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Etat live</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-sm text-white/65">Joueurs vivants</span>
                    <span className="font-semibold text-white">{alivePlayers.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-sm text-white/65">Indices poses</span>
                    <span className="font-semibold text-white">{cluesSubmitted}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                    <span className="text-sm text-white/65">Votes captures</span>
                    <span className="font-semibold text-white">{votedCount}</span>
                  </div>
                </div>
              </div>

              {game.phase === 'game_over' && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/45">Roles reveles</p>
                  <div className="mt-3 space-y-2">
                    {gamePlayers.map((player) => {
                      const config = roleConfig[player.role as keyof typeof roleConfig];
                      return (
                        <div key={`role-${player.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4 text-white/75" />
                            <span className="text-sm font-medium text-white">{player.player_name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">{config.label}</div>
                            {player.word && <div className="text-xs text-white/45">{player.word}</div>}
=======
  const phase = game.phase;
  const myRole = myPlayer?.role as keyof typeof roleConfig;
  const myRoleConfig = myRole ? roleConfig[myRole] : null;
  const phaseInfo = phaseLabels[phase] || { label: phase, emoji: '🎮' };
  const votedCount = alivePlayers.filter(p => p.vote_target !== null).length;

  // Word display with blanks
  const renderWordDisplay = () => {
    if (myPlayer?.role === 'mr_white') return '? ? ? ? ?';
    if (showWord && myPlayer?.word) return myPlayer.word;
    if (myPlayer?.word) return myPlayer.word.split('').map((c) => c === ' ' ? '  ' : '_ ').join('');
    return '_ _ _ _ _';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ═══ TOP BAR: Word Banner (sketch style) ═══ */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="px-4 pt-4 pb-2"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {/* Phase badge */}
          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
            <span>{phaseInfo.emoji}</span>
            <span className="hidden sm:inline">{phaseInfo.label}</span>
            <span className="sm:hidden">R{game.current_round}</span>
          </div>

          {/* Big handwritten-style word box */}
          <div className="flex-1 relative">
            <div className={cn(
              'rounded-2xl border-2 px-5 py-4 flex items-center gap-4 transition-all',
              'bg-card/60 backdrop-blur',
              showWord ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border/60',
            )}
              style={{ borderStyle: showWord ? 'solid' : 'dashed' }}
            >
              <span className="text-[11px] sm:text-sm font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                Votre mot
              </span>
              <div className={cn(
                'flex-1 text-center font-black text-xl sm:text-3xl tracking-[0.25em] truncate',
                showWord ? 'text-primary' : 'text-muted-foreground/70',
                myPlayer?.role === 'mr_white' && 'text-white/40',
              )}>
                {renderWordDisplay()}
              </div>
            </div>
          </div>

          {/* Show/hide word toggle */}
          {phase === 'word_reveal' && !hasSeenWord ? (
            <motion.button
              onClick={() => { handleRevealWord(); confirmWordSeen(); }}
              className="shrink-0 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all"
              whileTap={{ scale: 0.95 }}
            >
              OK
            </motion.button>
          ) : (
            <motion.button
              onClick={showWord ? () => setShowWord(false) : handleRevealWord}
              className={cn(
                'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all',
                showWord
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-card/60 border-border/60 text-muted-foreground hover:bg-muted/20'
              )}
              whileTap={{ scale: 0.9 }}
            >
              {showWord ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ═══ PLAYERS COLUMNS (sketch layout) ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card/30 border-b border-border/20 px-4 py-4"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-start sm:justify-center gap-3 sm:gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {gamePlayers.map((p, i) => {
              const isCurrent = currentTurnPlayerId === p.player_id && phase === 'clue_giving';
              const isMe = p.player_id === currentPlayer.id;
              const isEliminated = !p.is_alive;
              const isSelectable = phase === 'voting' && myPlayer?.is_alive && !hasVoted && p.player_id !== currentPlayer.id && p.is_alive;
              const isSelected = selectedVote === p.player_id;
              const playerHistory = (p as any).clue_history as string[] | undefined;
              const cluesArray: string[] = Array.isArray(playerHistory) && playerHistory.length > 0
                ? playerHistory
                : (p.current_clue ? [p.current_clue] : []);

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'flex flex-col items-center min-w-[80px] sm:min-w-[96px] gap-2 rounded-2xl p-2 transition-all',
                    isMe && 'bg-primary/5 ring-1 ring-primary/30',
                    isSelected && 'ring-2 ring-red-500 bg-red-500/10',
                    isEliminated && 'opacity-40',
                    isSelectable && 'cursor-pointer hover:bg-primary/10',
                  )}
                  onClick={isSelectable ? () => setSelectedVote(p.player_id) : undefined}
                >
                  <PlayerBubble
                    player={p}
                    index={i}
                    isCurrent={isCurrent}
                    isMe={isMe}
                    isEliminated={isEliminated}
                    hasClue={!!p.current_clue && phase === 'clue_giving'}
                    hasVoted={!!p.vote_target && phase === 'voting'}
                    isSelected={false}
                  />
                  {/* Stacked clues per round */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    {cluesArray.length === 0 ? (
                      <>
                        <div className="h-1.5 w-10 bg-border/40 rounded-full" />
                        <div className="h-1.5 w-8 bg-border/30 rounded-full" />
                        <div className="h-1.5 w-6 bg-border/20 rounded-full" />
                      </>
                    ) : (
                      cluesArray.map((c, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md max-w-[80px] truncate border',
                            idx === cluesArray.length - 1
                              ? 'bg-primary/15 border-primary/30 text-primary'
                              : 'bg-muted/20 border-border/30 text-muted-foreground'
                          )}
                          title={c}
                        >
                          {c}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {/* WORD REVEAL */}
            {phase === 'word_reveal' && (
              <motion.div key="reveal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-card/80 backdrop-blur rounded-2xl border border-border/30 p-6 text-center space-y-4">
                  {myPlayer?.role === 'mr_white' ? (
                    <>
                      <div className="text-5xl">👻</div>
                      <h2 className="text-xl font-black">Vous êtes Mr. White</h2>
                      <p className="text-sm text-muted-foreground">Aucun mot. Bluffez grâce aux indices !</p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl">{myRoleConfig?.emoji}</div>
                      <h2 className="text-xl font-black">Votre rôle : {myRoleConfig?.label}</h2>
                      <p className="text-sm text-muted-foreground">Appuyez sur <strong>OK</strong> en haut pour voir et confirmer votre mot.</p>
                    </>
                  )}

                  {hasSeenWord && currentPlayer.isHost && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={startCluePhase}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      Commencer les indices <ArrowRight className="w-4 h-4 inline ml-1" />
                    </motion.button>
                  )}
                  {hasSeenWord && !currentPlayer.isHost && (
                    <p className="text-sm text-muted-foreground animate-pulse">⏳ En attente de l'hôte...</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* CLUE GIVING */}
            {phase === 'clue_giving' && (
              <motion.div key="clue" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Current turn */}
                <div className={cn(
                  'text-center py-3 rounded-xl border',
                  isMyTurn ? 'bg-primary/10 border-primary/30' : 'bg-muted/10 border-border/20'
                )}>
                  <p className="text-xs text-muted-foreground">C'est au tour de</p>
                  <p className={cn('text-xl font-black', isMyTurn && 'text-primary')}>
                    {isMyTurn ? '🎯 Vous !' : gamePlayers.find(p => p.player_id === currentTurnPlayerId)?.player_name}
                  </p>
                </div>

                {/* Input */}
                {isMyTurn && myPlayer?.is_alive && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <p className="text-sm text-center text-primary font-semibold">💡 Donnez un indice en UN mot</p>
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
                        className="h-12 w-12 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 flex items-center justify-center"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Clues list */}
                {gamePlayers.filter(p => p.is_alive && p.current_clue).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Indices donnés</p>
                    {gamePlayers.filter(p => p.is_alive && p.current_clue).map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/10 border border-border/10"
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

                {!isMyTurn && (
                  <p className="text-center text-sm text-muted-foreground animate-pulse">⏳ En attente...</p>
                )}
              </motion.div>
            )}

            {/* DISCUSSION */}
            {phase === 'discussion' && (
              <motion.div key="discussion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black flex items-center gap-2">🗣️ Discussion</h2>
                  <DiscussionTimer />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                  <p className="text-sm font-medium">
                    <Search className="w-4 h-4 inline mr-1 text-yellow-400" />
                    Discutez et trouvez l'Undercover !
                  </p>
                </div>

                {/* All clues recap */}
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Récap des indices</p>
                  {gamePlayers.filter(p => p.is_alive && p.current_clue).map((p, i) => (
                    <div key={p.id} className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border',
                      p.player_id === currentPlayer.id ? 'bg-primary/5 border-primary/20' : 'bg-muted/5 border-border/10'
                    )}>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black',
                        p.player_id === currentPlayer.id ? 'bg-primary/20 text-primary' : 'bg-muted/20'
                      )}>
                        {p.player_name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-muted-foreground flex-1">{p.player_name}</span>
                      <span className="text-sm font-bold">« {p.current_clue} »</span>
                    </div>
                  ))}
                </div>

                {currentPlayer.isHost && (
                  <motion.button
                    onClick={startVoting}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Vote className="w-5 h-5" /> Passer au vote
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* VOTING */}
            {phase === 'voting' && (
              <motion.div key="voting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-black">🗳️ Votez en cliquant sur un joueur</h2>
                  <p className="text-sm text-muted-foreground">{votedCount}/{alivePlayers.length} votes</p>
                </div>

                {!myPlayer?.is_alive ? (
                  <div className="text-center py-6">
                    <Skull className="w-8 h-8 mx-auto text-red-400/50 mb-2" />
                    <p className="text-muted-foreground text-sm">Vous observez.</p>
                  </div>
                ) : hasVoted ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-green-400" />
                    <p className="font-bold text-green-400">Vote soumis !</p>
                    <p className="text-sm text-muted-foreground animate-pulse">En attente des autres...</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">
                      👆 Cliquez sur un joueur ci-dessus pour le sélectionner
                    </p>
                    {selectedVote && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
                        <p className="text-sm">
                          Vous voulez éliminer <strong className="text-red-400">{gamePlayers.find(p => p.player_id === selectedVote)?.player_name}</strong> ?
                        </p>
                        <motion.button
                          onClick={handleVote}
                          className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:brightness-110 transition-all"
                          whileTap={{ scale: 0.95 }}
                        >
                          <Vote className="w-4 h-4 inline mr-2" />
                          Confirmer le vote
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* VOTE RESULT */}
            {phase === 'vote_result' && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-card/80 backdrop-blur rounded-2xl border border-border/30 p-6 text-center space-y-4">
                  {game.eliminated_player_id ? (
                    <>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center">
                          <Skull className="w-8 h-8 text-red-400" />
                        </div>
                      </motion.div>
                      <h2 className="text-xl font-black">
                        {gamePlayers.find(p => p.player_id === game.eliminated_player_id)?.player_name}
                      </h2>
                      <p className="text-muted-foreground">a été éliminé !</p>
                      <div className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold',
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.bg,
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.border,
                        roleConfig[game.eliminated_role as keyof typeof roleConfig]?.color,
                      )}>
                        {roleConfig[game.eliminated_role as keyof typeof roleConfig]?.emoji}
                        {roleConfig[game.eliminated_role as keyof typeof roleConfig]?.label}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl">⚖️</div>
                      <h2 className="text-xl font-black">Égalité !</h2>
                      <p className="text-muted-foreground">Personne n'est éliminé.</p>
                    </>
                  )}

                  {currentPlayer.isHost && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      onClick={() => { nextRound(); setHasVoted(false); setSelectedVote(null); }}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all"
                      whileTap={{ scale: 0.98 }}
                    >
                      Manche suivante <ArrowRight className="w-4 h-4 inline ml-1" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* GAME OVER */}
            {phase === 'game_over' && (
              <motion.div key="gameover" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="bg-card/80 backdrop-blur rounded-2xl border border-primary/30 p-6 text-center space-y-5">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                    <Crown className="w-12 h-12 mx-auto text-yellow-400" />
                  </motion.div>

                  <h2 className="text-2xl font-black">Partie terminée !</h2>
                  <div className={cn(
                    'text-lg font-black py-3 px-4 rounded-xl inline-block',
                    game.winner_role === 'civilian' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'
                  )}>
                    {game.winner_role === 'civilian' ? '🛡️ Les Civils gagnent !' : '🕵️ Les Undercovers gagnent !'}
                  </div>

                  {/* Roles reveal */}
                  <div className="space-y-2 text-left">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">Tous les rôles</p>
                    {gamePlayers.map((p) => {
                      const cfg = roleConfig[p.role as keyof typeof roleConfig];
                      return (
                        <div key={p.id} className={cn('flex items-center justify-between p-2.5 rounded-xl border', cfg?.bg, cfg?.border, !p.is_alive && 'opacity-40')}>
                          <div className="flex items-center gap-2">
                            <span>{cfg?.emoji}</span>
                            <span className="font-semibold text-sm">{p.player_name}</span>
                            {!p.is_alive && <Skull className="w-3 h-3 text-red-400" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-bold', cfg?.color)}>{cfg?.label}</span>
                            {p.word && <span className="text-[10px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">{p.word}</span>}
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
                          </div>
                        </div>
                      );
                    })}
                  </div>
<<<<<<< HEAD
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-sky-100/70">Mot civil</p>
                      <p className="mt-2 font-display text-lg font-bold text-sky-100">{game.civilian_word}</p>
                    </div>
                    <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-rose-100/70">Mot undercover</p>
                      <p className="mt-2 font-display text-lg font-bold text-rose-100">{game.undercover_word}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TacticalPanel>
=======

                  {/* Words */}
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-[10px] uppercase text-muted-foreground">Mot Civil</p>
                      <p className="text-base font-black text-blue-400">{game.civilian_word}</p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-[10px] uppercase text-muted-foreground">Mot Undercover</p>
                      <p className="text-base font-black text-red-400">{game.undercover_word}</p>
                    </div>
                  </div>

                  <motion.button
                    onClick={onEndGame}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition-all"
                    whileTap={{ scale: 0.98 }}
                  >
                    Retour au menu
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
>>>>>>> 4d1066ba9b8b72909602ff02d4b8f23fac9a6974
        </div>
      </div>
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';
