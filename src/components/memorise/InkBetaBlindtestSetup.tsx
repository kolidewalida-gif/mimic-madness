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
  SlidersHorizontal,
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
    <span className="ibt-option-copy"><strong>{label}</strong><small>{description}</small></span>
    <span className="ibt-option-state">{checked ? 'Actif' : 'Inactif'}</span>
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
        <div className="ibt-waiting-visual">
          <div className="ibt-waiting-disc"><Disc3 aria-hidden="true" /></div>
          <div className="ibt-waiting-bars" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <div className="ibt-waiting-copy">
          <span className="ibt-live-chip"><Radio className={canStart ? undefined : 'animate-pulse'} aria-hidden="true" /> {canStart ? 'Studio connecté' : 'Connexion au studio…'}</span>
          <p className="ibt-kicker">Blindtest · Préparation</p>
          <h2>L’hôte compose la playlist</h2>
          <p>Installe-toi, monte le son et prépare tes meilleures réponses. La première manche arrive.</p>
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
        <div className="ibt-brand-lockup">
          <div className="ibt-logo-disc"><Disc3 aria-hidden="true" /></div>
          <div>
            <span className="ibt-kicker">Ink Beta · Le studio musical</span>
            <h1 id="ibt-setup-title">Compose ta partie</h1>
            <p><Headphones aria-hidden="true" /> Une playlist, quatre réponses, le plus rapide gagne.</p>
          </div>
        </div>
        <div className="ibt-session-badge">
          <Sparkles aria-hidden="true" />
          <span><small>Catalogue sélectionné</small><strong>{titleCount} titres prêts</strong></span>
        </div>
      </header>

      <div className="ibt-setup-grid">
        <section className="ibt-library" aria-labelledby="ibt-categories-title">
          <div className="ibt-panel-head ibt-library-head">
            <div>
              <span>01 · La playlist</span>
              <h2 id="ibt-categories-title">Choisis tes univers</h2>
              <p>Active au moins une collection. Tu peux tout mélanger.</p>
            </div>
            <div className="ibt-selection-count"><strong>{selected.size}</strong><span>sur {CATEGORIES.length}<small>sélectionnés</small></span></div>
          </div>

          <div className="ibt-category-grid">
            {CATEGORIES.map((category, index) => {
              const meta = CATEGORY_META[category];
              const active = selected.has(category);
              const count = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
              return (
                <motion.button
                  key={category}
                  type="button"
                  className="ibt-category menu-focus"
                  data-active={active || undefined}
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                  style={{ '--ibt-category': meta.color } as CSSProperties}
                  whileHover={{ y: -3 }}
                  whileTap={{ y: 1 }}
                >
                  <span className="ibt-category-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="ibt-category-emoji" aria-hidden="true">{meta.emoji}</span>
                  <span className="ibt-category-copy"><strong>{meta.label}</strong><small>{count} titres</small></span>
                  <span className="ibt-category-check" aria-hidden="true">{active && <Check />}</span>
                  <span className="ibt-category-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <aside className="ibt-console">
          <section className="ibt-console-panel" aria-labelledby="ibt-format-title">
            <div className="ibt-panel-head">
              <div><span>02 · Le format</span><h2 id="ibt-format-title">Règles du mix</h2></div>
              <SlidersHorizontal aria-hidden="true" />
            </div>
            <div className="ibt-control-group">
              <label><Disc3 aria-hidden="true" /><span>Nombre de manches<small>La longueur de la session</small></span></label>
              <div className="ibt-segmented">
                {BLINDTEST_ROUND_OPTIONS.map((value) => (
                  <button key={value} type="button" aria-pressed={rounds === value} onClick={() => setRounds(value)} className="menu-focus">{value}</button>
                ))}
              </div>
            </div>
            <div className="ibt-control-group">
              <label><Clock3 aria-hidden="true" /><span>Temps d’écoute<small>Pour reconnaître chaque extrait</small></span></label>
              <div className="ibt-segmented">
                {BLINDTEST_LISTEN_OPTIONS.map((value) => (
                  <button key={value} type="button" aria-pressed={listenMs === value} onClick={() => setListenMs(value)} className="menu-focus">{value / 1_000}s</button>
                ))}
              </div>
            </div>
          </section>

          <section className="ibt-console-panel" aria-labelledby="ibt-options-title">
            <div className="ibt-panel-head"><div><span>03 · Les bonus</span><h2 id="ibt-options-title">Pimente la partie</h2></div><Zap aria-hidden="true" /></div>
            <div className="ibt-setup-options">
              <OptionToggle checked={teams} icon={Users} label="Duel d’équipes" description="Cyan contre Rose" onClick={() => setTeams((value) => !value)} />
              <OptionToggle checked={hints} icon={Lightbulb} label="Indices progressifs" description="Le titre se révèle peu à peu" onClick={() => setHints((value) => !value)} />
              <OptionToggle checked={doublePoints} icon={Zap} label="Manches survoltées" description="Des tours valent deux fois plus" onClick={() => setDoublePoints((value) => !value)} />
            </div>
          </section>

          <section className="ibt-summary" aria-label="Résumé de la session">
            <div><span>Manches</span><strong>{playableRounds}</strong><small>tours</small></div>
            <div><span>Écoute</span><strong>{listenMs / 1_000}</strong><small>secondes</small></div>
            <div><span>Durée</span><strong>~{estimatedMinutes}</strong><small>minutes</small></div>
            <div><span>Mode</span><strong>{teams ? '2 équipes' : 'Solo'}</strong><small>{teams ? 'Cyan contre Rose' : 'chacun pour soi'}</small></div>
          </section>

          <motion.button
            type="button"
            className="ibt-launch menu-focus"
            onClick={() => onStart(Array.from(selected), config)}
            disabled={!canStart || starting}
            aria-busy={starting}
            whileHover={canStart && !starting ? { y: -3 } : undefined}
            whileTap={canStart && !starting ? { y: 1 } : undefined}
          >
            <span className="ibt-launch-icon">{starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}</span>
            <span className="ibt-launch-copy"><strong>{starting ? 'Préparation du mix…' : 'Entrer dans le studio'}</strong><small>{playableRounds} manches · {listenMs / 1_000}s par extrait</small></span>
            <span className="ibt-launch-arrow" aria-hidden="true">→</span>
          </motion.button>
          {!canStart && <p className="ibt-network-note"><Radio className="animate-pulse" aria-hidden="true" /> Connexion au salon…</p>}
          {error && <p className="ibt-network-note" role="alert"><AlertTriangle aria-hidden="true" /> {error}</p>}
        </aside>
      </div>
    </motion.section>
  );
};
