import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import {
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
    </motion.button>
  );
};

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
  } = useUndercoverGame(lobbyId, currentPlayer, players);

  const [clueInput, setClueInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showWord, setShowWord] = useState(false);

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
    setTimeout(() => setShowWord(false), 4000);
  }, []);

  useEffect(() => {
    if (game?.phase === 'voting') {
      setHasVoted(false);
      setSelectedVote(null);
    }
  }, [game?.phase]);

  if (loading || !game) {
    return (
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
      </div>
    );
  }

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
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        </div>
      </div>
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';
