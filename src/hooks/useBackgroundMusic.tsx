import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('backgroundMusicVolume');
    return saved ? parseFloat(saved) : 0.3;
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem('backgroundMusicTrack');
    return saved ? parseInt(saved) : Math.floor(Math.random() * musicTracks.length);
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = musicTracks[currentTrackIndex] || null;

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(musicTracks[currentTrackIndex].src);
      audioRef.current.loop = false;
      audioRef.current.volume = volume;
      
      const handleEnded = () => {
        setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
      };
      
      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
        }
      };
      
      const handleLoadedMetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };
      
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    // Try to start on first user interaction (autoplay policies)
    const tryStartOnGesture = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.play().catch(() => {});
      }
      document.removeEventListener('pointerdown', tryStartOnGesture);
      document.removeEventListener('keydown', tryStartOnGesture);
      document.removeEventListener('touchstart', tryStartOnGesture);
    };
    document.addEventListener('pointerdown', tryStartOnGesture, { once: true } as any);
    document.addEventListener('keydown', tryStartOnGesture, { once: true } as any);
    document.addEventListener('touchstart', tryStartOnGesture, { once: true } as any);

    return () => {
      document.removeEventListener('pointerdown', tryStartOnGesture);
      document.removeEventListener('keydown', tryStartOnGesture);
      document.removeEventListener('touchstart', tryStartOnGesture);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = musicTracks[currentTrackIndex].src;
      audioRef.current.load();
      localStorage.setItem('backgroundMusicTrack', currentTrackIndex.toString());
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      localStorage.setItem('backgroundMusicVolume', volume.toString());
    }
  }, [volume]);

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
  };

  const previousTrack = () => {
    setCurrentTrackIndex(prev => (prev - 1 + musicTracks.length) % musicTracks.length);
  };

  const selectTrack = (trackId: number) => {
    const index = musicTracks.findIndex(t => t.id === trackId);
    if (index !== -1) {
      setCurrentTrackIndex(index);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  return (
    <BackgroundMusicContext.Provider value={{ 
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
    }}>
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