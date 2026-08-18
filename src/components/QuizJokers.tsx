import { cn } from '@/lib/utils';
import { Scissors, Snowflake, FastForward } from 'lucide-react';
import { playSoundEffect } from '@/hooks/useSoundEffects';

export interface JokersState {
  fiftyFifty: boolean;
  freeze: boolean;
  skip: boolean;
}

export const INITIAL_JOKERS: JokersState = {
  fiftyFifty: true,
  freeze: true,
  skip: true,
};

interface Props {
  jokers: JokersState;
  onUseFiftyFifty: () => void;
  onUseFreeze: () => void;
  onUseSkip: () => void;
  disabled?: boolean;
}

const JokerBtn = ({ available, onClick, icon, label, color, disabled }: any) => (
  <button
    onClick={() => {
      if (!available || disabled) return;
      playSoundEffect('click', 0.4);
      onClick();
    }}
    disabled={!available || disabled}
    className={cn(
      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all',
      available && !disabled
        ? `${color} hover:scale-105 active:scale-95 cursor-pointer`
        : 'bg-muted/20 border-border/30 text-muted-foreground opacity-40 cursor-not-allowed'
    )}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export const QuizJokers = ({ jokers, onUseFiftyFifty, onUseFreeze, onUseSkip, disabled }: Props) => {
  return (
    <div className="flex items-center justify-center gap-2 animate-fadeIn">
      <JokerBtn
        available={jokers.fiftyFifty}
        disabled={disabled}
        onClick={onUseFiftyFifty}
        icon={<Scissors className="h-5 w-5" />}
        label="50/50"
        color="bg-amber-500/20 border-amber-500/50 text-amber-400"
      />
      <JokerBtn
        available={jokers.freeze}
        disabled={disabled}
        onClick={onUseFreeze}
        icon={<Snowflake className="h-5 w-5" />}
        label="Freeze"
        color="bg-[var(--ink-surface-3)]/20 border-[var(--ink-line)]/50 text-[var(--ink-text-dim)]"
      />
      <JokerBtn
        available={jokers.skip}
        disabled={disabled}
        onClick={onUseSkip}
        icon={<FastForward className="h-5 w-5" />}
        label="Skip"
        color="bg-[var(--ink-accent)]/20 border-[var(--ink-accent-line)]/50 text-[var(--ink-accent-text)]"
      />
    </div>
  );
};