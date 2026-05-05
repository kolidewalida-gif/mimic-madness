import { cn } from '@/lib/utils';
import { Settings, Hash, Timer, Sparkles, FileText } from 'lucide-react';

export interface QuizSettings {
  totalRounds: number;
  answerDurationMs: number;
  difficulty: 'mixed' | 'facile' | 'moyen' | 'difficile';
  questionMode: 'mixed' | 'qcm' | 'text';
  enableJokers: boolean;
  enableStreak: boolean;
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  totalRounds: 10,
  answerDurationMs: 30000,
  difficulty: 'mixed',
  questionMode: 'mixed',
  enableJokers: true,
  enableStreak: true,
};

interface Props {
  settings: QuizSettings;
  onChange: (s: QuizSettings) => void;
  disabled?: boolean;
}

const ROUND_OPTIONS = [5, 10, 15, 20, 30];
const TIME_OPTIONS = [10, 15, 20, 30, 45, 60];
const DIFF_OPTIONS: Array<{ id: QuizSettings['difficulty']; label: string; emoji: string }> = [
  { id: 'mixed', label: 'Mixte', emoji: '🎲' },
  { id: 'facile', label: 'Facile', emoji: '🟢' },
  { id: 'moyen', label: 'Moyen', emoji: '🟡' },
  { id: 'difficile', label: 'Difficile', emoji: '🔴' },
];
const MODE_OPTIONS: Array<{ id: QuizSettings['questionMode']; label: string; emoji: string }> = [
  { id: 'mixed', label: 'Mixte', emoji: '🎲' },
  { id: 'qcm', label: 'QCM', emoji: '📝' },
  { id: 'text', label: 'Libre', emoji: '⌨️' },
];

const Pill = ({ active, onClick, children, disabled }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
      active
        ? 'bg-primary/30 border-primary text-primary shadow-md shadow-primary/20'
        : 'bg-card/40 border-border/40 text-foreground-muted hover:border-primary/40',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    {children}
  </button>
);

const Toggle = ({ on, onClick, label, emoji, disabled }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-all',
      on
        ? 'bg-primary/10 border-primary/40 text-foreground'
        : 'bg-card/40 border-border/30 text-foreground-muted',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    <span className="flex items-center gap-2 text-sm font-semibold">
      <span>{emoji}</span>
      {label}
    </span>
    <span
      className={cn(
        'w-9 h-5 rounded-full relative transition-colors',
        on ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
          on ? 'left-[18px]' : 'left-0.5'
        )}
      />
    </span>
  </button>
);

export const QuizSettingsPanel = ({ settings, onChange, disabled }: Props) => {
  const update = <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-card/30 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
        <Settings className="h-4 w-4 text-accent" />
        Paramètres de l'hôte
      </div>

      {/* Rounds */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-foreground-muted">
          <Hash className="h-3 w-3" /> Nombre de questions
        </div>
        <div className="flex flex-wrap gap-2">
          {ROUND_OPTIONS.map(n => (
            <Pill key={n} active={settings.totalRounds === n} disabled={disabled} onClick={() => update('totalRounds', n)}>
              {n}
            </Pill>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-foreground-muted">
          <Timer className="h-3 w-3" /> Temps par question
        </div>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map(s => (
            <Pill
              key={s}
              active={settings.answerDurationMs === s * 1000}
              disabled={disabled}
              onClick={() => update('answerDurationMs', s * 1000)}
            >
              {s}s
            </Pill>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-foreground-muted">
          <Sparkles className="h-3 w-3" /> Difficulté
        </div>
        <div className="flex flex-wrap gap-2">
          {DIFF_OPTIONS.map(d => (
            <Pill key={d.id} active={settings.difficulty === d.id} disabled={disabled} onClick={() => update('difficulty', d.id)}>
              {d.emoji} {d.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Question mode */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-foreground-muted">
          <FileText className="h-3 w-3" /> Type de questions
        </div>
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map(m => (
            <Pill key={m.id} active={settings.questionMode === m.id} disabled={disabled} onClick={() => update('questionMode', m.id)}>
              {m.emoji} {m.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-2 border-t border-border/30">
        <Toggle
          on={settings.enableJokers}
          onClick={() => update('enableJokers', !settings.enableJokers)}
          label="Jokers (50/50, Freeze, Skip)"
          emoji="🃏"
          disabled={disabled}
        />
        <Toggle
          on={settings.enableStreak}
          onClick={() => update('enableStreak', !settings.enableStreak)}
          label="Bonus séries (streak)"
          emoji="🔥"
          disabled={disabled}
        />
      </div>
    </div>
  );
};