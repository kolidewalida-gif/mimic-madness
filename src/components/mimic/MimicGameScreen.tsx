import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Trophy, LogOut, Volume2, VolumeX, Loader2, Play, Music2, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import { itunesSearch, pickBestPreview } from '@/lib/itunes';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { MIMIC, MIMIC_SPECTRUM, mglow, scoreColor, grade } from './mimicTheme';
import { fetchMimicLyrics, pickExtractLines, type LyricLine } from './mimicLyrics';
import { MimicAnalyzer, detectPitch, mimicComment, type MimicResult } from './mimicScore';
import { pickRandomSong } from './mimicSongs';
import { MimicVoiceMesh } from './mimicVoice';
import { MimicMicCheck } from './MimicMicCheck';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

interface Player { id: string; name: string; isHost: boolean; isDisconnected?: boolean; }
interface Props { currentPlayer: Player; players: Player[]; lobbyId: string; onEndGame: () => void; }

type Phase = 'setup' | 'preview' | 'perform' | 'results';

interface Song { title: string; artist: string; artwork?: string; previewUrl?: string; }

interface MimicPayload {
  phase: Phase;
  song?: Song;
  lyrics?: LyricLine[];
  extractMs?: number;
  order?: string[];
  singerId?: string;
  turnIndex?: number;
  totalTurns?: number;
  startAt?: number;           // host clock ts to begin audio (after 3-2-1 lead)
  results?: Record<string, MimicResult>;
}

const SYNC_BUFFER_MS = 500;
const COUNTDOWN_MS = 3000;
const DEFAULT_EXTRACT_MS = 30000;

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

