import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import {
  Eye, EyeOff, MessageCircle, Vote, Skull, Crown, Shield,
  UserX, AlertTriangle, ArrowRight, Send, Timer, Users,
  CheckCircle2, Sparkles, Fingerprint, Search, Lock, X
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
    </motion.button>
  );
};

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
  } = useUndercoverGame(lobbyId, currentPlayer, players);

  const [clueInput, setClueInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showWord, setShowWord] = useState(false);
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
    setTimeout(() => setShowWord(false), 4000);
  }, []);

  useEffect(() => {
    if (game?.phase === 'voting') { setHasVoted(false); setSelectedVote(null); }
  }, [game?.phase]);

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="text-center space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/30 border-t-primary" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          <p className="text-lg font-bold text-muted-foreground">Préparation...</p>
        </motion.div>
      </div>
    );
  }

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
      {/* ═══ TOP BAR: Word Banner ═══ */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="bg-card/90 backdrop-blur-xl border-b border-border/30 px-4 py-3"
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Phase badge */}
          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
            <span>{phaseInfo.emoji}</span>
            <span className="hidden sm:inline">{phaseInfo.label}</span>
            <span className="sm:hidden">R{game.current_round}</span>
          </div>

          {/* Word display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">Votre mot</span>
              <div className={cn(
                'flex-1 text-center font-black text-lg sm:text-xl tracking-[0.2em] py-1 px-3 rounded-xl border transition-all',
                showWord 
                  ? 'bg-primary/10 border-primary/30 text-primary' 
                  : 'bg-muted/10 border-border/20 text-muted-foreground',
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
              className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all"
              whileTap={{ scale: 0.95 }}
            >
              OK
            </motion.button>
          ) : (
            <motion.button
              onClick={showWord ? () => setShowWord(false) : handleRevealWord}
              className={cn(
                'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all',
                showWord 
                  ? 'bg-primary/20 border-primary/30 text-primary' 
                  : 'bg-muted/10 border-border/20 text-muted-foreground hover:bg-muted/20'
              )}
              whileTap={{ scale: 0.9 }}
            >
              {showWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

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
        </div>
      </div>
    </div>
  );
});

UndercoverGameScreen.displayName = 'UndercoverGameScreen';
