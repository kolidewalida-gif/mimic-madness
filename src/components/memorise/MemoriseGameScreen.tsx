import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Clock, Trophy, Check, X, Crown, Loader2, LogOut, Volume2, VolumeX, Disc3, Play, Flame, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import {
  makeRound, makePlaylist, trackById, scoreFor, CATEGORY_META,
  BLINDTEST_ROUNDS, BLINDTEST_LISTEN_MS, BLINDTEST_REVEAL_MS,
} from '@/lib/blindtestTracks';
import { parseYouTubeId, youtubeThumb } from '@/lib/youtube';
import { YouTubeBlindtestPlayer, type YTBlindtestHandle } from './YouTubeBlindtestPlayer';

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

type Phase = 'intro' | 'listen' | 'reveal' | 'final';

interface PhasePayload {
  phase: Phase;
  roundIndex: number;
  totalRounds?: number;
  trackId?: string;
  optionIds?: string[];
  deadline?: number;
  scoreboard?: Record<string, number>;
  roundPoints?: Record<string, number>;
  answerIndex?: number;
}

export const MemoriseGameScreen = ({ currentPlayer, players, lobbyId, onEndGame }: MemoriseGameScreenProps) => {
  const isHost = currentPlayer.isHost;

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds, setTotalRounds] = useState(BLINDTEST_ROUNDS);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [scoreboard, setScoreboard] = useState<Record<string, number>>({});
  const [roundPoints, setRoundPoints] = useState<Record<string, number>>({});
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [volume, setVolume] = useState(70);
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [myStreak, setMyStreak] = useState(0);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answersRef = useRef<Record<string, { choice: number; elapsed: number }>>({});
  const scoreRef = useRef<Record<string, number>>({});
  const streakRef = useRef<Record<string, number>>({});
  const playersRef = useRef<Player[]>(players);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const badRef = useRef<Set<string>>(new Set());
  const currentTidRef = useRef<string | null>(null);
  const errorFlagRef = useRef(false);
  const saltRef = useRef(0);
  const cleanups = useRef<Array<() => void>>([]);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<YTBlindtestHandle | null>(null);
  const tickRef = useRef(0);

  useEffect(() => { playersRef.current = players; }, [players]);

  const track = useMemo(() => (trackId ? trackById(trackId) : undefined), [trackId]);
  const catMeta = track ? CATEGORY_META[track.category] : null;
  const muted = volume === 0;

  const namesById = useMemo(() => {
    const m: Record<string, string> = {};
    players.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [players]);

  /* ---------- media playback ---------- */
  const stopMedia = useCallback(() => {
    try { mediaRef.current?.pause(); } catch { /* noop */ }
    try { ytRef.current?.stop(); } catch { /* noop */ }
  }, []);

  const playTrack = useCallback((tid: string) => {
    const t = trackById(tid);
    if (!t) return;
    setMediaError(false);

    const ytId = t.youtubeId ? parseYouTubeId(t.youtubeId) : null;
    if (ytId) {
      try { mediaRef.current?.pause(); } catch { /* noop */ }
      setNeedsSoundUnlock(true); // cleared by onPlayingChange once it really plays
      ytRef.current?.setVolume(volume);
      ytRef.current?.load(ytId, t.clipStart ?? 0);
      return;
    }

    const v = mediaRef.current;
    if (!v || !t.src) return;
    try { ytRef.current?.stop(); } catch { /* noop */ }
    try {
      v.src = t.src;
      v.currentTime = 0;
      v.muted = muted;
      v.volume = volume / 100;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setNeedsSoundUnlock(false);
          if (t.clipStart) { try { v.currentTime = t.clipStart; } catch { /* noop */ } }
        }).catch(() => setNeedsSoundUnlock(true));
      }
    } catch {
      setNeedsSoundUnlock(true);
    }
  }, [volume, muted]);

  const resumeSound = useCallback(() => {
    const t = trackId ? trackById(trackId) : null;
    if (!t) return;
    const ytId = t.youtubeId ? parseYouTubeId(t.youtubeId) : null;
    if (ytId) {
      ytRef.current?.setVolume(volume > 0 ? volume : 70);
      ytRef.current?.play();
    } else {
      playTrack(t.id);
    }
  }, [trackId, volume, playTrack]);

  // apply volume to both players live
  useEffect(() => {
    if (mediaRef.current) { mediaRef.current.muted = muted; mediaRef.current.volume = volume / 100; }
    ytRef.current?.setVolume(volume);
  }, [volume, muted]);

  /* ---------- countdown ticker + urgency tick ---------- */
  useEffect(() => {
    if (phase !== 'listen' || !deadline) { setSecondsLeft(0); return; }
    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 5 && s > 0 && s !== tickRef.current && myChoice == null) {
        tickRef.current = s;
        playSoundEffect('countdown', 0.25);
      }
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [phase, deadline, myChoice]);

  /* ---------- apply a phase payload (everyone) ---------- */
  const applyPhase = useCallback((p: PhasePayload) => {
    setPhase(p.phase);
    setRoundIndex(p.roundIndex);
    if (p.totalRounds != null) setTotalRounds(p.totalRounds);
    if (p.trackId != null) setTrackId(p.trackId);
    if (p.optionIds) setOptionIds(p.optionIds);
    setDeadline(p.deadline ?? null);
    if (p.scoreboard) { setScoreboard(p.scoreboard); scoreRef.current = p.scoreboard; }
    if (p.roundPoints) {
      setRoundPoints(p.roundPoints);
      // local streak for the current player (visual only)
      const got = (p.roundPoints[currentPlayer.id] ?? 0) > 0;
      setMyStreak((s) => (got ? s + 1 : 0));
    }
    setAnswerIndex(p.answerIndex ?? null);

    if (p.phase === 'listen') {
      setMyChoice(null);
      setAnsweredCount(0);
      answersRef.current = {};
      tickRef.current = 0;
      if (p.trackId) { playSoundEffect('quizReveal', 0.3); playTrack(p.trackId); }
    }
    if (p.phase === 'reveal') { playSoundEffect('start', 0.35); }
    if (p.phase === 'final') stopMedia();
  }, [playTrack, stopMedia, currentPlayer.id]);

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
          setAnsweredCount(Object.keys(answersRef.current).length);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isHost && !startedRef.current) {
          startedRef.current = true;
          const seed = Math.floor(Math.random() * 1_000_000_000);
          const q = makePlaylist(seed, 999);
          queueRef.current = [...q];
          const total = Math.max(1, Math.min(BLINDTEST_ROUNDS, q.length));
          setTimeout(() => runRound(0, seed, total), 700);
        }
      });

    return () => {
      mountedRef.current = false;
      cleanups.current.forEach((fn) => fn());
      stopMedia();
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

  /** Resolve when everyone answered, time is up, OR the host's video errored. */
  const waitListen = (target: number, ms: number) => new Promise<'done' | 'error'>((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (errorFlagRef.current) { clearInterval(iv); resolve('error'); }
      else if (Object.keys(answersRef.current).length >= target || Date.now() - start >= ms) {
        clearInterval(iv); resolve('done');
      }
    }, 200);
    cleanups.current.push(() => clearInterval(iv));
  });

  /* ---------- host game loop (resilient: auto-skips unplayable videos) ---------- */
  const runRound = useCallback(async (i: number, seed: number, total: number) => {
    if (!mountedRef.current) return;

    // pick the next non-bad track from the queue
    let tid: string | undefined;
    while (queueRef.current.length) {
      const cand = queueRef.current.shift()!;
      if (!badRef.current.has(cand)) { tid = cand; break; }
    }
    if (!tid) { broadcastPhase({ phase: 'final', roundIndex: i, scoreboard: { ...scoreRef.current } }); return; }

    const r = makeRound(tid, seed + i * 7919 + 13 + saltRef.current);
    if (!r) { runRound(i, seed, total); return; }

    // LISTEN
    answersRef.current = {};
    currentTidRef.current = tid;
    errorFlagRef.current = false;
    broadcastPhase({
      phase: 'listen', roundIndex: i, totalRounds: total,
      trackId: tid, optionIds: r.optionIds,
      deadline: Date.now() + BLINDTEST_LISTEN_MS,
    });
    const connected = playersRef.current.filter((p) => !p.isDisconnected).length || 1;
    const reason = await waitListen(connected, BLINDTEST_LISTEN_MS);
    if (!mountedRef.current) return;

    if (reason === 'error') {
      // video can't be embedded/played — drop it and retry the same round slot
      badRef.current.add(tid);
      saltRef.current += 101;
      await wait(300);
      runRound(i, seed, total);
      return;
    }

    // SCORE (speed + streak bonus)
    const ansIdx = r.answerIndex;
    const rp: Record<string, number> = {};
    Object.entries(answersRef.current).forEach(([pid, a]) => {
      const correct = a.choice === ansIdx;
      if (correct) {
        streakRef.current[pid] = (streakRef.current[pid] || 0) + 1;
        const bonus = streakRef.current[pid] >= 2 ? Math.min(streakRef.current[pid], 6) * 40 : 0;
        rp[pid] = scoreFor(true, a.elapsed) + bonus;
      } else {
        streakRef.current[pid] = 0;
        rp[pid] = 0;
      }
      scoreRef.current[pid] = (scoreRef.current[pid] || 0) + rp[pid];
    });

    // REVEAL
    broadcastPhase({
      phase: 'reveal', roundIndex: i, totalRounds: total, trackId: tid, optionIds: r.optionIds,
      scoreboard: { ...scoreRef.current }, roundPoints: rp, answerIndex: ansIdx,
    });
    await wait(BLINDTEST_REVEAL_MS);
    if (!mountedRef.current) return;

    if (i + 1 < total) runRound(i + 1, seed, total);
    else broadcastPhase({ phase: 'final', roundIndex: i, scoreboard: { ...scoreRef.current } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastPhase]);

  /* ---------- YouTube player events ---------- */
  const handleYtPlaying = useCallback((playing: boolean) => {
    if (playing) { setNeedsSoundUnlock(false); setMediaError(false); }
  }, []);
  const handleYtError = useCallback(() => {
    setMediaError(true);
    if (isHost) errorFlagRef.current = true; // host skips this track
  }, [isHost]);

  /* ---------- answering ---------- */
  const answer = (choice: number) => {
    if (phase !== 'listen' || myChoice != null || !deadline) return;
    playSoundEffect('click', 0.3);
    setMyChoice(choice);
    const elapsed = Date.now() - (deadline - BLINDTEST_LISTEN_MS);
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

  const progress = phase === 'listen' && deadline
    ? Math.max(0, Math.min(1, (deadline - Date.now()) / BLINDTEST_LISTEN_MS))
    : 0;
  const urgent = phase === 'listen' && secondsLeft <= 5 && secondsLeft > 0 && myChoice == null;
  const connectedCount = players.filter((p) => !p.isDisconnected).length || players.length;

  const optionTracks = optionIds.map((id) => trackById(id));
  const revealYtId = track?.youtubeId ? parseYouTubeId(track.youtubeId) : null;
  const coverUrl = track?.cover || (revealYtId ? youtubeThumb(revealYtId) : undefined);

  /* ============================================================ */
  return (
    <div className="h-screen w-full flex flex-col items-center text-white relative overflow-hidden bg-gradient-to-b from-[#1a0d2e] via-[#140a24] to-[#0c0618]">
      <video ref={mediaRef} className="hidden" playsInline preload="auto" />
      <YouTubeBlindtestPlayer ref={ytRef} defaultVolume={volume} onPlayingChange={handleYtPlaying} onError={handleYtError} />

      {/* glow */}
      <div className="absolute -top-1/4 left-1/4 w-[55vw] h-[55vw] rounded-full bg-fuchsia-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[45vw] h-[45vw] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />

      {/* header */}
      <div className="relative z-10 w-full flex items-center justify-between px-5 py-4 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-fuchsia-500 to-purple-700 flex-shrink-0" style={{ boxShadow: '0 0 18px rgba(217,70,239,0.5)' }}>
            <Music className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-none truncate">Blindtest Musical</h1>
            <p className="text-xs text-white/50 truncate">Devine l’anime, le dessin animé ou la musique !</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {phase !== 'final' && phase !== 'intro' && (
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold">
              {roundIndex + 1}/{totalRounds}
            </div>
          )}
          {/* volume */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white/5 border border-white/10">
            <button onClick={() => setVolume((v) => (v === 0 ? 70 : 0))} className="text-white/70 hover:text-white" aria-label="Son">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range" min={0} max={100} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-fuchsia-400 cursor-pointer"
              aria-label="Volume"
            />
          </div>
          <button onClick={() => setVolume((v) => (v === 0 ? 70 : 0))} className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white/70" aria-label="Son">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onEndGame} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-rose-500/15">
            <LogOut className="w-4 h-4" /><span className="text-sm font-bold hidden sm:inline">Quitter</span>
          </button>
        </div>
      </div>

      {/* body */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4 min-h-0">
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-fuchsia-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-white/70">Préparation de la playlist…</p>
            </motion.div>
          )}

          {/* LISTEN */}
          {phase === 'listen' && track && (
            <motion.div key={`listen-${roundIndex}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-lg flex flex-col items-center gap-5">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <div className={cn('flex items-center gap-2 font-black text-lg', urgent ? 'text-rose-400' : 'text-cyan-300')}>
                  <Clock className="w-5 h-5" /> {secondsLeft}s
                </div>
                {catMeta && (
                  <span className="px-3 py-1 rounded-full text-sm font-bold border" style={{ borderColor: `${catMeta.color}66`, background: `${catMeta.color}1f`, color: catMeta.color }}>
                    {catMeta.emoji} {catMeta.label}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-white/5 border border-white/10 text-white/70">
                  {answeredCount}/{connectedCount} ont répondu
                </span>
              </div>

              {/* mystery vinyl + progress ring + equalizer */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke={urgent ? '#fb7185' : '#d946ef'} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${progress * 289} 289`} style={{ transition: 'stroke-dasharray 0.2s linear' }} />
                </svg>
                <motion.div
                  animate={{ rotate: 360, scale: urgent ? [1, 1.05, 1] : 1 }}
                  transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: urgent ? Infinity : 0 } }}
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle at 50% 50%, #2a1740 0%, #120a20 60%, #0a0510 100%)', border: `3px solid ${urgent ? 'rgba(251,113,133,0.6)' : 'rgba(217,70,239,0.4)'}`, boxShadow: `0 12px 40px ${urgent ? 'rgba(251,113,133,0.4)' : 'rgba(217,70,239,0.35)'}` }}
                >
                  <Disc3 className={cn('w-12 h-12', urgent ? 'text-rose-300/80' : 'text-fuchsia-300/80')} />
                </motion.div>
                <div className="absolute -bottom-2 flex items-end gap-1 h-6">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.span
                      key={i}
                      className={cn('w-1.5 rounded-full', urgent ? 'bg-rose-400' : 'bg-fuchsia-400')}
                      animate={{ height: ['30%', '100%', '45%', '90%', '30%'] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
                      style={{ height: '40%' }}
                    />
                  ))}
                </div>
              </div>

              {mediaError ? (
                <p className="flex items-center gap-2 text-sm text-amber-300/90">
                  <AlertTriangle className="w-4 h-4" /> Vidéo indisponible… {isHost ? 'on passe à la suivante' : "l'hôte change de piste"}
                </p>
              ) : needsSoundUnlock ? (
                <motion.button
                  onClick={resumeSound}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-fuchsia-500 text-white font-black shadow-lg shadow-fuchsia-500/40"
                >
                  <Volume2 className="w-5 h-5" /> Activer le son 🔊
                </motion.button>
              ) : (
                <p className="text-sm text-white/45 -mt-1">Écoute bien… c’est quoi ce son ? 🎧</p>
              )}

              {myStreak >= 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-sm font-black">
                  <Flame className="w-4 h-4" /> Série x{myStreak}
                </div>
              )}

              {/* options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {optionTracks.map((opt, i) => {
                  const selected = myChoice === i;
                  return (
                    <motion.button
                      key={optionIds[i]}
                      whileHover={myChoice == null ? { scale: 1.02 } : undefined}
                      whileTap={myChoice == null ? { scale: 0.97 } : undefined}
                      onClick={() => answer(i)}
                      disabled={myChoice != null}
                      className={cn(
                        'py-4 px-4 rounded-2xl text-base sm:text-lg font-black border-2 transition-all text-center leading-tight',
                        selected ? 'border-fuchsia-400 bg-fuchsia-500/30' : 'border-white/10 bg-white/[0.04] hover:border-fuchsia-400/40',
                        myChoice != null && !selected && 'opacity-50',
                      )}
                    >
                      {opt?.title ?? '???'}
                    </motion.button>
                  );
                })}
              </div>
              {myChoice != null && <p className="text-sm text-white/50">Réponse envoyée ! En attente des autres…</p>}
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && track && (
            <motion.div key={`r-${roundIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-lg flex flex-col items-center gap-4">
              <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ type: 'spring', damping: 14 }} className="flex flex-col items-center gap-3">
                <div className="relative w-40 h-40 rounded-3xl overflow-hidden flex items-center justify-center" style={{ border: '3px solid rgba(217,70,239,0.5)', boxShadow: '0 16px 50px rgba(217,70,239,0.4)' }}>
                  <div className="absolute inset-0 flex items-center justify-center text-6xl" style={{ background: catMeta ? `radial-gradient(circle, ${catMeta.color}33, #120a20)` : '#120a20' }}>
                    {catMeta?.emoji ?? '🎵'}
                  </div>
                  {coverUrl && (
                    <img src={coverUrl} alt={track.title} className="relative w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black">{track.title}</h2>
                  {track.subtitle && <p className="text-sm text-white/55 mt-0.5">{track.subtitle}</p>}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {optionTracks.map((opt, i) => {
                  const correct = i === answerIndex;
                  const mine = i === myChoice;
                  return (
                    <div key={optionIds[i]} className={cn('relative py-3 px-4 rounded-2xl text-base font-black border-2 text-center leading-tight', correct ? 'border-emerald-400 bg-emerald-500/25' : mine ? 'border-rose-400 bg-rose-500/20' : 'border-white/10 bg-white/[0.03] opacity-60')}>
                      {opt?.title ?? '???'}
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
                    <span className="font-black text-fuchsia-300">{p.pts} pts</span>
                  </div>
                ))}
                {ranked.length === 0 && <p className="text-center text-white/50">Aucun score</p>}
              </div>
              <button onClick={onEndGame} className="mt-2 px-8 py-3 rounded-2xl font-black text-lg bg-gradient-to-r from-fuchsia-500 to-purple-700 hover:brightness-110" style={{ boxShadow: '0 8px 24px rgba(217,70,239,0.5)' }}>
                Retour au lobby
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* live scoreboard strip */}
      {(phase === 'listen' || phase === 'reveal') && ranked.length > 0 && (
        <div className="relative z-10 w-full max-w-2xl px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            {ranked.slice(0, 6).map((p, i) => (
              <div key={p.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />}
                <span className="text-sm font-bold truncate max-w-[90px]">{p.name}</span>
                <span className="text-sm font-black text-fuchsia-300">{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
