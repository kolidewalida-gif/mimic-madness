import type { CSSProperties } from 'react';
import { Check, LockKeyhole, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GAME_MODE_META, GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';

interface ModePickerProps {
  value: LobbyGameMode;
  onChange?: (mode: LobbyGameMode) => void;
  playerCount: number;
  isAdmin?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

const ModeArt = ({ mode }: { mode: LobbyGameMode }) => {
  const meta = GAME_MODE_META[mode];
  return (
    <div className="ibs-mode-art" style={{ background: `linear-gradient(145deg, ${meta.fallbackColor}, #160d24)` }}>
      <img
        src={meta.imageCandidates[0]}
        alt=""
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
      <span aria-hidden="true">{meta.fallbackEmoji}</span>
    </div>
  );
};

export const ModePicker = ({ value, onChange, playerCount, isAdmin = false, disabled = false, compact = false }: ModePickerProps) => (
  <div className={cn('ibs-mode-picker', compact && 'ibs-mode-picker--compact')} role="list" aria-label="Modes de jeu">
    {GAME_MODE_ORDER.map((mode) => {
      const meta = GAME_MODE_META[mode];
      const selected = value === mode;
      const unavailable = !isAdmin && playerCount < meta.minPlayers;
      const locked = disabled || unavailable || !onChange;
      return (
        <button
          key={mode}
          type="button"
          role="listitem"
          className={cn('ibs-mode-card menu-focus', selected && 'is-selected')}
          style={{ '--mode-accent': meta.accent } as CSSProperties}
          onClick={() => !locked && onChange?.(mode)}
          disabled={disabled || unavailable || !onChange}
          aria-pressed={selected}
          aria-label={`${meta.label}, ${meta.tagline}${unavailable ? `, minimum ${meta.minPlayers} joueurs` : ''}`}
        >
          <ModeArt mode={mode} />
          <span className="ibs-mode-copy">
            <strong>{meta.shortLabel}</strong>
            <small>{meta.tagline}</small>
            <span className="ibs-mode-min"><Users aria-hidden="true" /> {meta.minPlayers}+</span>
          </span>
          <span className="ibs-mode-state" aria-hidden="true">
            {selected ? <Check /> : unavailable ? <LockKeyhole /> : null}
          </span>
        </button>
      );
    })}
  </div>
);