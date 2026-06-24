import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, Trophy, Check, X, Crown, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import InkReveal from '@/components/ui/ink-reveal';
import {
  makeRound, scoreFor, GRID,
  MEMORISE_ROUNDS, MEMORISE_MEMO_MS, MEMORISE_ANSWER_MS, MEMORISE_REVEAL_MS,
} from '@/lib/memoriseRounds';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
}
interface MemoriseGameScreenProps {
  currentPlayer: Player;
  players: Player[];
  lobbyId: string;
  onEndGame: () => void;
}

type Phase = 'intro' | 'memorize' | 'question' | 'reveal' | 'final';

interface PhasePayload {
  phase: Phase;
  roundIndex: number;
  seed?: number;
  deadline?: number;
  scoreboard?: Record<string, number>;
  roundPoints?: Record<string, number>;
  answerIndex?: number;
}

export const MemoriseGameScreen = ({ currentPlayer, players, lobbyId, onEndGame }: MemoriseGameScreenProps) => {
  const isHost = currentPlayer.isHost;

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [seed, setSeed] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [scoreboard, setScoreboard] = useState<Record<string, number>>({});
  const [roundPoints, setRoundPoints] = useState<Record<string, number>>({});
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answersRef = useRef<Record<string, { choice: number; elapsed: number }>>({});
  const scoreRef = useRef<Record<string, number>>({});
  const playersRef = useRef<Player[]>(players);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => { playersRef.current = players; }, [players]);

  const round = useMemo(() => (seed != null ? makeRound(seed) : null), [seed]);

  const namesById = useMemo(() => {
    const m: Record<string, string> = {};
    players.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [players]);

  /* ---------- countdown ticker ---------- */
  useEffect(() => {
    if ((phase !== 'memorize' && phase !== 'question') || !deadline) { setSecondsLeft(0); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [phase, deadline]);

  /* ---------- apply a phase payload (everyone) ---------- */
  const applyPhase = useCallback((p: PhasePayload) => {
    setPhase(p.phase);
    setRoundIndex(p.roundIndex);
    if (p.seed != null) setSeed(p.seed);
    setDeadline(p.deadline ?? null);
    if (p.scoreboard) { setScoreboard(p.scoreboard); scoreRef.current = p.scoreboard; }
    if (p.roundPoints) setRoundPoints(p.roundPoints);
    setAnswerIndex(p.answerIndex ?? null);
    if (p.phase === 'question') setMyChoice(null);
    if (p.phase === 'memorize') playSoundEffect('quizReveal', 0.4);
    if (p.phase === 'reveal') playSoundEffect('start', 0.35);
  }, []);

  /* ---------- channel ---------- */
  useEffect(() => {
    const channel = supabase.channel(`memorise:${lobbyId}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'phase' }, ({ payload }) => applyPhase(payload as PhasePayload))
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        const a = payload as { playerId: string; choice: number; elapsed: number };
        if (!answersRef.current[a.playerId]) {
          answersRef.current[a.playerId] = { choice: a.choice, elapsed: a.elapsed };
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isHost && !startedRef.current) {
          startedRef.current = true;
          setTimeout(() => runRound(0), 600);
        }
      });

    return () => {
      mountedRef.current = false;
      cleanups.current.forEach((fn) => fn());
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  const broadcastPhase = useCallback((payload: PhasePayload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'phase', payload });
  }, []);

  const wait = (ms: number) => new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    cleanups.current.push(() => clearTimeout(t));
  });

  const waitForAnswers = (target: number, ms: number) => new Promise<void>((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (Object.keys(answersRef.current).length >= target || Date.now() - start >= ms) {
        clearInterval(iv);
        resolve();
      }
    }, 250);
    cleanups.current.push(() => clearInterval(iv));
  });

  /* ---------- host game loop ---------- */
  const runRound = useCallback(async (i: number) => {
    if (!mountedRef.current) return;
    const roundSeed = Math.floor(Math.random() * 1_000_000_000) + i * 7919;

    // MEMORIZE
    broadcastPhase({ phase: 'memorize', roundIndex: i, seed: roundSeed, deadline: Date.now() + MEMORISE_MEMO_MS });
    await wait(MEMORISE_MEMO_MS);
    if (!mountedRef.current) return;

    // QUESTION
    answersRef.current = {};
    const qStart = Date.now();
    broadcastPhase({ phase: 'question', roundIndex: i, seed: roundSeed, deadline: qStart + MEMORISE_ANSWER_MS });
    const connected = playersRef.current.filter((p) => !p.isDisconnected).length || 1;
    await waitForAnswers(connected, MEMORISE_ANSWER_MS);
    if (!mountedRef.current) return;

    // SCORE
    const r = makeRound(roundSeed);
    const ansIdx = r.question.answerIndex;
    const rp: Record<string, number> = {};
    Object.entries(answersRef.current).forEach(([pid, a]) => {
      const pts = scoreFor(a.choice === ansIdx, a.elapsed);
      rp[pid] = pts;
      scoreRef.current[pid] = (scoreRef.current[pid] || 0) + pts;
    });

    // REVEAL
    broadcastPhase({ phase: 'reveal', roundIndex: i, seed: roundSeed, scoreboard: { ...scoreRef.current }, roundPoints: rp, answerIndex: ansIdx });
    await wait(MEMORISE_REVEAL_MS);
    if (!mountedRef.current) return;

    if (i + 1 < MEMORISE_ROUNDS) runRound(i + 1);
    else broadcastPhase({ phase: 'final', roundIndex: i, scoreboard: { ...scoreRef.current } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastPhase]);

  /* ---------- answering ---------- */
  const answer = (choice: number) => {
    if (phase !== 'question' || myChoice != null || !deadline) return;
    playSoundEffect('click', 0.3);
    setMyChoice(choice);
    const elapsed = Date.now() - (deadline - MEMORISE_ANSWER_MS);
    channelRef.current?.send({
      type: 'broadcast', event: 'answer',
      payload: { playerId: currentPlayer.id, choice, elapsed },
    });
  };

  const ranked = useMemo(
    () => Object.entries(scoreboard)
      .map(([id, pts]) => ({ id, pts, name: namesById[id] || 'Joueur' }))
      .sort((a, b) => b.pts - a.pts),
    [scoreboard, namesById],
  );

  /* ============================================================ */
  return (
    <div className="h-screen w-full flex flex-col items-center text-white relative overflow-hidden bg-gradient-to-b from-[#1a0d2e] via-[#140a24] to-[#0c0618]">
      {/* glow */}
      <div className="absolute -top-1/4 left-1/4 w-[55vw] h-[55vw] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[45vw] h-[45vw] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />

      {/* header */}
      <div className="relative z-10 w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-700" style={{ boxShadow: '0 0 18px rgba(168,85,247,0.5)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none">Memorise</h1>
            <p className="text-xs text-white/50">Mémorise puis réponds vite !</p>
          </div>
        </div>
        {phase !== 'final' && phase !== 'intro' && (
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold">
            Round {roundIndex + 1}/{MEMORISE_ROUNDS}
          </div>
        )}
        <button onClick={onEndGame} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/15">
          <LogOut className="w-4 h-4" /><span className="text-sm font-bold hidden sm:inline">Quitter</span>
        </button>
      </div>

      {/* body */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4 min-h-0">
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-white/70">Préparation des images…</p>
            </motion.div>
          )}

          {/* MEMORIZE */}
          {phase === 'memorize' && round && (
            <motion.div key={`memo-${roundIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-amber-300 font-black text-lg">
                <Clock className="w-5 h-5" /> Mémorise — {secondsLeft}s
              </div>
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{ width: 'min(82vw, 460px)', height: 'min(82vw, 460px)', border: '3px solid rgba(168,85,247,0.4)', boxShadow: '0 20px 60px rgba(124,58,237,0.4)' }}
              >
                <div
                  className="absolute inset-0 grid p-3 gap-2 bg-gradient-to-br from-[#241338] to-[#160a26]"
                  style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
                >
                  {round.board.map((emoji, i) => (
                    <div key={i} className="flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10" style={{ fontSize: 'clamp(28px, 9vw, 56px)' }}>
                      {emoji}
                    </div>
                  ))}
                </div>
                <InkReveal key={`ink-${roundIndex}`} durationMs={2000} />
              </div>
              <p className="text-sm text-white/45">Retiens bien la position et le nombre de chaque symbole !</p>
            </motion.div>
          )}

          {/* QUESTION */}
          {phase === 'question' && round && (
            <motion.div key={`q-${roundIndex}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-lg flex flex-col items-center gap-5">
              <div className="flex items-center gap-2 text-cyan-300 font-black text-lg">
                <Clock className="w-5 h-5" /> {secondsLeft}s
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-center">{round.question.text}</h2>
              <div className="grid grid-cols-2 gap-3 w-full">
                {round.question.options.map((opt, i) => {
                  const selected = myChoice === i;
                  return (
                    <motion.button
                      key={i}
                      whileHover={myChoice == null ? { scale: 1.03 } : undefined}
                      whileTap={myChoice == null ? { scale: 0.97 } : undefined}
                      onClick={() => answer(i)}
                      disabled={myChoice != null}
                      className={cn(
                        'py-5 rounded-2xl text-3xl font-black border-2 transition-all',
                        selected ? 'border-purple-400 bg-purple-500/30' : 'border-white/10 bg-white/[0.04] hover:border-purple-400/40',
                        myChoice != null && !selected && 'opacity-50',
                      )}
                    >
                      {opt}
                    </motion.button>
                  );
                })}
              </div>
              {myChoice != null && <p className="text-sm text-white/50">Réponse envoyée ! En attente des autres…</p>}
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && round && (
            <motion.div key={`r-${roundIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-lg flex flex-col items-center gap-4">
              <p className="text-lg font-bold text-white/70">{round.question.text}</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                {round.question.options.map((opt, i) => {
                  const correct = i === answerIndex;
                  const mine = i === myChoice;
                  return (
                    <div key={i} className={cn('relative py-5 rounded-2xl text-3xl font-black border-2 text-center', correct ? 'border-emerald-400 bg-emerald-500/25' : mine ? 'border-rose-400 bg-rose-500/20' : 'border-white/10 bg-white/[0.03] opacity-60')}>
                      {opt}
                      {correct && <Check className="absolute top-2 right-2 w-5 h-5 text-emerald-300" />}
                      {mine && !correct && <X className="absolute top-2 right-2 w-5 h-5 text-rose-300" />}
                    </div>
                  );
                })}
              </div>
              {roundPoints[currentPlayer.id] != null && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
                  className={cn('px-4 py-2 rounded-full font-black text-lg', roundPoints[currentPlayer.id] > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/50')}>
                  {roundPoints[currentPlayer.id] > 0 ? `+${roundPoints[currentPlayer.id]} pts !` : 'Pas de points'}
                </motion.div>
              )}
              <MiniBoard board={round.board} />
            </motion.div>
          )}

          {/* FINAL */}
          {phase === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md flex flex-col items-center gap-5">
              <Trophy className="w-14 h-14 text-amber-400" />
              <h2 className="text-4xl font-black">Classement final</h2>
              <div className="w-full space-y-2">
                {ranked.map((p, i) => (
                  <div key={p.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border', i === 0 ? 'border-amber-400/60 bg-amber-500/15' : 'border-white/10 bg-white/[0.04]')}>
                    <span className="text-xl font-black w-7 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                    <span className="flex-1 font-bold truncate">{p.name}{p.id === currentPlayer.id ? ' (toi)' : ''}</span>
                    <span className="font-black text-amber-300">{p.pts} pts</span>
                  </div>
                ))}
                {ranked.length === 0 && <p className="text-center text-white/50">Aucun score</p>}
              </div>
              <button onClick={onEndGame} className="mt-2 px-8 py-3 rounded-2xl font-black text-lg bg-gradient-to-r from-purple-500 to-violet-700 hover:brightness-110" style={{ boxShadow: '0 8px 24px rgba(168,85,247,0.5)' }}>
                Retour au lobby
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* live scoreboard strip (memorize/question/reveal) */}
      {(phase === 'memorize' || phase === 'question' || phase === 'reveal') && ranked.length > 0 && (
        <div className="relative z-10 w-full max-w-2xl px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            {ranked.slice(0, 6).map((p, i) => (
              <div key={p.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />}
                <span className="text-sm font-bold truncate max-w-[90px]">{p.name}</span>
                <span className="text-sm font-black text-purple-300">{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MiniBoard = ({ board }: { board: string[] }) => (
  <div className="grid p-2 gap-1 rounded-2xl bg-white/[0.04] border border-white/10" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
    {board.map((e, i) => (
      <div key={i} className="w-9 h-9 flex items-center justify-center text-xl">{e}</div>
    ))}
  </div>
);
