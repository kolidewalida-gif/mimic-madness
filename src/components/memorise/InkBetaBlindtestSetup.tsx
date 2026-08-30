import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock3,
  Disc3,
  Headphones,
  Lightbulb,
  Loader2,
  Play,
  Radio,
  Users,
  Zap,
} from 'lucide-react';
import {
  BLINDTEST_ENTRIES_UNIQUE,
  BLINDTEST_LISTEN_MS,
  BLINDTEST_LISTEN_OPTIONS,
  BLINDTEST_REVEAL_MS,
  BLINDTEST_ROUNDS,
  BLINDTEST_ROUND_OPTIONS,
  CATEGORY_META,
  type BlindtestCategory,
} from '@/lib/blindtestTracks';
import type { BlindtestConfig } from './MemoriseGameScreen';

interface InkBetaBlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  error: string | null;
  onStart: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
}

const CATEGORIES: BlindtestCategory[] = [
  'anime', 'cartoon', 'music', 'film', 'jeuxvideo',
  'disney', 'kpop', 'retro', 'series', 'rapfr',
];

const OptionToggle = ({
  checked,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  checked: boolean;
  icon: typeof Users;
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="bt5-toggle menu-focus"
    data-on={checked || undefined}
    aria-pressed={checked}
    onClick={onClick}
  >
    <span className="bt5-toggle-icon"><Icon aria-hidden="true" /></span>
    <span className="bt5-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
    <span className="bt5-toggle-switch" aria-hidden="true"><i /></span>
  </button>
);

export const InkBetaBlindtestSetup = ({
  isHost,
  canStart,
  starting,
  error,
  onStart,
}: InkBetaBlindtestSetupProps) => {
  const [selected, setSelected] = useState<Set<BlindtestCategory>>(new Set(CATEGORIES));
  const [rounds, setRounds] = useState(BLINDTEST_ROUNDS);
  const [listenMs, setListenMs] = useState(BLINDTEST_LISTEN_MS);
  const [teams, setTeams] = useState(false);
  const [hints, setHints] = useState(true);
  const [doublePoints, setDoublePoints] = useState(true);

  const toggleCategory = (category: BlindtestCategory) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const titleCount = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => selected.has(entry.category)).length;
  const playableRounds = Math.max(1, Math.min(rounds, titleCount));
  const estimatedMinutes = Math.max(1, Math.ceil((playableRounds * (listenMs + BLINDTEST_REVEAL_MS)) / 60_000));
  const config: BlindtestConfig = { rounds, listenMs, teams, hints, doublePoints };

  if (!isHost) {
    return (
      <motion.section
        className="bt5-waiting"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
      >
        <div className="bt5-waiting-disc" aria-hidden="true">
          <Disc3 />
          <span className="bt5-waiting-pulse" />
        </div>
        <div className="bt5-waiting-copy">
          <span className="bt5-eyebrow">Blindtest musical</span>
          <h2>Le mix arrive.</h2>
          <p>L’hôte prépare la sélection. Branche tes écouteurs, ça va aller vite.</p>
          <span className="bt5-connection" data-ready={canStart || undefined}>
            <Radio className={canStart ? undefined : 'animate-pulse'} aria-hidden="true" />
            {canStart ? 'Salon connecté' : 'Connexion au salon…'}
          </span>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="bt5-setup"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="bt5-setup-title"
    >
      <div className="bt5-setup-main">
        <header className="bt5-setup-hero">
          <span className="bt5-eyebrow">Blindtest musical</span>
          <h1 id="bt5-setup-title">Fais ta setlist.</h1>
          <p><Headphones aria-hidden="true" /> {selected.size} univers · {titleCount} titres · environ {estimatedMinutes} min</p>
        </header>

        <div className="bt5-cats" role="group" aria-label="Catégories">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const active = selected.has(category);
            const count = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
            return (
              <motion.button
                key={category}
                type="button"
                className="bt5-cat menu-focus"
                data-active={active || undefined}
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                style={{ '--bt5-cat': meta.color } as CSSProperties}
                whileTap={{ scale: 0.96 }}
              >
                <span className="bt5-cat-emoji" aria-hidden="true">{meta.emoji}</span>
                <span className="bt5-cat-copy">
                  <strong>{meta.label}</strong>
                  <small>{count} titres</small>
                </span>
                <span className="bt5-cat-check" aria-hidden="true">{active ? <Check /> : '+'}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <aside className="bt5-setup-side">
        <div className="bt5-rule">
          <label><Disc3 aria-hidden="true" /><span>Manches</span><strong>{playableRounds}</strong></label>
          <div className="bt5-segments">
            {BLINDTEST_ROUND_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={rounds === value} onClick={() => setRounds(value)} className="menu-focus">{value}</button>
            ))}
          </div>
        </div>

        <div className="bt5-rule">
          <label><Clock3 aria-hidden="true" /><span>Écoute</span><strong>{listenMs / 1_000}s</strong></label>
          <div className="bt5-segments">
            {BLINDTEST_LISTEN_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={listenMs === value} onClick={() => setListenMs(value)} className="menu-focus">{value / 1_000}s</button>
            ))}
          </div>
        </div>

        <div className="bt5-toggles" aria-label="Options de partie">
          <OptionToggle checked={teams} icon={Users} label="Équipes" description="Deux camps" onClick={() => setTeams((value) => !value)} />
          <OptionToggle checked={hints} icon={Lightbulb} label="Indices" description="Progressifs" onClick={() => setHints((value) => !value)} />
          <OptionToggle checked={doublePoints} icon={Zap} label="Double" description="Tours ×2" onClick={() => setDoublePoints((value) => !value)} />
        </div>

        <motion.button
          type="button"
          className="bt5-launch menu-focus"
          onClick={() => onStart(Array.from(selected), config)}
          disabled={!canStart || starting}
          aria-busy={starting}
          whileTap={canStart && !starting ? { scale: 0.98 } : undefined}
        >
          <span className="bt5-launch-icon">{starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}</span>
          <span className="bt5-launch-copy"><strong>{starting ? 'Chargement du mix…' : 'Lancer le blindtest'}</strong><small>{playableRounds} manches · {teams ? 'en équipes' : 'chacun pour soi'}</small></span>
        </motion.button>

        <div className="bt5-setup-message" aria-live="polite">
          {!canStart && <p><Radio className="animate-pulse" aria-hidden="true" /> Connexion au salon…</p>}
          {error && <p role="alert"><AlertTriangle aria-hidden="true" /> {error}</p>}
        </div>
      </aside>
    </motion.section>
  );
};
