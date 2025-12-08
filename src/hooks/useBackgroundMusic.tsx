import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import music1 from '@/assets/background-music-1.mp3';
import music2 from '@/assets/background-music-2.mp3';
import music3 from '@/assets/background-music-3.mp3';
import music4 from '@/assets/background-music-4.mp3';
import music5 from '@/assets/background-music-5.mp3';

interface BackgroundMusicContextType {
  volume: number;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  pause: () => void;
  play: () => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

const musicTracks = [music1, music2, music3, music4, music5];

export const BackgroundMusicProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('backgroundMusicVolume');
    return saved ? parseFloat(saved) : 0.3;
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    // Start with random track
    return Math.floor(Math.random() * musicTracks.length);
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(musicTracks[currentTrackIndex]);
      audioRef.current.loop = false;
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('ended', () => {
        // Pick a random track (different from current)
        const nextIndex = Math.floor(Math.random() * musicTracks.length);
        setCurrentTrackIndex(nextIndex);
      });
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
      audioRef.current.src = musicTracks[currentTrackIndex];
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrackIndex, isPlaying]);

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

  return (
    <BackgroundMusicContext.Provider value={{ volume, setVolume, isPlaying, pause, play }}>
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
