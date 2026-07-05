import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Clock, Trophy, Check, X, Crown, LogOut, Volume2, VolumeX, Disc3, Flame, AlertTriangle, Users, Zap, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import {
  BLINDTEST_ENTRIES, BLINDTEST_ENTRIES_UNIQUE, CATEGORY_META, scoreFor,
  BLINDTEST_ROUNDS, BLINDTEST_LISTEN_MS, BLINDTEST_REVEAL_MS,
  type BlindtestCategory, type BlindtestEntry,
} from '@/lib/blindtestTracks';
import { itunesSearch, pickBestPreview, itunesPoster } from '@/lib/itunes';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { BlindtestSetup } from './BlindtestSetup';
import { BT, BT_SPECTRUM, glow } from './blindtestTheme';
import { BlindtestBackground } from './BlindtestBackground';

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

export interface BlindtestConfig {
  rounds: number;
  listenMs: number;
  teams: boolean;
  hints: boolean;
  doublePoints: boolean;
}

/** Two-team palette (used in team mode). */
const TEAM_META = [
  { name: 'Équipe Cyan', short: 'Cyan', color: BT.cyan },
  { name: 'Équipe Rose', short: 'Rose', color: BT.magenta },
] as const;

/** Progressive masked-title hint: reveals more letters as the round elapses. */
function buildHint(title: string, elapsedFrac: number): string {
  return title
    .split(' ')
    .map((w) =>
      w
        .split('')
        .map((ch, i) => {
          if (!/[a-zA-Z0-9À-ÿ]/.test(ch)) return ch;
          if (elapsedFrac >= 0.7) return i === 0 || i % 2 === 0 ? ch : '•';
          if (elapsedFrac >= 0.45) return i === 0 ? ch : '•';
          return '•';
        })
        .join(''),
    )
    .join('  ');
}

interface RoundTrack {
  title: string;          // the answer
  subtitle?: string;      // "Song – Artist"
  category: BlindtestCategory;
  previewUrl?: string;
  artwork?: string;
}

interface PhasePayload {
  phase: Phase;
  roundIndex: number;
  totalRounds?: number;
  track?: RoundTrack;
  options?: string[];
  deadline?: number;
  /** Host clock timestamp at which the listen phase should actually start. */
  startAt?: number;
  scoreboard?: Record<string, number>;
  roundPoints?: Record<string, number>;
  answerIndex?: number;
  /** playerId -> chosen option index, for showing voters under each answer. */
  answers?: Record<string, number>;
  /** Configured listen window (ms) for this game. */
  listenMs?: number;
  /** Whether 2-team mode is on. */
  teamsEnabled?: boolean;
  /** Whether progressive hints are on. */
  hintsEnabled?: boolean;
  /** Whether THIS round is a double-points round. */
  doublePoints?: boolean;
  /** Random 2-team split (playerId -> 0|1), computed once by the host at game
   *  start and broadcast so every client agrees on the same random teams. */
  teamAssign?: Record<string, 0 | 1>;
  /** playerId -> average reaction time (ms) across all answered rounds,
   *  sent with the final phase so everyone sees everyone's average speed. */
  avgReaction?: Record<string, number>;
}

/** Buffer used by the host to schedule a synchronized listen start on all clients. */
const LISTEN_SYNC_BUFFER_MS = 500;

/* deterministic helpers */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildOptions(
  correct: { title: string; category: BlindtestCategory },
  pool: { title: string; category: BlindtestCategory }[],
  seed: number,
): { options: string[]; answerIndex: number } {
  const rnd = mulberry(seed);
  const same = Array.from(new Set(pool.filter((t) => t.category === correct.category).map((t) => t.title)))
    .filter((t) => t !== correct.title);
  const others = Array.from(new Set(pool.map((t) => t.title)))
    .filter((t) => t !== correct.title && !same.includes(t));
  const distractors = [...shuffle(same, rnd), ...shuffle(others, rnd)].slice(0, 3);
  const options = shuffle([correct.title, ...distractors], rnd);
  return { options, answerIndex: options.indexOf(correct.title) };
}

