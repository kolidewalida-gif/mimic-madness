import type { CSSProperties } from 'react';
import { ModePicker } from '@/components/menu/ModePicker';
import { GAME_MODE_META, type LobbyGameMode } from '@/lib/gameModes';

interface GameModeSelectorProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  disabled?: boolean;
  playerCount: number;
  isAdmin?: boolean;
}

export const GameModeSelector = ({
  gameMode,
  onGameModeChange,
  disabled = false,
  playerCount,
  isAdmin = false,
}: GameModeSelectorProps) => (
  <section className="ibs-panel p-4 sm:p-5" style={{ '--menu-accent': GAME_MODE_META[gameMode].accent } as CSSProperties}>
    <header className="ibs-section-heading mb-4">
      <span>PROGRAMMATION</span>
      <h3>Mode de jeu</h3>
    </header>
    <ModePicker
      value={gameMode}
      onChange={onGameModeChange}
      playerCount={playerCount}
      isAdmin={isAdmin}
      disabled={disabled}
      compact
    />
  </section>
);