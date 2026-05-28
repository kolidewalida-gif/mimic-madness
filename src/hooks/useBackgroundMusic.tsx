import {
  createContext, useContext, useEffect, useRef, useState,
  ReactNode, useCallback, useMemo,
} from 'react';

// Import music files
import music1 from '@/assets/background-music-1.mp3';
import music2 from '@/assets/background-music-2.mp3';
import music3 from '@/assets/background-music-3.mp3';
import music4 from '@/assets/background-music-4.mp3';
import music5 from '@/assets/background-music-5.mp3';
import music6 from '@/assets/background-music-6.mp3';
import music7 from '@/assets/background-music-7.mp3';
import music8 from '@/assets/background-music-8.mp3';
import music9 from '@/assets/background-music-9.mp3';
import music10 from '@/assets/background-music-10.mp3';
import music11 from '@/assets/background-music-11.mp3';
import music12 from '@/assets/background-music-12.mp3';
import music13 from '@/assets/background-music-13.mp3';

import aLobby from '@/assets/adaptive/lobby.mp3';
import aLobby2 from '@/assets/adaptive/lobby2.mp3';
import aGameplay from '@/assets/adaptive/gameplay.mp3';
import aVote from '@/assets/adaptive/vote.mp3';
import aVictory from '@/assets/adaptive/victory.mp3';
import aDefeat from '@/assets/adaptive/defeat.mp3';
import aUndercover from '@/assets/adaptive/undercover.mp3';
import aAudiophone from '@/assets/adaptive/audio-phone.mp3';
import aQuiz from '@/assets/adaptive/quiz.mp3';

const USER_GAMEPLAY_TRACKS: { id: number; name: string; src: string }[] = [
  { id: 200, name: '🎲 Cubic Confetti', src: '/music/cubic-confetti.mp3' },
  { id: 201, name: '⛏️ Mineclap Mayhem', src: '/music/mineclap-mayhem.mp3' },
];

export interface MusicTrack {
  id: number;
  name: string;
  src: string;
  moods?: MusicMood[];
}

export type MusicMood = 'chill' | 'energetic' | 'tense' | 'epic' | 'mysterious' | 'playful';

export type MusicSituation =
  | 'home' | 'lobby' | 'preparation' | 'preview' | 'round'
  | 'playing' | 'voting' | 'victory' | 'defeat'
  | 'undercover' | 'audiophone' | 'quiz' | 'monopoly' | 'pixoguess';

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
  { id: 1,   name: 'Neon Dreams',        src: music1,  moods: ['chill'] },
  { id: 2,   name: 'Cyber Wave',         src: music2,  moods: ['chill', 'playful'] },
  { id: 3,   name: 'Digital Pulse',      src: music3,  moods: ['energetic'] },
  { id: 4,   name: 'Synth Horizon',      src: music4,  moods: ['chill', 'epic'] },
  { id: 5,   name: 'Electric Night',     src: music5,  moods: ['tense', 'mysterious'] },
  { id: 6,   name: 'Midnight Glow',      src: music6,  moods: ['mysterious', 'tense'] },
  { id: 7,   name: 'Retro Vibes',        src: music7,  moods: ['playful', 'chill'] },
  { id: 8,   name: 'Future Bass',        src: music8,  moods: ['energetic', 'epic'] },
  { id: 9,   name: 'Pixel Party',        src: music9,  moods: ['playful', 'energetic'] },
  { id: 10,  name: 'Neon Rush',          src: music10, moods: ['energetic', 'tense'] },
  { id: 11,  name: 'Cosmic Flow',        src: music11, moods: ['chill', 'mysterious'] },
  { id: 12,  name: 'Stellar Beat',       src: music12, moods: ['epic', 'energetic'] },
  { id: 13,  name: 'Original Mafieux',   src: music13, moods: ['mysterious', 'tense'] },
  { id: 100, name: '🎪 Lobby Theme',     src: aLobby,     moods: ['chill', 'playful'] },
  { id: 101, name: '⚡ Game On',         src: aGameplay,  moods: ['energetic'] },
  { id: 102, name: '🕯️ The Vote',        src: aVote,      moods: ['tense', 'mysterious'] },
  { id: 103, name: '🏆 Victory Fanfare', src: aVictory,   moods: ['epic'] },
  { id: 104, name: '💀 Sad Trombone',    src: aDefeat,    moods: ['chill'] },
  { id: 105, name: '🕵️ Undercover Noir', src: aUndercover, moods: ['mysterious', 'tense'] },
  { id: 106, name: '📞 Audio Phone',     src: aAudiophone, moods: ['playful'] },
  { id: 107, name: '🧠 Quiz Show',       src: aQuiz,      moods: ['playful', 'energetic'] },
  { id: 108, name: '🎪 Lobby Theme II',  src: aLobby2,    moods: ['chill', 'playful'] },
  { id: 109, name: '🎪 Lobby Theme III', src: '/music/lobbytheme3.mp3', moods: ['chill', 'playful'] },
  ...USER_GAMEPLAY_TRACKS.map((t) => ({ ...t, moods: ['energetic', 'epic'] as MusicMood[] })),
];

