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
    <div className="rounded-xl border-2 border-[#ff2b2b]/40 bg-[#050505]/80 backdrop-blur-sm p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-white">
          <Timer className="h-4 w-4 text-[#ff2b2b]" /> Temps de discussion
        </span>
        <span className={cn('font-mono font-bold', urgent ? 'text-[#ff2b2b]' : 'text-white')}>{seconds}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#050505]/60 border border-[#ff2b2b]/20">
        <div
          className={cn('h-full transition-all', urgent ? 'bg-[#ff2b2b]' : 'bg-[#ff2b2b]/60')}
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
    <div className="min-h-screen bg-[#050505] text-foreground relative overflow-hidden">
      {/* Volumetric red fog background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff2b2b]/12 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ff2b2b]/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#ff2b2b]/8 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 pb-40">
        {/* Round Header - Cyberpunk style */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[#ff2b2b]/30 rounded-full blur-xl" />
            <div className="relative px-8 py-3 rounded-full border-2 border-[#ff2b2b]/60 bg-[#050505]/90 backdrop-blur-md">
              <h1
                className="text-2xl md:text-3xl font-black tracking-tight text-center"
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: '#ff2b2b',
                  textShadow: '0 0 30px rgba(255, 43, 43, 0.6)',
                }}
              >
                MANCHE {game.current_round} - {phaseLabels[game.phase]?.toUpperCase() ?? game.phase.toUpperCase()}
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Stats badges */}
        <div className="mb-6 flex items-center justify-center gap-3 text-sm">
          <div className="rounded-full border-2 border-[#ff2b2b]/40 bg-[#050505]/80 backdrop-blur-sm px-4 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#ff2b2b]/70">Vivants</div>
            <div className="font-bold text-white">{alivePlayers.length}/{players.length}</div>
          </div>
          {game.phase === 'voting' && (
            <div className="rounded-full border-2 border-[#ff2b2b]/40 bg-[#050505]/80 backdrop-blur-sm px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#ff2b2b]/70">Votes</div>
              <div className="font-bold text-white">{votedCount}/{alivePlayers.length}</div>
            </div>
          )}
        </div>

        {/* PLAYERS CAROUSEL — Horizontal scrolling cards with avatars */}
        <div className="mb-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#ff2b2b]/30 scrollbar-track-transparent">
          <div className="flex min-w-max items-center justify-center gap-4 px-4">
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
                ? roleConfig[player.role as keyof typeof roleConfig]
                : null;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <motion.button
                    type="button"
                    whileHover={canVote ? { y: -4, scale: 1.05 } : undefined}
                    onClick={canVote ? () => setSelectedVote(player.player_id) : undefined}
                    disabled={!canVote}
                    className={cn(
                      'relative w-32 rounded-2xl border-2 p-3 text-center transition-all duration-300',
                      'bg-[#050505]/90 backdrop-blur-md',
                      isSelected
                        ? 'border-[#ff2b2b] bg-[#ff2b2b]/20 shadow-[0_0_40px_rgba(255,43,43,0.6)]'
                        : isCurrent
                          ? 'border-[#ff2b2b]/80 bg-[#ff2b2b]/10 shadow-[0_0_30px_rgba(255,43,43,0.4)]'
                          : 'border-[#ff2b2b]/30',
                      isMe && !isSelected && !isCurrent && 'border-cyan-400/60 bg-cyan-400/5',
                      isEliminated && 'opacity-40 saturate-0',
                      canVote && 'cursor-pointer hover:border-[#ff2b2b]',
                      !canVote && 'cursor-default',
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative mx-auto mb-2">
                      <div className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center text-xl font-black border-2 transition-all',
                        isEliminated
                          ? 'bg-muted text-muted-foreground border-muted'
                          : 'bg-gradient-to-br from-[#ff2b2b]/30 to-[#ff2b2b]/10 text-white border-[#ff2b2b]/50',
                        isCurrent && 'shadow-[0_0_20px_rgba(255,43,43,0.5)]'
                      )}>
                        {isEliminated ? <Skull className="h-6 w-6" /> : player.player_name[0]?.toUpperCase()}
                      </div>
                      {isCurrent && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff2b2b] border-2 border-[#050505] flex items-center justify-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </motion.div>
                      )}
                    </div>

                    {/* Name */}
                    <p className="truncate text-sm font-bold text-white mb-1">
                      {player.player_name}
                    </p>

                    {/* "VOUS" indicator */}
                    {isMe && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                          VOUS
                        </span>
                      </div>
                    )}

                    {/* Clue display */}
                    {displayClue && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'mt-2 px-2 py-1 rounded-lg text-xs font-semibold truncate',
                          isLiveTyping
                            ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-200'
                            : 'bg-[#ff2b2b]/20 border border-[#ff2b2b]/40 text-[#ff2b2b]'
                        )}
                      >
                        {displayClue}
                      </motion.div>
                    )}

                    {/* Role reveal (game over) */}
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
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action zone */}
        <div className="mb-6 rounded-2xl border-2 border-[#ff2b2b]/40 bg-[#050505]/90 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(255,43,43,0.2)]">
          {game.phase === 'word_reveal' && (
            <div className="text-center">
              <p className="text-sm text-[#ff2b2b]/70 mb-4">
                {hasSeenWord
                  ? 'En attente des autres joueurs...'
                  : 'Découvrez votre mot et confirmez quand vous êtes prêt.'}
              </p>
              {hasSeenWord && currentPlayer.isHost && (
                <Button 
                  onClick={startCluePhase} 
                  className="w-full bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white font-bold border-2 border-[#ff2b2b]/50"
                >
                  Lancer la phase d'indices <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {game.phase === 'clue_giving' && (
            <>
              {isMyTurn && myPlayer?.is_alive ? (
                <div>
                  <p className="text-sm font-semibold mb-3 text-white">À vous ! Donnez un indice (un seul mot)</p>
                  <div className="flex gap-2">
                    <Input
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder="Ex: rond, rouge, sucré..."
                      maxLength={30}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                      className="bg-[#050505]/80 border-[#ff2b2b]/40 text-white placeholder:text-[#ff2b2b]/40 focus:border-[#ff2b2b]"
                    />
                    <Button 
                      onClick={handleSubmitClue} 
                      disabled={!clueInput.trim()}
                      className="bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-[#ff2b2b]/70">
                  Au tour de{' '}
                  <span className="font-bold text-white">
                    {gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '...'}
                  </span>
                </p>
              )}
            </>
          )}

          {game.phase === 'discussion' && (
            <div className="space-y-3">
              <DiscussionTimer />
              <p className="text-center text-sm text-[#ff2b2b]/70">
                Discutez et trouvez l'imposteur !
              </p>
              {currentPlayer.isHost && (
                <Button 
                  onClick={startVoting} 
                  className="w-full bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white font-bold"
                >
                  Passer au vote <Vote className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {game.phase === 'voting' && (
            <>
              {!myPlayer?.is_alive ? (
                <p className="text-center text-sm text-[#ff2b2b]/70">
                  Vous êtes éliminé, vous observez le vote.
                </p>
              ) : hasVoted ? (
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  <p className="font-semibold text-white">Vote enregistré</p>
                  <p className="text-sm text-[#ff2b2b]/70">En attente des autres...</p>
                </div>
              ) : selectedVote ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-white">
                    Voter pour éliminer{' '}
                    <span className="font-bold text-[#ff2b2b]">
                      {gamePlayers.find((p) => p.player_id === selectedVote)?.player_name}
                    </span>{' '}
                    ?
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-[#ff2b2b]/40 text-white hover:bg-[#ff2b2b]/10" 
                      onClick={() => setSelectedVote(null)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      className="flex-1 bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white font-bold" 
                      onClick={handleVote}
                    >
                      Confirmer
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-[#ff2b2b]/70">
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
              <h3 className="text-2xl font-bold mb-2 text-white">
                {game.winner_role === 'civilian' ? 'Victoire des Civils !' : 'Victoire des Infiltrés !'}
              </h3>
              <p className="text-sm text-[#ff2b2b]/70">
                Mot civil : <span className="font-bold text-white">{game.civilian_word}</span> ·
                Mot undercover : <span className="font-bold text-white">{game.undercover_word}</span>
              </p>
              <Button 
                onClick={onEndGame} 
                className="mt-4 w-full bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white font-bold"
              >
                Retour au lobby
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MY WORD — fixed bottom card with "J'AI VU !" button style */}
      {!isGameOver && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,520px)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl border-2 border-[#ff2b2b]/60 bg-[#050505]/95 backdrop-blur-md p-5 shadow-[0_0_60px_rgba(255,43,43,0.4)]"
          >
            {/* Lightbulb icon */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#ff2b2b]/20 border-2 border-[#ff2b2b]/60 flex items-center justify-center backdrop-blur-sm">
              <Eye className="w-5 h-5 text-[#ff2b2b]" />
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex-1 min-w-0 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff2b2b]/70 mb-2">
                  Votre mot
                </div>
                <div 
                  className="text-3xl md:text-4xl font-black tracking-wide truncate"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#ffffff',
                    textShadow: '0 0 30px rgba(255, 43, 43, 0.5)',
                  }}
                >
                  {myPlayer?.word
                    ? (showWord ? myPlayer.word.toUpperCase() : '• • • • •')
                    : <span className="text-amber-300">??? · IMPROVISEZ</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {myPlayer?.word && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowWord((v) => !v)}
                    aria-label={showWord ? 'Cacher le mot' : 'Voir le mot'}
                    className="border-[#ff2b2b]/40 text-[#ff2b2b] hover:bg-[#ff2b2b]/10 hover:border-[#ff2b2b]"
                  >
                    {showWord ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                )}
                {game.phase === 'word_reveal' && !hasSeenWord && (
                  <motion.button
                    onClick={confirmWordSeen}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-xl font-black text-lg bg-[#ff2b2b] text-white border-2 border-[#ff2b2b]/50 hover:bg-[#ff2b2b]/90 transition-all shadow-[0_0_30px_rgba(255,43,43,0.5)]"
                  >
                    J'AI VU !
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ff2b2b]/20 border-2 border-[#ff2b2b]/60">
            <Skull className="h-8 w-8 text-[#ff2b2b]" />
          </div>
          <div>
            <p className="text-sm text-[#ff2b2b]/70">Éliminé</p>
            <h3 className="text-2xl font-bold text-white">{eliminatedName}</h3>
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#050505]/60 border-2 border-[#ff2b2b]/40">
            <X className="h-8 w-8 text-[#ff2b2b]/70" />
          </div>
          <h3 className="text-xl font-bold text-white">Aucune élimination (égalité)</h3>
        </>
      )}
      {isHost && (
        <Button 
          onClick={onNext} 
          className="w-full bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white font-bold"
        >
          Manche suivante <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};