export const MemoriseGameScreen = ({ currentPlayer, players, lobbyId, onEndGame }: MemoriseGameScreenProps) => {
  const isHost = currentPlayer.isHost;

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds, setTotalRounds] = useState(BLINDTEST_ROUNDS);
  const [track, setTrack] = useState<RoundTrack | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [scoreboard, setScoreboard] = useState<Record<string, number>>({});
  const [roundPoints, setRoundPoints] = useState<Record<string, number>>({});
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [myChoice, setMyChoice] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState<number>(() => {
    try { const s = Number(localStorage.getItem('mimic.blindtest.volume')); if (Number.isFinite(s) && s >= 0 && s <= 100) return s; } catch { /* noop */ }
    return 70;
  });
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [myStreak, setMyStreak] = useState(0);
  const [channelReady, setChannelReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [revealVotes, setRevealVotes] = useState<Record<string, number>>({});
  // ── new game options ──
  const [listenMs, setListenMs] = useState<number>(BLINDTEST_LISTEN_MS);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [roundDouble, setRoundDouble] = useState(false);
  const [myElapsed, setMyElapsed] = useState<number | null>(null);
  /** playerId -> chosen option index, updated live during the listen phase
   *  (used to show a teammate's vote in team mode). */
  const [liveVotes, setLiveVotes] = useState<Record<string, number>>({});
  /** True when the reveal artwork is missing or fails to load → show a clean
   *  white title card instead of a wrong/blank cover. */
  const [artFailed, setArtFailed] = useState(false);
  /** Random 2-team split, broadcast by the host at game start (empty = not team mode / not yet assigned). */
  const [teamAssign, setTeamAssign] = useState<Record<string, 0 | 1>>({});
  /** playerId -> average reaction time (ms), broadcast at game end. */
  const [avgReaction, setAvgReaction] = useState<Record<string, number>>({});

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answersRef = useRef<Record<string, { choice: number; elapsed: number }>>({});
  const scoreRef = useRef<Record<string, number>>({});
  const streakRef = useRef<Record<string, number>>({});
  /** playerId -> [sum of reaction times, count] across the whole game (host-tracked). */
  const reactionSumRef = useRef<Record<string, [number, number]>>({});
  const teamAssignRef = useRef<Record<string, 0 | 1>>({});
  const playersRef = useRef<Player[]>(players);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const queueRef = useRef<BlindtestEntry[]>([]);
  const poolRef = useRef<{ title: string; category: BlindtestCategory }[]>([]);
  const errorFlagRef = useRef(false);
  const cleanups = useRef<Array<() => void>>([]);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef(0);
  const hostPlayingRef = useRef(false);
  const blockedRef = useRef(false);
  const lastVolRef = useRef(70);
  const volumeRef = useRef(70);
  const listenStartRef = useRef<number>(0);
  /** Estimated host clock offset in ms: hostNow ≈ Date.now() + clockOffsetRef.current. */
  const clockOffsetRef = useRef<number>(0);
  const bestRttRef = useRef<number>(Number.POSITIVE_INFINITY);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingListenRef = useRef<PhasePayload | null>(null);
  /** Set true once the clip actually starts playing this round (real audio onset). */
  const roundAudioStartedRef = useRef(false);
  const listenMsRef = useRef<number>(BLINDTEST_LISTEN_MS);
  const configRef = useRef<BlindtestConfig>({ rounds: BLINDTEST_ROUNDS, listenMs: BLINDTEST_LISTEN_MS, teams: false, hints: true, doublePoints: false });

  useEffect(() => { playersRef.current = players; }, [players]);
  // Reset the artwork-failed flag whenever the round's track changes.
  useEffect(() => { setArtFailed(false); }, [track?.previewUrl]);

  const catMeta = track ? CATEGORY_META[track.category] : null;
  const muted = volume === 0;

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);

  const namesById = useMemo(() => {
    const m: Record<string, string> = {};
    players.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [players]);

  // 2-team split: the host draws a RANDOM assignment once at game start and
  // broadcasts it (`teamAssign`) so every client sees the identical random
  // teams. Falls back to a deterministic split only before that arrives.
  const teamOf = useMemo(() => {
    if (Object.keys(teamAssign).length) return teamAssign;
    const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id));
    const map: Record<string, 0 | 1> = {};
    sorted.forEach((p, i) => { map[p.id] = (i % 2) as 0 | 1; });
    return map;
  }, [players, teamAssign]);

  /* ---------- audio playback ---------- */
  const stopMedia = useCallback(() => {
    try { mediaRef.current?.pause(); } catch { /* noop */ }
  }, []);

  const playTrack = useCallback((t: RoundTrack) => {
    setMediaError(false);
    blockedRef.current = false;
    const v = mediaRef.current;
    if (!v || !t.previewUrl) { setNeedsSoundUnlock(false); return; }
    try {
      v.src = t.previewUrl;
      v.currentTime = 0;
      v.muted = volumeRef.current === 0;
      v.volume = volumeRef.current / 100;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { hostPlayingRef.current = true; setNeedsSoundUnlock(false); })
          .catch((err: any) => {
            if (err && err.name === 'NotAllowedError') { blockedRef.current = true; setNeedsSoundUnlock(true); }
            else { setMediaError(true); if (isHost) errorFlagRef.current = true; }
          });
      }
    } catch { setNeedsSoundUnlock(true); }
  }, [isHost]);

  const resumeSound = useCallback(() => {
    if (track) playTrack(track);
  }, [track, playTrack]);

  const toggleMute = useCallback(() => {
    setVolume((v) => (v === 0 ? (lastVolRef.current || 70) : 0));
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
    if (mediaRef.current) { mediaRef.current.muted = muted; mediaRef.current.volume = volume / 100; }
    if (volume > 0) lastVolRef.current = volume;
    try { localStorage.setItem('mimic.blindtest.volume', String(volume)); } catch { /* noop */ }
  }, [volume, muted]);

  /* ---------- countdown + urgency tick ---------- */
  useEffect(() => {
    if (phase !== 'listen') { setSecondsLeft(0); return; }
    // During the short sync buffer (deadline not set yet) show the full time.
    if (!deadline) { setSecondsLeft(Math.ceil(listenMs / 1000)); return; }
    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 5 && s > 0 && s !== tickRef.current && myChoice == null) {
        tickRef.current = s; playSoundEffect('countdown', 0.25);
      }
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [phase, deadline, myChoice, listenMs]);

  /* ---------- apply phase (everyone) ---------- */
  const applyPhase = useCallback((p: PhasePayload) => {
    setPhase(p.phase);
    setRoundIndex(p.roundIndex);
    if (p.totalRounds != null) setTotalRounds(p.totalRounds);
    if (p.track) setTrack(p.track);
    if (p.options) setOptions(p.options);
    if (p.scoreboard) { setScoreboard(p.scoreboard); scoreRef.current = p.scoreboard; }
    if (p.roundPoints) {
      setRoundPoints(p.roundPoints);
      const got = (p.roundPoints[currentPlayer.id] ?? 0) > 0;
      setMyStreak((s) => (got ? s + 1 : 0));
    }
    setAnswerIndex(p.answerIndex ?? null);
    if (p.answers) setRevealVotes(p.answers);
    // apply broadcast game options
    if (p.listenMs != null) { setListenMs(p.listenMs); listenMsRef.current = p.listenMs; }
    if (p.teamsEnabled != null) setTeamsEnabled(p.teamsEnabled);
    if (p.hintsEnabled != null) setHintsEnabled(p.hintsEnabled);
    if (p.teamAssign) { setTeamAssign(p.teamAssign); teamAssignRef.current = p.teamAssign; }
    if (p.avgReaction) setAvgReaction(p.avgReaction);
    if (p.phase === 'listen' || p.phase === 'reveal') setRoundDouble(!!p.doublePoints);

    if (p.phase === 'listen') {
      setMyChoice(null); setMyElapsed(null); setAnsweredCount(0); setAnsweredIds(new Set()); answersRef.current = {}; tickRef.current = 0;
      setRevealVotes({}); setLiveVotes({});
      roundAudioStartedRef.current = false;
      // Schedule the actual listen start using the host-provided `startAt` timestamp
      // corrected by our estimated clock offset. This guarantees every player
      // (including the host, which also waits the same buffer) starts the round
      // at the exact same wall-clock moment.
      if (listenTimerRef.current) { clearTimeout(listenTimerRef.current); listenTimerRef.current = null; }
      pendingListenRef.current = p;
      const lm = p.listenMs ?? listenMsRef.current;
      const hostStartAt = p.startAt ?? (p.deadline ? p.deadline - lm : Date.now());
      // Convert host clock -> local clock: localStartAt = hostStartAt - clockOffset.
      const localStartAt = hostStartAt - clockOffsetRef.current;
      const delay = Math.max(0, localStartAt - Date.now());
      const beginListen = () => {
        listenTimerRef.current = null;
        if (!mountedRef.current) return;
        listenStartRef.current = Date.now();
        // Local deadline is derived from local start for a fair per-client countdown.
        setDeadline(listenStartRef.current + lm);
        if (p.track) { playSoundEffect('quizReveal', 0.3); playTrack(p.track); }
      };
      if (delay <= 0) beginListen();
      else listenTimerRef.current = setTimeout(beginListen, delay);
      return;
    } else {
      // Any non-listen phase cancels a pending scheduled listen start.
      if (listenTimerRef.current) { clearTimeout(listenTimerRef.current); listenTimerRef.current = null; }
      pendingListenRef.current = null;
      setDeadline(p.deadline ?? null);
    }
    if (p.phase === 'reveal') playSoundEffect('start', 0.35);
    if (p.phase === 'final') stopMedia();
  }, [playTrack, stopMedia, currentPlayer.id, isHost]);

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
          setAnsweredIds(new Set(Object.keys(answersRef.current)));
          setLiveVotes((prev) => ({ ...prev, [a.playerId]: a.choice }));
        }
      })
      // ---- clock sync handshake (NTP-lite) ----
      .on('broadcast', { event: 'sync-req' }, ({ payload }) => {
        if (!isHost) return;
        const q = payload as { clientId: string; clientNow: number };
        channelRef.current?.send({
          type: 'broadcast',
          event: 'sync-res',
          payload: { clientId: q.clientId, clientNow: q.clientNow, hostNow: Date.now() },
        });
      })
      .on('broadcast', { event: 'sync-res' }, ({ payload }) => {
        const r = payload as { clientId: string; clientNow: number; hostNow: number };
        if (r.clientId !== currentPlayer.id) return;
        const now = Date.now();
        const rtt = now - r.clientNow;
        if (rtt < 0 || rtt > 5000) return;
        if (rtt < bestRttRef.current) {
          bestRttRef.current = rtt;
          // Best estimate of hostNow at *this* moment = hostNow + rtt/2.
          clockOffsetRef.current = (r.hostNow + rtt / 2) - now;
        }
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') setChannelReady(true); });

    // Non-host: periodically ping the host to keep the clock offset fresh.
    let syncIv: ReturnType<typeof setInterval> | null = null;
    if (!isHost) {
      const ping = () => {
        channel.send({
          type: 'broadcast',
          event: 'sync-req',
          payload: { clientId: currentPlayer.id, clientNow: Date.now() },
        });
      };
      // Fire a few quick pings on start to converge fast, then a slow heartbeat.
      const quick = [200, 500, 1000, 2000].map((t) => setTimeout(ping, t));
      syncIv = setInterval(ping, 5000);
      cleanups.current.push(() => { quick.forEach(clearTimeout); if (syncIv) clearInterval(syncIv); });
    }

    return () => {
      mountedRef.current = false;
      cleanups.current.forEach((fn) => fn());
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
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

  const waitListen = (target: number, ms: number) => new Promise<'done' | 'error'>((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      if (errorFlagRef.current) { clearInterval(iv); resolve('error'); }
      // host playback watchdog: skip a clip only if it errored (not when merely blocked by autoplay)
      else if (!hostPlayingRef.current && !blockedRef.current && elapsed > 6000) { clearInterval(iv); resolve('error'); }
      else if (Object.keys(answersRef.current).length >= target || elapsed >= ms) {
        clearInterval(iv); resolve('done');
      }
    }, 200);
    cleanups.current.push(() => clearInterval(iv));
  });

  /** Fetch the next playable track (skips entries with no iTunes preview). */
  const fetchNextTrack = useCallback(async (): Promise<{ entry: BlindtestEntry; track: RoundTrack } | null> => {
    let safety = 0;
    while (queueRef.current.length && safety < 12) {
      safety += 1;
      const entry = queueRef.current.shift()!;
      const results = await itunesSearch(entry.query);
      const best = pickBestPreview(results, { answer: entry.answer, hint: entry.hint, category: entry.category, query: entry.query });
      if (best) {
        // For visual categories, fetch the real poster/jaquette (movie poster,
        // TV-show cover) so the reveal shows the actual artwork of the answer
        // instead of a plain soundtrack album cover. Falls back to album art.
        let artwork = best.artworkUrl;
        if (['film', 'disney', 'anime', 'cartoon', 'series'].includes(entry.category)) {
          try {
            const poster = await itunesPoster(entry.answer, entry.category);
            if (poster) artwork = poster;
          } catch { /* keep album art */ }
        }
        return {
          entry,
          track: {
            title: entry.answer,
            subtitle: `${best.trackName} – ${best.artistName}`,
            category: entry.category,
            previewUrl: best.previewUrl,
            artwork,
          },
        };
      }
    }
    return null;
  }, []);

  /* ---------- host loop ---------- */
  const runRound = useCallback(async (i: number, total: number, pre?: { entry: BlindtestEntry; track: RoundTrack } | null) => {
    if (!mountedRef.current) return;

    const buildAvgReaction = (): Record<string, number> => {
      const out: Record<string, number> = {};
      Object.entries(reactionSumRef.current).forEach(([pid, [sum, count]]) => { if (count > 0) out[pid] = Math.round(sum / count); });
      return out;
    };

    const next = pre ?? await fetchNextTrack();
    if (!mountedRef.current) return;
    if (!next) { broadcastPhase({ phase: 'final', roundIndex: i, scoreboard: { ...scoreRef.current }, avgReaction: buildAvgReaction() }); return; }

    const { options: opts, answerIndex: ansIdx } = buildOptions(
      { title: next.track.title, category: next.track.category },
      poolRef.current,
      (i + 1) * 7919 + Math.floor(Math.random() * 1000),
    );

    answersRef.current = {};
    errorFlagRef.current = false;
    hostPlayingRef.current = false;
    const cfg = configRef.current;
    const lm = cfg.listenMs;
    // Double-points rounds: always the final round, plus a ~20% chance elsewhere.
    const isDouble = cfg.doublePoints && (i === total - 1 || Math.random() < 0.2);
    // Schedule a synchronized listen start: everyone (host + clients) waits
    // until `startAt` on the host clock before actually playing the track.
    const startAt = Date.now() + LISTEN_SYNC_BUFFER_MS;
    broadcastPhase({
      phase: 'listen',
      roundIndex: i,
      totalRounds: total,
      track: next.track,
      options: opts,
      startAt,
      deadline: startAt + lm,
      listenMs: lm,
      teamsEnabled: cfg.teams,
      hintsEnabled: cfg.hints,
      doublePoints: isDouble,
      // Re-sent every round (cheap) so late joiners / reconnects also get it.
      teamAssign: cfg.teams ? teamAssignRef.current : undefined,
    });
    // Host also waits the same buffer so its own audio starts in sync with clients.
    // (applyPhase runs via `broadcast.self: true` and schedules the local start;
    // that path handles playTrack for the host too since we route through applyPhase.)

    const connected = playersRef.current.filter((p) => !p.isDisconnected).length || 1;
    // The host's collection window must END at the same moment every client's
    // countdown does: clients start after LISTEN_SYNC_BUFFER_MS, so the host
    // waits buffer + full listen time (+ a grace for network latency) so that
    // last-second correct answers are still counted and scored.
    const reason = await waitListen(connected, LISTEN_SYNC_BUFFER_MS + lm + 700);
    if (!mountedRef.current) return;

    if (reason === 'error') {
      await wait(250);
      runRound(i, total);
      return;
    }

    const mult = isDouble ? 2 : 1;
    const rp: Record<string, number> = {};
    Object.entries(answersRef.current).forEach(([pid, a]) => {
      const correct = a.choice === ansIdx;
      // Track every answered round's reaction time (correct or not) for the
      // final "average reaction time" stat, shown per player at game end.
      const sum = reactionSumRef.current[pid] ?? [0, 0];
      reactionSumRef.current[pid] = [sum[0] + a.elapsed, sum[1] + 1];
      if (correct) {
        streakRef.current[pid] = (streakRef.current[pid] || 0) + 1;
        const bonus = streakRef.current[pid] >= 2 ? Math.min(streakRef.current[pid], 6) * 40 : 0;
        rp[pid] = (scoreFor(true, a.elapsed, lm) + bonus) * mult;
      } else {
        streakRef.current[pid] = 0; rp[pid] = 0;
      }
      scoreRef.current[pid] = (scoreRef.current[pid] || 0) + rp[pid];
    });

    const votes: Record<string, number> = {};
    Object.entries(answersRef.current).forEach(([pid, a]) => { votes[pid] = a.choice; });
    broadcastPhase({ phase: 'reveal', roundIndex: i, totalRounds: total, track: next.track, options: opts, scoreboard: { ...scoreRef.current }, roundPoints: rp, answerIndex: ansIdx, answers: votes, listenMs: lm, teamsEnabled: cfg.teams, hintsEnabled: cfg.hints, doublePoints: isDouble });
    // prefetch the next track during the reveal (smooth + drops dead clips early)
    const prefetch = i + 1 < total ? fetchNextTrack() : Promise.resolve(null);
    await wait(BLINDTEST_REVEAL_MS);
    if (!mountedRef.current) return;

    if (i + 1 < total) { const nt = await prefetch; runRound(i + 1, total, nt); }
    else broadcastPhase({ phase: 'final', roundIndex: i, scoreboard: { ...scoreRef.current }, avgReaction: buildAvgReaction() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastPhase, fetchNextTrack, playTrack]);

  /* ---------- host starts (the click unlocks audio for the whole game) ---------- */
  const startGame = useCallback(async (cats: BlindtestCategory[], config: BlindtestConfig) => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarting(true);

    // lock in the chosen options for the whole game
    configRef.current = config;
    listenMsRef.current = config.listenMs;
    setListenMs(config.listenMs);
    setTeamsEnabled(config.teams);
    setHintsEnabled(config.hints);

    // Random 2-team split, drawn ONCE by the host so every client (including
    // the host) shares the exact same random teams for the whole game.
    if (config.teams) {
      const shuffledPlayers = shuffle(playersRef.current, mulberry(Math.floor(Math.random() * 1e9)));
      const assign: Record<string, 0 | 1> = {};
      shuffledPlayers.forEach((p, i) => { assign[p.id] = (i % 2) as 0 | 1; });
      teamAssignRef.current = assign;
      setTeamAssign(assign);
    } else {
      teamAssignRef.current = {};
      setTeamAssign({});
    }
    reactionSumRef.current = {};
    setAvgReaction({});

    // `BLINDTEST_ENTRIES` contains weighted duplicates (featured/new answers
    // appear more than once) so they're more likely to be drawn — but each
    // answer must still only be asked ONCE per game, so we shuffle the
    // weighted pool then dedupe, keeping the first (weighted-biased) occurrence.
    const weighted = BLINDTEST_ENTRIES.filter((e) => cats.includes(e.category));
    const uniqueEntries = BLINDTEST_ENTRIES_UNIQUE.filter((e) => cats.includes(e.category));
    poolRef.current = uniqueEntries.map((e) => ({ title: e.answer, category: e.category }));
    const rnd = mulberry(Math.floor(Math.random() * 1e9));
    const seenKeys = new Set<string>();
    queueRef.current = shuffle(weighted, rnd).filter((e) => {
      const key = e.category + '|' + e.answer.toLowerCase();
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    const total = Math.max(1, Math.min(config.rounds, uniqueEntries.length));

    // Fetch the first track now — still inside the click's activation window —
    // so the host's first playTrack() is allowed to play with sound.
    const first = await fetchNextTrack();
    if (!mountedRef.current) return;
    if (!first) { broadcastPhase({ phase: 'final', roundIndex: 0, scoreboard: {} }); return; }
    runRound(0, total, first);
  }, [runRound, fetchNextTrack, broadcastPhase]);

  /* ---------- answering ---------- */
  const answer = (choice: number) => {
    if (phase !== 'listen' || myChoice != null || !deadline) return;
    // Round not actually started yet (still in the sync buffer) or already over.
    if (!listenStartRef.current || Date.now() > deadline) return;
    playSoundEffect('click', 0.3);
    setMyChoice(choice);
    const elapsed = Math.max(0, Math.min(listenMsRef.current, Date.now() - listenStartRef.current));
    setMyElapsed(elapsed);
    channelRef.current?.send({ type: 'broadcast', event: 'answer', payload: { playerId: currentPlayer.id, choice, elapsed } });
  };

  const ranked = useMemo(
    () => Object.entries(scoreboard)
      .map(([id, pts]) => ({ id, pts, name: namesById[id] || 'Joueur' }))
      .sort((a, b) => b.pts - a.pts),
    [scoreboard, namesById],
  );

  // Every participant (incl. 0 pts) for the live left scoreboard.
  const standings = useMemo(
    () => players
      .map((p) => ({ id: p.id, name: p.name, pts: scoreboard[p.id] || 0, isMe: p.id === currentPlayer.id }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)),
    [players, scoreboard, currentPlayer.id],
  );

  const progress = phase === 'listen' && deadline
    ? Math.max(0, Math.min(1, (deadline - Date.now()) / listenMs)) : 0;
  const urgent = phase === 'listen' && secondsLeft <= 5 && secondsLeft > 0 && myChoice == null;
  const connectedCount = players.filter((p) => !p.isDisconnected).length || players.length;

  // Team aggregates (team mode).
  const teamScores = useMemo(() => {
    const t: [number, number] = [0, 0];
    players.forEach((p) => { t[teamOf[p.id] ?? 0] += scoreboard[p.id] || 0; });
    return t;
  }, [players, scoreboard, teamOf]);
  const myTeam = teamOf[currentPlayer.id] ?? 0;

  // Progressive hint text during the listen phase.
  const elapsedFrac = phase === 'listen' && deadline ? 1 - progress : 0;
  const hintText = hintsEnabled && track && elapsedFrac >= 0.35 ? buildHint(track.title, elapsedFrac) : null;

  // My reaction-speed tier (visible speed bonus).
  const speedTier = (() => {
    if (myElapsed == null) return null;
    const f = myElapsed / (listenMs || 1);
    if (f < 0.2) return { label: '⚡ Éclair', color: BT.cyan };
    if (f < 0.45) return { label: '🔥 Rapide', color: BT.gold };
    return { label: '✓ Dans les temps', color: BT.sub };
  })();

  /* ============================================================ */
  const accent = catMeta?.color ?? BT.violet;
  return (
    <div className="h-screen w-full flex flex-col items-center text-white relative overflow-hidden" style={{ background: BT.bg }}>
      <audio
        ref={mediaRef}
        className="hidden"
        preload="auto"
        loop
        onPlaying={() => {
          hostPlayingRef.current = true; setNeedsSoundUnlock(false); setMediaError(false);
          // Fair scoring: reaction time is measured from the REAL audio onset
          // for each player (neutralizes clip load / autoplay-unlock latency),
          // so the host no longer systematically wins.
          if (!roundAudioStartedRef.current) { roundAudioStartedRef.current = true; listenStartRef.current = Date.now(); }
        }}
        onTimeUpdate={() => { hostPlayingRef.current = true; }}
        onError={() => { setMediaError(true); if (isHost) errorFlagRef.current = true; }}
      />

      {/* neon lounge background */}
      <BlindtestBackground accent={accent} />

      {/* header */}
      <div className="relative z-10 w-full flex items-center justify-between px-5 py-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 relative"
            style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #050509 0 1.5px, #17172a 1.5px 3px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: glow(BT.magenta, 0.4) }}
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: BT_SPECTRUM }}>
              <Music className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          </motion.div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-none truncate tracking-tight" style={{ background: BT_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BLINDTEST</h1>
            <p className="text-[11px] truncate font-medium tracking-wide" style={{ color: BT.sub }}>Devine le son le plus vite possible</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {phase !== 'final' && phase !== 'intro' && (
            <div className="px-3 py-1.5 rounded-full text-sm font-black tabular-nums" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BT.hair}`, color: '#fff' }}>{roundIndex + 1}/{totalRounds}</div>
          )}
          <button onClick={toggleMute} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BT.hair}` }} aria-label="Son">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onEndGame} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/80 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BT.hair}` }}>
            <LogOut className="w-4 h-4" /><span className="text-sm font-bold hidden sm:inline">Quitter</span>
          </button>
        </div>
      </div>

      {/* body */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4 min-h-0 overflow-y-auto custom-scrollbar py-4">
        <AnimatePresence mode="wait">
          {/* INTRO — host category chooser */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
              <BlindtestSetup isHost={isHost} canStart={channelReady} starting={starting} onStart={startGame} />
            </motion.div>
          )}

          {/* LISTEN */}
          {phase === 'listen' && track && (
            <motion.div key={`listen-${roundIndex}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-lg flex flex-col items-center gap-5">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <div className="flex items-center gap-1.5 font-black text-lg px-3.5 py-1.5 rounded-full text-white tabular-nums" style={{ background: urgent ? BT.rose : 'rgba(255,255,255,0.06)', border: `1px solid ${urgent ? BT.rose : BT.hair}`, boxShadow: urgent ? glow(BT.rose, 0.5) : 'none' }}>
                  <Clock className="w-4 h-4" /> {secondsLeft}s
                </div>
                {catMeta && (
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold text-white flex items-center gap-1.5" style={{ background: `${catMeta.color}22`, border: `1px solid ${catMeta.color}66`, color: catMeta.color }}>
                    <span>{catMeta.emoji}</span> {catMeta.label}
                  </span>
                )}
                <span className="px-3.5 py-1.5 rounded-full text-sm font-bold" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BT.hair}`, color: BT.sub }}>{answeredCount}/{connectedCount} ont répondu</span>
                {teamsEnabled && (
                  <span className="px-3.5 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5" style={{ background: `${TEAM_META[myTeam].color}22`, border: `1px solid ${TEAM_META[myTeam].color}66`, color: TEAM_META[myTeam].color }}>
                    <Users className="w-3.5 h-3.5" /> {TEAM_META[myTeam].short}
                  </span>
                )}
              </div>

              {roundDouble && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, boxShadow: [`0 0 20px ${BT.gold}66`, `0 0 34px ${BT.gold}aa`, `0 0 20px ${BT.gold}66`] }}
                  transition={{ boxShadow: { duration: 1.3, repeat: Infinity } }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-black font-black text-sm -mb-1"
                  style={{ background: `linear-gradient(90deg, ${BT.gold}, #ff9a3d)` }}
                >
                  <Zap className="w-4 h-4" fill="currentColor" /> MANCHE DOUBLE ×2
                </motion.div>
              )}

              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="btRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ff2e97" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#22e0ff" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke={urgent ? BT.rose : 'url(#btRing)'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progress * 289} 289`} style={{ transition: 'stroke-dasharray 0.2s linear', filter: `drop-shadow(0 0 6px ${urgent ? BT.rose : BT.violet}cc)` }} />
                </svg>
                <motion.div
                  animate={{ rotate: 360, scale: urgent ? [1, 1.05, 1] : 1 }}
                  transition={{ rotate: { duration: 3.5, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: urgent ? Infinity : 0 } }}
                  className="w-36 h-36 rounded-full flex items-center justify-center relative"
                  style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #050509 0 2px, #17172a 2px 4px)', border: '2px solid rgba(255,255,255,0.14)', boxShadow: `${glow(urgent ? BT.rose : BT.violet, 0.5)}, inset 0 0 34px rgba(0,0,0,0.8)` }}
                >
                  <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.14), transparent 45%)' }} />
                  <div className="w-12 h-12 rounded-full flex items-center justify-center relative" style={{ background: urgent ? `linear-gradient(135deg, ${BT.rose}, ${BT.magenta})` : BT_SPECTRUM, boxShadow: glow(urgent ? BT.rose : BT.violet, 0.5) }}>
                    <Disc3 className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
                <div className="absolute -bottom-1 flex items-end gap-1 h-6">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.span key={i} className="w-1.5 rounded-full" style={{ background: urgent ? BT.rose : BT_SPECTRUM, height: '40%', boxShadow: glow(urgent ? BT.rose : BT.violet, 0.35) }} animate={{ height: ['30%', '100%', '45%', '90%', '30%'] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }} />
                  ))}
                </div>
              </div>

              {mediaError ? (
                <p className="flex items-center gap-2 text-sm font-medium" style={{ color: BT.gold }}>
                  <AlertTriangle className="w-4 h-4" /> Extrait indisponible… {isHost ? 'on passe à la suivante' : "l'hôte change de piste"}
                </p>
              ) : needsSoundUnlock ? (
                <motion.button onClick={resumeSound} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black text-lg" style={{ background: BT_SPECTRUM, boxShadow: `0 10px 34px ${BT.magenta}55` }}>
                  <Volume2 className="w-5 h-5" /> Activer le son 🔊
                </motion.button>
              ) : (
                <p className="text-sm -mt-1 font-medium" style={{ color: BT.sub }}>Écoute bien… c'est quoi ce son ? 🎧</p>
              )}

              {myStreak >= 2 && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-sm font-black" style={{ background: `linear-gradient(90deg, ${BT.gold}, #ff9a3d)`, boxShadow: glow(BT.gold, 0.4) }}>
                  <Flame className="w-4 h-4" /> Série x{myStreak}
                </div>
              )}

              {hintText && myChoice == null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BT.hair}` }}
                >
                  <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: BT.gold }} />
                  <span className="font-black tracking-[0.15em] text-lg" style={{ color: '#fff' }}>{hintText}</span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {options.map((opt, i) => {
                  const selected = myChoice === i;
                  // Team mode: show teammates (my team, excluding me) who already
                  // voted this option — so you can see your coéquipier's pick live.
                  const mates = teamsEnabled
                    ? players.filter((p) => p.id !== currentPlayer.id && (teamOf[p.id] ?? 0) === myTeam && liveVotes[p.id] === i)
                    : [];
                  return (
                    <motion.button
                      key={i}
                      whileHover={myChoice == null ? { scale: 1.03, rotate: -1 } : undefined}
                      whileTap={myChoice == null ? { scale: 0.97 } : undefined}
                      onClick={() => answer(i)}
                      disabled={myChoice != null}
                      className="relative py-4 px-4 rounded-2xl text-base sm:text-lg font-bold text-center leading-tight text-white overflow-hidden transition-colors"
                      style={{
                        border: `1px solid ${selected ? 'transparent' : mates.length ? TEAM_META[myTeam].color : BT.hair}`,
                        background: selected ? BT_SPECTRUM : 'rgba(255,255,255,0.04)',
                        boxShadow: selected ? `0 10px 30px ${BT.magenta}44` : mates.length ? `inset 0 0 0 1px ${TEAM_META[myTeam].color}55` : 'none',
                        opacity: myChoice != null && !selected ? 0.45 : 1,
                      }}
                    >
                      {opt}
                      {mates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 justify-center">
                          {mates.map((p) => {
                            const av = getAvatar(p.id);
                            const img = av?.type === 'image' && av.imageUrl ? av.imageUrl : null;
                            return (
                              <div
                                key={p.id}
                                title={`${p.name} (coéquipier)`}
                                className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full"
                                style={{ background: `${TEAM_META[myTeam].color}26`, border: `1px solid ${TEAM_META[myTeam].color}66` }}
                              >
                                <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-black text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                  {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || '?').toUpperCase()}
                                </span>
                                <span className="text-[10px] font-bold" style={{ color: TEAM_META[myTeam].color }}>{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              {myChoice != null && (
                <div className="flex flex-col items-center gap-1.5">
                  {speedTier && myElapsed != null && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-sm"
                      style={{ background: `${speedTier.color}22`, border: `1px solid ${speedTier.color}66`, color: speedTier.color }}
                    >
                      {speedTier.label} · {(myElapsed / 1000).toFixed(1)}s
                    </motion.div>
                  )}
                  <p className="text-sm font-medium" style={{ color: BT.sub }}>Réponse envoyée ! En attente des autres…</p>
                </div>
              )}
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && track && (
            <motion.div key={`r-${roundIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl flex flex-col items-center gap-5">
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 13, stiffness: 200 }}
                className="flex flex-col items-center gap-4"
              >
                <div
                  className="relative rounded-[1.8rem] overflow-hidden flex items-center justify-center"
                  style={{ width: 'min(86vw, 34rem)', height: 'min(86vw, 34rem)', border: `1px solid ${accent}66`, boxShadow: `0 30px 90px ${accent}55, 0 0 0 1px rgba(255,255,255,0.05), ${glow(accent, 0.4)}` }}
                >
                  {(!track.artwork || artFailed) ? (
                    // Clean white "title card" fallback — no cover, or it failed
                    // to load: never show a wrong/blank image, show the title.
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: 'linear-gradient(180deg, #ffffff, #eef0f4)' }}>
                      <span className="text-xs md:text-sm font-black uppercase tracking-[0.25em] mb-3" style={{ color: catMeta?.color ?? '#888' }}>
                        {catMeta ? `${catMeta.emoji} ${catMeta.label}` : '🎵'}
                      </span>
                      <span className="font-black leading-tight" style={{ color: '#0d0d14', fontSize: 'clamp(1.6rem, 6vw, 3.2rem)' }}>{track.title}</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 'min(40vw,16rem)', background: catMeta ? `radial-gradient(circle, ${catMeta.color}44, ${BT.bgSoft})` : BT.bgSoft }}>{catMeta?.emoji ?? '🎵'}</div>
                      <motion.img
                        src={track.artwork}
                        alt={track.title}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="relative w-full h-full object-cover"
                        onError={() => setArtFailed(true)}
                      />
                      {/* shine sweep */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)' }}
                        initial={{ x: '-120%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 0.9, delay: 0.25 }}
                      />
                    </>
                  )}
                  {catMeta && (
                    <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-black text-white flex items-center gap-1.5 backdrop-blur-md" style={{ background: `${catMeta.color}cc`, boxShadow: glow(catMeta.color, 0.4) }}>
                      {catMeta.emoji} {catMeta.label}
                    </span>
                  )}
                </div>
                <div className="text-center px-3">
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white"
                    style={{ textShadow: `0 4px 30px ${accent}66` }}
                  >
                    {track.title}
                  </motion.h2>
                  {track.subtitle && <p className="text-sm md:text-base mt-1.5 font-medium" style={{ color: BT.sub }}>{track.subtitle}</p>}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {options.map((opt, i) => {
                  const correct = i === answerIndex;
                  const mine = i === myChoice;
                  const voters = players.filter((p) => revealVotes[p.id] === i);
                  return (
                    <div
                      key={i}
                      className="relative py-3 px-4 rounded-2xl leading-tight text-white"
                      style={{
                        border: `1px solid ${correct ? BT.emerald : mine ? BT.rose : BT.hair}`,
                        background: correct ? `${BT.emerald}22` : mine ? `${BT.rose}22` : 'rgba(255,255,255,0.03)',
                        boxShadow: correct ? glow(BT.emerald, 0.35) : mine ? glow(BT.rose, 0.3) : 'none',
                        opacity: !correct && !mine ? 0.6 : 1,
                      }}
                    >
                      <div className="text-base font-bold text-center">{opt}</div>
                      {correct && <Check className="absolute top-2 right-2 w-5 h-5" style={{ color: BT.emerald }} strokeWidth={3} />}
                      {mine && !correct && <X className="absolute top-2 right-2 w-5 h-5" style={{ color: BT.rose }} strokeWidth={3} />}
                      {voters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 justify-center">
                          {voters.map((p) => {
                            const av = getAvatar(p.id);
                            const img = av?.type === 'image' && av.imageUrl ? av.imageUrl : null;
                            return (
                              <div
                                key={p.id}
                                title={p.name}
                                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-black text-white"
                                style={{ border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)' }}
                              >
                                {img ? (
                                  <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  (p.name[0] || '?').toUpperCase()
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {(() => {
                const myPts = roundPoints[currentPlayer.id];
                const gotPts = (myPts ?? 0) > 0;
                const answered = myChoice != null;
                const label = gotPts
                  ? `+${myPts} pts !`
                  : answered
                    ? 'Mauvaise réponse'
                    : 'Pas de réponse';
                return (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className="flex items-center gap-2 px-5 py-2 rounded-full font-black text-lg text-white"
                      style={{
                        background: gotPts ? `linear-gradient(90deg, ${BT.emerald}, #12b47a)` : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${gotPts ? 'transparent' : BT.hair}`,
                        boxShadow: gotPts ? glow(BT.emerald, 0.4) : 'none',
                        color: gotPts ? '#fff' : BT.sub,
                      }}
                    >
                      {label}
                      {gotPts && roundDouble && (
                        <span className="flex items-center gap-0.5 text-black rounded-full px-2 py-0.5 text-xs" style={{ background: BT.gold }}>
                          <Zap className="w-3 h-3" fill="currentColor" /> ×2
                        </span>
                      )}
                    </motion.div>
                    {gotPts && speedTier && (
                      <span className="text-xs font-bold" style={{ color: speedTier.color }}>{speedTier.label}</span>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* FINAL */}
          {phase === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md flex flex-col items-center gap-5">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                <Trophy className="w-16 h-16" style={{ color: BT.gold, filter: `drop-shadow(0 6px 22px ${BT.gold}88)` }} />
              </motion.div>
              <h2 className="text-4xl font-black tracking-tight" style={{ background: BT_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Classement final</h2>

              {teamsEnabled && (
                <div className="w-full">
                  {(() => {
                    const winner = teamScores[0] === teamScores[1] ? -1 : (teamScores[0] > teamScores[1] ? 0 : 1);
                    return (
                      <>
                        <p className="text-center text-sm font-black mb-2" style={{ color: BT.sub }}>
                          {winner === -1 ? '🤝 Égalité !' : `🏆 ${TEAM_META[winner].name} gagne !`}
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[0, 1].map((t) => (
                            <div
                              key={t}
                              className="flex flex-col items-center py-3 rounded-2xl"
                              style={{
                                border: `1px solid ${winner === t ? TEAM_META[t].color : BT.hair}`,
                                background: `${TEAM_META[t].color}${winner === t ? '2e' : '14'}`,
                                boxShadow: winner === t ? glow(TEAM_META[t].color, 0.35) : 'none',
                              }}
                            >
                              <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: TEAM_META[t].color }}>
                                <Users className="w-4 h-4" /> {TEAM_META[t].short}
                              </span>
                              <span className="text-3xl font-black tabular-nums text-white">{teamScores[t]}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="w-full space-y-2.5">
                {ranked.map((p, i) => {
                  const av = getAvatar(p.id);
                  const img = av?.type === 'image' && av.imageUrl ? av.imageUrl : null;
                  const avg = avgReaction[p.id];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white relative overflow-hidden"
                      style={{
                        border: `1px solid ${i === 0 ? BT.gold : BT.hair}`,
                        background: i === 0 ? `linear-gradient(90deg, ${BT.gold}22, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)',
                        boxShadow: i === 0 ? glow(BT.gold, 0.3) : 'none',
                      }}
                    >
                      <span className="text-2xl font-black w-8 text-center flex-shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', border: `2px solid ${teamsEnabled ? TEAM_META[teamOf[p.id] ?? 0].color : (i === 0 ? BT.gold : BT.hair)}` }}
                      >
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold truncate text-base block">{p.name}{p.id === currentPlayer.id ? ' (toi)' : ''}</span>
                        {avg != null && (
                          <span className="text-xs font-medium flex items-center gap-1" style={{ color: BT.sub }}>
                            <Clock className="w-3 h-3" /> {(avg / 1000).toFixed(1)}s moy.
                          </span>
                        )}
                      </div>
                      <span className="font-black text-lg tabular-nums flex-shrink-0" style={{ color: i === 0 ? BT.gold : BT.cyan }}>{p.pts}</span>
                    </motion.div>
                  );
                })}
                {ranked.length === 0 && <p className="text-center text-base font-medium" style={{ color: BT.sub }}>Aucun score</p>}
              </div>
              <motion.button
                onClick={onEndGame}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="mt-2 px-8 py-3.5 rounded-2xl font-black text-xl text-white"
                style={{ background: BT_SPECTRUM, boxShadow: `0 12px 40px ${BT.magenta}55` }}
              >
                Retour au lobby
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* left live scoreboard (real-time) */}
      {(phase === 'listen' || phase === 'reveal') && standings.length > 0 && (
        <div className="hidden md:flex fixed left-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-1.5 w-56 max-h-[82vh] overflow-y-auto custom-scrollbar p-3 rounded-2xl" style={{ background: BT.panel, border: `1px solid ${BT.hair}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)' }}>
          <div className="flex items-center gap-2 px-1 pb-2 mb-0.5" style={{ borderBottom: `1px solid ${BT.hair}` }}>
            <Trophy className="w-4 h-4" style={{ color: BT.gold }} />
            <span className="text-sm font-black text-white uppercase tracking-[0.15em]">Scores</span>
            <span className="ml-auto text-[11px] font-bold" style={{ color: BT.sub }}>{answeredCount}/{connectedCount}</span>
          </div>

          {teamsEnabled && (
            <div className="grid grid-cols-2 gap-1.5 mb-1">
              {[0, 1].map((t) => (
                <div key={t} className="flex flex-col items-center py-1.5 rounded-lg" style={{ background: `${TEAM_META[t].color}1f`, border: `1px solid ${TEAM_META[t].color}55` }}>
                  <span className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1" style={{ color: TEAM_META[t].color }}>
                    <Users className="w-3 h-3" /> {TEAM_META[t].short}
                  </span>
                  <span className="text-lg font-black tabular-nums text-white leading-none">{teamScores[t]}</span>
                </div>
              ))}
            </div>
          )}

          {standings.map((p, i) => {
            const answered = phase === 'listen' && answeredIds.has(p.id);
            const tColor = teamsEnabled ? TEAM_META[teamOf[p.id] ?? 0].color : (p.isMe ? BT.violet : null);
            return (
              <motion.div
                layout
                key={p.id}
                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-white"
                style={{
                  border: `1px solid ${tColor ? `${tColor}66` : BT.hairSoft}`,
                  background: p.isMe ? `linear-gradient(90deg, ${tColor ?? BT.violet}2e, rgba(255,255,255,0.02))` : (teamsEnabled ? `${tColor}12` : 'rgba(255,255,255,0.03)'),
                  boxShadow: p.isMe ? `inset 0 0 0 1px ${tColor ?? BT.violet}33` : 'none',
                }}
              >
                <span className="w-6 text-center text-sm font-black flex-shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                {teamsEnabled && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TEAM_META[teamOf[p.id] ?? 0].color }} />}
                <span className={cn('flex-1 truncate text-sm font-bold', p.isMe ? 'text-white' : 'text-white/85')}>{p.name}{p.isMe ? ' (toi)' : ''}</span>
                {answered && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BT.emerald }} strokeWidth={3} />}
                <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: p.isMe ? (tColor ?? BT.violet) : BT.cyan }}>{p.pts}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* vertical volume bar (persisted) */}
      {(phase === 'listen' || phase === 'reveal') && (
        <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 px-3 py-4 rounded-2xl" style={{ background: BT.panel, border: `1px solid ${BT.hair}`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)' }}>
          <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors" aria-label="Son">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <VerticalVolume value={volume} onChange={setVolume} />
          <span className="text-xs font-black tabular-nums" style={{ color: BT.sub }}>{volume}</span>
        </div>
      )}

      {/* live scoreboard strip (mobile only — desktop uses the left panel) */}
      {(phase === 'listen' || phase === 'reveal') && ranked.length > 0 && (
        <div className="relative z-10 w-full max-w-2xl px-4 pb-4 md:hidden">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            {ranked.slice(0, 6).map((p, i) => (
              <div key={p.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-white" style={{ background: i === 0 ? `${BT.gold}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? BT.gold : BT.hair}` }}>
                {i === 0 && <Crown className="w-3.5 h-3.5" style={{ color: BT.gold }} fill="currentColor" />}
                <span className="text-sm font-bold truncate max-w-[90px]">{p.name}</span>
                <span className="text-sm font-black" style={{ color: i === 0 ? BT.gold : BT.cyan }}>{p.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- custom vertical volume slider (robust cross-browser) ---------- */
const VerticalVolume = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = 1 - (clientY - r.top) / r.height;
    onChange(Math.round(Math.max(0, Math.min(1, pct)) * 100));
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setFromY(e.clientY); }}
      onPointerMove={(e) => { if (dragging.current) setFromY(e.clientY); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      className="relative w-3 rounded-full cursor-pointer touch-none"
      style={{ height: 150, background: 'rgba(255,255,255,0.08)', border: `1px solid ${BT.hair}` }}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Volume de la musique"
    >
      <div
        className="absolute bottom-0 left-0 right-0 rounded-full"
        style={{ height: `${value}%`, background: 'linear-gradient(180deg, #22e0ff, #8b5cf6, #ff2e97)' }}
      />
      <div
        className="absolute left-1/2 w-5 h-5 rounded-full bg-white"
        style={{ bottom: `calc(${value}% - 10px)`, transform: 'translateX(-50%)', boxShadow: `0 0 12px ${BT.violet}aa` }}
      />
    </div>
  );
};
