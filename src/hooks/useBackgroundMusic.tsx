import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback, useMemo } from 'react';

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

// Adaptive original tracks (composed for each situation)
import aLobby from '@/assets/adaptive/lobby.mp3';
import aLobby2 from '@/assets/adaptive/lobby2.mp3';
import aGameplay from '@/assets/adaptive/gameplay.mp3';
import aVote from '@/assets/adaptive/vote.mp3';
import aVictory from '@/assets/adaptive/victory.mp3';
import aDefeat from '@/assets/adaptive/defeat.mp3';
import aUndercover from '@/assets/adaptive/undercover.mp3';
import aAudiophone from '@/assets/adaptive/audio-phone.mp3';
import aQuiz from '@/assets/adaptive/quiz.mp3';

/**
 * User-provided gameplay tracks dropped in /public/music/.
 * Referenced by URL so they're served as static assets (no bundling).
 */
const USER_GAMEPLAY_TRACKS: { id: number; name: string; src: string }[] = [
  { id: 200, name: '🎲 Cubic Confetti', src: '/music/cubic-confetti.mp3' },
  { id: 201, name: '⛏️ Mineclap Mayhem', src: '/music/mineclap-mayhem.mp3' },
];

export interface MusicTrack {
  id: number;
  name: string;
  src: string;
  /** Mood tags used by the adaptive auto-selector */
  moods?: MusicMood[];
}

/**
 * Moods used to map a game situation to a track.
 * - `chill`        : menu/lobby vibe
 * - `energetic`    : in-game general
 * - `tense`        : voting / countdown / undercover
 * - `epic`         : victory / big moment
 * - `mysterious`   : undercover / detective
 * - `playful`      : audio-phone / quiz
 */
export type MusicMood = "chill" | "energetic" | "tense" | "epic" | "mysterious" | "playful";

/** Game situation broadcast by the app — drives auto track selection. */
export type MusicSituation =
  | "home"
  | "lobby"
  | "preparation"
  | "playing"
  | "voting"
  | "victory"
  | "defeat"
  | "undercover"
  | "audiophone"
  | "quiz"
  | "monopoly"
  | "pixoguess";

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
  { id: 1, name: "Neon Dreams", src: music1, moods: ["chill"] },
  { id: 2, name: "Cyber Wave", src: music2, moods: ["chill", "playful"] },
  { id: 3, name: "Digital Pulse", src: music3, moods: ["energetic"] },
  { id: 4, name: "Synth Horizon", src: music4, moods: ["chill", "epic"] },
  { id: 5, name: "Electric Night", src: music5, moods: ["tense", "mysterious"] },
  { id: 6, name: "Midnight Glow", src: music6, moods: ["mysterious", "tense"] },
  { id: 7, name: "Retro Vibes", src: music7, moods: ["playful", "chill"] },
  { id: 8, name: "Future Bass", src: music8, moods: ["energetic", "epic"] },
  { id: 9, name: "Pixel Party", src: music9, moods: ["playful", "energetic"] },
  { id: 10, name: "Neon Rush", src: music10, moods: ["energetic", "tense"] },
  { id: 11, name: "Cosmic Flow", src: music11, moods: ["chill", "mysterious"] },
  { id: 12, name: "Stellar Beat", src: music12, moods: ["epic", "energetic"] },
  { id: 13, name: "Original Mafieux", src: music13, moods: ["mysterious", "tense"] },
  // Adaptive originals (id 100+) — preferred per situation
  { id: 100, name: "🎪 Lobby Theme", src: aLobby, moods: ["chill", "playful"] },
  { id: 101, name: "⚡ Game On", src: aGameplay, moods: ["energetic"] },
  { id: 102, name: "🕯️ The Vote", src: aVote, moods: ["tense", "mysterious"] },
  { id: 103, name: "🏆 Victory Fanfare", src: aVictory, moods: ["epic"] },
  { id: 104, name: "💀 Sad Trombone", src: aDefeat, moods: ["chill"] },
  { id: 105, name: "🕵️ Undercover Noir", src: aUndercover, moods: ["mysterious", "tense"] },
  { id: 106, name: "📞 Audio Phone", src: aAudiophone, moods: ["playful"] },
  { id: 107, name: "🧠 Quiz Show", src: aQuiz, moods: ["playful", "energetic"] },
  { id: 108, name: "🎪 Lobby Theme II", src: aLobby2, moods: ["chill", "playful"] },
  { id: 109, name: "🎪 Lobby Theme III", src: '/music/lobbytheme3.mp3', moods: ["chill", "playful"] },
  // User-provided gameplay tracks (id 200+) — preferred for the "playing" situation
  ...USER_GAMEPLAY_TRACKS.map((t) => ({
    ...t,
    moods: ["energetic", "epic"] as MusicMood[],
  })),
];

