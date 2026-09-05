import { useState, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUndercoverGame } from '@/hooks/useUndercoverGame';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { UndercoverPreGameSettings } from './UndercoverPreGameSettings';
import { computeRoundWinner } from '@/lib/undercoverLogic';
import {
  ArrowRight, CheckCircle2, Crown, Eye, EyeOff, LogOut, RefreshCw, Send, Skull,
  Timer, UserX, Vote, X, Sparkles, Loader2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { PodiumAd } from '@/components/PodiumAd';

interface Player { id: string; name: string; isHost: boolean; isDisconnected?: boolean; }
interface UndercoverGameScreenProps {
  currentPlayer: Player; players: Player[]; lobbyId: string; onEndGame: () => void;
}

const SHADOW = '2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)';
const SHADOW_SM = '1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)';
const FONT = "'Outfit', sans-serif";

const PHASE_COLORS: Record<string, string> = {
  word_reveal: 'var(--ink-accent)', clue_giving: 'var(--ink-text-dim)', discussion: '#f59e0b',
  voting: '#ef4444', vote_result: '#fbbf24', game_over: '#fbbf24',
  clue_transition: '#67e8f9', vote_setup: '#f59e0b', vote_resolution: '#ef4444', round_transition: '#a78bfa',
};
const PHASE_LABELS: Record<string, string> = {
  word_reveal: '👁️ Découverte du mot', clue_giving: '💬 Phase d\'indices',
  discussion: '🔥 Discussion', voting: '⚡ Vote',
  vote_result: '💀 Résultat', game_over: '🏆 Fin de partie',
  clue_transition: '↻ Deuxième passage', vote_setup: '↻ Ouverture du vote',
  vote_resolution: '⚖️ Décompte des voix', round_transition: '↻ Préparation de la suite',
};
const TRANSITION_PHASES = new Set(['clue_transition', 'vote_setup', 'vote_resolution', 'round_transition']);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export const UndercoverGameScreen = memo(
  ({ currentPlayer, players, lobbyId, onEndGame }: UndercoverGameScreenProps) => {
    const {
      game, gamePlayers, myPlayer, loading, error, participantCount, alivePlayers,
      currentTurnPlayerId, isMyTurn, hasSeenWord,
      submitClue, submitVote, startVoting, nextRound,
      confirmWordSeen, startCluePhase, lockSettings, retryInitialization,
    } = useUndercoverGame(lobbyId, currentPlayer, players);

    const [clueInput, setClueInput] = useState('');
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [clueSubmitting, setClueSubmitting] = useState(false);
    const [voteSubmitting, setVoteSubmitting] = useState(false);
    const [showWordModal, setShowWordModal] = useState(false);
    const [showEliminationFx, setShowEliminationFx] = useState(false);

    const { setSituation, clearSituationOverride } = useBackgroundMusic();
    const prevPhaseRef = useRef<string | null>(null);
    const myTurnSfxRef = useRef<string | null>(null);

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

      if (phase === 'voting' || phase === 'vote_result' || phase === 'vote_resolution') {
        setSituation('voting', { priority: 5, source: 'undercover' });
      } else if (phase === 'game_over') {
        setSituation(game.winner_role === 'civilian' ? 'victory' : 'defeat', { priority: 6, source: 'undercover' });
      } else {
        setSituation('undercover', { priority: 5, source: 'undercover' });
      }
    }, [game?.phase, game?.winner_role, setSituation]);

    useEffect(() => () => clearSituationOverride('undercover'), [clearSituationOverride]);

    useEffect(() => {
      if (game?.phase === 'clue_giving' && isMyTurn && myPlayer?.is_alive) {
        const key = `${game.current_round}:${game.current_player_index}:${game.clue_pass ?? 0}`;
        if (myTurnSfxRef.current !== key) {
          myTurnSfxRef.current = key;
          playInkSound('cartoonDing', 0.5);
        }
      }
    }, [game?.phase, isMyTurn, myPlayer?.is_alive, game?.current_round, game?.current_player_index, game?.clue_pass]);

    const accent = game ? PHASE_COLORS[game.phase] ?? 'var(--ink-accent)' : 'var(--ink-accent)';
    const hasVoted = Boolean(myPlayer?.vote_target);

    const handleSubmitClue = useCallback(async () => {
      const trimmed = clueInput.trim();
      if (!trimmed || clueSubmitting) return;
      setClueSubmitting(true);
      const submitted = await submitClue(trimmed);
      if (submitted) {
        playInkSound('cartoonPop', 0.4);
        setClueInput('');
      }
      setClueSubmitting(false);
    }, [clueInput, clueSubmitting, submitClue]);

    const handleVote = useCallback(async () => {
      if (!selectedVote || voteSubmitting) return;
      setVoteSubmitting(true);
      const submitted = await submitVote(selectedVote);
      if (submitted) {
        playInkSound('cartoonZap', 0.45);
        setSelectedVote(null);
      }
      setVoteSubmitting(false);
    }, [selectedVote, submitVote, voteSubmitting]);

    useEffect(() => {
      if (game?.phase === 'voting') setSelectedVote(null);
    }, [game?.phase]);
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

    const sessionPlayers = players.filter((player) => !player.isDisconnected);

    if (loading || !game) {
      return (
        <div className="menu-screen-safe relative flex h-[100dvh] min-h-0 items-center justify-center overflow-y-auto overflow-x-hidden bg-[#0b0612] px-4 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,.2),transparent_45%)]" />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-black/35 p-6 text-center backdrop-blur-xl">
            {error ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-200">
                  <RefreshCw className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-2xl font-black">Synchronisation interrompue</h1>
                <p className="mt-2 text-sm font-semibold text-white/55">{error}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={onEndGame}
                    className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 font-black text-white/75">
                    Retour
                  </button>
                  <button type="button" onClick={retryInitialization}
                    className="min-h-12 rounded-2xl bg-pink-500 px-4 font-black text-white">
                    Réessayer
                  </button>
                </div>
              </>
            ) : (
              <>
                <motion.div className="mx-auto w-fit" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 className="h-10 w-10 text-pink-300" />
                </motion.div>
                <h1 className="mt-4 text-2xl font-black">Mise en place de la mission</h1>
                <p className="mt-2 text-sm font-semibold text-white/55">
                  {currentPlayer.isHost && participantCount < 3
                    ? `Synchronisation des agents… ${participantCount}/3`
                    : 'Récupération de la partie en cours…'}
                </p>
              </>
            )}
          </div>
        </div>
      );
    }

    if (game.phase === 'settings') {
      return (
        <UndercoverPreGameSettings
          players={sessionPlayers}
          isHost={currentPlayer.isHost}
          initialNumUndercover={game.num_undercover}
          initialTotalRounds={game.total_rounds}
          initialEnableMrWhite={game.enable_mr_white}
          onConfirm={lockSettings}
        />
      );
    }

    const isGameOver = game.phase === 'game_over';
    const votedCount = alivePlayers.filter((p) => p.vote_target !== null).length;
    const currentTurnName = gamePlayers.find((p) => p.player_id === currentTurnPlayerId)?.player_name ?? '…';

    return (
      <div className="undercover-game-stage menu-screen-safe relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden text-white">
        <div className="absolute inset-0">
          <BackgroundWithFallback />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(11,5,20,.76),rgba(22,8,38,.58),rgba(7,4,13,.88))]" />
        </div>

        <header className="relative z-10 flex-shrink-0 px-3 pb-2 pt-3 sm:px-5 sm:pt-4">
          <div className="mx-auto flex w-full max-w-[100rem] min-w-0 items-center gap-2">
            <motion.div key={game.phase} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-lg sm:px-5 sm:py-2.5">
              <span className="block truncate text-base font-black sm:text-xl" style={{ fontFamily: FONT, color: accent, textShadow: SHADOW_SM }}>
                {PHASE_LABELS[game.phase] ?? game.phase}
                {game.phase === 'clue_giving' && (
                  <span className="ml-2 text-xs text-white/55 sm:text-sm">
                    passage {(game.clue_pass ?? 0) + 1}/2
                  </span>
                )}
              </span>
            </motion.div>

            <div className="hidden min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 text-sm font-black backdrop-blur-lg sm:flex">
              <span className="text-emerald-300">C {game.civilian_wins ?? 0}</span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-rose-300">I {game.undercover_wins ?? 0}</span>
            </div>

            <div className="flex min-h-11 shrink-0 items-center rounded-2xl border border-white/10 bg-black/50 px-3 backdrop-blur-lg sm:px-4">
              <span className="text-base font-black sm:text-xl" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                {game.current_round}/{game.total_rounds > 90 ? '∞' : game.total_rounds}
              </span>
            </div>

            <button type="button" onClick={onEndGame} aria-label="Quitter Undercover"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/50 text-white/70 backdrop-blur-lg transition-colors hover:bg-red-500/20 hover:text-red-100">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {game.phase === 'discussion' && (
          <div className="relative z-10 mx-auto w-full max-w-[100rem] px-3 pb-2 sm:px-5">
            <TimerBar accent={accent} total={28} />
          </div>
        )}

        <div className={cn(
          'undercover-game-layout relative z-10 mx-auto grid w-full max-w-[100rem] min-h-0 flex-1 grid-cols-1 items-start gap-3 overflow-y-auto overflow-x-hidden px-3 pb-24 pt-1 overscroll-contain sm:gap-4 sm:px-5',
          'min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(20rem,27rem)] min-[1100px]:pb-6',
          isGameOver && 'undercover-game-layout--results',
        )}>
          <div className="undercover-player-board flex min-h-0 min-w-0 flex-col items-center rounded-[1.75rem] border border-white/10 bg-black/25 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-5">
          <div className="undercover-player-grid grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
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
                <div key={player.id} className={cn(
                  'flex min-w-0 w-full flex-col items-center justify-self-stretch gap-2 rounded-2xl border px-2.5 py-3 sm:gap-2.5 sm:px-3 sm:py-4',
                  isCurrent ? 'border-white/30 bg-white/10' : 'border-white/[.08] bg-black/20',
                  isSelected && 'border-red-300/55 bg-red-500/10',
                )}>
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
                      'relative aspect-square w-[clamp(5rem,24vw,9rem)] rounded-full flex items-center justify-center flex-shrink-0',
                      canVotePlayer && 'cursor-pointer',
                      isEliminated && 'opacity-40 grayscale',
                    )}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                        : isCurrent ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                        : isMe ? 'linear-gradient(135deg, var(--ink-text-dim), var(--ink-text-dim))'
                        : 'var(--ink-accent)',
                      border: '1px solid var(--ink-line)',
                      boxShadow: isCurrent ? `0 0 0 rgba(0,0,0,0), 0 0 20px ${accent}66` : '0 0 0 rgba(0,0,0,0)',
                    }}
                  >
                    {isEliminated ? <Skull className="w-14 h-14 text-white/70" /> :
                      av.type === 'image' && av.imageUrl ? <img src={av.imageUrl} alt="" className="h-[88%] w-[88%] rounded-full object-cover" /> :
                      <span className="text-4xl font-black text-white sm:text-5xl md:text-6xl" style={{ fontFamily: FONT }}>{player.player_name[0]?.toUpperCase()}</span>}
                    {isCurrent && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                        style={{ background: accent, border: '1px solid var(--ink-line)' }}>
                        💬
                      </motion.div>
                    )}
                    {isSelected && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 border-2 border-[var(--ink-line)] flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>

                  {/* Player name */}
                  <span className={cn('text-base md:text-lg font-black truncate max-w-full text-center',
                    isMe ? 'text-[var(--ink-text-dim)]' : 'text-white/90')}
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

        <aside className="undercover-control-panel min-w-0 space-y-4 rounded-[1.75rem] border border-white/10 bg-[#12091f]/90 p-4 shadow-2xl backdrop-blur-xl sm:p-5 min-[1100px]:sticky min-[1100px]:top-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-white/40">Console de mission</p>
              <h2 className="truncate text-xl font-black" style={{ color: accent }}>
                {PHASE_LABELS[game.phase] ?? 'Partie en cours'}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-white/55">
              {alivePlayers.length} en jeu
            </span>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">
              {error}
            </p>
          )}

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {TRANSITION_PHASES.has(game.phase) && (
                <motion.div key="transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
                  <p className="font-black text-white/75">Synchronisation de la table…</p>
                </motion.div>
              )}
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
                          style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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
                        maxLength={30} autoFocus enterKeyHint="send" onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                        className="min-w-0 flex-1 h-11 bg-black/50 text-center text-lg font-black text-white placeholder:text-white/30 rounded-2xl"
                        style={{ fontFamily: FONT, border: '1px solid var(--ink-line)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }} />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSubmitClue}
                        disabled={!clueInput.trim() || clueSubmitting}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
                        style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
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
                      style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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
                        style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)', border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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
                      onClick={() => { void nextRound(); setSelectedVote(null); }}
                      className="px-5 py-2.5 rounded-2xl font-black text-white"
                      style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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

                  <PodiumAd
                    gameMode="undercover"
                    instanceKey={`${game.id}:${game.current_round}:game-over`}
                  />

                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onEndGame}
                    className="px-5 py-2.5 rounded-2xl font-black text-white"
                    style={{ background: 'linear-gradient(180deg, #fbbf24, #d97706)', border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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
                style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '1px solid var(--ink-line)', boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 16px ${accent}44`, fontFamily: FONT, textShadow: SHADOW_SM }}>
                <Eye className="w-5 h-5" /> Voir mon mot
              </motion.button>
            </div>
          )}
        </aside>
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
              className="menu-screen-safe fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6"
              onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}>
              <motion.div initial={{ scale: 0.7, rotate: -5 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.7 }}
                transition={{ type: 'spring', damping: 14 }} onClick={(e) => e.stopPropagation()}
                className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl p-6 text-center sm:p-8"
                style={{ background: 'linear-gradient(180deg, #1a0d2e, #0f0820)', border: '1px solid var(--ink-line)', boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 40px ${accent}33` }}>
                <p className="text-xs uppercase tracking-widest text-white/40 font-black mb-4" style={{ fontFamily: FONT }}>🤫 Ton mot secret</p>
                {myPlayer?.role === 'mr_white' ? (
                  <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 px-4 py-5">
                    <p className="text-3xl font-black text-white" style={{ fontFamily: FONT }}>MR WHITE</p>
                    <p className="mt-2 text-sm font-bold text-white/55">Tu n’as aucun mot. Écoute les autres et improvise sans te faire repérer.</p>
                  </div>
                ) : myPlayer?.word ? (
                  <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                    className="text-4xl md:text-5xl font-black text-white break-words mb-6"
                    style={{ fontFamily: FONT, textShadow: `${SHADOW}, 0 0 20px ${accent}55` }}>
                    {myPlayer.word.toUpperCase()}
                  </motion.p>
                ) : (
                  <p className="mb-6 text-base font-black text-white/50" style={{ fontFamily: FONT }}>Mot en cours de synchronisation…</p>
                )}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowWordModal(false); if (game.phase === 'word_reveal' && !hasSeenWord) confirmWordSeen(); }}
                  className="w-full px-5 py-3 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none', fontFamily: FONT, textShadow: SHADOW_SM }}>
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
      className="menu-screen-safe fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 cursor-pointer"
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
        className="relative flex max-h-[calc(100dvh-2rem)] max-w-full flex-col items-center gap-3 overflow-y-auto rounded-3xl px-5 py-5 sm:gap-4 sm:px-8 sm:py-7"
        style={{
          background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
          border: '1px solid var(--ink-line)',
          boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 50px ${tint}66`,
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
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
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
            border: '1px solid var(--ink-line)',
            boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 30px ${tint}66`,
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
        border: `3px solid ${isWinner ? color : 'var(--ink-line)'}`,
        boxShadow: isWinner
          ? `0 0 0 rgba(0,0,0,0), 0 0 24px ${color}66`
          : '0 0 0 rgba(0,0,0,0)',
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
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}
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
      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
      <Timer className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'linear' }}
          style={{ background: urgent ? 'linear-gradient(90deg, #fbbf24, #ef4444)' : `linear-gradient(90deg, ${color}, ${color}88)` }} />
      </div>
      <span className={cn('text-lg font-black tabular-nums', urgent && 'text-red-400')}
        style={{ fontFamily: "'Outfit', sans-serif", textShadow: SHADOW_SM }}>
        {seconds}s
      </span>
    </div>
  );
};
