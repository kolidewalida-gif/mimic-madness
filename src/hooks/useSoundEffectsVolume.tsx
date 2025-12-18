import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface SoundEffectsVolumeContextType {
  volume: number;
  setVolume: (volume: number) => void;
}

const SoundEffectsVolumeContext = createContext<SoundEffectsVolumeContextType | undefined>(undefined);

const STORAGE_KEY = 'sound-effects-volume';

export const SoundEffectsVolumeProvider = ({ children }: { children: React.ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseFloat(stored) : 0.5;
    }
    return 0.5;
  });

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    localStorage.setItem(STORAGE_KEY, clampedVolume.toString());
  }, []);

  return (
    <SoundEffectsVolumeContext.Provider value={{ volume, setVolume }}>
      {children}
    </SoundEffectsVolumeContext.Provider>
  );
};

export const useSoundEffectsVolume = () => {
  const context = useContext(SoundEffectsVolumeContext);
  if (!context) {
    // Return default values if used outside provider
    return {
      volume: typeof window !== 'undefined' 
        ? parseFloat(localStorage.getItem(STORAGE_KEY) || '0.5') 
        : 0.5,
      setVolume: (v: number) => localStorage.setItem(STORAGE_KEY, v.toString())
    };
  }
  return context;
};

// Get volume without hook (for use in playSoundEffect)
export const getSoundEffectsVolume = (): number => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : 0.5;
  }
  return 0.5;
};
