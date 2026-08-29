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
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  BLINDTEST_ENTRIES_UNIQUE,
  BLINDTEST_LISTEN_OPTIONS,
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
    className="ibt-option menu-focus"
    aria-pressed={checked}
    onClick={onClick}
  >
    <span className="ibt-option-icon"><Icon aria-hidden="true" /></span>
    <span><strong>{label}</strong><small>{description}</small></span>
    <span className="ibt-option-switch" aria-hidden="true"><i /></span>
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
  const [rounds, setRounds] = useState(10);
  const [listenMs, setListenMs] = useState(20_000);
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
  const estimatedMinutes = Math.max(1, Math.ceil((playableRounds * (listenMs + 6_500)) / 60_000));
  const config: BlindtestConfig = { rounds, listenMs, teams, hints, doublePoints };

  if (!isHost) {
    return (
      <motion.section
        className="ibt-waiting"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
      >
        <div className="ibt-waiting-disc"><Disc3 aria-hidden="true" /></div>
        <span className="ibt-live-chip"><Radio aria-hidden="true" /> Synchronisation live</span>
        <div>
          <p className="ibt-kicker">Studio Blindtest</p>
          <h2>L’hôte prépare la playlist</h2>
          <p>Les catégories, la durée et les bonus arrivent dès le lancement.</p>
        </div>
        <div className="ibt-waiting-bars" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="ibt-setup"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      aria-labelledby="ibt-setup-title"
    >
      <header className="ibt-setup-hero">
        <div className="ibt-logo-disc"><Disc3 aria-hidden="true" /></div>
        <div>
          <span className="ibt-kicker">Ink Beta · Music studio</span>
          <h1 id="ibt-setup-title">Blindtest</h1>
          <p><Headphones aria-hidden="true" /> Reconnais le son avant toute la troupe.</p>
        </div>
        <div className="ibt-session-badge">
          <Sparkles aria-hidden="true" />
          <span><small>Bibliothèque active</small><strong>{titleCount} titres</strong></span>
        </div>
      </header>

      <div className="ibt-setup-grid">
        <section className="ibt-panel ibt-library" aria-labelledby="ibt-categories-title">
          <div className="ibt-panel-head">
            <div><span>01 · Playlist</span><h2 id="ibt-categories-title">Choisis les univers</h2></div>
            <strong>{selected.size}/{CATEGORIES.length}</strong>
          </div>
          <div className="ibt-category-grid">
            {CATEGORIES.map((category) => {
              const meta = CATEGORY_META[category];
              const active = selected.has(category);
              const count = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  className="ibt-category menu-focus"
                  data-active={active || undefined}
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                  style={{ '--ibt-category': meta.color } as CSSProperties}
                >
                  <span className="ibt-category-top"><i aria-hidden="true">{meta.emoji}</i>{active && <Check aria-hidden="true" />}</span>
                  <span><strong>{meta.label}</strong><small>{count} titres</small></span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="ibt-console">
          <section className="ibt-panel" aria-labelledby="ibt-format-title">
            <div className="ibt-panel-head"><div><span>02 · Session</span><h2 id="ibt-format-title">Règles du mix</h2></div></div>
            <div className="ibt-control-group">
              <label><Disc3 aria-hidden="true" /> Manches</label>
              <div className="ibt-segmented">
                {BLINDTEST_ROUND_OPTIONS.map((value) => (
                  <button key={value} type="button" aria-pressed={rounds === value} onClick={() => setRounds(value)} className="menu-focus">{value}</button>
                ))}
              </div>
            </div>
            <div className="ibt-control-group">
              <label><Clock3 aria-hidden="true" /> Temps d’écoute</label>
              <div className="ibt-segmented">
                {BLINDTEST_LISTEN_OPTIONS.map((value) => (
                  <button key={value} type="button" aria-pressed={listenMs === value} onClick={() => setListenMs(value)} className="menu-focus">{value / 1_000}s</button>
                ))}
              </div>
            </div>
          </section>

          <section className="ibt-panel" aria-labelledby="ibt-options-title">
            <div className="ibt-panel-head"><div><span>03 · Bonus</span><h2 id="ibt-options-title">Options de jeu</h2></div></div>
            <div className="ibt-setup-options grid gap-1.5">
              <OptionToggle checked={teams} icon={Users} label="Deux équipes" description="Cyan contre Rose" onClick={() => setTeams((value) => !value)} />
              <OptionToggle checked={hints} icon={Lightbulb} label="Indices progressifs" description="Le titre se dévoile" onClick={() => setHints((value) => !value)} />
              <OptionToggle checked={doublePoints} icon={Zap} label="Manches ×2" description="Finale toujours doublée" onClick={() => setDoublePoints((value) => !value)} />
            </div>
          </section>

          <section className="ibt-summary" aria-label="Résumé de la session">
            <div><span>Playlist</span><strong>{titleCount}</strong><small>titres disponibles</small></div>
            <div><span>Session</span><strong>{playableRounds}</strong><small>manches jouées</small></div>
            <div><span>Durée</span><strong>~{estimatedMinutes}</strong><small>minutes</small></div>
            <div><span>Format</span><strong>{teams ? '2×' : 'Solo'}</strong><small>{teams ? 'deux équipes' : 'chacun pour soi'}</small></div>
          </section>

          <motion.button
            type="button"
            className="ibt-launch menu-focus"
            onClick={() => onStart(Array.from(selected), config)}
            disabled={!canStart || starting}
            aria-busy={starting}
            whileHover={canStart && !starting ? { y: -2 } : undefined}
            whileTap={canStart && !starting ? { y: 2 } : undefined}
          >
            {starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>{starting ? 'Préparation du mix…' : 'Lancer le Blindtest'}</span>
            <small>{playableRounds} manches · {listenMs / 1_000}s par extrait</small>
          </motion.button>
          {!canStart && <p className="ibt-network-note"><Radio className="animate-pulse" aria-hidden="true" /> Connexion au salon…</p>}
          {error && <p className="ibt-network-note" role="alert"><AlertTriangle aria-hidden="true" /> {error}</p>}
        </aside>
      </div>
    </motion.section>
  );
};
