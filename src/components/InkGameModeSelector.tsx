import type { CSSProperties } from 'react';
import { ModePicker } from '@/components/menu/ModePicker';
import { GAME_MODE_META, type LobbyGameMode } from '@/lib/gameModes';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface InkGameModeSelectorProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  playerCount: number;
  isAdmin?: boolean;
}

export const InkGameModeSelector = ({ gameMode, onGameModeChange, playerCount, isAdmin = false }: InkGameModeSelectorProps) => (
  <section className="ibs-panel p-4" style={{ '--menu-accent': GAME_MODE_META[gameMode].accent } as CSSProperties}>
    <header className="ibs-section-heading mb-4">
      <span>STUDIO</span>
      <h3>Choisir une émission</h3>
    </header>
    <ModePicker
      value={gameMode}
      onChange={(mode) => {
        playInkSound('brushTap', 0.4);
        onGameModeChange(mode);
      }}
      playerCount={playerCount}
      isAdmin={isAdmin}
      compact
    />
  </section>
);