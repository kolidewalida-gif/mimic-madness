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
    className="bt4-toggle menu-focus"
    data-on={checked || undefined}
    aria-pressed={checked}
    onClick={onClick}
  >
    <span className="bt4-toggle-icon"><Icon aria-hidden="true" /></span>
    <span className="bt4-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
    <span className="bt4-toggle-switch" aria-hidden="true"><i /></span>
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
        className="bt4-waiting"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
      >
        <div className="bt4-waiting-art" aria-hidden="true">
          <div className="bt4-waiting-record"><Disc3 /></div>
          <div className="bt4-waiting-wave">
            {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <div className="bt4-waiting-copy">
          <span className="bt4-eyebrow">Blindtest · Backstage</span>
          <h2>Le mix<br />arrive.</h2>
          <p>L’hôte prépare la sélection. Branche tes écouteurs et garde un doigt sur les réponses.</p>
          <span className="bt4-connection" data-ready={canStart || undefined}>
            <Radio className={canStart ? undefined : 'animate-pulse'} aria-hidden="true" />
            {canStart ? 'Salon connecté' : 'Connexion au salon…'}
          </span>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="bt4-setup"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="bt4-setup-title"
    >
      <header className="bt4-setup-hero">
        <div className="bt4-setup-title">
          <span className="bt4-eyebrow">Ink Beta · Blindtest</span>
          <h1 id="bt4-setup-title">Fais ta setlist.</h1>
          <p><Headphones aria-hidden="true" /> Dix univers, quatre choix, une seule bonne réponse.</p>
        </div>
        <div className="bt4-setup-numbers" aria-label="Sélection actuelle">
          <div><strong>{selected.size}</strong><span>univers<br />actifs</span></div>
          <i aria-hidden="true" />
          <div><strong>{titleCount}</strong><span>titres<br />disponibles</span></div>
        </div>
      </header>

      <section className="bt4-crate" aria-labelledby="bt4-categories-title">
        <div className="bt4-crate-heading">
          <div>
            <span className="bt4-step">01</span>
            <h2 id="bt4-categories-title">Pioche tes sons</h2>
          </div>
          <p>Fais défiler les pochettes · garde au moins un univers</p>
        </div>

        <div className="bt4-crate-track">
          {CATEGORIES.map((category, index) => {
            const meta = CATEGORY_META[category];
            const active = selected.has(category);
            const count = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
            return (
              <motion.button
                key={category}
                type="button"
                className="bt4-sleeve menu-focus"
                data-active={active || undefined}
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                style={{ '--bt4-cat': meta.color } as CSSProperties}
                whileTap={{ scale: 0.97 }}
              >
                <span className="bt4-sleeve-top">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span className="bt4-sleeve-check">{active ? <Check aria-hidden="true" /> : '+'}</span>
                </span>
                <span className="bt4-sleeve-art" aria-hidden="true">
                  <i /><i /><i />
                  <b>{meta.emoji}</b>
                </span>
                <span className="bt4-sleeve-copy">
                  <strong>{meta.label}</strong>
                  <small>{count} titres</small>
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="bt4-mixer" aria-labelledby="bt4-mixer-title">
        <div className="bt4-mixer-intro">
          <span className="bt4-step">02</span>
          <div>
            <h2 id="bt4-mixer-title">Règle le tempo</h2>
            <p>Environ {estimatedMinutes} min de jeu</p>
          </div>
        </div>

        <div className="bt4-rule">
          <label><Disc3 aria-hidden="true" /><span>Manches</span><strong>{playableRounds}</strong></label>
          <div className="bt4-segments" data-count={BLINDTEST_ROUND_OPTIONS.length}>
            {BLINDTEST_ROUND_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={rounds === value} onClick={() => setRounds(value)} className="menu-focus">{value}</button>
            ))}
          </div>
        </div>

        <div className="bt4-rule">
          <label><Clock3 aria-hidden="true" /><span>Écoute</span><strong>{listenMs / 1_000}s</strong></label>
          <div className="bt4-segments" data-count={BLINDTEST_LISTEN_OPTIONS.length}>
            {BLINDTEST_LISTEN_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={listenMs === value} onClick={() => setListenMs(value)} className="menu-focus">{value / 1_000}s</button>
            ))}
          </div>
        </div>

        <div className="bt4-bonuses" aria-label="Options de partie">
          <OptionToggle checked={teams} icon={Users} label="Équipes" description="Deux camps" onClick={() => setTeams((value) => !value)} />
          <OptionToggle checked={hints} icon={Lightbulb} label="Indices" description="Progressifs" onClick={() => setHints((value) => !value)} />
          <OptionToggle checked={doublePoints} icon={Zap} label="Double" description="Tours ×2" onClick={() => setDoublePoints((value) => !value)} />
        </div>

        <motion.button
          type="button"
          className="bt4-launch menu-focus"
          onClick={() => onStart(Array.from(selected), config)}
          disabled={!canStart || starting}
          aria-busy={starting}
          whileTap={canStart && !starting ? { scale: 0.98 } : undefined}
        >
          <span className="bt4-launch-icon">{starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}</span>
          <span><strong>{starting ? 'Chargement du mix…' : 'Lancer le blindtest'}</strong><small>{playableRounds} manches · {teams ? 'en équipes' : 'chacun pour soi'}</small></span>
          <b aria-hidden="true">↗</b>
        </motion.button>
      </section>

      <div className="bt4-setup-message" aria-live="polite">
        {!canStart && <p><Radio className="animate-pulse" aria-hidden="true" /> Connexion au salon…</p>}
        {error && <p role="alert"><AlertTriangle aria-hidden="true" /> {error}</p>}
      </div>
    </motion.section>
  );
};
