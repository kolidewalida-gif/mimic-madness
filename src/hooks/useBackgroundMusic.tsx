import {
  createContext, useContext, useEffect, useRef, useState,
  ReactNode, useCallback, useMemo,
} from 'react';

// Bande-son du jeu : 3 pistes, jouées en playlist continue.
import neonPirate from '@/assets/music/neon-pirate.mp3.asset.json';
import captainRoxas from '@/assets/music/captain-roxas.mp3.asset.json';
import myLuckySpot from '@/assets/music/my-lucky-spot.mp3.asset.json';

export interface MusicTrack {
  id: number;
  name: string;
  src: string;
  moods?: MusicMood[];
  /** Style label shown in the player, mirrors scripts/generate_original_music.py. */
  genre?: string;
  bpm?: number;
}

export type MusicMood = 'chill' | 'energetic' | 'tense' | 'epic' | 'mysterious' | 'playful';

export type MusicSituation =
  | 'home' | 'lobby' | 'preparation' | 'preview' | 'round'
  | 'playing' | 'voting' | 'victory' | 'defeat'
  | 'undercover' | 'audiophone' | 'audiophone-rewind' | 'quiz'
  | 'monopoly' | 'pixoguess' | 'team-showdown'
  | 'blindtest' | 'mimic-waiting' | 'mimic-results' | 'connection';

interface SituationOverride {
  situation: MusicSituation;
  priority: number;
  source: string;
  expiresAt: number | null;
}

interface SetSituationOptions {
  priority?: number;
  holdMs?: number;
  source?: string;
}

const musicTracks: MusicTrack[] = [
  { id: 400, name: 'Neon Pirate', src: neonPirate.url },
  { id: 401, name: 'Captain Roxas — Super', src: captainRoxas.url },
  { id: 402, name: 'My Lucky Spot', src: myLuckySpot.url },
];

/**
 * La playlist ne dépend plus de la situation de jeu : les 3 pistes
 * s'enchaînent en boucle, quel que soit l'écran.
 */
function nextTrackIndex(current: number): number {
  return (current + 1) % musicTracks.length;
}

/** Normalise a src to a comparable key (strip origin for absolute URLs). */
const normSrc = (src: string): string => {
  try {
    const u = new URL(src, window.location.href);
    return u.pathname + u.search;
  } catch {
    return src;
  }
};

interface BackgroundMusicContextType {
  volume: number;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  pause: () => void;
  play: () => void;
  currentTrack: MusicTrack | null;
  tracks: MusicTrack[];
  nextTrack: () => void;
  previousTrack: () => void;
  selectTrack: (id: number) => void;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  autoMode: boolean;
  setAutoMode: (v: boolean) => void;
  situation: MusicSituation;
  setSituation: (s: MusicSituation, options?: SetSituationOptions) => void;
  clearSituationOverride: (source?: string) => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const BackgroundMusicProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem('backgroundMusicVolume');
    if (stored === null) return 0.3;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.3;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const storedId = Number(localStorage.getItem('backgroundMusicTrackId'));
    const byId = musicTracks.findIndex((track) => track.id === storedId);
    return byId >= 0 ? byId : 0;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Deux éléments audio pour permettre un vrai crossfade (A/B). */
  const decksRef = useRef<HTMLAudioElement[]>([]);
  const activeDeckRef = useRef(0);
  const crossfadingRef = useRef(false);
  const hasInteracted = useRef(false);
  const fadeAbortRef = useRef<{ aborted: boolean } | null>(null);
  const progressTimerRef = useRef<number>(0);

/** Durée du fondu enchaîné entre deux pistes (ms). */
const CROSSFADE_MS = 3000;

