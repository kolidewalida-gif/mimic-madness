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

export interface MusicTrack {
  id: number;
  name: string;
  src: string;
}

const musicTracks: MusicTrack[] = [
  { id: 1, name: "Neon Dreams", src: music1 },
  { id: 2, name: "Cyber Wave", src: music2 },
  { id: 3, name: "Digital Pulse", src: music3 },
  { id: 4, name: "Synth Horizon", src: music4 },
  { id: 5, name: "Electric Night", src: music5 },
  { id: 6, name: "Midnight Glow", src: music6 },
  { id: 7, name: "Retro Vibes", src: music7 },
  { id: 8, name: "Future Bass", src: music8 },
  { id: 9, name: "Pixel Party", src: music9 },
  { id: 10, name: "Neon Rush", src: music10 },
  { id: 11, name: "Cosmic Flow", src: music11 },
  { id: 12, name: "Stellar Beat", src: music12 },
  { id: 13, name: "Original Mafieux", src: music13 },
];

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

  const currentTrack = useMemo(() => 
    musicTracks[currentTrackIndex] || null
  , [currentTrackIndex]);

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
    setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
  }, []);

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
  }, [handleEnded, handleTimeUpdate, handleLoadedMetadata, volume]);

  // Load track when index changes
  useEffect(() => {
    if (audioRef.current && musicTracks[currentTrackIndex]) {
      audioRef.current.src = musicTracks[currentTrackIndex].src;
      audioRef.current.preload = 'auto';
      localStorage.setItem('backgroundMusicTrack', currentTrackIndex.toString());
      if (isPlaying && hasUserInteracted.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrackIndex, isPlaying]);

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
    seek
  }), [volume, setVolume, isPlaying, pause, play, currentTrack, nextTrack, previousTrack, selectTrack, progress, duration, seek]);

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
