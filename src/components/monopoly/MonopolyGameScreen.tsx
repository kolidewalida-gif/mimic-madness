import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Dice5,
  Home,
  DollarSign,
  Building,
  Landmark,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Trophy,
  KeyRound,
  Scale,
  Zap,
  Crown,
} from 'lucide-react';
import { MonopolyBoard3DCanvas } from './MonopolyBoard3D';
import { MonopolyPlayerPanel } from './MonopolyPlayerPanel';
import { MonopolyPropertyPanel } from './MonopolyPropertyPanel';
import { MonopolyCardModal } from './MonopolyCardModal';
import { useMonopolyGame } from '@/hooks/useMonopolyGame';
import { useMonopolyAnimationQueue } from '@/hooks/useMonopolyAnimationQueue';
import { BOARD_SPACES, TOKEN_COLORS, type TokenType } from '@/lib/monopolyBoard';
import { playAudioForEvent } from '@/lib/monopolyAudioMap';
import type { PlayerTokenHopEvent } from './visual/PlayerToken';
import {
  InkGameStage,
  InkCard,
  InkButton,
  InkPhasePill,
  InkTitle,
  InkIconBadge,
  InkPill,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { cn } from '@/lib/utils';

const ACCENT = '#ec4899';
const ACCENT_2 = 'var(--ink-accent)';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Props {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

/* ============================================================
   Animated Dice — cartoon 3D rolling face
============================================================ */
const CartoonDice = ({ value, rolling }: { value: number; rolling: boolean }) => {
  return (
    <motion.div
      animate={
        rolling
          ? { rotate: [0, 360, 720, 1080], scale: [1, 1.15, 0.95, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: rolling ? 0.9 : 0.4, ease: 'easeOut' }}
      className="relative w-14 h-14 rounded-2xl flex items-center justify-center select-none"
      style={{
        background: 'linear-gradient(180deg, #fff 0%, #e2e8f0 100%)',
        border: '1px solid var(--ink-line)',
        boxShadow:
          'none',
      }}
    >
      <span
        className="text-3xl font-black leading-none"
        style={{
          fontFamily: "'Outfit', sans-serif",
          color: 'var(--ink-line)',
          textShadow: '0 0 0 rgba(0,0,0,0.15)',
        }}
      >
        {value}
      </span>
    </motion.div>
  );
};

/* ============================================================
   Money chip — animated cartoon counter
============================================================ */
const MoneyChip = ({
  amount,
  color = '#fbbf24',
  size = 'md',
}: {
  amount: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClass =
    size === 'lg'
      ? 'text-2xl px-4 py-2'
      : size === 'sm'
        ? 'text-base px-2.5 py-1'
        : 'text-xl px-3.5 py-1.5';
  return (
    <motion.div
      key={amount}
      initial={{ scale: 1.1, y: -2 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-2xl font-black leading-none',
        sizeClass,
      )}
      style={{
        background: `linear-gradient(180deg, ${color}, ${color}cc)`,
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
        color: 'white',
        fontFamily: "'Outfit', sans-serif",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      <DollarSign className="w-4 h-4" strokeWidth={3} />
      {amount}
    </motion.div>
  );
};

/* ============================================================
   MAIN SCREEN
============================================================ */
export const MonopolyGameScreen = ({
  currentPlayer,
  players,
  lobbyId,
  onEndGame,
}: Props) => {
  const [showProperties, setShowProperties] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);

  const {
    game,
    mPlayers,
    properties,
    currentCard,
    message,
    animatingTo,
    isMyTurn,
    currentTurnPlayer,
    myPlayer,
    rollDice,
    buyProperty,
    skipBuy,
    executeCard,
    buyHouse,
    mortgageProperty,
    useJailCard,
    payJailFine,
    declareBankruptcy,
    forceRestart,
  } = useMonopolyGame(lobbyId, currentPlayer, players);

  /* ----- Synchronized SFX on phase + dice changes ----- */
  // Phase-based UX cues: these are *not* diff-driven (no Supabase column
  // changes), they reflect local state-machine transitions the player
  // already sees in the UI. Diff-driven event audio (DICE_ROLL, PURCHASE,
  // PASS_GO, RENT_FLOW, etc.) is forwarded from `useMonopolyAnimationQueue`
  // via `playAudioForEvent` below.
  useEffect(() => {
    if (!game) return;
    if (game.phase === 'rolling' && isMyTurn) playInkSound('cartoonWobble', 0.35);
    else if (game.phase === 'bankrupt') playInkSound('cartoonZap', 0.5);
  }, [game?.phase, isMyTurn, game]);

  useEffect(() => {
    if (game?.last_dice_1 && game?.last_dice_2) {
      // Visual rolling window — sound is played via the diff-driven queue
      // when the snapshot changes (see queue forwarder below).
      setDiceRolling(true);
      const t = setTimeout(() => setDiceRolling(false), 900);
      return () => clearTimeout(t);
    }
  }, [game?.last_dice_1, game?.last_dice_2]);

  const turnPlayerColor = useMemo(() => {
    if (!currentTurnPlayer) return ACCENT;
    return TOKEN_COLORS[currentTurnPlayer.token_type as TokenType] || ACCENT;
  }, [currentTurnPlayer]);

  /* ============================================================
     ANIMATION QUEUE — diff-driven audio, FX, hop events
     The queue derives RenderEvent[] from prev/next snapshots and
     drives:
       - audio cues via `playAudioForEvent` (single source of truth)
       - per-player hop events forwarded to <PlayerToken>
       - whip-pan camera trigger on dice doubles
     The queue NEVER writes Supabase. `useMonopolyGame` stays the
     only writer (Req 13.4 / 14.1).
  ============================================================ */
  const queue = useMonopolyAnimationQueue(game ?? null, mPlayers, properties);

  // Per-player latest TOKEN_HOP — keyed by player_id so re-renders that
  // forward the same map reference are idempotent (the FSM dedupes by ts).
  const [hopEvents, setHopEvents] = useState<
    Record<string, PlayerTokenHopEvent | undefined>
  >({});

  // Per-tile pulse trigger — keyed by `property_index`, value is the
  // timestamp of the latest event. The property panel reads this map to
  // pulse its card glow on PURCHASE / BUILDING_GROW / MORTGAGE.
  const [pulsedTiles, setPulsedTiles] = useState<
    Record<number, number | undefined>
  >({});

  // Whip-pan trigger — bumped on every dice doubles event.
  const [whipPanTrigger, setWhipPanTrigger] = useState<{ ts: number } | null>(
    null,
  );

  // Drain the queue on every event batch: play audio, forward hop events,
  // bump whip-pan on doubles. We `consume(() => true)` so a single batch
  // is processed exactly once.
  useEffect(() => {
    if (queue.events.length === 0) return;
    const drained = queue.consume(() => true);
    if (drained.length === 0) return;

    const nextHops: Record<string, PlayerTokenHopEvent | undefined> = {};
    const nextPulses: Record<number, number> = {};
    let nextWhipPan: { ts: number } | null = null;
    const ts = Date.now();

    for (const ev of drained) {
      // 1) Audio — single canonical lookup.
      playAudioForEvent(ev);

      // 2) Token hops → forward to <PlayerToken>.
      if (ev.kind === 'TOKEN_HOP') {
        nextHops[ev.playerId] = {
          from: ev.from,
          to: ev.to,
          passedGo: ev.passedGo,
          ts,
        };
      }

      // 3) Per-tile pulse for property events.
      if (
        ev.kind === 'PURCHASE' ||
        ev.kind === 'BUILDING_GROW' ||
        ev.kind === 'MORTGAGE'
      ) {
        nextPulses[ev.tile] = ts;
      }

      // 4) Dice doubles → whip-pan.
      if (ev.kind === 'DICE_ROLL' && ev.doubles) {
        nextWhipPan = { ts };
      }
    }

    if (Object.keys(nextHops).length > 0) {
      setHopEvents((prev) => ({ ...prev, ...nextHops }));
    }
    if (Object.keys(nextPulses).length > 0) {
      setPulsedTiles((prev) => ({ ...prev, ...nextPulses }));
    }
    if (nextWhipPan !== null) {
      setWhipPanTrigger(nextWhipPan);
    }
  }, [queue]);

  const handleRoll = () => {
    playInkSound('cartoonBoing', 0.5);
    rollDice();
  };

  const handleBuy = () => {
    playInkSound('cartoonDing', 0.5);
    buyProperty();
  };

  const handleSkip = () => {
    playInkSound('inkClick', 0.3);
    skipBuy();
  };

  const handleCard = () => {
    playInkSound('cartoonSwoosh', 0.4);
    executeCard();
  };

  const handleBankrupt = () => {
    playInkSound('cartoonZap', 0.55);
    declareBankruptcy();
  };

  const handleJailCard = () => {
    playInkSound('cartoonDing', 0.4);
    useJailCard();
  };

  const handlePayJail = () => {
    playInkSound('cartoonPop', 0.4);
    payJailFine();
  };

  /* ----- Stuck-loading detection: show recovery button after 4s ----- */
  useEffect(() => {
    if (game && mPlayers.length > 0) {
      setStuckLoading(false);
      return;
    }
    const t = setTimeout(() => setStuckLoading(true), 4000);
    return () => clearTimeout(t);
  }, [game, mPlayers.length]);

  /* ============================================================
     LOADING
  ============================================================ */
  if (!game || mPlayers.length === 0) {
    return (
      <InkGameStage accent={ACCENT}>
        <div className="min-h-screen flex items-center justify-center px-6">
          <InkCard accent={ACCENT} className="p-8 text-center max-w-md w-full" highlighted>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                border: '1px solid var(--ink-line)',
                boxShadow: 'none',
              }}
            >
              <Landmark className="w-8 h-8 text-white" strokeWidth={2.5} />
            </motion.div>
            <InkTitle size="lg">PRÉPARATION</InkTitle>
            <p
              className="text-base text-white/70 mt-2 font-bold"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Le plateau se met en place...
            </p>

            {stuckLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 space-y-3"
              >
                <p
                  className="text-sm text-amber-300 font-bold"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  ⚠️ Ça prend trop longtemps...
                </p>
                <div className="flex gap-2 justify-center">
                  {currentPlayer.isHost && (
                    <InkButton
                      onClick={() => {
                        setStuckLoading(false);
                        forceRestart();
                      }}
                      color="#fbbf24"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      RELANCER
                    </InkButton>
                  )}
                  <InkButton onClick={onEndGame} color="#475569" variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4" />
                    QUITTER
                  </InkButton>
                </div>
              </motion.div>
            )}
          </InkCard>
        </div>
      </InkGameStage>
    );
  }

  /* ============================================================
     END SCREEN
  ============================================================ */
  if (game.is_finished) {
    const ranked = [...mPlayers].sort((a, b) => b.money - a.money);
    return (
      <InkGameStage accent="#fbbf24">
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 220 }}
            className="w-full max-w-md"
          >
            <InkCard accent="#fbbf24" highlighted className="p-7 text-center space-y-5">
              <motion.div
                animate={{ rotate: [-6, 6, -6], scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: '1px solid var(--ink-line)',
                  boxShadow: 'none',
                }}
              >
                <Trophy className="w-12 h-12 text-white" strokeWidth={2.5} />
              </motion.div>

              <InkTitle size="xl">VICTOIRE !</InkTitle>

              <p
                className="text-3xl font-black"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: '#fbbf24',
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                {game.winner_name}
              </p>

              <div className="space-y-2 pt-2">
                {ranked.map((p, i) => (
                  <motion.div
                    key={p.player_id}
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: '1px solid var(--ink-line)',
                      boxShadow: 'none',
                    }}
                  >
                    <span
                      className="text-2xl font-black"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        color: i === 0 ? '#fbbf24' : '#fff',
                        textShadow: GRAFFITI_TEXT_SHADOW_SM,
                      }}
                    >
                      #{i + 1}
                    </span>
                    {i === 0 && <Crown className="w-5 h-5 text-amber-400" fill="currentColor" />}
                    <span
                      className="flex-1 font-black text-lg text-white text-left truncate"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {p.player_name}
                    </span>
                    <MoneyChip amount={p.money} size="sm" />
                  </motion.div>
                ))}
              </div>

              <InkButton onClick={onEndGame} color="#fbbf24" size="lg" className="w-full">
                <ArrowLeft className="w-5 h-5" />
                RETOUR LOBBY
              </InkButton>
            </InkCard>
          </motion.div>
        </div>
      </InkGameStage>
    );
  }

  const currentSpace = myPlayer ? BOARD_SPACES[myPlayer.position] : null;

  /* ============================================================
     PHASE PILL CONFIG
  ============================================================ */
  const phaseInfo = (() => {
    if (game.phase === 'rolling') return { icon: Dice5, label: 'À LANCER', color: 'var(--ink-accent)' };
    if (game.phase === 'buying') return { icon: Home, label: 'À ACHETER', color: '#22c55e' };
    if (game.phase === 'card') return { icon: CreditCard, label: 'CARTE', color: 'var(--ink-text-dim)' };
    if (game.phase === 'bankrupt') return { icon: AlertTriangle, label: 'FAILLITE', color: '#ef4444' };
    if (myPlayer?.in_jail) return { icon: KeyRound, label: 'PRISON', color: '#f59e0b' };
    return { icon: Sparkles, label: 'EN JEU', color: ACCENT };
  })();

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <InkGameStage accent={turnPlayerColor}>
      {/* ============== HEADER ============== */}
      <header className="relative z-30 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <InkButton onClick={onEndGame} color="#475569" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4" />
          QUITTER
        </InkButton>

        <div className="flex flex-col items-center gap-1.5 pointer-events-none">
          <InkPhasePill
            icon={phaseInfo.icon}
            label={phaseInfo.label}
            accent={phaseInfo.color}
          />
          <h1
            className="text-3xl md:text-4xl font-black leading-none"
            style={{
              fontFamily: "'Outfit', sans-serif",
              color: '#fff',
              textShadow: GRAFFITI_TEXT_SHADOW,
            }}
          >
            MIMIC<span style={{ color: '#fbbf24' }}>POLY</span>
          </h1>
        </div>

        <InkButton
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowProperties((s) => !s);
          }}
          color={ACCENT_2}
          size="sm"
        >
          <Building className="w-4 h-4" />
          <span className="hidden sm:inline">PROP.</span>
        </InkButton>
      </header>

      {/* ============== MAIN ============== */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 px-4 md:px-6 pb-6 max-w-[1800px] mx-auto w-full">
        {/* LEFT — PLAYERS */}
        <aside className="lg:w-72 flex-shrink-0">
          <MonopolyPlayerPanel
            players={mPlayers}
            currentTurnPlayerId={game.player_order[game.current_player_index]}
            currentPlayerId={currentPlayer.id}
            properties={properties}
          />
        </aside>

        {/* CENTER — BOARD + ACTIONS */}
        <section className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="relative">
            <MonopolyBoard3DCanvas
              players={mPlayers}
              properties={properties}
              lastDice1={game.last_dice_1}
              lastDice2={game.last_dice_2}
              animatingTo={animatingTo}
              currentPlayerId={game.player_order[game.current_player_index]}
              hopEvents={hopEvents}
              whipPanTrigger={whipPanTrigger}
            />
            {/* Money pot floating badge */}
            {game.free_parking_pot > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: -8 }}
                className="absolute top-3 left-3 z-20"
              >
                <div
                  className="px-3 py-1.5 rounded-2xl"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                    border: '1px solid var(--ink-line)',
                    boxShadow: 'none',
                    transform: 'rotate(-4deg)',
                  }}
                >
                  <span
                    className="text-sm font-black text-white uppercase tracking-wider"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: GRAFFITI_TEXT_SHADOW_SM,
                    }}
                  >
                    🅿️ POT: {game.free_parking_pot}$
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* ACTION CARD */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${message}-${game.phase}-${game.current_player_index}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 18, stiffness: 280 }}
            >
              <InkCard accent={turnPlayerColor} highlighted={isMyTurn} className="p-4 md:p-5">
                <div className="flex flex-col gap-4">
                  {/* TURN HEADER */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={isMyTurn ? { scale: [1, 1.12, 1] } : undefined}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <InkIconBadge
                          icon={isMyTurn ? Zap : Sparkles}
                          color={turnPlayerColor}
                          size="md"
                          wobble={isMyTurn}
                        />
                      </motion.div>
                      <div>
                        <p
                          className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none"
                          style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                          {isMyTurn ? 'TON TOUR' : 'TOUR DE'}
                        </p>
                        <p
                          className="text-2xl md:text-3xl font-black leading-none mt-1 truncate max-w-[260px]"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            color: turnPlayerColor,
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {isMyTurn ? 'À TOI DE JOUER !' : currentTurnPlayer?.player_name}
                        </p>
                      </div>
                    </div>

                    {myPlayer && (
                      <div className="flex items-center gap-2">
                        <MoneyChip amount={myPlayer.money} color="#22c55e" size="md" />
                        {myPlayer.has_get_out_of_jail_card > 0 && (
                          <InkPill label="🎫" value={`x${myPlayer.has_get_out_of_jail_card}`} color="var(--ink-text-dim)" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* MESSAGE */}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-4 py-3 rounded-2xl text-center"
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--ink-line)',
                      }}
                    >
                      <p
                        className="text-lg md:text-xl font-black text-white leading-tight"
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        {message}
                      </p>
                    </motion.div>
                  )}

                  {/* DICE DISPLAY */}
                  {game.last_dice_1 != null && game.last_dice_2 != null && (
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <CartoonDice value={game.last_dice_1} rolling={diceRolling} />
                      <span
                        className="text-2xl font-black text-white/40"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        +
                      </span>
                      <CartoonDice value={game.last_dice_2} rolling={diceRolling} />
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-black ml-2"
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          color: '#fbbf24',
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        = {game.last_dice_1 + game.last_dice_2}
                      </motion.span>
                      {game.last_dice_1 === game.last_dice_2 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: -6 }}
                          transition={{ type: 'spring', stiffness: 350 }}
                          className="px-3 py-1 rounded-2xl ml-1"
                          style={{
                            background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                            border: '1px solid var(--ink-line)',
                            boxShadow: 'none',
                          }}
                        >
                          <span
                            className="text-base font-black text-white uppercase tracking-wider"
                            style={{
                              fontFamily: "'Outfit', sans-serif",
                              textShadow: GRAFFITI_TEXT_SHADOW_SM,
                            }}
                          >
                            DOUBLE !
                          </span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* ACTIONS */}
                  {isMyTurn && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 justify-center"
                    >
                      {/* Rolling phase (free) */}
                      {game.phase === 'rolling' && !myPlayer?.in_jail && (
                        <InkButton onClick={handleRoll} color="var(--ink-accent)" size="lg">
                          <Dice5 className="w-5 h-5" />
                          LANCER LES DÉS
                        </InkButton>
                      )}

                      {/* Jail phase */}
                      {game.phase === 'rolling' && myPlayer?.in_jail && (
                        <>
                          <InkButton onClick={handleRoll} color="#f59e0b" size="md">
                            <Dice5 className="w-4 h-4" />
                            TENTER DOUBLE
                          </InkButton>
                          {myPlayer.money >= 50 && (
                            <InkButton onClick={handlePayJail} color="#22c55e" size="md">
                              <DollarSign className="w-4 h-4" />
                              PAYER 50$
                            </InkButton>
                          )}
                          {myPlayer.has_get_out_of_jail_card > 0 && (
                            <InkButton onClick={handleJailCard} color="var(--ink-text-dim)" size="md">
                              <KeyRound className="w-4 h-4" />
                              CARTE SORTIE
                            </InkButton>
                          )}
                        </>
                      )}

                      {/* Buying phase */}
                      {game.phase === 'buying' && currentSpace && (
                        <>
                          <InkButton onClick={handleBuy} color="#22c55e" size="lg">
                            <Home className="w-5 h-5" />
                            ACHETER {currentSpace.price}$
                          </InkButton>
                          <InkButton onClick={handleSkip} color="#475569" variant="outline" size="md">
                            PASSER
                          </InkButton>
                        </>
                      )}

                      {/* Card phase */}
                      {game.phase === 'card' && (
                        <InkButton onClick={handleCard} color="var(--ink-text-dim)" size="lg">
                          <Sparkles className="w-5 h-5" />
                          CONTINUER
                        </InkButton>
                      )}

                      {/* Bankrupt */}
                      {(game.phase === 'bankrupt' || (myPlayer && myPlayer.money < 0)) && (
                        <InkButton onClick={handleBankrupt} color="#ef4444" size="lg">
                          <AlertTriangle className="w-5 h-5" />
                          DÉCLARER FAILLITE
                        </InkButton>
                      )}
                    </motion.div>
                  )}

                  {/* Waiting indicator (not my turn) */}
                  {!isMyTurn && (
                    <div className="flex items-center justify-center gap-2 text-white/50">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: turnPlayerColor }}
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: turnPlayerColor }}
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: turnPlayerColor }}
                      />
                      <span
                        className="text-base font-bold ml-2"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                      >
                        En attente du joueur...
                      </span>
                    </div>
                  )}
                </div>
              </InkCard>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* RIGHT — PROPERTIES */}
        <AnimatePresence>
          {showProperties && (
            <motion.aside
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 18, stiffness: 220 }}
              className="lg:w-80 flex-shrink-0"
            >
              <MonopolyPropertyPanel
                properties={properties}
                myPlayerId={currentPlayer.id}
                myMoney={myPlayer?.money || 0}
                onBuyHouse={buyHouse}
                onMortgage={mortgageProperty}
                isMyTurn={isMyTurn}
                pulsedTiles={pulsedTiles}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* CARD MODAL */}
      {currentCard && game.phase === 'card' && (
        <MonopolyCardModal card={currentCard} onClose={handleCard} isMyTurn={isMyTurn} />
      )}
    </InkGameStage>
  );
};
