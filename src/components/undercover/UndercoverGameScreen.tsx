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
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    icon: Shield,
    color: 'text-sky-300',
    bg: 'bg-sky-500/15 border-sky-400/40',
  },
  undercover: {
    label: 'Undercover',
    icon: UserX,
    color: 'text-rose-300',
    bg: 'bg-rose-500/15 border-rose-400/40',
  },
  mr_white: {
    label: 'Mr White',
    icon: HelpCircle,
    color: 'text-amber-200',
    bg: 'bg-amber-500/15 border-amber-400/40',
  },
} as const;

const phaseLabels: Record<string, string> = {
  word_reveal: 'Découverte du mot',
  clue_giving: 'Donnez votre indice',
  discussion: 'Discussion',
  voting: 'Vote',
  vote_result: 'Résultat',
  game_over: 'Fin de partie',
};

const DiscussionTimer = () => {
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
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Timer className="h-4 w-4" /> Temps de discussion
        </span>
        <span className={cn('font-mono font-bold', urgent ? 'text-rose-400' : 'text-foreground')}>{seconds}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', urgent ? 'bg-rose-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

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
  const [showWord, setShowWord] = useState(true);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-foreground">Préparation de la partie...</p>
        </div>
      </div>
    );
  }

  const isGameOver = game.phase === 'game_over';
  const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;

  // Order players by speaking order (alive first, then eliminated at the end)
  const orderedPlayers = (() => {
    const byId = new Map(gamePlayers.map((p) => [p.player_id, p]));
    const ordered = game.player_order
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof gamePlayers;
    // append any extras not in order
    gamePlayers.forEach((p) => {
      if (!ordered.find((o) => o.player_id === p.player_id)) ordered.push(p);
    });
    return ordered;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-40">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Manche {game.current_round} · {phaseLabels[game.phase] ?? game.phase}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Undercover</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card/40 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vivants</div>
              <div className="font-bold">{alivePlayers.length}/{players.length}</div>
            </div>
            {game.phase === 'voting' && (
              <div className="rounded-lg border border-border bg-card/40 px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Votes</div>
                <div className="font-bold">{votedCount}/{alivePlayers.length}</div>
              </div>
            )}
          </div>
        </div>

        {/* PLAYERS ROW — flowing like a relay, bubbles spawn above */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex min-w-max items-end gap-3">
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
              // Live typing: show the bubble in real time for the current player
              // while it's their turn and they haven't submitted yet.
              const isLiveTyping =
                isMe &&
                isMyTurn &&
                game.phase === 'clue_giving' &&
                Boolean(myPlayer?.is_alive) &&
                clueInput.trim().length > 0;
              const displayClue = isLiveTyping ? clueInput.trim() : lastClue;
              const revealedRole = isGameOver
                ? roleConfig[player.role as keyof typeof roleConfig]
                : null;

              return (
                <div key={player.id} className="flex items-end gap-3">
                  <div className="flex flex-col items-center gap-2 w-28">
                    {/* Clue bubble */}
                    <div className="h-14 flex items-end justify-center w-full">
                      <AnimatePresence mode="wait">
                        {displayClue ? (
                          <motion.div
                            key={isLiveTyping ? `live-${isMe}` : `final-${displayClue}`}
                            initial={
                              isLiveTyping
                                ? { scale: 0.9, y: 6, opacity: 0 }
                                : { scale: 0.2, y: 20, opacity: 0 }
                            }
                            animate={{
                              scale: isLiveTyping ? [1, 1.06, 1] : 1,
                              y: 0,
                              opacity: 1,
                              transition: isLiveTyping
                                ? { duration: 0.18, ease: 'easeOut' }
                                : { type: 'spring', stiffness: 420, damping: 14 },
                            }}
                            exit={{ scale: 0.4, opacity: 0, y: -10 }}
                            className={cn(
                              'relative max-w-full rounded-2xl border-2 px-3 py-1.5 text-sm font-bold shadow-lg',
                              isLiveTyping
                                ? 'border-dashed border-cyan-400/80 bg-cyan-400/10 text-cyan-100'
                                : isCurrent
                                ? 'border-primary bg-primary/20 text-primary'
                                : 'border-border bg-card text-foreground',
                            )}
                          >
                            <span className="block truncate max-w-[6rem]">
                              {displayClue}
                              {isLiveTyping && (
                                <motion.span
                                  className="ml-0.5 inline-block"
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ duration: 0.9, repeat: Infinity }}
                                >
                                  |
                                </motion.span>
                              )}
                            </span>
                            {/* speech tail */}
                            <div
                              className={cn(
                                'absolute left-1/2 -bottom-2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2',
                                isLiveTyping
                                  ? 'border-cyan-400/80 bg-cyan-400/10'
                                  : isCurrent
                                  ? 'border-primary bg-primary/20'
                                  : 'border-border bg-card',
                              )}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl border-2 border-dashed border-border/60 px-3 py-1.5 text-xs text-muted-foreground italic"
                          >
                            mot…
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Player chip */}
                    <motion.button
                      type="button"
                      layout
                      whileHover={canVote ? { y: -2 } : undefined}
                      onClick={canVote ? () => setSelectedVote(player.player_id) : undefined}
                      disabled={!canVote}
                      className={cn(
                        'relative w-full rounded-2xl border-2 p-2 text-center transition-all',
                        isSelected
                          ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/40'
                          : isCurrent
                            ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.5)]'
                            : 'border-border bg-card/50',
                        isMe && !isSelected && !isCurrent && 'border-cyan-400/60',
                        isEliminated && 'opacity-40 saturate-0',
                        canVote && 'cursor-pointer hover:border-rose-400',
                        !canVote && 'cursor-default',
                      )}
                    >
                      <div className={cn(
                        'mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full text-lg font-black',
                        isEliminated
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-gradient-to-br from-primary/30 to-primary/10 text-foreground',
                      )}>
                        {isEliminated ? <Skull className="h-5 w-5" /> : player.player_name[0]?.toUpperCase()}
                      </div>
                      <p className="truncate text-xs font-semibold">
                        {player.player_name}
                        {isMe && <span className="block text-[10px] text-cyan-400">vous</span>}
                      </p>
                      {isCurrent && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                          à lui
                        </span>
                      )}
                      {revealedRole && (
                        <div className={cn(
                          'mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          revealedRole.bg,
                          revealedRole.color,
                        )}>
                          <revealedRole.icon className="h-3 w-3" />
                          {revealedRole.label}
                        </div>
                      )}
                    </motion.button>
                  </div>

                  {/* Arrow between players */}
                  {idx < orderedPlayers.length - 1 && (
                    <ChevronRight
                      className={cn(
                        'mb-9 h-6 w-6 shrink-0',
                        game.phase === 'clue_giving' && lastClue
                          ? 'text-primary'
                          : 'text-muted-foreground/40',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action zone */}
        <div className="mb-6 rounded-2xl border border-border bg-card/40 p-5">
          {game.phase === 'word_reveal' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {hasSeenWord
                  ? 'En attente des autres joueurs...'
                  : 'Découvrez votre mot et confirmez quand vous êtes prêt.'}
              </p>
              {hasSeenWord && currentPlayer.isHost && (
                <Button onClick={startCluePhase} className="w-full">
                  Lancer la phase d'indices <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {game.phase === 'clue_giving' && (
            <>
              {isMyTurn && myPlayer?.is_alive ? (
                <div>
                  <p className="text-sm font-semibold mb-3">À vous ! Donnez un indice (un seul mot)</p>
                  <div className="flex gap-2">
                    <Input
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder="Ex: rond, rouge, sucré..."
                      maxLength={30}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                    />
                    <Button onClick={handleSubmitClue} disabled={!clueInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Au tour de{' '}
                  <span className="font-bold text-foreground">
                    {gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '...'}
                  </span>
                </p>
              )}
            </>
          )}

          {game.phase === 'discussion' && (
            <div className="space-y-3">
              <DiscussionTimer />
              <p className="text-center text-sm text-muted-foreground">
                Discutez et trouvez l'imposteur !
              </p>
              {currentPlayer.isHost && (
                <Button onClick={startVoting} variant="destructive" className="w-full">
                  Passer au vote <Vote className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {game.phase === 'voting' && (
            <>
              {!myPlayer?.is_alive ? (
                <p className="text-center text-sm text-muted-foreground">
                  Vous êtes éliminé, vous observez le vote.
                </p>
              ) : hasVoted ? (
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  <p className="font-semibold">Vote enregistré</p>
                  <p className="text-sm text-muted-foreground">En attente des autres...</p>
                </div>
              ) : selectedVote ? (
                <div className="space-y-3">
                  <p className="text-center text-sm">
                    Voter pour éliminer{' '}
                    <span className="font-bold text-rose-400">
                      {gamePlayers.find((p) => p.player_id === selectedVote)?.player_name}
                    </span>{' '}
                    ?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedVote(null)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={handleVote}>
                      Confirmer
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Cliquez sur un joueur pour voter contre lui.
                </p>
              )}
            </>
          )}

          {game.phase === 'vote_result' && (
            <VoteResultBlock
              game={game}
              gamePlayers={gamePlayers}
              isHost={currentPlayer.isHost}
              onNext={() => {
                nextRound();
                setHasVoted(false);
                setSelectedVote(null);
              }}
            />
          )}

          {isGameOver && (
            <div className="text-center">
              <Crown className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <h3 className="text-2xl font-bold mb-2">
                {game.winner_role === 'civilian' ? 'Victoire des Civils !' : 'Victoire des Infiltrés !'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Mot civil : <span className="font-bold text-foreground">{game.civilian_word}</span> ·
                Mot undercover : <span className="font-bold text-foreground">{game.undercover_word}</span>
              </p>
              <Button onClick={onEndGame} className="mt-4 w-full">
                Retour au lobby
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MY WORD — fixed bottom card (no role shown) */}
      {!isGameOver && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,480px)]">
          <div className="relative rounded-2xl border-2 border-primary/50 bg-background/95 backdrop-blur-md p-4 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Votre mot
                </div>
                <div className="text-2xl font-black tracking-wide truncate">
                  {myPlayer?.word
                    ? (showWord ? myPlayer.word : '• • • • •')
                    : <span className="text-amber-300">??? · à vous d'improviser</span>}
                </div>
              </div>
              {myPlayer?.word && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowWord((v) => !v)}
                  aria-label={showWord ? 'Cacher le mot' : 'Voir le mot'}
                >
                  {showWord ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              )}
              {game.phase === 'word_reveal' && !hasSeenWord && (
                <Button onClick={confirmWordSeen}>J'ai vu</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';

const VoteResultBlock = ({
  game,
  gamePlayers,
  isHost,
  onNext,
}: {
  game: any;
  gamePlayers: any[];
  isHost: boolean;
  onNext: () => void;
}) => {
  const eliminatedName = gamePlayers.find((p) => p.player_id === game.eliminated_player_id)?.player_name;
  const eliminatedRole = game.eliminated_role ? roleConfig[game.eliminated_role as keyof typeof roleConfig] : null;

  return (
    <div className="text-center space-y-4">
      {game.eliminated_player_id ? (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15">
            <Skull className="h-8 w-8 text-rose-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Éliminé</p>
            <h3 className="text-2xl font-bold">{eliminatedName}</h3>
            {eliminatedRole && (
              <div className={cn('mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold', eliminatedRole.bg)}>
                <eliminatedRole.icon className="h-4 w-4" />
                {eliminatedRole.label}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <X className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">Aucune élimination (égalité)</h3>
        </>
      )}
      {isHost && (
        <Button onClick={onNext} className="w-full">
          Manche suivante <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};