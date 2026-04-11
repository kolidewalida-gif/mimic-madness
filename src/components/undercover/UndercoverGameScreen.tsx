import { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import { Eye, EyeOff, MessageCircle, Vote, Skull, Crown, Shield, UserX, AlertTriangle, ArrowRight, Send } from 'lucide-react';
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
  civilian: { label: 'Civil', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  undercover: { label: 'Undercover', icon: UserX, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  mr_white: { label: 'Mr. White', icon: AlertTriangle, color: 'text-white', bg: 'bg-white/10', border: 'border-white/30' },
};

export const UndercoverGameScreen = memo(({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
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

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement de la partie...</p>
        </div>
      </div>
    );
  }

  const phase = game.phase;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-black text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
            🕵️ UNDERCOVER
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Manche {game.current_round}</span>
            <span>•</span>
            <span>{alivePlayers.length} joueurs en vie</span>
          </div>
        </motion.div>

        {/* Player Role Badge */}
        {myPlayer && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'p-4 rounded-xl border-2 text-center',
              roleConfig[myPlayer.role as keyof typeof roleConfig]?.bg,
              roleConfig[myPlayer.role as keyof typeof roleConfig]?.border,
            )}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Votre rôle</p>
            <p className={cn('text-lg font-bold', roleConfig[myPlayer.role as keyof typeof roleConfig]?.color)}>
              {roleConfig[myPlayer.role as keyof typeof roleConfig]?.label}
            </p>
            {!myPlayer.is_alive && (
              <p className="text-red-400 text-sm mt-1 flex items-center justify-center gap-1">
                <Skull className="w-4 h-4" /> Éliminé
              </p>
            )}
          </motion.div>
        )}

        {/* Phase: Word Reveal */}
        <AnimatePresence mode="wait">
          {phase === 'word_reveal' && myPlayer && (
            <motion.div
              key="word-reveal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-6 text-center space-y-4">
                <Eye className="w-10 h-10 mx-auto text-primary" />
                <h2 className="text-xl font-bold">Votre mot secret</h2>
                <p className="text-sm text-muted-foreground">
                  {myPlayer.role === 'mr_white'
                    ? "Vous êtes Mr. White ! Vous n'avez pas de mot. Essayez de deviner le mot des civils grâce aux indices."
                    : "Mémorisez votre mot. Ne le dites pas directement !"}
                </p>

                {myPlayer.role !== 'mr_white' && (
                  <button
                    onClick={() => setShowWord(!showWord)}
                    className="mx-auto flex items-center gap-2 px-6 py-3 bg-primary/20 hover:bg-primary/30 rounded-xl transition-colors border border-primary/30"
                  >
                    {showWord ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    {showWord ? 'Cacher' : 'Voir mon mot'}
                  </button>
                )}

                {showWord && myPlayer.word && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black text-primary py-4"
                  >
                    {myPlayer.word}
                  </motion.div>
                )}

                {!hasSeenWord ? (
                  <button
                    onClick={confirmWordSeen}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                  >
                    J'ai mémorisé ! ✓
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-green-400 text-sm">✓ Mot mémorisé</p>
                    {currentPlayer.isHost && (
                      <button
                        onClick={startCluePhase}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        Commencer les indices <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {!currentPlayer.isHost && (
                      <p className="text-muted-foreground text-sm">En attente de l'hôte...</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase: Clue Giving */}
          {phase === 'clue_giving' && (
            <motion.div
              key="clue-giving"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">Tour d'indices</h2>
                </div>

                {/* Current player indicator */}
                {currentTurnPlayerId && (
                  <div className="text-center py-3">
                    <p className="text-sm text-muted-foreground">C'est au tour de</p>
                    <p className="text-xl font-bold text-primary">
                      {gamePlayers.find(p => p.player_id === currentTurnPlayerId)?.player_name}
                      {currentTurnPlayerId === currentPlayer.id && ' (vous)'}
                    </p>
                  </div>
                )}

                {/* Clues given so far */}
                <div className="space-y-2">
                  {gamePlayers
                    .filter(p => p.is_alive && p.current_clue)
                    .map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <span className="text-sm font-medium">{p.player_name}:</span>
                        <span className="text-sm text-primary font-bold">"{p.current_clue}"</span>
                      </div>
                    ))}
                </div>

                {/* Input for current player */}
                {isMyTurn && myPlayer?.is_alive && (
                  <div className="flex gap-2">
                    <Input
                      value={clueInput}
                      onChange={e => setClueInput(e.target.value)}
                      placeholder="Donnez un indice en UN mot..."
                      className="flex-1"
                      maxLength={30}
                      onKeyDown={e => e.key === 'Enter' && handleSubmitClue()}
                    />
                    <button
                      onClick={handleSubmitClue}
                      disabled={!clueInput.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {!isMyTurn && (
                  <p className="text-center text-muted-foreground text-sm animate-pulse">
                    En attente de l'indice...
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase: Discussion */}
          {phase === 'discussion' && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-6 space-y-4">
                <h2 className="text-lg font-bold text-center">💬 Discussion</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Discutez entre vous pour trouver l'Undercover ! Qui est suspect ?
                </p>

                {/* All clues */}
                <div className="space-y-2">
                  {gamePlayers
                    .filter(p => p.is_alive && p.current_clue)
                    .map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                        <span className="font-medium text-sm">{p.player_name}</span>
                        <span className="text-primary font-bold">"{p.current_clue}"</span>
                      </div>
                    ))}
                </div>

                {currentPlayer.isHost && (
                  <button
                    onClick={startVoting}
                    className="w-full py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Vote className="w-5 h-5" /> Passer au vote
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase: Voting */}
          {phase === 'voting' && (
            <motion.div
              key="voting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-6 space-y-4">
                <div className="text-center space-y-2">
                  <Vote className="w-8 h-8 mx-auto text-red-400" />
                  <h2 className="text-lg font-bold">Vote d'élimination</h2>
                  <p className="text-sm text-muted-foreground">Qui voulez-vous éliminer ?</p>
                </div>

                {!myPlayer?.is_alive ? (
                  <p className="text-center text-muted-foreground">Vous êtes éliminé, vous ne pouvez plus voter.</p>
                ) : hasVoted ? (
                  <div className="text-center space-y-2">
                    <p className="text-green-400 font-bold">✓ Vote soumis</p>
                    <p className="text-sm text-muted-foreground animate-pulse">En attente des autres votes...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alivePlayers
                      .filter(p => p.player_id !== currentPlayer.id)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedVote(p.player_id)}
                          className={cn(
                            'w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3',
                            selectedVote === p.player_id
                              ? 'border-red-500 bg-red-500/20'
                              : 'border-border/30 bg-muted/10 hover:bg-muted/20'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            selectedVote === p.player_id ? 'bg-red-500 text-white' : 'bg-muted/30'
                          )}>
                            {p.player_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{p.player_name}</span>
                        </button>
                      ))}
                    
                    <button
                      onClick={handleVote}
                      disabled={!selectedVote}
                      className="w-full py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-red-600 transition-colors mt-4"
                    >
                      Confirmer le vote
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase: Vote Result */}
          {phase === 'vote_result' && (
            <motion.div
              key="vote-result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-6 text-center space-y-4">
                {game.eliminated_player_id ? (
                  <>
                    <Skull className="w-12 h-12 mx-auto text-red-400" />
                    <h2 className="text-xl font-bold">
                      {gamePlayers.find(p => p.player_id === game.eliminated_player_id)?.player_name} est éliminé !
                    </h2>
                    <p className={cn(
                      'text-lg font-bold',
                      game.eliminated_role === 'civilian' ? 'text-blue-400' : game.eliminated_role === 'undercover' ? 'text-red-400' : 'text-white'
                    )}>
                      C'était un {roleConfig[game.eliminated_role as keyof typeof roleConfig]?.label || game.eliminated_role} !
                    </p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-12 h-12 mx-auto text-yellow-400" />
                    <h2 className="text-xl font-bold">Égalité !</h2>
                    <p className="text-muted-foreground">Personne n'est éliminé ce tour.</p>
                  </>
                )}

                {currentPlayer.isHost && (
                  <button
                    onClick={() => {
                      nextRound();
                      setHasVoted(false);
                      setSelectedVote(null);
                    }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    Manche suivante <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase: Game Over */}
          {phase === 'game_over' && (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-primary/30 p-8 text-center space-y-6">
                <Crown className="w-16 h-16 mx-auto text-yellow-400" />
                <h2 className="text-2xl font-black">Partie terminée !</h2>
                
                <div className={cn(
                  'text-xl font-bold py-4 rounded-xl',
                  game.winner_role === 'civilian' ? 'text-blue-400 bg-blue-500/10' : 'text-red-400 bg-red-500/10'
                )}>
                  {game.winner_role === 'civilian' ? '🛡️ Les Civils gagnent !' : '🕵️ Les Undercovers gagnent !'}
                </div>

                {/* Reveal all roles */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground">Tous les rôles</h3>
                  {gamePlayers.map(p => {
                    const cfg = roleConfig[p.role as keyof typeof roleConfig];
                    return (
                      <div key={p.id} className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        cfg?.bg, cfg?.border,
                        !p.is_alive && 'opacity-50'
                      )}>
                        <span className="font-medium">{p.player_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-bold', cfg?.color)}>{cfg?.label}</span>
                          {p.word && <span className="text-xs text-muted-foreground">({p.word})</span>}
                          {!p.is_alive && <Skull className="w-4 h-4 text-red-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Words reveal */}
                <div className="flex gap-4 justify-center">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Mot Civil</p>
                    <p className="text-lg font-bold text-blue-400">{game.civilian_word}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Mot Undercover</p>
                    <p className="text-lg font-bold text-red-400">{game.undercover_word}</p>
                  </div>
                </div>

                <button
                  onClick={onEndGame}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Retour au menu
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Players Status Bar */}
        <div className="bg-card/40 backdrop-blur-sm rounded-xl border border-border/20 p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Joueurs</h3>
          <div className="flex flex-wrap gap-2">
            {gamePlayers.map(p => (
              <div
                key={p.id}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  p.is_alive
                    ? currentTurnPlayerId === p.player_id
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted/20 border-border/30'
                    : 'bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50'
                )}
              >
                {p.player_name}
                {!p.is_alive && ' 💀'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';
