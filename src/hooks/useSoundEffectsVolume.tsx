import { useState, useCallback, createContext, useContext } from 'react';

interface SoundEffectsVolumeContextType {
  volume: number;
  setVolume: (volume: number) => void;
}

const SoundEffectsVolumeContext = createContext<SoundEffectsVolumeContextType | undefined>(undefined);

const STORAGE_KEY = 'sound-effects-volume';
const DEFAULT_VOLUME = 0.5;

/**
 * Lire un volume enregistré en refusant tout ce qui n'est pas un nombre valide.
 *
 * Sans cette validation, une valeur illisible dans `localStorage` donnait `NaN`.
 * Ce `NaN` se propageait jusqu'à `masterGain.gain.value`, ce que l'API Web Audio
 * refuse en levant une exception — avalée par le `try/catch` de
 * `playSoundEffect`. Résultat : **tous** les effets sonores devenaient muets,
 * définitivement et sans le moindre message. C'est l'une des causes possibles
 * d'un joueur qui n'a plus aucun son.
 */
const parseStoredVolume = (raw: string | null): number => {
  if (raw === null) return DEFAULT_VOLUME;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, parsed));
};

const readStoredVolume = (): number => {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    return parseStoredVolume(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Mode privé ou stockage refusé : le défaut vaut mieux qu'un silence.
    return DEFAULT_VOLUME;
  }
};

const writeStoredVolume = (volume: number): number => {
  const safe = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_VOLUME;
  try {
    localStorage.setItem(STORAGE_KEY, String(safe));
  } catch {
    // Le réglage ne survivra pas au rechargement, mais il s'applique maintenant.
  }
  return safe;
};

export const SoundEffectsVolumeProvider = ({ children }: { children: React.ReactNode }) => {
  const [volume, setVolumeState] = useState(readStoredVolume);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(writeStoredVolume(newVolume));
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
      volume: readStoredVolume(),
      setVolume: (v: number) => { writeStoredVolume(v); },
    };
  }
  return context;
};

// Get volume without hook (for use in playSoundEffect)
export const getSoundEffectsVolume = (): number => readStoredVolume();
