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
    description: 'Trouvez les imposteurs avant qu\'ils ne survivent au vote.',
  },
  undercover: {
    label: 'Undercover',
    icon: UserX,
    color: 'text-rose-300',
    bg: 'bg-rose-500/15 border-rose-400/40',
    description: 'Mélangez-vous aux civils sans vous faire repérer.',
  },
  mr_white: {
    label: 'Mr White',
    icon: HelpCircle,
    color: 'text-amber-200',
    bg: 'bg-amber-500/15 border-amber-400/40',
    description: 'Vous n\'avez aucun mot. Bluffez pour survivre.',
  },
} as const;

const phaseLabels: Record<string, string> = {
  word_reveal: 'Découverte des mots',
  clue_giving: 'Donnez votre indice',
  discussion: 'Discussion',
  voting: 'Vote',
  vote_result: 'Résultat du vote',
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

  const myRole = (myPlayer?.role ?? 'civilian') as keyof typeof roleConfig;
  const myRoleConfig = roleConfig[myRole];
  const RoleIcon = myRoleConfig.icon;
  const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Manche {game.current_round} · {phaseLabels[game.phase] ?? game.phase}
            </p>
            <h1 className="text-3xl font-bold">Undercover</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card/40 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground">Vivants</div>
              <div className="font-bold">{alivePlayers.length}/{players.length}</div>
            </div>
            {game.phase === 'voting' && (
              <div className="rounded-lg border border-border bg-card/40 px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">Votes</div>
                <div className="font-bold">{votedCount}/{alivePlayers.length}</div>
              </div>
            )}
          </div>
        </div>

        {/* Ma carte */}
        <div className={cn('mb-6 rounded-2xl border-2 p-5', myRoleConfig.bg)}>
          <div className="flex items-start gap-4">
            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background/40', myRoleConfig.color)}>
              <RoleIcon className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-xs font-bold uppercase tracking-wide', myRoleConfig.color)}>Votre rôle</span>
              </div>
              <h2 className="text-xl font-bold mb-1">{myRoleConfig.label}</h2>
              <p className="text-sm text-muted-foreground">{myRoleConfig.description}</p>
            </div>
          </div>

          {myPlayer?.role !== 'mr_white' && myPlayer?.word && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Votre mot secret</div>
                <div className="text-2xl font-black tracking-wide">
                  {showWord ? myPlayer.word : '• • • • •'}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowWord((v) => !v)}
                aria-label={showWord ? 'Cacher le mot' : 'Voir le mot'}
              >
                {showWord ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          )}

          {game.phase === 'word_reveal' && !hasSeenWord && (
            <Button
              className="mt-4 w-full"
              onClick={() => {
                setShowWord(true);
                confirmWordSeen();
              }}
            >
              J'ai vu mon mot
            </Button>
          )}
        </div>

        {/* Action en cours */}
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

          {game.phase === 'game_over' && (
            <div className="text-center">
              <Crown className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <h3 className="text-2xl font-bold mb-2">
                {game.winner_role === 'civilian' ? 'Victoire des Civils !' : 'Victoire des Infiltrés !'}
              </h3>
              <Button onClick={onEndGame} className="mt-4 w-full">
                Retour au lobby
              </Button>
            </div>
          )}
        </div>

        {/* Joueurs */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Joueurs</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <AnimatePresence>
              {gamePlayers.map((player) => {
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
                  <motion.button
                    key={player.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={canVote ? { y: -2 } : undefined}
                    onClick={canVote ? () => setSelectedVote(player.player_id) : undefined}
                    disabled={!canVote}
                    className={cn(
                      'rounded-2xl border-2 p-3 text-left transition-all',
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15'
                        : isCurrent
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card/40',
                      isMe && !isSelected && !isCurrent && 'border-cyan-400/50',
                      isEliminated && 'opacity-40 saturate-0',
                      canVote && 'hover:border-rose-400 cursor-pointer',
                      !canVote && 'cursor-default'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold',
                        isEliminated ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-foreground'
                      )}>
                        {isEliminated ? <Skull className="h-4 w-4" /> : player.player_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {player.player_name}
                          {isMe && <span className="ml-1 text-xs text-cyan-400">(vous)</span>}
                        </p>
                        {isCurrent && (
                          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">À son tour</p>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      'rounded-lg px-2 py-1.5 text-xs min-h-[28px]',
                      lastClue ? 'bg-background/60 font-medium' : 'bg-background/30 text-muted-foreground italic'
                    )}>
                      {lastClue ?? '...'}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
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