export const MimicGameScreen = ({ currentPlayer, players, lobbyId, onEndGame }: Props) => {
  const isHost = currentPlayer.isHost;
  const { isPlaying: isBackgroundPlaying, pause: pauseBackground, play: playBackground, setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();

  const [phase, setPhase] = useState<Phase>('setup');
  const [song, setSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [extractMs, setExtractMs] = useState(DEFAULT_EXTRACT_MS);
  const [order, setOrder] = useState<string[]>([]);
  const [singerId, setSingerId] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [results, setResults] = useState<Record<string, MimicResult>>({});
  const [liveScore, setLiveScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lyricIdx, setLyricIdx] = useState(0);
  const [starting, setStarting] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [channelReady, setChannelReady] = useState(false);
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(false);
  const [micError, setMicError] = useState(false);
  const [localMicReady, setLocalMicReady] = useState(false);
  const [micReadyIds, setMicReadyIds] = useState<Set<string>>(() => new Set());
  const [reactions, setReactions] = useState<Array<{ emoji: string; id: number }>>([]);
  const [volume, setVolume] = useState<number>(() => {
    try { const s = Number(localStorage.getItem('mimic.karaoke.volume')); if (Number.isFinite(s) && s >= 0 && s <= 100) return s; } catch { /* noop */ }
    return 75;
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const cleanups = useRef<Array<() => void>>([]);
  const clockOffsetRef = useRef(0);
  const bestRttRef = useRef(Number.POSITIVE_INFINITY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(75);
  const resultsRef = useRef<Record<string, MimicResult>>({});
  const lastPhaseRef = useRef<MimicPayload | null>(null);
  const playedSongsRef = useRef<Set<string>>(new Set());
  // mic analysis (singer only)
  const analyzerRef = useRef<MimicAnalyzer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micRafRef = useRef<number | null>(null);
  const performEndRef = useRef<number>(0);
  const startAtLocalRef = useRef<number>(0);
  // live voice (WebRTC mesh)
  const voiceMeshRef = useRef<MimicVoiceMesh | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const playersRef = useRef<Player[]>(players);
  const backgroundIsPlayingRef = useRef(isBackgroundPlaying);
  const backgroundShouldResumeRef = useRef(false);
  const backgroundAutoModeRef = useRef(autoMode);

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);
  const namesById = useMemo(() => { const m: Record<string, string> = {}; players.forEach((p) => { m[p.id] = p.name; }); return m; }, [players]);
  const muted = volume === 0;
  const connectedPlayerIds = useMemo(() => players.filter((player) => !player.isDisconnected).map((player) => player.id), [players]);
  const readyMicCount = connectedPlayerIds.filter((id) => micReadyIds.has(id)).length;
  const allMicsReady = connectedPlayerIds.length > 0 && readyMicCount === connectedPlayerIds.length;

  const reportMicReady = useCallback((ready: boolean) => {
    setLocalMicReady(ready);
    setMicReadyIds((previous) => {
      const next = new Set(previous);
      if (ready) next.add(currentPlayer.id);
      else next.delete(currentPlayer.id);
      return next;
    });
    channelRef.current?.send({ type: 'broadcast', event: 'mic-ready', payload: { playerId: currentPlayer.id, ready } });
  }, [currentPlayer.id]);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => {
    volumeRef.current = volume;
    if (mediaRef.current) { mediaRef.current.muted = muted; mediaRef.current.volume = volume / 100; }
    if (remoteAudioRef.current) { remoteAudioRef.current.muted = muted; remoteAudioRef.current.volume = volume / 100; }
    try { localStorage.setItem('mimic.karaoke.volume', String(volume)); } catch { /* noop */ }
  }, [volume, muted]);

  useEffect(() => { backgroundIsPlayingRef.current = isBackgroundPlaying; }, [isBackgroundPlaying]);
  useEffect(() => {
    backgroundAutoModeRef.current = autoMode;
    if (!autoMode) {
      backgroundShouldResumeRef.current = false;
      clearSituationOverride('mimic-game');
    }
  }, [autoMode, clearSituationOverride]);

  // Keep menu music out of the iTunes preview and live vocal performance,
  // then restore it only when this component paused it itself.
  useEffect(() => {
    if (!autoMode) return;
    if (phase === 'preview' || phase === 'perform') {
      if (backgroundIsPlayingRef.current) backgroundShouldResumeRef.current = true;
      pauseBackground();
      return;
    }

    setSituation(phase === 'results' ? 'mimic-results' : 'mimic-waiting', {
      priority: 5,
      source: 'mimic-game',
    });
    if (backgroundShouldResumeRef.current) {
      backgroundShouldResumeRef.current = false;
      playBackground();
    }
  }, [phase, autoMode, pauseBackground, playBackground, setSituation]);

  useEffect(() => () => {
    clearSituationOverride('mimic-game');
    if (backgroundAutoModeRef.current && backgroundShouldResumeRef.current) playBackground();
  }, [clearSituationOverride, playBackground]);

  /* ---------------- live voice mesh helpers ---------------- */
  const ensureMesh = useCallback(() => {
    if (voiceMeshRef.current) return voiceMeshRef.current;
    const send = (kind: string, payload: Record<string, unknown>) =>
      channelRef.current?.send({ type: 'broadcast', event: 'rtc', payload: { kind, ...payload } });
    const mesh = new MimicVoiceMesh(currentPlayer.id, send as any, (stream) => {
      const el = remoteAudioRef.current;
      if (!el) return;
      try {
        (el as HTMLAudioElement).srcObject = stream;
        el.muted = volumeRef.current === 0;
        el.volume = volumeRef.current / 100;
        el.play().catch(() => { /* will unlock on user gesture */ });
      } catch { /* noop */ }
    });
    voiceMeshRef.current = mesh;
    return mesh;
  }, [currentPlayer.id]);

  const stopMesh = useCallback(() => {
    try { voiceMeshRef.current?.stop(); } catch { /* noop */ }
    voiceMeshRef.current = null;
    if (remoteAudioRef.current) { try { (remoteAudioRef.current as HTMLAudioElement).srcObject = null; } catch { /* noop */ } }
  }, []);

  /* ---------------- audio ---------------- */
  const stopMedia = useCallback(() => { try { mediaRef.current?.pause(); } catch { /* noop */ } }, []);
  const playFromStart = useCallback(() => {
    // also (re)start the singer's live voice — this runs on a user gesture so
    // it unlocks autoplay for the remote audio too.
    const rem = remoteAudioRef.current;
    if (rem && (rem as HTMLAudioElement).srcObject) { rem.muted = volumeRef.current === 0; rem.volume = volumeRef.current / 100; rem.play().catch(() => {}); }
    const el = mediaRef.current;
    if (!el || !el.src) return;
    try {
      el.currentTime = 0; el.muted = volumeRef.current === 0; el.volume = volumeRef.current / 100;
      const p = el.play();
      if (p && typeof p.then === 'function') p.then(() => setNeedsSoundUnlock(false)).catch(() => setNeedsSoundUnlock(true));
    } catch { setNeedsSoundUnlock(true); }
  }, []);

  /* ---------------- mic (singer) ---------------- */
  const stopMic = useCallback(() => {
    if (micRafRef.current) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    micStreamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
  }, []);

  const startMic = useCallback(async () => {
    setMicError(false);
    analyzerRef.current = new MimicAnalyzer();
    analyzerRef.current.reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser); // NOT connected to destination (avoids feedback)
      const buf = new Float32Array(analyser.fftSize);
      let lastBroadcast = 0;
      const tick = () => {
        if (!mountedRef.current || !analyzerRef.current) return;
        analyser.getFloatTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        const pitch = detectPitch(buf, ctx.sampleRate);
        analyzerRef.current.push({ voice: Math.min(1, rms * 2.4), music: 1, pitch, t: Date.now() - startAtLocalRef.current });
        const live = analyzerRef.current.live();
        setLiveScore(live);
        const now = Date.now();
        if (now - lastBroadcast > 180) {
          lastBroadcast = now;
          channelRef.current?.send({ type: 'broadcast', event: 'score', payload: { playerId: currentPlayer.id, live } });
        }
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);

      // Publish the mic live to all listeners (turn-based: I'm the singer).
      try {
        const listeners = playersRef.current.filter((p) => p.id !== currentPlayer.id && !p.isDisconnected).map((p) => p.id);
        const mesh = ensureMesh();
        await mesh.startAsSinger(stream, listeners);
      } catch { /* live voice best-effort */ }
    } catch {
      setMicError(true);
    }
  }, [currentPlayer.id, ensureMesh]);

  /* ---------------- phase application (everyone) ---------------- */
  const applyPhase = useCallback((p: MimicPayload) => {
    setPhase(p.phase);
    if (p.song) setSong(p.song);
    if (p.lyrics) setLyrics(p.lyrics);
    if (p.extractMs != null) setExtractMs(p.extractMs);
    if (p.order) setOrder(p.order);
    if (p.totalTurns != null) setTotalTurns(p.totalTurns);
    if (p.results) { setResults(p.results); resultsRef.current = p.results; }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    // load audio src for preview/perform
    if (p.song?.previewUrl && mediaRef.current && mediaRef.current.src !== p.song.previewUrl) {
      mediaRef.current.src = p.song.previewUrl;
    }

    if (p.phase === 'preview' || p.phase === 'perform') {
      const lm = p.extractMs ?? extractMs;
      const lead = p.phase === 'perform' ? COUNTDOWN_MS : 0;
      const hostStartAt = p.startAt ?? Date.now();
      const localStartAt = hostStartAt - clockOffsetRef.current;
      startAtLocalRef.current = localStartAt;
      performEndRef.current = localStartAt + lm;
      setSingerId(p.singerId ?? null);
      setTurnIndex(p.turnIndex ?? 0);
      setLiveScore(0);
      setLyricIdx(0);

      // Reset live voice for this turn. Spectators arm a listener mesh now so
      // they're ready to answer the singer's offer; the singer publishes from
      // startMic() once the mic is live.
      stopMesh();
      if (p.phase === 'perform' && p.singerId && p.singerId !== currentPlayer.id) {
        ensureMesh().startAsListener(p.singerId);
      }

      const beginAudio = () => {
        if (!mountedRef.current) return;
        setCountdown(null);
        playFromStart();
        // singer opens mic on their own turn
        if (p.phase === 'perform' && p.singerId === currentPlayer.id) startMic();
      };

      // countdown (perform only)
      if (lead > 0) {
        const cdStart = localStartAt - COUNTDOWN_MS;
        const runCd = () => {
          const remain = Math.ceil((localStartAt - Date.now()) / 1000);
          if (remain > 0 && remain <= 3) { setCountdown(remain); playSoundEffect('countdown', 0.3); }
        };
        const untilCd = Math.max(0, cdStart - Date.now());
        const cdTimer = setTimeout(() => {
          runCd();
          const iv = setInterval(runCd, 1000);
          cleanups.current.push(() => clearInterval(iv));
        }, untilCd);
        cleanups.current.push(() => clearTimeout(cdTimer));
      } else {
        setCountdown(null);
      }

      const delay = Math.max(0, localStartAt - Date.now());
      timerRef.current = setTimeout(beginAudio, delay);
      return;
    }

    // non-playing phases
    setCountdown(null);
    stopMic();
    stopMesh();
    stopMedia();
    setSingerId(null);
  }, [extractMs, playFromStart, startMic, stopMic, stopMesh, ensureMesh, stopMedia, currentPlayer.id]);

  /* ---------------- lyric teleprompter (best-effort proportional) ---------------- */
  useEffect(() => {
    if ((phase !== 'preview' && phase !== 'perform') || !lyrics.length) return;
    const iv = setInterval(() => {
      const elapsed = Date.now() - startAtLocalRef.current;
      if (elapsed < 0) { setLyricIdx(0); return; }
      const frac = Math.max(0, Math.min(1, elapsed / (extractMs || DEFAULT_EXTRACT_MS)));
      setLyricIdx(Math.min(lyrics.length - 1, Math.floor(frac * lyrics.length)));
    }, 150);
    return () => clearInterval(iv);
  }, [phase, lyrics, extractMs]);

  /* ---------------- countdown of remaining time ---------------- */
  useEffect(() => {
    if (phase !== 'preview' && phase !== 'perform') { setSecondsLeft(0); return; }
    const iv = setInterval(() => {
      const remain = Math.max(0, Math.ceil((performEndRef.current - Date.now()) / 1000));
      setSecondsLeft(remain);
    }, 200);
    return () => clearInterval(iv);
  }, [phase, singerId]);

  /* ---------------- channel ---------------- */
  useEffect(() => {
    const channel = supabase.channel(`mimic:${lobbyId}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'phase' }, ({ payload }) => applyPhase(payload as MimicPayload))
      .on('broadcast', { event: 'score' }, ({ payload }) => {
        const s = payload as { playerId: string; live: number };
        if (s.playerId !== currentPlayer.id) setLiveScore(s.live);
      })
      .on('broadcast', { event: 'mic-ready' }, ({ payload }) => {
        const status = payload as { playerId: string; ready: boolean };
        setMicReadyIds((previous) => {
          const next = new Set(previous);
          if (status.ready) next.add(status.playerId);
          else next.delete(status.playerId);
          return next;
        });
      })
      .on('broadcast', { event: 'state-req' }, ({ payload }) => {
        if (!isHost || !lastPhaseRef.current) return;
        const request = payload as { clientId: string };
        channelRef.current?.send({ type: 'broadcast', event: 'state-res', payload: { clientId: request.clientId, state: lastPhaseRef.current } });
      })
      .on('broadcast', { event: 'state-res' }, ({ payload }) => {
        const response = payload as { clientId: string; state: MimicPayload };
        if (response.clientId === currentPlayer.id) applyPhase(response.state);
      })
      .on('broadcast', { event: 'final' }, ({ payload }) => {
        const r = payload as { playerId: string; result: MimicResult };
        resultsRef.current = { ...resultsRef.current, [r.playerId]: r.result };
        setResults({ ...resultsRef.current });
      })
      .on('broadcast', { event: 'react' }, ({ payload }) => {
        const e = payload as { emoji: string; id: number };
        setReactions((prev) => [...prev.slice(-14), e]);
        setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== e.id)), 2600);
      })
      .on('broadcast', { event: 'rtc' }, ({ payload }) => {
        const sig = payload as { kind: 'offer' | 'answer' | 'ice'; to: string };
        if (sig.to !== currentPlayer.id) return;
        voiceMeshRef.current?.handleSignal(sig as any);
      })
      .on('broadcast', { event: 'sync-req' }, ({ payload }) => {
        if (!isHost) return;
        const q = payload as { clientId: string; clientNow: number };
        channelRef.current?.send({ type: 'broadcast', event: 'sync-res', payload: { clientId: q.clientId, clientNow: q.clientNow, hostNow: Date.now() } });
      })
      .on('broadcast', { event: 'sync-res' }, ({ payload }) => {
        const r = payload as { clientId: string; clientNow: number; hostNow: number };
        if (r.clientId !== currentPlayer.id) return;
        const now = Date.now();
        const rtt = now - r.clientNow;
        if (rtt < 0 || rtt > 5000) return;
        if (rtt < bestRttRef.current) { bestRttRef.current = rtt; clockOffsetRef.current = (r.hostNow + rtt / 2) - now; }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannelReady(true);
          if (!isHost) {
            void channel.send({ type: 'broadcast', event: 'state-req', payload: { clientId: currentPlayer.id } });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setChannelReady(false);
        }
      });

    let syncIv: ReturnType<typeof setInterval> | null = null;
    if (!isHost) {
      const ping = () => channel.send({ type: 'broadcast', event: 'sync-req', payload: { clientId: currentPlayer.id, clientNow: Date.now() } });
      const quick = [200, 500, 1000, 2000].map((t) => setTimeout(ping, t));
      syncIv = setInterval(ping, 5000);
      cleanups.current.push(() => { quick.forEach(clearTimeout); if (syncIv) clearInterval(syncIv); });
    }

    return () => {
      mountedRef.current = false;
      cleanups.current.forEach((fn) => fn());
      if (timerRef.current) clearTimeout(timerRef.current);
      stopMic();
      stopMesh();
      stopMedia();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  useEffect(() => {
    if (!channelReady || !localMicReady || phase !== 'setup') return;
    const announce = () => channelRef.current?.send({ type: 'broadcast', event: 'mic-ready', payload: { playerId: currentPlayer.id, ready: true } });
    void announce();
    const interval = setInterval(announce, 2500);
    return () => clearInterval(interval);
  }, [channelReady, currentPlayer.id, localMicReady, phase]);

  const broadcast = useCallback((payload: MimicPayload) => {
    lastPhaseRef.current = payload;
    channelRef.current?.send({ type: 'broadcast', event: 'phase', payload });
  }, []);
  const wait = (ms: number) => new Promise<void>((res) => { const t = setTimeout(res, ms); cleanups.current.push(() => clearTimeout(t)); });

  /* ---------------- reactions ---------------- */
  const sendReaction = (emoji: string) => channelRef.current?.send({ type: 'broadcast', event: 'react', payload: { emoji, id: Date.now() + Math.random() } });

  /* ---------------- host game loop ---------------- */
  const runGame = useCallback(async () => {
    try {
      const connected = players.filter((p) => !p.isDisconnected);
      const ord = shuffle(connected.map((p) => p.id));

      // fetch a playable song with lyrics (try a few). Each network call below
      // already has its own hard timeout (itunes ~8s, lrclib ~6s), but we also
      // cap the whole search so a slow/flaky network never freezes the host
      // on "Préparation…" forever.
      let chosen: { song: Song; lines: LyricLine[]; ms: number } | null = null;
      for (let attempt = 0; attempt < 6 && !chosen && mountedRef.current; attempt++) {
        const s = pickRandomSong(playedSongsRef.current);
        playedSongsRef.current.add(s.title.toLowerCase());
        try {
          const results = await itunesSearch(s.query);
          const best = pickBestPreview(results, { answer: s.title, category: 'music', query: s.query });
          if (!best) continue;
          const ly = await fetchMimicLyrics(best.trackName || s.title, best.artistName || s.artist);
          if (!ly.lines.length) continue;
          chosen = {
            song: { title: s.title, artist: best.artistName || s.artist, artwork: best.artworkUrl, previewUrl: best.previewUrl },
            lines: pickExtractLines(ly.lines, 8),
            ms: DEFAULT_EXTRACT_MS,
          };
        } catch { /* try the next song */ }
      }
      if (!mountedRef.current) return;
      if (!chosen) { setSearchFailed(true); return; }

      resultsRef.current = {};
      setResults({});

      // PREVIEW (everyone listens, no mic)
      const previewStart = Date.now() + SYNC_BUFFER_MS + clockOffsetRef.current;
      broadcast({ phase: 'preview', song: chosen.song, lyrics: chosen.lines, extractMs: chosen.ms, order: ord, totalTurns: ord.length, startAt: previewStart });
      await wait(SYNC_BUFFER_MS + chosen.ms + 1200);
      if (!mountedRef.current) return;

      // PERFORM turns
      for (let i = 0; i < ord.length; i++) {
        const startAt = Date.now() + SYNC_BUFFER_MS + COUNTDOWN_MS + clockOffsetRef.current;
        broadcast({ phase: 'perform', song: chosen.song, lyrics: chosen.lines, extractMs: chosen.ms, order: ord, singerId: ord[i], turnIndex: i, totalTurns: ord.length, startAt });
        // wait: buffer + countdown + extract + grace for the singer's 'final'
        await wait(SYNC_BUFFER_MS + COUNTDOWN_MS + chosen.ms + 1600);
        if (!mountedRef.current) return;
        // ensure a result exists (default modest score if singer had no mic / left)
        if (!resultsRef.current[ord[i]]) {
          resultsRef.current[ord[i]] = { mimic: 0, sub: { paroles: 0, justesse: 0, rythme: 0, synchro: 0, dynamique: 0, stabilite: 0 } };
        }
        await wait(700);
      }

      if (!mountedRef.current) return;
      broadcast({ phase: 'results', results: { ...resultsRef.current } });
    } catch {
      // Any unexpected error (network throw, etc.) must never leave the host
      // stuck on "Préparation…" with no feedback.
      if (mountedRef.current) setSearchFailed(true);
    } finally {
      if (mountedRef.current) { setStarting(false); startedRef.current = false; }
    }
  }, [players, broadcast]);

  const startGame = useCallback(async () => {
    if (startedRef.current || !allMicsReady) return;
    startedRef.current = true;
    setStarting(true);
    setSearchFailed(false);
    // unlock audio on this gesture
    try { const el = mediaRef.current; if (el) { el.muted = true; await el.play().catch(() => {}); el.pause(); el.muted = muted; } } catch { /* noop */ }
    await runGame();
  }, [runGame, muted, allMicsReady]);

  const replay = useCallback(() => {
    if (!isHost) return;
    startedRef.current = false;
    setStarting(false);
    setResults({});
    resultsRef.current = {};
    startGame();
  }, [isHost, startGame]);

  /* ---------------- singer: finalize at end of own turn ---------------- */
  useEffect(() => {
    if (phase !== 'perform' || singerId !== currentPlayer.id) return;
    // schedule finalize slightly after the extract ends (performEndRef already
    // accounts for the 3-2-1 lead, since startAt included it).
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const delay = performEndRef.current + 250 - Date.now();
      if (delay > 0) { const t = setTimeout(schedule, Math.min(delay, 1000)); cleanups.current.push(() => clearTimeout(t)); return; }
      stopMic();
      const result = analyzerRef.current ? analyzerRef.current.finalize() : { mimic: 0, sub: { paroles: 0, justesse: 0, rythme: 0, synchro: 0, dynamique: 0, stabilite: 0 } };
      if (micError) result.mimic = 0;
      resultsRef.current = { ...resultsRef.current, [currentPlayer.id]: result };
      setResults({ ...resultsRef.current });
      channelRef.current?.send({ type: 'broadcast', event: 'final', payload: { playerId: currentPlayer.id, result } });
      playSoundEffect('start', 0.4);
    };
    const t0 = setTimeout(schedule, 500);
    return () => { cancelled = true; clearTimeout(t0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, singerId, turnIndex]);

  const toggleMute = () => setVolume((v) => (v === 0 ? 75 : 0));

  /* ---------------- derived ---------------- */
  const singerName = singerId ? (namesById[singerId] || 'Joueur') : '';
  const isMeSinging = phase === 'perform' && singerId === currentPlayer.id;
  const ranked = useMemo(() => Object.entries(results)
    .map(([id, r]) => ({ id, name: namesById[id] || 'Joueur', ...r }))
    .sort((a, b) => b.mimic - a.mimic), [results, namesById]);
  const progress = (phase === 'preview' || phase === 'perform')
    ? Math.max(0, Math.min(1, (performEndRef.current - Date.now()) / (extractMs || DEFAULT_EXTRACT_MS))) : 0;

  /* ============================================================ */
  return (
    <div className="ibs-shell ibs-mimic menu-surface menu-screen-safe h-screen w-full flex flex-col items-center text-white relative overflow-hidden" style={{ background: MIMIC.bg }}>
      <audio ref={mediaRef} className="hidden" preload="auto" onPlaying={() => setNeedsSoundUnlock(false)} />
      {/* live voice of the current singer (spectators) */}
      <audio ref={remoteAudioRef} className="hidden" autoPlay playsInline />

      {/* background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ background: MIMIC.bg }}>
        <motion.div className="absolute rounded-full" style={{ width: '60vw', height: '60vw', top: '-18%', left: '20%', background: `radial-gradient(circle, ${MIMIC.gold}33, transparent 65%)`, filter: 'blur(90px)' }} animate={{ opacity: [0.5, 0.85, 0.5] }} transition={{ duration: 5, repeat: Infinity }} />
        <div className="absolute rounded-full" style={{ width: '45vw', height: '45vw', bottom: '-15%', left: '-8%', background: `radial-gradient(circle, ${MIMIC.magenta}2e, transparent 65%)`, filter: 'blur(100px)' }} />
        <div className="absolute rounded-full" style={{ width: '45vw', height: '45vw', bottom: '-12%', right: '-8%', background: `radial-gradient(circle, ${MIMIC.violet}2e, transparent 65%)`, filter: 'blur(100px)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }} />
      </div>

      {/* header */}
      <div className="ibs-studio-header relative z-10 w-full flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: MIMIC_SPECTRUM, boxShadow: mglow(MIMIC.magenta, 0.4) }}>
            <Mic className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-none tracking-tight" style={{ background: MIMIC_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MIMIC</h1>
            <p className="text-[11px] font-medium tracking-wide" style={{ color: MIMIC.sub }}>Karaoké compétitif</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(phase === 'perform') && <div className="px-3 py-1.5 rounded-full text-sm font-black tabular-nums" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${MIMIC.hair}` }}>{turnIndex + 1}/{totalTurns}</div>}
          <button type="button" onClick={toggleMute} className="menu-icon-control w-11 h-11 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${MIMIC.hair}` }} aria-label={muted ? 'Activer le son' : 'Couper le son'} aria-pressed={muted}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
          <button type="button" data-back onClick={onEndGame} className="menu-action flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/80 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${MIMIC.hair}` }} aria-label="Retour au lobby"><LogOut className="w-4 h-4" /><span className="text-sm font-bold hidden sm:inline">Retour</span></button>
        </div>
      </div>

      {/* body */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4 min-h-0 overflow-y-auto custom-scrollbar py-4">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid w-full max-w-4xl gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="ibs-panel flex flex-col gap-5 p-5 sm:p-7" style={{ '--menu-accent': MIMIC.magenta } as React.CSSProperties}>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: MIMIC_SPECTRUM, boxShadow: mglow(MIMIC.magenta, 0.45) }}>
                    <Mic className="h-9 w-9 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <span className="ibs-eyebrow">LIVE VOCAL · TOUR PAR TOUR</span>
                    <h2 className="text-4xl font-black tracking-tight" style={{ background: MIMIC_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MIMIC STAGE</h2>
                    <p className="mt-1 text-sm" style={{ color: MIMIC.sub }}>Imite rythme, énergie et justesse. Les autres joueurs t’écoutent en direct.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/[0.04] p-3"><Music2 className="mx-auto mb-1 h-4 w-4" style={{ color: MIMIC.gold }} /><strong className="block text-white">Preview iTunes</strong></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><Mic className="mx-auto mb-1 h-4 w-4" style={{ color: MIMIC.magenta }} /><strong className="block text-white">Voix WebRTC</strong></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><Trophy className="mx-auto mb-1 h-4 w-4" style={{ color: MIMIC.emerald }} /><strong className="block text-white">Score live</strong></div>
                </div>
                <MimicMicCheck onReadyChange={reportMicReady} />
              </section>

              <aside className="ibs-panel flex flex-col gap-4 p-5 sm:p-6" style={{ '--menu-accent': MIMIC.emerald } as React.CSSProperties}>
                <div className="flex items-end justify-between gap-3">
                  <div className="ibs-section-heading"><span>CHECK-IN STUDIO</span><h3>Micros des joueurs</h3></div>
                  <span className={`ibs-status ${allMicsReady ? 'ibs-status--online' : 'ibs-status--network'}`}>{readyMicCount}/{connectedPlayerIds.length} prêts</span>
                </div>
                <div className="grid gap-2" role="list" aria-label="État des microphones">
                  {players.filter((player) => !player.isDisconnected).map((player) => {
                    const ready = micReadyIds.has(player.id);
                    const avatar = getAvatar(player.id);
                    const image = avatar?.type === 'image' && avatar.imageUrl ? avatar.imageUrl : null;
                    return (
                      <div key={player.id} role="listitem" className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-xs font-black">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : player.name.slice(0, 1).toUpperCase()}</div>
                        <span className="min-w-0 flex-1 truncate font-bold text-white">{player.name}{player.id === currentPlayer.id ? ' · toi' : ''}</span>
                        <span className={`ibs-status ${ready ? 'ibs-status--online' : 'ibs-status--neutral'}`}>{ready ? 'MICRO PRÊT' : 'EN ATTENTE'}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto">
                  {isHost ? (
                    <motion.button onClick={startGame} disabled={!channelReady || starting || !allMicsReady} aria-busy={starting} whileHover={channelReady && allMicsReady && !starting ? { scale: 1.02 } : undefined} whileTap={channelReady && allMicsReady && !starting ? { scale: 0.98 } : undefined}
                      className="menu-focus flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-xl font-black text-white"
                      style={{ background: channelReady && allMicsReady && !starting ? MIMIC_SPECTRUM : 'rgba(255,255,255,0.06)', boxShadow: channelReady && allMicsReady && !starting ? `0 10px 34px ${MIMIC.magenta}55` : 'none', opacity: channelReady && allMicsReady && !starting ? 1 : 0.55 }}>
                      {starting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-white" />}
                      {starting ? 'Préparation…' : !allMicsReady ? 'MICROS EN ATTENTE' : searchFailed ? 'RÉESSAYER' : 'OUVRIR LA SCÈNE'}
                    </motion.button>
                  ) : <p className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center font-bold" style={{ color: MIMIC.sub }}>L’hôte ouvrira la scène quand tous les micros seront prêts.</p>}
                  {starting && <p className="mt-2 text-center text-xs" style={{ color: MIMIC.sub }}>Recherche d’une chanson avec paroles… (max ~1 min)</p>}
                  {!starting && searchFailed && <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold" style={{ color: MIMIC.rose }}><AlertTriangle className="h-4 w-4" /> Réseau lent ou bloqué. Réessaie.</p>}
                </div>
              </aside>
            </motion.div>
          )}

          {(phase === 'preview' || phase === 'perform') && song && (
            <motion.div key="stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-xl flex flex-col items-center gap-4">
              {/* status line */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {phase === 'preview' ? (
                  <span className="px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2" style={{ background: `${MIMIC.gold}22`, border: `1px solid ${MIMIC.gold}66`, color: MIMIC.gold }}><Music2 className="w-4 h-4" /> Écoute attentivement — à toi de chanter ensuite</span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2" style={{ background: isMeSinging ? `${MIMIC.magenta}26` : 'rgba(255,255,255,0.06)', border: `1px solid ${isMeSinging ? MIMIC.magenta : MIMIC.hair}`, color: isMeSinging ? '#fff' : MIMIC.sub }}>
                    {isMeSinging ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} {isMeSinging ? 'À TOI DE CHANTER !' : `${singerName} chante`}
                  </span>
                )}
                <span className="px-3.5 py-1.5 rounded-full text-sm font-bold tabular-nums" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${MIMIC.hair}` }}>{secondsLeft}s</span>
              </div>

              {/* Mimic % (perform only) */}
              {phase === 'perform' && (
                <div className="flex flex-col items-center -mb-1">
                  <span className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: MIMIC.sub }}>Mimic</span>
                  <motion.span key={Math.round(liveScore / 2)} className="text-6xl font-black tabular-nums leading-none" style={{ color: scoreColor(liveScore), textShadow: `0 0 30px ${scoreColor(liveScore)}88` }}>{liveScore}%</motion.span>
                </div>
              )}

              {/* artwork */}
              <div className="relative rounded-[1.6rem] overflow-hidden flex items-center justify-center"
                style={{ width: 'min(70vw, 22rem)', height: 'min(70vw, 22rem)', border: `1px solid ${MIMIC.hair}`, boxShadow: `0 30px 90px rgba(0,0,0,0.6), ${mglow(MIMIC.violet, 0.35)}` }}>
                {song.artwork ? (
                  <motion.img src={song.artwork} alt={song.title} className="w-full h-full object-cover" animate={isMeSinging ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: 'linear-gradient(180deg,#fff,#eef0f4)' }}>
                    <span className="font-black" style={{ color: '#0d0d14', fontSize: 'clamp(1.4rem,5vw,2.4rem)' }}>{song.title}</span>
                  </div>
                )}
                {countdown != null && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <motion.span key={countdown} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-8xl font-black" style={{ color: MIMIC.gold, textShadow: `0 0 30px ${MIMIC.gold}` }}>{countdown}</motion.span>
                  </div>
                )}
              </div>
              <div className="text-center -mt-1">
                <p className="text-lg font-black">{song.title}</p>
                <p className="text-sm" style={{ color: MIMIC.sub }}>{song.artist}</p>
              </div>

              {/* lyrics teleprompter */}
              <div className="w-full flex flex-col items-center gap-1.5 px-2 min-h-[7rem]">
                {lyrics.length ? lyrics.slice(Math.max(0, lyricIdx - 1), lyricIdx + 3).map((l, k) => {
                  const isCurrent = (Math.max(0, lyricIdx - 1) + k) === lyricIdx;
                  return (
                    <p key={k} className="text-center font-black leading-tight transition-all"
                      style={{ fontSize: isCurrent ? '1.4rem' : '1rem', color: isCurrent ? '#fff' : MIMIC.sub, textShadow: isCurrent ? `0 0 18px ${MIMIC.violet}aa` : 'none', opacity: isCurrent ? 1 : 0.5 }}>
                      {l.text}
                    </p>
                  );
                }) : <p className="text-sm" style={{ color: MIMIC.sub }}>🎵 Suis la mélodie…</p>}
              </div>

              {needsSoundUnlock && (
                <motion.button onClick={playFromStart} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black" style={{ background: MIMIC_SPECTRUM }}>
                  <Volume2 className="w-5 h-5" /> Activer le son 🔊
                </motion.button>
              )}
              {isMeSinging && micError && (
                <p className="flex items-center gap-2 text-sm font-bold" style={{ color: MIMIC.rose }}><AlertTriangle className="w-4 h-4" /> Micro indisponible — active-le pour être noté.</p>
              )}

              {/* reactions bar (spectators) */}
              {phase === 'perform' && !isMeSinging && (
                <div className="flex gap-2">
                  {['👏', '🔥', '😂', '❤️', '⭐', '🎉'].map((e) => (
                    <button key={e} type="button" onClick={() => sendReaction(e)} className="menu-icon-control w-11 h-11 rounded-full text-xl flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${MIMIC.hair}` }} aria-label={`Réagir ${e}`}>{e}</button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md flex flex-col items-center gap-5">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }}><Trophy className="w-16 h-16" style={{ color: MIMIC.gold, filter: `drop-shadow(0 6px 22px ${MIMIC.gold}88)` }} /></motion.div>
              <h2 className="text-4xl font-black tracking-tight" style={{ background: MIMIC_SPECTRUM, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Classement Mimic</h2>
              {song && <p className="text-sm -mt-3" style={{ color: MIMIC.sub }}>{song.title} — {song.artist}</p>}
              <div className="w-full space-y-2.5">
                {ranked.map((p, i) => {
                  const av = getAvatar(p.id); const img = av?.type === 'image' && av.imageUrl ? av.imageUrl : null;
                  return (
                    <motion.div key={p.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white"
                      style={{ border: `1px solid ${i === 0 ? MIMIC.gold : MIMIC.hair}`, background: i === 0 ? `linear-gradient(90deg, ${MIMIC.gold}22, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.03)', boxShadow: i === 0 ? mglow(MIMIC.gold, 0.3) : 'none' }}>
                      <span className="text-2xl font-black w-8 text-center flex-shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)', border: `2px solid ${i === 0 ? MIMIC.gold : MIMIC.hair}` }}>
                        {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : (p.name[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold truncate block">{p.name}{p.id === currentPlayer.id ? ' (toi)' : ''}</span>
                        <span className="text-xs" style={{ color: MIMIC.sub }}>{mimicComment(p)}</span>
                      </div>
                      <span className="font-black text-xl tabular-nums flex-shrink-0" style={{ color: scoreColor(p.mimic) }}>{p.mimic}%</span>
                    </motion.div>
                  );
                })}
                {ranked.length === 0 && <p className="text-center text-base" style={{ color: MIMIC.sub }}>Aucun score</p>}
              </div>
              <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
                {isHost ? (
                  <motion.button onClick={replay} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="px-8 py-3.5 rounded-2xl font-black text-xl text-white flex items-center gap-2" style={{ background: MIMIC_SPECTRUM, boxShadow: `0 12px 40px ${MIMIC.magenta}55` }}><RotateCcw className="w-5 h-5" /> Rejouer</motion.button>
                ) : (
                  <span className="px-5 py-2 rounded-full text-sm" style={{ color: MIMIC.sub, background: 'rgba(255,255,255,0.05)', border: `1px solid ${MIMIC.hair}` }}>En attente de l'hôte…</span>
                )}
                <motion.button onClick={onEndGame} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="px-8 py-3.5 rounded-2xl font-black text-xl" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${MIMIC.hair}`, color: '#fff' }}>Retour au lobby</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* floating reactions */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 0, x: `${20 + Math.random() * 60}vw`, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: -260, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 2.6, ease: 'easeOut' }} className="absolute bottom-24 text-4xl">{r.emoji}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MimicGameScreen;