/** Direct mapping from situation -> preferred adaptive track id(s). Arrays are randomized. */
const SITUATION_TO_ADAPTIVE_ID: Partial<Record<MusicSituation, number | number[]>> = {
  home: 109,
  lobby: 109,
  preparation: 109,
  playing: [200, 201, 101], // 🎮 user gameplay tracks first, original 101 as fallback
  voting: 102,
  victory: 103,
  defeat: 104,
  undercover: 105,
  audiophone: 106,
  quiz: 107,
  monopoly: [200, 201, 101],
  pixoguess: [200, 201, 101],
};

/** Map each game situation to a list of preferred moods (in priority order). */
const SITUATION_TO_MOODS: Record<MusicSituation, MusicMood[]> = {
  home: ["chill", "playful"],
  lobby: ["chill", "playful"],
  preparation: ["playful", "energetic"],
  playing: ["energetic", "epic"],
  voting: ["tense", "mysterious"],
  victory: ["epic", "energetic"],
  defeat: ["mysterious", "chill"],
  undercover: ["mysterious", "tense"],
  audiophone: ["playful", "chill"],
  quiz: ["playful", "energetic"],
  monopoly: ["epic", "energetic"],
  pixoguess: ["playful", "energetic"],
};

function pickTrackForSituation(
  situation: MusicSituation,
  excludeId?: number,
): MusicTrack {
  // Prefer the dedicated adaptive original if available
  const adaptive = SITUATION_TO_ADAPTIVE_ID[situation];
  if (adaptive !== undefined) {
    const ids = Array.isArray(adaptive) ? adaptive : [adaptive];
    const pool = ids.filter((id) => id !== excludeId);
    const pickId = (pool.length > 0 ? pool : ids)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : ids.length))];
    const track = musicTracks.find((t) => t.id === pickId);
    if (track) return track;
  }
  const moods = SITUATION_TO_MOODS[situation] ?? ["energetic"];
  for (const mood of moods) {
    const candidates = musicTracks.filter(
      (t) => t.moods?.includes(mood) && t.id !== excludeId,
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return musicTracks[Math.floor(Math.random() * musicTracks.length)];
}

interface BackgroundMusicContextType {
  volume: number;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  pause: () => void;
  play: () => void;
  currentTrack: MusicTrack | null;
  tracks: MusicTrack[];
  nextTrack: () => void;
  previousTrack: () => void;
  selectTrack: (trackId: number) => void;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  /** Auto adaptive mode: when true, music auto-switches with the current situation. */
  autoMode: boolean;
  setAutoMode: (v: boolean) => void;
  /** Current situation (set by the app) used by the auto-selector. */
  situation: MusicSituation;
  setSituation: (s: MusicSituation, options?: SetSituationOptions) => void;
  clearSituationOverride: (source?: string) => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const BackgroundMusicProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('backgroundMusicVolume');
    return saved ? parseFloat(saved) : 0.3;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem('backgroundMusicTrack');
    return saved ? parseInt(saved) : Math.floor(Math.random() * musicTracks.length);
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasUserInteracted = useRef(false);

  const [autoMode, setAutoModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('backgroundMusicAuto');
    return saved === null ? true : saved === 'true';
  });
  const [baseSituation, setBaseSituation] = useState<MusicSituation>("home");
  const [overrideSituation, setOverrideSituation] = useState<SituationOverride | null>(null);
  const lastAutoSituation = useRef<MusicSituation | null>(null);

  const setAutoMode = useCallback((v: boolean) => {
    setAutoModeState(v);
    localStorage.setItem('backgroundMusicAuto', String(v));
  }, []);

  const clearSituationOverride = useCallback((source?: string) => {
    setOverrideSituation((current) => {
      if (!current) return null;
      if (source && current.source !== source) return current;
      return null;
    });
  }, []);

  const setSituation = useCallback((s: MusicSituation, options?: SetSituationOptions) => {
    const priority = options?.priority ?? 0;
    if (priority > 0) {
      const nextOverride: SituationOverride = {
        situation: s,
        priority,
        source: options?.source ?? "unknown",
        expiresAt: options?.holdMs ? Date.now() + options.holdMs : null,
      };

      setOverrideSituation((current) => {
        if (!current) return nextOverride;
        const currentExpired = current.expiresAt !== null && current.expiresAt <= Date.now();
        if (currentExpired) return nextOverride;
        if (current.source === nextOverride.source) return nextOverride;
        if (nextOverride.priority >= current.priority) return nextOverride;
        return current;
      });
      return;
    }

    setBaseSituation(s);
  }, []);

  useEffect(() => {
    if (!overrideSituation?.expiresAt) return;

    const delay = Math.max(overrideSituation.expiresAt - Date.now(), 0);
    const timer = window.setTimeout(() => {
      setOverrideSituation((current) => {
        if (!current) return null;
        if (current.expiresAt !== overrideSituation.expiresAt) return current;
        if (current.expiresAt !== null && current.expiresAt <= Date.now()) {
          return null;
        }
        return current;
      });
    }, delay + 20);

    return () => window.clearTimeout(timer);
  }, [overrideSituation]);

  const situation = useMemo(() => {
    if (!overrideSituation) return baseSituation;
    if (overrideSituation.expiresAt !== null && overrideSituation.expiresAt <= Date.now()) {
      return baseSituation;
    }
    return overrideSituation.situation;
  }, [baseSituation, overrideSituation]);

  const currentTrack = useMemo(() => 
    musicTracks[currentTrackIndex] || null
  , [currentTrackIndex]);

  // Auto-switch track when situation changes (only if autoMode is on)
  useEffect(() => {
    if (!autoMode) return;
    if (lastAutoSituation.current === situation) return;
    lastAutoSituation.current = situation;
    const currentId = musicTracks[currentTrackIndex]?.id;
    const next = pickTrackForSituation(situation, currentId);
    const nextIdx = musicTracks.findIndex((t) => t.id === next.id);
    if (nextIdx !== -1 && nextIdx !== currentTrackIndex) {
      setCurrentTrackIndex(nextIdx);
    }
  }, [autoMode, situation, currentTrackIndex]);

  // Throttled progress update
  const progressUpdateRef = useRef<number>(0);
  const handleTimeUpdate = useCallback(() => {
    const now = Date.now();
    if (now - progressUpdateRef.current > 250 && audioRef.current) {
      progressUpdateRef.current = now;
      setProgress(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setCurrentTrackIndex((prev) => {
      if (autoMode) {
        const currentId = musicTracks[prev]?.id;
        const next = pickTrackForSituation(situation, currentId);
        const nextIdx = musicTracks.findIndex((track) => track.id === next.id);
        if (nextIdx !== -1) {
          return nextIdx;
        }
      }
      return (prev + 1) % musicTracks.length;
    });
  }, [autoMode, situation]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
      audioRef.current.loop = false;
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [handleEnded, handleTimeUpdate, handleLoadedMetadata]);

  // Load track when index changes
  useEffect(() => {
    if (audioRef.current && musicTracks[currentTrackIndex]) {
      // Avoid reloading the same source (prevents stalls during rapid situation switches)
      const nextSrc = musicTracks[currentTrackIndex].src;
      const currentSrc = audioRef.current.src;
      if (currentSrc && currentSrc.endsWith(nextSrc)) {
        return;
      }
      audioRef.current.src = musicTracks[currentTrackIndex].src;
      audioRef.current.preload = 'auto';
      localStorage.setItem('backgroundMusicTrack', currentTrackIndex.toString());
      // Try to autoplay — if blocked by browser policy, a global gesture
      // listener (installed below) will retry on the first user gesture.
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [currentTrackIndex]);

  // Auto-start music on mount + auto-resume on first user gesture if blocked
  useEffect(() => {
    const tryPlay = () => {
      if (!audioRef.current) return;
      if (!audioRef.current.src) {
        audioRef.current.src = musicTracks[currentTrackIndex].src;
        audioRef.current.preload = 'auto';
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    };

    // Initial attempt (works if browser allows it, e.g. PWA / returning user)
    tryPlay();

    // Fallback: resume on the very first user gesture (one-shot)
    const onGesture = () => {
      hasUserInteracted.current = true;
      tryPlay();
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
    window.addEventListener('touchstart', onGesture, { once: false });

    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update volume
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    localStorage.setItem('backgroundMusicVolume', newVolume.toString());
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(() => {
    hasUserInteracted.current = true;
    if (audioRef.current) {
      if (!audioRef.current.src || audioRef.current.src === '') {
        audioRef.current.src = musicTracks[currentTrackIndex].src;
        audioRef.current.preload = 'auto';
      }
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [currentTrackIndex]);

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
  }, []);

  const previousTrack = useCallback(() => {
    setCurrentTrackIndex(prev => (prev - 1 + musicTracks.length) % musicTracks.length);
  }, []);

  const selectTrack = useCallback((trackId: number) => {
    const index = musicTracks.findIndex(t => t.id === trackId);
    if (index !== -1) {
      setCurrentTrackIndex(index);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const contextValue = useMemo(() => ({ 
    volume, 
    setVolume, 
    isPlaying, 
    pause, 
    play,
    currentTrack,
    tracks: musicTracks,
    nextTrack,
    previousTrack,
    selectTrack,
    progress,
    duration,
    seek,
    autoMode,
    setAutoMode,
    situation,
    setSituation,
    clearSituationOverride,
  }), [volume, setVolume, isPlaying, pause, play, currentTrack, nextTrack, previousTrack, selectTrack, progress, duration, seek, autoMode, setAutoMode, situation, setSituation, clearSituationOverride]);

  return (
    <BackgroundMusicContext.Provider value={contextValue}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) {
    throw new Error('useBackgroundMusic must be used within BackgroundMusicProvider');
  }
  return context;
};
