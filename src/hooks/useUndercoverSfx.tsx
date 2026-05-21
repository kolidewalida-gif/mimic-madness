import { useEffect, useRef, useCallback } from 'react';
import { getSoundEffectsVolume } from './useSoundEffectsVolume';

/**
 * Undercover mode SFX — plays custom audio files at key game moments.
 *
 * Files served from /public/sfx/undercover/:
 *   - vote-suspense.mp3         → plays during vote animation (before reveal)
 *   - vote-civil-eliminated.mp3 → plays when a CIVIL is eliminated (bad vote)
 *   - vote-civil-eliminated-2.mp3 → variant 2
 *   - tension-long-game.mp3    → plays when the game drags on (round 4+)
 */

const SFX_PATHS = {
  voteSuspense: '/sfx/undercover/vote-suspense.mp3',
  voteCivilEliminated: '/sfx/undercover/vote-civil-eliminated.mp3',
  voteCivilEliminated2: '/sfx/undercover/vote-civil-eliminated-2.mp3',
  tensionLongGame: '/sfx/undercover/tension-long-game.mp3',
} as const;

type UndercoverSfxType = keyof typeof SFX_PATHS;

// Cache audio elements to avoid re-creating them each time
const audioCache = new Map<string, HTMLAudioElement>();

const getAudio = (path: string): HTMLAudioElement => {
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
  return audio;
};

/** Play an undercover SFX. Returns the audio element for manual stop. */
export const playUndercoverSfx = (
  type: UndercoverSfxType,
  volume = 0.5,
): HTMLAudioElement | null => {
  try {
    const globalVol = getSoundEffectsVolume();
    const path = SFX_PATHS[type];
    const audio = getAudio(path);
    audio.volume = Math.min(1, volume * globalVol);
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* noop: autoplay blocked */
    });
    return audio;
  } catch {
    return null;
  }
};

/** Stop a playing SFX with a quick fade-out. */
export const stopUndercoverSfx = (audio: HTMLAudioElement | null) => {
  if (!audio) return;
  // Quick 300ms fade
  const startVol = audio.volume;
  const steps = 10;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
      audio.volume = startVol;
    }
  }, 30);
};

/**
 * Hook that auto-plays undercover SFX based on game state.
 *
 * @param phase - current game phase
 * @param round - current round number
 * @param eliminatedRole - role of the last eliminated player (null if no one)
 * @param isVoteResult - true when we're showing vote result
 */
export const useUndercoverSfx = ({
  phase,
  round,
  eliminatedRole,
  isVoteResult,
}: {
  phase: string;
  round: number;
  eliminatedRole: string | null;
  isVoteResult: boolean;
}) => {
  const suspenseRef = useRef<HTMLAudioElement | null>(null);
  const tensionRef = useRef<HTMLAudioElement | null>(null);
  const lastPhaseRef = useRef<string>('');
  const lastRoundRef = useRef<number>(0);

  // Vote suspense — plays when entering voting phase
  useEffect(() => {
    if (phase === 'voting' && lastPhaseRef.current !== 'voting') {
      // Play suspense music during the vote
      suspenseRef.current = playUndercoverSfx('voteSuspense', 0.6);
    }
    if (phase !== 'voting' && suspenseRef.current) {
      stopUndercoverSfx(suspenseRef.current);
      suspenseRef.current = null;
    }
    lastPhaseRef.current = phase;
  }, [phase]);

  // Vote result — civil eliminated (bad vote) SFX
  useEffect(() => {
    if (isVoteResult && eliminatedRole && eliminatedRole !== 'undercover' && eliminatedRole !== 'mr_white') {
      // A civilian was eliminated — play the "oops" music
      const variant = Math.random() > 0.5 ? 'voteCivilEliminated' : 'voteCivilEliminated2';
      playUndercoverSfx(variant, 0.7);
    }
  }, [isVoteResult, eliminatedRole]);

  // Tension music — when game drags on (round 4+)
  useEffect(() => {
    if (round >= 4 && phase === 'discussion' && lastRoundRef.current < round) {
      // Start tension music on round 4+ discussion
      if (tensionRef.current) {
        stopUndercoverSfx(tensionRef.current);
      }
      tensionRef.current = playUndercoverSfx('tensionLongGame', 0.4);
    }
    if (phase !== 'discussion' && tensionRef.current) {
      stopUndercoverSfx(tensionRef.current);
      tensionRef.current = null;
    }
    lastRoundRef.current = round;
  }, [round, phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopUndercoverSfx(suspenseRef.current);
      stopUndercoverSfx(tensionRef.current);
    };
  }, []);
};
