export interface GameAvatarPreset {
  id: string;
  label: string;
  src: string;
}

/** Avatars originaux fournis par le jeu et servis comme assets locaux cachables. */
export const GAME_AVATARS = [
  { id: 'mimo-neon', label: 'Mimo Néon', src: '/game-avatars/mimo-neon.svg' },
  { id: 'mimo-voltage', label: 'Mimo Voltage', src: '/game-avatars/mimo-voltage.svg' },
  { id: 'mimo-pop', label: 'Mimo Pop', src: '/game-avatars/mimo-pop.svg' },
  { id: 'mimo-royal', label: 'Mimo Royal', src: '/game-avatars/mimo-royal.svg' },
  { id: 'mimo-love', label: 'Mimo Love', src: '/game-avatars/mimo-love.svg' },
  { id: 'mimo-luna', label: 'Mimo Luna', src: '/game-avatars/mimo-luna.svg' },
  { id: 'mimo-bloom', label: 'Mimo Bloom', src: '/game-avatars/mimo-bloom.svg' },
  { id: 'mimo-player', label: 'Mimo Player', src: '/game-avatars/mimo-player.svg' },
] as const satisfies readonly GameAvatarPreset[];

export const findGameAvatarIndex = (src?: string): number => (
  src ? GAME_AVATARS.findIndex((avatar) => avatar.src === src) : -1
);