const SITUATION_TO_ADAPTIVE_ID: Partial<Record<MusicSituation, number | number[]>> = {
  home: 109, lobby: 109, preparation: 109,
  preview: [108, 100],
  round: [200, 201, 101],
  playing: [200, 201, 101],
  voting: 102, victory: 103, defeat: 104,
  undercover: 105, audiophone: 106, quiz: 107,
  monopoly: [200, 201, 101], pixoguess: [200, 201, 101],
};

const SITUATION_TO_MOODS: Record<MusicSituation, MusicMood[]> = {
  home: ['chill', 'playful'], lobby: ['chill', 'playful'],
  preparation: ['playful', 'energetic'], preview: ['playful', 'chill'],
  round: ['energetic', 'epic'], playing: ['energetic', 'epic'],
  voting: ['tense', 'mysterious'], victory: ['epic', 'energetic'],
  defeat: ['mysterious', 'chill'], undercover: ['mysterious', 'tense'],
  audiophone: ['playful', 'chill'], quiz: ['playful', 'energetic'],
  monopoly: ['epic', 'energetic'], pixoguess: ['playful', 'energetic'],
};

function pickTrackForSituation(situation: MusicSituation, excludeId?: number): MusicTrack {
  const adaptive = SITUATION_TO_ADAPTIVE_ID[situation];
  if (adaptive !== undefined) {
    const ids = Array.isArray(adaptive) ? adaptive : [adaptive];
    const pool = ids.filter((id) => id !== excludeId);
    const chosen = pool.length > 0 ? pool : ids;
    const pickId = chosen[Math.floor(Math.random() * chosen.length)];
    const track = musicTracks.find((t) => t.id === pickId);
    if (track) return track;
  }
  const moods = SITUATION_TO_MOODS[situation] ?? ['energetic'];
  for (const mood of moods) {
    const candidates = musicTracks.filter((t) => t.moods?.includes(mood) && t.id !== excludeId);
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return musicTracks[Math.floor(Math.random() * musicTracks.length)];
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
    const s = localStorage.getItem('backgroundMusicVolume');
    return s ? parseFloat(s) : 0.3;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const s = localStorage.getItem('backgroundMusicTrack');
    const idx = s ? parseInt(s, 10) : -1;
    return idx >= 0 && idx < musicTracks.length ? idx : 0;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteracted = useRef(false);
  const fadeAbortRef = useRef<{ aborted: boolean } | null>(null);
  const progressTimerRef = useRef<number>(0);

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
  const [overrideSituation, setOverrideSituation] = useState<SituationOverride | null>(null);
  const lastAutoSituation = useRef<MusicSituation | null>(null);

  useEffect(() => { autoModeRef.current = autoMode; }, [autoMode]);

  const setAutoMode = useCallback((v: boolean) => {
    setAutoModeState(v);
    localStorage.setItem('backgroundMusicAuto', String(v));
  }, []);

  const clearSituationOverride = useCallback((source?: string) => {
    setOverrideSituation((cur) => {
      if (!cur) return null;
      if (source && cur.source !== source) return cur;
      return null;
    });
  }, []);

  const setSituation = useCallback((s: MusicSituation, options?: SetSituationOptions) => {
    const priority = options?.priority ?? 0;
    if (priority > 0) {
      const next: SituationOverride = {
        situation: s, priority,
        source: options?.source ?? 'unknown',
        expiresAt: options?.holdMs ? Date.now() + options.holdMs : null,
      };
      setOverrideSituation((cur) => {
        if (!cur) return next;
        if (cur.expiresAt !== null && cur.expiresAt <= Date.now()) return next;
        if (cur.source === next.source) return next;
        if (next.priority >= cur.priority) return next;
        return cur;
      });
      return;
    }
    setBaseSituation(s);
  }, []);

  // Auto-expire overrides
  useEffect(() => {
    if (!overrideSituation?.expiresAt) return;
    const delay = Math.max(overrideSituation.expiresAt - Date.now(), 0);
    const t = window.setTimeout(() => {
      setOverrideSituation((cur) => {
        if (!cur || cur.expiresAt !== overrideSituation.expiresAt) return cur;
        return cur.expiresAt <= Date.now() ? null : cur;
      });
    }, delay + 20);
    return () => window.clearTimeout(t);
  }, [overrideSituation]);

  const situation = useMemo<MusicSituation>(() => {
    if (!overrideSituation) return baseSituation;
    if (overrideSituation.expiresAt !== null && overrideSituation.expiresAt <= Date.now()) return baseSituation;
    return overrideSituation.situation;
  }, [baseSituation, overrideSituation]);

  useEffect(() => { situationRef.current = situation; }, [situation]);

  const currentTrack = useMemo(() => musicTracks[currentTrackIndex] ?? null, [currentTrackIndex]);

  // ── Cross-fade helper ────────────────────────────────────────────────────
  const fadeAndLoad = useCallback((nextSrc: string, targetVol: number, wasPlaying: boolean, fadeMs = 400) => {
    const el = audioRef.current;
    if (!el) return;

    // Same track? Just ensure volume is right.
    if (normSrc(el.src) === normSrc(nextSrc)) {
      el.volume = targetVol;
      return;
    }

    if (fadeAbortRef.current) fadeAbortRef.current.aborted = true;
    const token = { aborted: false };
    fadeAbortRef.current = token;

    const startVol = el.volume;
    const t0 = performance.now();

    const fadeOut = (now: number) => {
      if (token.aborted || !audioRef.current) return;
      const t = Math.min(1, (now - t0) / fadeMs);
      audioRef.current.volume = Math.max(0, startVol * (1 - t));
      if (t < 1) { requestAnimationFrame(fadeOut); return; }

      // Swap src
      if (token.aborted || !audioRef.current) return;
      audioRef.current.src = nextSrc;
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0;

      if (!wasPlaying) {
        // User had paused — load but don't play
        audioRef.current.load();
        return;
      }

      audioRef.current.play()
        .then(() => {
          if (token.aborted) return;
          setIsPlaying(true);
          const t1 = performance.now();
          const fadeIn = (now2: number) => {
            if (token.aborted || !audioRef.current) return;
            const t2 = Math.min(1, (now2 - t1) / fadeMs);
            audioRef.current.volume = targetVol * t2;
            if (t2 < 1) requestAnimationFrame(fadeIn);
          };
          requestAnimationFrame(fadeIn);
        })
        .catch(() => {});
    };

    // If currently silent (paused or vol=0), skip the fade-out
    if (el.paused || el.volume < 0.01) {
      el.src = nextSrc;
      el.preload = 'auto';
      el.volume = wasPlaying ? 0 : targetVol;
      if (wasPlaying) {
        el.play()
          .then(() => {
            if (token.aborted) return;
            setIsPlaying(true);
            const t1 = performance.now();
            const fadeIn = (now2: number) => {
              if (token.aborted || !audioRef.current) return;
              const t2 = Math.min(1, (now2 - t1) / fadeMs);
              audioRef.current.volume = targetVol * t2;
              if (t2 < 1) requestAnimationFrame(fadeIn);
            };
            requestAnimationFrame(fadeIn);
          })
          .catch(() => {});
      }
    } else {
      requestAnimationFrame(fadeOut);
    }
  }, []);

  // ── Audio element — created once, never torn down ────────────────────────
  useEffect(() => {
    const el = new Audio();
    el.preload = 'none';
    el.loop = false;
    el.volume = volumeRef.current;
    audioRef.current = el;

    const onEnded = () => {
      // Pick next track for the current situation (read from ref, always fresh)
      const curId = musicTracks[currentTrackIndexRef.current]?.id;
      const next = autoModeRef.current
        ? pickTrackForSituation(situationRef.current, curId)
        : musicTracks[(currentTrackIndexRef.current + 1) % musicTracks.length];
      const nextIdx = musicTracks.findIndex((t) => t.id === next.id);
      setCurrentTrackIndex(nextIdx >= 0 ? nextIdx : 0);
    };

    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - progressTimerRef.current > 250) {
        progressTimerRef.current = now;
        setProgress(el.currentTime);
      }
    };

    const onMeta = () => setDuration(el.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: audio element lives for the entire session

  // ── Load track when index changes ────────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    const track = musicTracks[currentTrackIndex];
    if (!el || !track) return;
    localStorage.setItem('backgroundMusicTrack', String(currentTrackIndex));
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

  // ── Auto-switch track when situation changes ─────────────────────────────
  useEffect(() => {
    if (!autoMode) return;
    if (lastAutoSituation.current === situation) return;
    lastAutoSituation.current = situation;
    const curId = musicTracks[currentTrackIndex]?.id;
    const next = pickTrackForSituation(situation, curId);
    const nextIdx = musicTracks.findIndex((t) => t.id === next.id);
    if (nextIdx !== -1 && nextIdx !== currentTrackIndex) {
      setCurrentTrackIndex(nextIdx);
    }
  }, [autoMode, situation, currentTrackIndex]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v;
    localStorage.setItem('backgroundMusicVolume', String(v));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
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
