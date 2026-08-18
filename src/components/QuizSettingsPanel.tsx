import { cn } from '@/lib/utils';
import { Hash, Timer, Sparkles, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';

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
const DIFF_OPTIONS: Array<{
  id: QuizSettings['difficulty'];
  label: string;
  emoji: string;
  color: string;
}> = [
  { id: 'mixed', label: 'Mixte', emoji: '🎲', color: '#a06bff' },
  { id: 'facile', label: 'Facile', emoji: '🟢', color: '#3ddc91' },
  { id: 'moyen', label: 'Moyen', emoji: '🟡', color: '#fbbf24' },
  { id: 'difficile', label: 'Difficile', emoji: '🔴', color: '#ef4444' },
];
const MODE_OPTIONS: Array<{
  id: QuizSettings['questionMode'];
  label: string;
  emoji: string;
  color: string;
}> = [
  { id: 'mixed', label: 'Mixte', emoji: '🎲', color: '#a06bff' },
  { id: 'qcm', label: 'QCM', emoji: '📝', color: '#40c9ff' },
  { id: 'text', label: 'Libre', emoji: '⌨️', color: '#ff9640' },
];

const InkPill = ({
  active,
  onClick,
  children,
  disabled,
  color = 'var(--ink-accent)',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  color?: string;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.06, rotate: -1.5 } : undefined}
    whileTap={!disabled ? { scale: 0.94 } : undefined}
    className={cn(
      'px-3 py-1.5 rounded-xl text-base font-black text-white leading-none transition-opacity',
      disabled && 'opacity-50 cursor-not-allowed',
    )}
    style={{
      background: active
        ? `linear-gradient(180deg, ${color}, ${color}cc)`
        : 'rgba(255,255,255,0.05)',
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
      fontFamily: "'Outfit', sans-serif",
      textShadow: active ? GRAFFITI_TEXT_SHADOW_SM : undefined,
      color: active ? 'white' : 'rgba(255,255,255,0.65)',
    }}
  >
    {children}
  </motion.button>
);

const InkToggle = ({
  on,
  onClick,
  label,
  emoji,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
  disabled?: boolean;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled ? { scale: 1.01, rotate: -0.3 } : undefined}
    whileTap={!disabled ? { scale: 0.99 } : undefined}
    className={cn(
      'flex items-center justify-between w-full px-3 py-2.5 rounded-2xl transition-opacity',
      disabled && 'opacity-50 cursor-not-allowed',
    )}
    style={{
      background: on
        ? 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(5,150,105,0.05))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '1px solid var(--ink-line)',
      boxShadow: 'none',
    }}
  >
    <span className="flex items-center gap-2">
      <span className="text-xl">{emoji}</span>
      <span
        className="text-base font-black text-white leading-none"
        style={{
          fontFamily: "'Outfit', sans-serif",
          textShadow: GRAFFITI_TEXT_SHADOW_SM,
        }}
      >
        {label}
      </span>
    </span>
    <span
      className="relative inline-flex items-center w-12 h-7 rounded-full"
      style={{
        background: on
          ? 'linear-gradient(180deg, #34d399, #059669)'
          : 'rgba(0,0,0,0.5)',
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{
          left: on ? 'calc(100% - 22px)' : '2px',
          boxShadow: 'none',
        }}
      />
    </span>
  </motion.button>
);

const SectionHeader = ({
  icon: Icon,
  label,
}: {
  icon: any;
  label: string;
}) => (
  <div
    className="flex items-center gap-1.5 text-base font-black uppercase tracking-wider text-white/85"
    style={{
      fontFamily: "'Outfit', sans-serif",
      textShadow: GRAFFITI_TEXT_SHADOW_SM,
    }}
  >
    <Icon className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.5} />
    {label}
  </div>
);

export const QuizSettingsPanel = ({ settings, onChange, disabled }: Props) => {
  const update = <K extends keyof QuizSettings>(
    key: K,
    value: QuizSettings[K],
  ) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-4">
      {/* Rounds */}
      <div className="space-y-2">
        <SectionHeader icon={Hash} label="Nombre de questions" />
        <div className="flex flex-wrap gap-2">
          {ROUND_OPTIONS.map((n) => (
            <InkPill
              key={n}
              active={settings.totalRounds === n}
              disabled={disabled}
              onClick={() => update('totalRounds', n)}
            >
              {n}
            </InkPill>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="space-y-2">
        <SectionHeader icon={Timer} label="Temps par question" />
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((s) => (
            <InkPill
              key={s}
              active={settings.answerDurationMs === s * 1000}
              disabled={disabled}
              onClick={() => update('answerDurationMs', s * 1000)}
              color="var(--ink-text-dim)"
            >
              {s}s
            </InkPill>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <SectionHeader icon={Sparkles} label="Difficulté" />
        <div className="flex flex-wrap gap-2">
          {DIFF_OPTIONS.map((d) => (
            <InkPill
              key={d.id}
              active={settings.difficulty === d.id}
              disabled={disabled}
              onClick={() => update('difficulty', d.id)}
              color={d.color}
            >
              {d.emoji} {d.label}
            </InkPill>
          ))}
        </div>
      </div>

      {/* Question mode */}
      <div className="space-y-2">
        <SectionHeader icon={FileText} label="Type de questions" />
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((m) => (
            <InkPill
              key={m.id}
              active={settings.questionMode === m.id}
              disabled={disabled}
              onClick={() => update('questionMode', m.id)}
              color={m.color}
            >
              {m.emoji} {m.label}
            </InkPill>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-2">
        <InkToggle
          on={settings.enableJokers}
          onClick={() => update('enableJokers', !settings.enableJokers)}
          label="Jokers (50/50, Freeze, Skip)"
          emoji="🃏"
          disabled={disabled}
        />
        <InkToggle
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
