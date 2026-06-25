import { useState, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { UndercoverPreGameSettings } from './UndercoverPreGameSettings';
import { computeRoundWinner } from '@/lib/undercoverLogic';
import {
  ArrowRight, CheckCircle2, Crown, Eye, EyeOff, Send, Skull,
  Timer, UserX, Vote, X, Sparkles, Loader2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface Player { id: string; name: string; isHost: boolean; }
interface UndercoverGameScreenProps {
  currentPlayer: Player; players: Player[]; lobbyId: string; onEndGame: () => void;
}

const SHADOW = '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810';
const SHADOW_SM = '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810';
const FONT = "'Caveat', cursive";

const PHASE_COLORS: Record<string, string> = {
  word_reveal: '#a855f7', clue_giving: '#06b6d4', discussion: '#f59e0b',
  voting: '#ef4444', vote_result: '#fbbf24', game_over: '#fbbf24',
};
const PHASE_LABELS: Record<string, string> = {
  word_reveal: '👁️ Découverte du mot', clue_giving: '💬 Phase d\'indices',
  discussion: '🔥 Discussion', voting: '⚡ Vote',
  vote_result: '💀 Résultat', game_over: '🏆 Fin de partie',
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
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
    // Elimination dramatic overlay — shown briefly when a player gets eliminated.
    // Auto-dismisses after a short timeout so the recap (or next round) appears below.
    const [showEliminationFx, setShowEliminationFx] = useState(false);

    // ── Adaptive music + SFX ────────────────────────────────────────────
    const { setSituation, clearSituationOverride } = useBackgroundMusic();
    const prevPhaseRef = useRef<string | null>(null);
    const myTurnSfxRef = useRef<string | null>(null);

    // Drive music situation + a juicy SFX on every phase change
    useEffect(() => {
      if (!game) return;
      const phase = game.phase;
      if (prevPhaseRef.current === phase) return;
      prevPhaseRef.current = phase;

      switch (phase) {
        case 'word_reveal': playInkSound('cartoonDing', 0.4); break;
        case 'clue_giving': playInkSound('cartoonPop', 0.4); break;
        case 'discussion': playInkSound('cartoonSwoosh', 0.45); break;
        case 'voting': playInkSound('cartoonWobble', 0.5); break;
        case 'game_over':
          playInkSound(game.winner_role === 'civilian' ? 'cartoonFanfare' : 'cartoonZap', 0.6);
          break;
        default: break;
      }

      // Adaptive soundtrack: tense during the vote, win/lose sting at the end
      if (phase === 'voting' || phase === 'vote_result') {
        setSituation('voting', { priority: 5, source: 'undercover' });
      } else if (phase === 'game_over') {
        setSituation(game.winner_role === 'civilian' ? 'victory' : 'defeat', { priority: 6, source: 'undercover' });
      } else {
        setSituation('undercover', { priority: 5, source: 'undercover' });
      }
    }, [game?.phase, game?.winner_role, setSituation]);

    // Restore base music when leaving the mode
    useEffect(() => () => clearSituationOverride('undercover'), [clearSituationOverride]);

    // "It's your turn" chime during the clue phase (once per turn)
    useEffect(() => {
      if (game?.phase === 'clue_giving' && isMyTurn && myPlayer?.is_alive) {
        const key = `${game.current_round}:${game.current_player_index}:${(game as any).clue_pass ?? 0}`;
        if (myTurnSfxRef.current !== key) {
          myTurnSfxRef.current = key;
          playInkSound('cartoonDing', 0.5);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game?.phase, isMyTurn, myPlayer?.is_alive, game?.current_round, game?.current_player_index]);

    const accent = game ? PHASE_COLORS[game.phase] ?? '#a855f7' : '#a855f7';

    const handleSubmitClue = useCallback(() => {
      const trimmed = clueInput.trim();
      if (!trimmed) return;
      playInkSound('cartoonPop', 0.4);
      submitClue(trimmed);
      setClueInput('');
    }, [clueInput, submitClue]);

    const handleVote = useCallback(() => {
      if (!selectedVote) return;
      playInkSound('cartoonZap', 0.45);
      submitVote(selectedVote);
      setHasVoted(true);
    }, [selectedVote, submitVote]);

    useEffect(() => { if (game?.phase === 'voting') { setHasVoted(false); setSelectedVote(null); } }, [game?.phase]);
    useEffect(() => { if (game?.phase === 'word_reveal' && !hasSeenWord) setShowWordModal(true); }, [game?.phase, hasSeenWord]);

    // Trigger dramatic elimination FX when entering vote_result with a real
    // elimination. Auto-hide after 2.6s so the recap card behind takes over.
    useEffect(() => {
      if (game?.phase === 'vote_result' && game.eliminated_player_id) {
        playInkSound('cartoonZap', 0.5);
        setShowEliminationFx(true);
        const t = setTimeout(() => setShowEliminationFx(false), 2600);
        return () => clearTimeout(t);
      }
      setShowEliminationFx(false);
    }, [game?.phase, game?.eliminated_player_id]);

    // Compute round outcome client-side: who is still alive after the
    // elimination, and whether a side has won this round. Used by the
    // vote_result recap and the game_over reveal so we can show both words
    // and the role of each player.
    const eliminatedPlayer = useMemo(
      () => gamePlayers.find((p) => p.player_id === game?.eliminated_player_id) ?? null,
      [gamePlayers, game?.eliminated_player_id],
    );
    const aliveAfterElim = useMemo(
      () => gamePlayers.filter((p) => p.is_alive),
      [gamePlayers],
    );
    const roundWinner = useMemo(
      () => computeRoundWinner(aliveAfterElim.map((p) => ({ role: p.role }))),
      [aliveAfterElim],
    );

    const orderedPlayers = useMemo(() => {
      if (!game) return [] as typeof gamePlayers;
      const byId = new Map(gamePlayers.map((p) => [p.player_id, p]));
      const ordered = game.player_order.map((id) => byId.get(id)).filter(Boolean) as typeof gamePlayers;
      gamePlayers.forEach((p) => { if (!ordered.find((o) => o.player_id === p.player_id)) ordered.push(p); });
      return ordered;
    }, [game, gamePlayers]);

    const playerIds = useMemo(() => orderedPlayers.map((p) => p.player_id), [orderedPlayers]);
    const { getAvatar } = useMultiplePlayerAvatars(playerIds);

    // Loading
    if (loading || !game) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#1a0530]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="w-10 h-10 text-purple-400" />
          </motion.div>
        </div>
      );
    }

    // Settings
    if (game.phase === 'settings') {
      return <UndercoverPreGameSettings totalPlayers={players.length} isHost={currentPlayer.isHost}
        initialNumUndercover={game.num_undercover} initialTotalRounds={game.total_rounds} initialEnableMrWhite={game.enable_mr_white}
        onConfirm={({ numUndercover, totalRounds, enableMrWhite }) => lockSettings({ numUndercover, totalRounds, enableMrWhite })} />;
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;
    const currentTurnName = gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '…';

    return (
      <div className="h-screen w-full flex flex-col text-white relative overflow-hidden">
        {/* ═══ BACKGROUND IMAGE — graffiti wall ═══ */}
        <div className="absolute inset-0">
          <BackgroundWithFallback />
          {/* Dark overlay for readability — lighter so the new background shows */}
          <div className="absolute inset-0 bg-[#1a0530]/40" />
        </div>

        {/* ═══ TOP BAR — Phase info + Round counter ═══ */}
        <header className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
          {/* Phase label */}
          <motion.div key={game.phase} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="px-5 py-2.5 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.5)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
            <span className="text-xl font-black" style={{ fontFamily: FONT, color: accent, textShadow: SHADOW_SM }}>
              {PHASE_LABELS[game.phase] ?? game.phase}
              {game.phase === 'clue_giving' && (
                <span className="text-sm ml-2 text-white/60">
                  ({((game as any).clue_pass ?? 0) + 1}/2)
                </span>
              )}
            </span>
          </motion.div>

          {/* Round counter */}
          <div className="px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810' }}>
            <span className="text-2xl font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
              {game.current_round}/{game.total_rounds > 90 ? '∞' : game.total_rounds}
            </span>
          </div>
        </header>

        {/* Timer in header area — visible during discussion */}
        {game.phase === 'discussion' && (
          <div className="relative z-10 mx-auto max-w-xl px-5 pb-2">
            <TimerBar accent={accent} total={28} />
          </div>
        )}

        {/* ═══ MAIN AREA — Players grid with clue history ═══ */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0 overflow-hidden">
          {/* Players columns — each player is a column with avatar on top and clues below */}
          <div className="w-full max-w-4xl flex justify-center gap-3 md:gap-5">
            {orderedPlayers.map((player) => {
              const isCurrent = currentTurnPlayerId === player.player_id && game.phase === 'clue_giving';
              const isMe = player.player_id === currentPlayer.id;
              const isEliminated = !player.is_alive;
              const isSelected = selectedVote === player.player_id;
              const canVotePlayer = game.phase === 'voting' && Boolean(myPlayer?.is_alive) && !hasVoted && player.player_id !== currentPlayer.id && player.is_alive;
              const av = getAvatar(player.player_id);
              const history = (player as { clue_history?: string[] }).clue_history ?? [];
              // Build clue list: all past clues + current clue
              const allClues = [...history];
              if (player.current_clue && !allClues.includes(player.current_clue)) {
                allClues.push(player.current_clue);
              }

              return (
                <div key={player.id} className="flex flex-col items-center gap-2.5 min-w-0" style={{ flex: '1 1 0', maxWidth: '220px' }}>
                  {/* Avatar */}
                  <motion.button
                    type="button"
                    onClick={canVotePlayer ? () => { playInkSound('brushTap', 0.35); setSelectedVote(player.player_id); } : undefined}
                    disabled={!canVotePlayer}
                    whileHover={canVotePlayer ? { scale: 1.1 } : undefined}
                    whileTap={canVotePlayer ? { scale: 0.9 } : undefined}
                    animate={isCurrent ? { y: [0, -4, 0] } : undefined}
                    transition={isCurrent ? { duration: 1.2, repeat: Infinity } : undefined}
                    className={cn(
                      'relative w-36 h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center flex-shrink-0',
                      canVotePlayer && 'cursor-pointer',
                      isEliminated && 'opacity-40 grayscale',
                    )}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                        : isCurrent ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                        : isMe ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                        : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                      border: '4px solid #0a0810',
                      boxShadow: isCurrent ? `0 5px 0 #0a0810, 0 0 20px ${accent}66` : '0 4px 0 #0a0810',
                    }}
                  >
                    {isEliminated ? <Skull className="w-14 h-14 text-white/70" /> :
                      av.type === 'image' && av.imageUrl ? <img src={av.imageUrl} alt="" className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover" /> :
                      <span className="text-5xl md:text-6xl font-black text-white" style={{ fontFamily: FONT }}>{player.player_name[0]?.toUpperCase()}</span>}
                    {isCurrent && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                        style={{ background: accent, border: '1.5px solid #0a0810' }}>
                        💬
                      </motion.div>
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 border-2 border-[#0a0810] flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>

                  {/* Player name */}
                  <span className={cn('text-base md:text-lg font-black truncate max-w-full text-center',
                    isMe ? 'text-cyan-300' : 'text-white/90')}
                    style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                    {isMe ? 'Toi' : player.player_name}
                  </span>

                  {/* Clue history — stacked cards below avatar */}
                  <div className="flex flex-col gap-2 w-full">
                    {allClues.map((clue, i) => (
                      <motion.div
                        key={`${player.player_id}-${i}`}
                        initial={{ scale: 0.7, opacity: 0, y: -5 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', damping: 15 }}
                        className="w-full px-3 py-2 rounded-xl text-center truncate"
                        style={{
                          background: 'rgba(0,0,0,0.55)',
                          border: '2px solid rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <span className="text-base md:text-lg font-bold text-white/95" style={{ fontFamily: FONT }}>
                          {clue}
                        </span>
                      </motion.div>
                    ))}
                    {/* Empty placeholder */}
                    {allClues.length === 0 && (
                      <div className="w-full px-3 py-2 rounded-xl text-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                        <span className="text-sm text-white/30 italic" style={{ fontFamily: FONT }}>…</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ BOTTOM ZONE — Action area + Timer ═══ */}
        <div className="relative z-10 px-4 pb-20 space-y-3">
          {/* Action zone — contextual per phase */}
          <div className="max-w-xl mx-auto">
            <AnimatePresence mode="wait">
              {/* WORD REVEAL */}
              {game.phase === 'word_reveal' && (
                <motion.div key="wr" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                  className="text-center space-y-3">
                  {hasSeenWord ? (
                    <>
                      <p className="text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>✅ Mot mémorisé !</p>
                      {currentPlayer.isHost && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startCluePhase}
                          className="px-5 py-2.5 rounded-2xl font-black text-white"
                          style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                          Lancer les indices 🚀
                        </motion.button>
                      )}
                    </>
                  ) : (
                    <p className="text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Appuie sur "Voir mon mot" 👇
                    </p>
                  )}
                </motion.div>
              )}

              {/* CLUE GIVING */}
              {game.phase === 'clue_giving' && (
                <motion.div key="cg" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                  className="space-y-2">
                  {isMyTurn && myPlayer?.is_alive ? (
                    <div className="flex gap-2 max-w-md mx-auto">
                      <Input value={clueInput} onChange={(e) => setClueInput(e.target.value)} placeholder="Ton indice…"
                        maxLength={30} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                        className="flex-1 h-11 bg-black/50 text-center text-lg font-black text-white placeholder:text-white/30 rounded-2xl"
                        style={{ fontFamily: FONT, border: '3px solid #0a0810', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }} />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSubmitClue}
                        disabled={!clueInput.trim()}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
                        style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}>
                        <Send className="w-5 h-5 text-white" />
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-center text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Au tour de <span style={{ color: accent }}>{currentTurnName}</span> 💭
                    </p>
                  )}
                  {/* Clue submission progress for this pass */}
                  {(() => {
                    const submitted = orderedPlayers.filter((p) => p.is_alive && p.current_clue).length;
                    const total = orderedPlayers.filter((p) => p.is_alive).length;
                    return (
                      <p className="text-center text-xs font-black text-white/50" style={{ fontFamily: FONT }}>
                        ✍️ {submitted}/{total} indices donnés
                      </p>
                    );
                  })()}
                </motion.div>
              )}

              {/* DISCUSSION */}
              {game.phase === 'discussion' && (
                <motion.div key="disc" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                  className="text-center space-y-2">
                  <p className="text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Qui est suspect ? 🕵️</p>
                  {currentPlayer.isHost && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startVoting}
                      className="px-5 py-2.5 rounded-2xl font-black text-white"
                      style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Passer au vote ⚡
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* VOTING */}
              {game.phase === 'voting' && (
                <motion.div key="vote" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                  className="text-center space-y-2">
                  {!myPlayer?.is_alive ? (
                    <p className="text-lg font-black text-white/50" style={{ fontFamily: FONT }}>Tu observes… 👻</p>
                  ) : hasVoted ? (
                    <p className="text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>✅ Vote enregistré ! ({votedCount}/{alivePlayers.length})</p>
                  ) : selectedVote ? (
                    <div className="flex gap-3 justify-center">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedVote(null)}
                        className="px-4 py-2 rounded-2xl font-black text-white"
                        style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', fontFamily: FONT }}>
                        Annuler
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleVote}
                        className="px-4 py-2 rounded-2xl font-black text-white"
                        style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '3px solid #0a0810', boxShadow: '0 3px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                        Éliminer 💀
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-lg font-black" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Clique sur un joueur 🎯 ({votedCount}/{alivePlayers.length})
                    </p>
                  )}
                </motion.div>
              )}

              {/* VOTE RESULT */}
              {game.phase === 'vote_result' && (
                <motion.div key="vr" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center space-y-3">
                  {game.eliminated_player_id && eliminatedPlayer ? (
                    <>
                      <p className="text-2xl font-black" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                        💀 <span style={{ color: '#ef4444' }}>{eliminatedPlayer.player_name}</span> éliminé !
                      </p>
                      <p className="text-base font-black text-white/80" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                        C'était{' '}
                        <span style={{
                          color: eliminatedPlayer.role === 'undercover' ? '#ef4444'
                            : eliminatedPlayer.role === 'mr_white' ? '#fbbf24' : '#34d399',
                        }}>
                          {eliminatedPlayer.role === 'undercover' ? 'un Infiltré 😈'
                            : eliminatedPlayer.role === 'mr_white' ? 'Mr White 🃏'
                            : 'un Civil 😇'}
                        </span>
                      </p>

                      {/* If the round just ended, reveal both words side-by-side */}
                      {roundWinner && (
                        <RoundEndRecap
                          winner={roundWinner}
                          civilianWord={game.civilian_word}
                          undercoverWord={game.undercover_word}
                          accent={accent}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-xl font-black" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                      🤷 Égalité ! Personne n'est éliminé.
                    </p>
                  )}
                  {currentPlayer.isHost && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { nextRound(); setHasVoted(false); setSelectedVote(null); }}
                      className="px-5 py-2.5 rounded-2xl font-black text-white"
                      style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                      Continuer ➡️
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* GAME OVER */}
              {isGameOver && (
                <motion.div key="go" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14 }}
                  className="text-center space-y-3">
                  <motion.p
                    initial={{ scale: 0.6, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                    className="text-3xl md:text-4xl font-black"
                    style={{
                      fontFamily: FONT,
                      textShadow: SHADOW,
                      color: game.winner_role === 'civilian' ? '#34d399' : '#ef4444',
                    }}>
                    {game.winner_role === 'civilian' ? '🎉 Les Civils gagnent !' : '😈 Les Infiltrés gagnent !'}
                  </motion.p>

                  <RoundEndRecap
                    winner={(game.winner_role === 'civilian' || game.winner_role === 'undercover')
                      ? game.winner_role
                      : 'civilian'}
                    civilianWord={game.civilian_word}
                    undercoverWord={game.undercover_word}
                    accent={accent}
                    revealRoles={gamePlayers}
                  />

                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onEndGame}
                    className="px-5 py-2.5 rounded-2xl font-black text-white"
                    style={{ background: 'linear-gradient(180deg, #fbbf24, #d97706)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                    Retour au lobby 🏠
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* "Voir mon mot" button */}
          {!isGameOver && (
            <div className="flex justify-center">
              <motion.button type="button" onClick={() => setShowWordModal(true)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="px-6 py-3 rounded-2xl font-black text-lg text-white flex items-center gap-2"
                style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: `0 5px 0 #0a0810, 0 0 16px ${accent}44`, fontFamily: FONT, textShadow: SHADOW_SM }}>
                <Eye className="w-5 h-5" /> Voir mon mot
              </motion.button>
            </div>
          )}
        </div>

        {/* ═══ ELIMINATION FX OVERLAY ═══ */}
        <AnimatePresence>
          {showEliminationFx && eliminatedPlayer && (
            <EliminationOverlay
              playerName={eliminatedPlayer.player_name}
              role={eliminatedPlayer.role}
              avatar={getAvatar(eliminatedPlayer.player_id)}
              onDismiss={() => setShowEliminationFx(false)}
            />
          )}
        </AnimatePresence>

        {/* ═══ WORD MODAL ═══ */}
        <AnimatePresence>
          {showWordModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}>
              <motion.div initial={{ scale: 0.7, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.7 }}
                transition={{ type: 'spring', damping: 14 }} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl p-8 text-center"
                style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '4px solid #0a0810', boxShadow: `0 8px 0 #0a0810, 0 0 40px ${accent}33` }}>
                <p className="text-xs uppercase tracking-widest text-white/40 font-black mb-4" style={{ fontFamily: FONT }}>🤫 Ton mot secret</p>
                {myPlayer?.word ? (
                  <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                    className="text-4xl md:text-5xl font-black text-white break-words mb-6"
                    style={{ fontFamily: FONT, textShadow: `${SHADOW}, 0 0 20px ${accent}55` }}>
                    {myPlayer.word.toUpperCase()}
                  </motion.p>
                ) : (
                  <p className="text-4xl font-black text-white/50 mb-6" style={{ fontFamily: FONT }}>??? 🎭</p>
                )}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}
                  className="w-full px-5 py-3 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: FONT, textShadow: SHADOW_SM }}>
                  <EyeOff className="w-5 h-5" />
                  {game.phase === 'word_reveal' && !hasSeenWord ? "C'est noté !" : 'Cacher'}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

UndercoverGameScreen.displayName = 'UndercoverGameScreen';

/* ═══════════════════════════════════════════════════════════
   Elimination Overlay — dramatic full-screen reveal that the
   voted player has been eliminated. Skull burst, big avatar,
   role reveal, then auto-dismiss.
═══════════════════════════════════════════════════════════ */
type EliminationRole = 'civilian' | 'undercover' | 'mr_white';

const EliminationOverlay = ({
  playerName,
  role,
  avatar,
  onDismiss,
}: {
  playerName: string;
  role: EliminationRole;
  avatar: { type: 'image'; imageUrl: string } | { type: 'initials' } | { type: string; imageUrl?: string };
  onDismiss: () => void;
}) => {
  const tint = role === 'undercover' ? '#ef4444' : role === 'mr_white' ? '#fbbf24' : '#34d399';
  const label =
    role === 'undercover' ? "C'était un Infiltré 😈"
    : role === 'mr_white' ? "C'était Mr White 🃏"
    : "C'était un Civil 😇";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDismiss}
      className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Radial flash */}
      <motion.div
        initial={{ scale: 0, opacity: 0.7 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${tint}66, transparent 70%)`, filter: 'blur(40px)' }}
      />

      {/* Burst particles */}
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * 280,
              y: Math.sin(angle) * 280,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.05 }}
            className="absolute w-3 h-3 rounded-full"
            style={{ background: tint, boxShadow: `0 0 12px ${tint}` }}
          />
        );
      })}

      <motion.div
        initial={{ scale: 0.4, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center gap-4 px-8 py-7 rounded-3xl"
        style={{
          background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
          border: '4px solid #0a0810',
          boxShadow: `0 8px 0 #0a0810, 0 0 50px ${tint}66`,
        }}
      >
        {/* Skull stamp on top */}
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ type: 'spring', damping: 8, delay: 0.15 }}
          className="absolute -top-4 -right-4 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
            border: '3px solid #0a0810',
            boxShadow: '0 4px 0 #0a0810',
          }}
        >
          <Skull className="w-7 h-7 text-white" strokeWidth={2.5} />
        </motion.div>

        {/* Big avatar with shake */}
        <motion.div
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 0.4, repeat: 4 }}
          className="w-32 h-32 rounded-full flex items-center justify-center grayscale"
          style={{
            background: `linear-gradient(135deg, ${tint}, ${tint}88)`,
            border: '5px solid #0a0810',
            boxShadow: `0 6px 0 #0a0810, 0 0 30px ${tint}66`,
          }}
        >
          {avatar?.type === 'image' && avatar.imageUrl ? (
            <img src={avatar.imageUrl} alt="" className="w-28 h-28 rounded-full object-cover opacity-70" />
          ) : (
            <span className="text-5xl font-black text-white/80" style={{ fontFamily: FONT }}>
              {playerName[0]?.toUpperCase()}
            </span>
          )}
        </motion.div>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-black text-white text-center"
          style={{ fontFamily: FONT, textShadow: SHADOW }}
        >
          {playerName} éliminé !
        </motion.p>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-xl font-black text-center px-4 py-1.5 rounded-2xl"
          style={{
            fontFamily: FONT,
            color: tint,
            textShadow: SHADOW_SM,
            background: `${tint}22`,
            border: `2.5px solid ${tint}55`,
          }}
        >
          {label}
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Round End Recap — reveals both words side-by-side and (when
   the match is over) lists every player's role. Used inline in
   vote_result and game_over.
═══════════════════════════════════════════════════════════ */
const RoundEndRecap = ({
  winner,
  civilianWord,
  undercoverWord,
  accent,
  revealRoles,
}: {
  winner: 'civilian' | 'undercover';
  civilianWord: string | null;
  undercoverWord: string | null;
  accent: string;
  revealRoles?: Array<{ player_id: string; player_name: string; role: EliminationRole }>;
}) => {
  // Civilian card pops first if civilians won; otherwise undercover pops first.
  const civilianFirst = winner === 'civilian';

  const Card = ({
    label, word, color, emoji, delay, isWinner,
  }: { label: string; word: string | null; color: string; emoji: string; delay: number; isWinner: boolean }) => (
    <motion.div
      initial={{ scale: 0.6, rotate: -4, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14, delay }}
      className="flex-1 px-3 py-3 rounded-2xl text-center"
      style={{
        background: `linear-gradient(180deg, ${color}33, ${color}11)`,
        border: `3px solid ${isWinner ? color : '#0a0810'}`,
        boxShadow: isWinner
          ? `0 4px 0 #0a0810, 0 0 24px ${color}66`
          : '0 4px 0 #0a0810',
      }}
    >
      <p className="text-[10px] uppercase tracking-widest font-black"
        style={{ fontFamily: FONT, color, textShadow: SHADOW_SM }}>
        {emoji} {label}
      </p>
      <p className="text-2xl font-black text-white truncate" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
        {word ?? '???'}
      </p>
      {isWinner && (
        <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest text-amber-300"
          style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
          🏆 Vainqueur
        </span>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="mx-auto max-w-md space-y-3"
    >
      <p className="text-xs uppercase tracking-widest font-black text-white/70 text-center"
        style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
        🤐 Les mots révélés
      </p>
      <div className="flex gap-2.5">
        <Card
          label="Civils"
          word={civilianWord}
          color="#34d399"
          emoji="😇"
          delay={civilianFirst ? 0.3 : 0.55}
          isWinner={winner === 'civilian'}
        />
        <Card
          label="Infiltrés"
          word={undercoverWord}
          color="#ef4444"
          emoji="😈"
          delay={civilianFirst ? 0.55 : 0.3}
          isWinner={winner === 'undercover'}
        />
      </div>

      {/* Optional full role list, used for the final game over screen */}
      {revealRoles && revealRoles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl p-3 space-y-1.5"
          style={{ background: 'rgba(0,0,0,0.5)', border: '2.5px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-black text-white/60 text-center"
            style={{ fontFamily: FONT }}>
            Récap des rôles
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {revealRoles.map((p) => {
              const rTint = p.role === 'undercover' ? '#ef4444' : p.role === 'mr_white' ? '#fbbf24' : '#34d399';
              const rLabel = p.role === 'undercover' ? 'Infiltré' : p.role === 'mr_white' ? 'Mr White' : 'Civil';
              return (
                <div key={p.player_id}
                  className="flex items-center justify-between px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${rTint}55` }}>
                  <span className="text-sm font-black text-white truncate" style={{ fontFamily: FONT }}>
                    {p.player_name}
                  </span>
                  <span className="text-xs font-black" style={{ fontFamily: FONT, color: rTint, textShadow: SHADOW_SM }}>
                    {rLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Background with automatic fallback — tries multiple candidate
   filenames so the image works whether the user named it
   background.png or backgroundundercover.png.
═══════════════════════════════════════════════════════════ */
const BACKGROUND_CANDIDATES = [
  '/undercovermenu/background.png',
  '/undercovermenu/background.jpg',
  '/undercovermenu/background.webp',
  '/undercovermenu/backgroundundercover.png',
  '/undercovermenu/backgroundundercover.jpg',
  '/undercovermenu/backgroundundercover.webp',
];

// Cache-buster: append a version param so the browser re-fetches after
// a 404 was previously cached. We use the build timestamp as the version.
const BG_VERSION = Date.now();

const BackgroundWithFallback = () => {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  const src = `${BACKGROUND_CANDIDATES[idx]}?v=${BG_VERSION}`;

  return (
    <img
      key={src}
      src={src}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => {
        if (idx + 1 < BACKGROUND_CANDIDATES.length) {
          setIdx(idx + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════
   Timer Bar — bottom countdown
═══════════════════════════════════════════════════════════ */
const TimerBar = ({ accent, total = 28 }: { accent: string; total?: number }) => {
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
    <div className="max-w-xl mx-auto flex items-center gap-3 px-4 py-2 rounded-full"
      style={{ background: 'rgba(0,0,0,0.5)', border: '3px solid #0a0810', boxShadow: '0 3px 0 #0a0810' }}>
      <Timer className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'linear' }}
          style={{ background: urgent ? 'linear-gradient(90deg, #fbbf24, #ef4444)' : `linear-gradient(90deg, ${color}, ${color}88)` }} />
      </div>
      <span className={cn('text-lg font-black tabular-nums', urgent && 'text-red-400')}
        style={{ fontFamily: "'Caveat', cursive", textShadow: SHADOW_SM }}>
        {seconds}s
      </span>
    </div>
  );
};