  // Keep refs in sync so callbacks always see the latest values without
  // being recreated (avoids the audio element teardown/recreate loop).
  const volumeRef = useRef(volume);
  const isPlayingRef = useRef(isPlaying);
  const situationRef = useRef<MusicSituation>('home');
  const autoModeRef = useRef(true);
  const currentTrackIndexRef = useRef(currentTrackIndex);

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex; }, [currentTrackIndex]);

  // ── Situation state ──────────────────────────────────────────────────────
  const [autoMode, setAutoModeState] = useState<boolean>(() => {
    const s = localStorage.getItem('backgroundMusicAuto');
    return s === null ? true : s === 'true';
  });
  const [baseSituation, setBaseSituation] = useState<MusicSituation>('home');
  const [situationOverrides, setSituationOverrides] = useState<SituationOverride[]>([]);
  const lastAutoSituation = useRef<MusicSituation | null>(null);

  useEffect(() => {
    autoModeRef.current = autoMode;
    // Jamais de boucle sur une seule piste : la playlist enchaîne les morceaux.
    if (audioRef.current) audioRef.current.loop = false;
  }, [autoMode]);

  const setAutoMode = useCallback((v: boolean) => {
    setAutoModeState(v);
    localStorage.setItem('backgroundMusicAuto', String(v));
  }, []);

  const clearSituationOverride = useCallback((source?: string) => {
    setSituationOverrides((current) => (
      source ? current.filter((item) => item.source !== source) : []
    ));
  }, []);

  const setSituation = useCallback((s: MusicSituation, options?: SetSituationOptions) => {
    const priority = options?.priority ?? 0;
    if (priority > 0) {
      const next: SituationOverride = {
        situation: s,
        priority,
        source: options?.source ?? 'unknown',
        expiresAt: options?.holdMs ? Date.now() + options.holdMs : null,
      };
      setSituationOverrides((current) => {
        const now = Date.now();
        const active = current.filter((item) => (
          item.source !== next.source
          && (item.expiresAt === null || item.expiresAt > now)
        ));
        return [...active, next];
      });
      return;
    }
    setBaseSituation(s);
  }, []);

  // Auto-expire only the overrides whose hold duration elapsed. Lower-priority
  // situations stay in the stack and become active again afterwards.
  useEffect(() => {
    const expirations = situationOverrides
      .map((item) => item.expiresAt)
      .filter((expiresAt): expiresAt is number => expiresAt !== null);
    if (expirations.length === 0) return;
    const nextExpiration = Math.min(...expirations);
    const timer = window.setTimeout(() => {
      const now = Date.now();
      setSituationOverrides((current) => current.filter((item) => (
        item.expiresAt === null || item.expiresAt > now
      )));
    }, Math.max(nextExpiration - Date.now(), 0) + 20);
    return () => window.clearTimeout(timer);
  }, [situationOverrides]);

  const situation = useMemo<MusicSituation>(() => {
    const now = Date.now();
    let selected: SituationOverride | null = null;
    for (const candidate of situationOverrides) {
      if (candidate.expiresAt !== null && candidate.expiresAt <= now) continue;
      if (!selected || candidate.priority >= selected.priority) selected = candidate;
    }
    return selected?.situation ?? baseSituation;
  }, [baseSituation, situationOverrides]);

  useEffect(() => { situationRef.current = situation; }, [situation]);

  const currentTrack = useMemo(() => musicTracks[currentTrackIndex] ?? null, [currentTrackIndex]);

  // ── Cross-fade helper (A/B decks, aucun blanc entre les pistes) ──────────
  const fadeAndLoad = useCallback((
    nextSrc: string,
    targetVol: number,
    wasPlaying: boolean,
    fadeMs = CROSSFADE_MS,
  ) => {
    const decks = decksRef.current;
    const current = decks[activeDeckRef.current];
    const incoming = decks[1 - activeDeckRef.current];
    if (!current || !incoming) return;

    // Même piste déjà en cours ? On ajuste juste le volume.
    if (current.src && normSrc(current.src) === normSrc(nextSrc) && !current.paused) {
      current.volume = targetVol;
      return;
    }

    if (fadeAbortRef.current) fadeAbortRef.current.aborted = true;
    const token = { aborted: false };
    fadeAbortRef.current = token;

    incoming.src = nextSrc;
    incoming.preload = 'auto';
    incoming.volume = 0;
    incoming.currentTime = 0;

    // Le deck entrant devient l'actif (progression / ended le suivent).
    activeDeckRef.current = 1 - activeDeckRef.current;
    audioRef.current = incoming;

    if (!wasPlaying) {
      incoming.load();
      incoming.volume = targetVol;
      current.pause();
      crossfadingRef.current = false;
      return;
    }

    const startVol = current.paused ? 0 : current.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      if (token.aborted) return;
      const t = Math.min(1, (now - t0) / fadeMs);
      // Fondu en puissance constante pour éviter le creux de volume.
      incoming.volume = Math.max(0, Math.min(1, targetVol * Math.sin((t * Math.PI) / 2)));
      if (!current.paused) {
        current.volume = Math.max(0, Math.min(1, startVol * Math.cos((t * Math.PI) / 2)));
      }
      if (t < 1) { requestAnimationFrame(step); return; }
      current.pause();
      current.volume = 0;
      crossfadingRef.current = false;
    };

    incoming.play()
      .then(() => {
        if (token.aborted) return;
        setIsPlaying(true);
        requestAnimationFrame(step);
      })
      .catch(() => { crossfadingRef.current = false; });
  }, []);

  // ── Audio element — created once, never torn down ────────────────────────
  useEffect(() => {
    const decks = [new Audio(), new Audio()];
    decks.forEach((el) => {
      el.preload = 'none';
      el.loop = false;
      el.volume = 0;
    });
    decks[0].volume = volumeRef.current;
    decksRef.current = decks;
    activeDeckRef.current = 0;
    audioRef.current = decks[0];

    const isActive = (el: HTMLAudioElement) => decksRef.current[activeDeckRef.current] === el;
    const goNext = () => {
      crossfadingRef.current = true;
      setCurrentTrackIndex(nextTrackIndex(currentTrackIndexRef.current));
    };

    const cleanups = decks.map((el) => {
      const onEnded = () => { if (isActive(el) && !crossfadingRef.current) goNext(); };
      const onError = () => { if (isActive(el)) goNext(); };
      const onTimeUpdate = () => {
        if (!isActive(el)) return;
        // Déclenche le fondu enchaîné avant la fin : aucun blanc entre les pistes.
        if (
          !crossfadingRef.current
          && isPlayingRef.current
          && Number.isFinite(el.duration)
          && el.duration > CROSSFADE_MS / 1000 + 1
          && el.duration - el.currentTime <= CROSSFADE_MS / 1000
        ) {
          goNext();
          return;
        }
        const now = Date.now();
        if (now - progressTimerRef.current > 250) {
          progressTimerRef.current = now;
          setProgress(el.currentTime);
        }
      };
      const onMeta = () => { if (isActive(el)) setDuration(el.duration); };
      const onPlay = () => { if (isActive(el)) setIsPlaying(true); };
      const onPause = () => { if (isActive(el) && !crossfadingRef.current) setIsPlaying(false); };

      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);
      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onMeta);
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);

      return () => {
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('loadedmetadata', onMeta);
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.pause();
      };
    });

    return () => {
      cleanups.forEach((fn) => fn());
      decksRef.current = [];
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: audio element lives for the entire session

  // ── Load track when index changes ────────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    const track = musicTracks[currentTrackIndex];
    if (!el || !track) return;
    localStorage.setItem('backgroundMusicTrackId', String(track.id));
    localStorage.removeItem('backgroundMusicTrack');
    fadeAndLoad(track.src, volumeRef.current, isPlayingRef.current);
  }, [currentTrackIndex, fadeAndLoad]);

  // ── Auto-start on first user gesture ────────────────────────────────────
  useEffect(() => {
    // Try immediately (works for returning users / PWA)
    const tryPlay = () => {
      const el = audioRef.current;
      if (!el) return;
      if (!el.src) {
        el.src = musicTracks[currentTrackIndexRef.current]?.src ?? '';
        el.preload = 'auto';
      }
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    };
    tryPlay();

    const onGesture = () => {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      tryPlay();
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Controls ─────────────────────────────────────────────────────────────
  const setVolume = useCallback((v: number) => {
    const safe = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.3;
    setVolumeState(safe);
    volumeRef.current = safe;
    if (audioRef.current) audioRef.current.volume = safe;
    localStorage.setItem('backgroundMusicVolume', String(safe));
  }, []);

  const pause = useCallback(() => {
    if (fadeAbortRef.current) fadeAbortRef.current.aborted = true;
    crossfadingRef.current = false;
    decksRef.current.forEach((el) => el.pause());
    if (audioRef.current) audioRef.current.volume = volumeRef.current;
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    hasInteracted.current = true;
    const el = audioRef.current;
    if (!el) return;
    if (!el.src) {
      el.src = musicTracks[currentTrackIndexRef.current]?.src ?? '';
      el.preload = 'auto';
    }
    el.play().then(() => setIsPlaying(true)).catch(console.error);
  }, []);

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((p) => (p + 1) % musicTracks.length);
  }, []);

  const previousTrack = useCallback(() => {
    setCurrentTrackIndex((p) => (p - 1 + musicTracks.length) % musicTracks.length);
  }, []);

  const selectTrack = useCallback((id: number) => {
    const idx = musicTracks.findIndex((t) => t.id === id);
    if (idx !== -1) setCurrentTrackIndex(idx);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const ctx = useMemo<BackgroundMusicContextType>(() => ({
    volume, setVolume, isPlaying, pause, play,
    currentTrack, tracks: musicTracks,
    nextTrack, previousTrack, selectTrack,
    progress, duration, seek,
    autoMode, setAutoMode,
    situation, setSituation, clearSituationOverride,
  }), [
    volume, setVolume, isPlaying, pause, play,
    currentTrack, nextTrack, previousTrack, selectTrack,
    progress, duration, seek,
    autoMode, setAutoMode,
    situation, setSituation, clearSituationOverride,
  ]);

  return (
    <BackgroundMusicContext.Provider value={ctx}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const ctx = useContext(BackgroundMusicContext);
  if (!ctx) throw new Error('useBackgroundMusic must be used within BackgroundMusicProvider');
  return ctx;
};
