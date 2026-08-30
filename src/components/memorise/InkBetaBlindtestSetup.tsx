import { useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock3,
  Disc3,
  Gauge,
  Headphones,
  Layers,
  Lightbulb,
  ListMusic,
  Loader2,
  Play,
  Radio,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
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

/** Nombre de titres par univers, calculé une fois pour tout le module. */
const COUNT_BY_CATEGORY = CATEGORIES.reduce<Record<string, number>>((acc, category) => {
  acc[category] = BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === category).length;
  return acc;
}, {});

const plural = (value: number, word: string) => `${value} ${word}${value > 1 ? 's' : ''}`;

/** Segment de réglage : une valeur discrète parmi une liste courte. */
const Segmented = <T extends number>({
  options,
  value,
  format,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  format: (option: T) => string;
  onChange: (option: T) => void;
  label: string;
}) => (
  <div className="bts-segmented" role="group" aria-label={label} data-count={options.length}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className="menu-focus"
        aria-pressed={value === option}
        onClick={() => onChange(option)}
      >
        {format(option)}
      </button>
    ))}
  </div>
);

/** Bonus de partie : un interrupteur explicite avec sa conséquence en jeu. */
const BonusToggle = ({
  checked,
  icon: Icon,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  icon: typeof Users;
  label: string;
  description: string;
  onChange: () => void;
}) => (
  <button
    type="button"
    className="bts-bonus menu-focus"
    data-on={checked || undefined}
    aria-pressed={checked}
    onClick={onChange}
  >
    <span className="bts-bonus-icon" aria-hidden="true"><Icon /></span>
    <span className="bts-bonus-copy">
      <strong>{label}</strong>
      <small>{description}</small>
    </span>
    <span className="bts-switch" aria-hidden="true"><i /></span>
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
  const [rounds, setRounds] = useState<number>(BLINDTEST_ROUNDS);
  const [listenMs, setListenMs] = useState<number>(BLINDTEST_LISTEN_MS);
  const [teams, setTeams] = useState(false);
  const [hints, setHints] = useState(true);
  const [doublePoints, setDoublePoints] = useState(true);

  /** Un univers doit toujours rester actif : sans titre, aucune manche. */
  const isLastSelected = (category: BlindtestCategory) => selected.size === 1 && selected.has(category);

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

  const selectAll = () => setSelected(new Set(CATEGORIES));

  /** Tirage surprise : trois univers au hasard pour relancer la variété. */
  const selectRandom = () => {
    const pool = [...CATEGORIES];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSelected(new Set(pool.slice(0, 3)));
  };

  const titleCount = useMemo(
    () => CATEGORIES.reduce((total, category) => (selected.has(category) ? total + COUNT_BY_CATEGORY[category] : total), 0),
    [selected],
  );

  const playableRounds = Math.max(1, Math.min(rounds, titleCount));
  const isCapped = playableRounds < rounds;
  const listenSeconds = Math.round(listenMs / 1_000);
  const estimatedMinutes = Math.max(1, Math.ceil((playableRounds * (listenMs + BLINDTEST_REVEAL_MS)) / 60_000));
  const config: BlindtestConfig = { rounds, listenMs, teams, hints, doublePoints };

  const activeBonuses = [
    teams ? 'deux équipes' : null,
    hints ? 'indices progressifs' : null,
    doublePoints ? 'manches ×2' : null,
  ].filter(Boolean) as string[];

  const recap = [
    plural(playableRounds, 'manche'),
    `${listenSeconds} s d’écoute`,
    teams ? 'en équipes' : 'chacun pour soi',
  ].join(' · ');

  if (!isHost) {
    return (
      <motion.section
        className="bts-wait"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
      >
        <div className="bts-wait-art" aria-hidden="true">
          <div className="bts-wait-disc"><Disc3 /></div>
          <div className="bts-wait-wave">
            {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <div className="bts-wait-copy">
          <span className="bts-kicker"><Radio aria-hidden="true" /> Blindtest · Backstage</span>
          <h2>Le mix<br /><em>arrive.</em></h2>
          <p>L’hôte compose la setlist. Branche tes écouteurs, monte le son et garde un doigt sur les réponses.</p>
        </div>
        <ul className="bts-wait-tips">
          <li><Timer aria-hidden="true" /> Répondre vite rapporte plus de points</li>
          <li><Lightbulb aria-hidden="true" /> Des indices apparaissent en fin d’extrait</li>
          <li><Check aria-hidden="true" /> Une seule réponse, pas de retour en arrière</li>
        </ul>
        <span className="bts-connection" data-ready={canStart || undefined}>
          <Radio className={canStart ? undefined : 'animate-pulse'} aria-hidden="true" />
          {canStart ? 'Salon connecté' : 'Connexion au salon…'}
        </span>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="bts"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      aria-labelledby="bts-title"
    >
      <header className="bts-hero">
        <div className="bts-hero-copy">
          <span className="bts-kicker"><Disc3 aria-hidden="true" /> Ink Beta · Blindtest</span>
          <h1 id="bts-title">Fais ta setlist.</h1>
          <p><Headphones aria-hidden="true" /> Un extrait, quatre propositions, une seule bonne réponse.</p>
        </div>

        <dl className="bts-stats" aria-label="Résumé de la partie">
          <div>
            <dt><Layers aria-hidden="true" /> Univers</dt>
            <dd>{selected.size}<em>/{CATEGORIES.length}</em></dd>
          </div>
          <div>
            <dt><ListMusic aria-hidden="true" /> Titres</dt>
            <dd>{titleCount.toLocaleString('fr-FR')}</dd>
          </div>
          <div>
            <dt><Disc3 aria-hidden="true" /> Manches</dt>
            <dd>{playableRounds}</dd>
          </div>
          <div>
            <dt><Clock3 aria-hidden="true" /> Durée</dt>
            <dd>~{estimatedMinutes}<em>min</em></dd>
          </div>
        </dl>
      </header>

      <section className="bts-crate" aria-labelledby="bts-crate-title">
        <div className="bts-head">
          <span className="bts-step" aria-hidden="true">01</span>
          <div className="bts-head-copy">
            <h2 id="bts-crate-title">Pioche tes univers</h2>
            <p>Garde au moins un univers actif. Plus la sélection est large, plus le mix surprend.</p>
          </div>
          <div className="bts-head-actions">
            <button type="button" className="bts-chip menu-focus" onClick={selectAll} disabled={selected.size === CATEGORIES.length}>
              <Sparkles aria-hidden="true" /> Tout
            </button>
            <button type="button" className="bts-chip menu-focus" onClick={selectRandom}>
              <Shuffle aria-hidden="true" /> Au hasard
            </button>
          </div>
        </div>

        <div className="bts-grid" role="group" aria-label="Univers musicaux disponibles">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const active = selected.has(category);
            const locked = isLastSelected(category);
            return (
              <motion.button
                key={category}
                type="button"
                className="bts-card menu-focus"
                data-active={active || undefined}
                data-locked={locked || undefined}
                aria-pressed={active}
                title={locked ? 'Garde au moins un univers actif' : undefined}
                onClick={() => toggleCategory(category)}
                style={{ '--bts-cat': meta.color } as CSSProperties}
                whileTap={locked ? undefined : { scale: 0.97 }}
              >
                <span className="bts-card-art" aria-hidden="true">{meta.emoji}</span>
                <span className="bts-card-copy">
                  <strong>{meta.label}</strong>
                  <small>{plural(COUNT_BY_CATEGORY[category], 'titre')}</small>
                </span>
                <span className="bts-card-state" aria-hidden="true">
                  {active ? <Check /> : '+'}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <ol className="bts-rules" aria-label="Déroulé d’une manche">
        <li>
          <span className="bts-rules-num" aria-hidden="true">1</span>
          <Timer aria-hidden="true" />
          <div>
            <strong>Écoute l’extrait</strong>
            <small>{listenSeconds} secondes, sans le titre à l’écran</small>
          </div>
        </li>
        <li>
          <span className="bts-rules-num" aria-hidden="true">2</span>
          <Gauge aria-hidden="true" />
          <div>
            <strong>Réponds vite</strong>
            <small>Le score fond seconde après seconde</small>
          </div>
        </li>
        <li>
          <span className="bts-rules-num" aria-hidden="true">3</span>
          <Trophy aria-hidden="true" />
          <div>
            <strong>Grimpe au classement</strong>
            <small>Le meilleur flair musical remporte le set</small>
          </div>
        </li>
      </ol>

      <aside className="bts-rail">
        <section className="bts-block" aria-labelledby="bts-tempo-title">
          <div className="bts-head">
            <span className="bts-step" aria-hidden="true">02</span>
            <div className="bts-head-copy">
              <h2 id="bts-tempo-title">Règle le tempo</h2>
              <p>Manches courtes pour enchaîner, extraits longs pour deviner.</p>
            </div>
          </div>

          <div className="bts-field">
            <span className="bts-field-label">
              <Disc3 aria-hidden="true" /> Manches
              <strong>{rounds}</strong>
            </span>
            <Segmented
              label="Nombre de manches"
              options={BLINDTEST_ROUND_OPTIONS}
              value={rounds as (typeof BLINDTEST_ROUND_OPTIONS)[number]}
              format={(option) => String(option)}
              onChange={setRounds}
            />
          </div>

          <div className="bts-field">
            <span className="bts-field-label">
              <Timer aria-hidden="true" /> Écoute
              <strong>{listenSeconds} s</strong>
            </span>
            <Segmented
              label="Durée d’écoute par manche"
              options={BLINDTEST_LISTEN_OPTIONS}
              value={listenMs as (typeof BLINDTEST_LISTEN_OPTIONS)[number]}
              format={(option) => `${option / 1_000}s`}
              onChange={setListenMs}
            />
          </div>

        </section>

        <section className="bts-block" aria-labelledby="bts-bonus-title">
          <div className="bts-head">
            <span className="bts-step" aria-hidden="true">03</span>
            <div className="bts-head-copy">
              <h2 id="bts-bonus-title">Ajoute du piment</h2>
              <p>Trois options qui changent la façon de marquer.</p>
            </div>
          </div>

          <div className="bts-bonuses">
            <BonusToggle
              checked={teams}
              icon={Users}
              label="Équipes"
              description="Deux camps, scores cumulés"
              onChange={() => setTeams((value) => !value)}
            />
            <BonusToggle
              checked={hints}
              icon={Lightbulb}
              label="Indices"
              description="Lettres révélées en fin d’extrait"
              onChange={() => setHints((value) => !value)}
            />
            <BonusToggle
              checked={doublePoints}
              icon={Zap}
              label="Manches ×2"
              description="Certaines manches valent double"
              onChange={() => setDoublePoints((value) => !value)}
            />
          </div>
        </section>

        <footer className="bts-launch-zone">
          <div className="bts-ticket" aria-live="polite">
            <span className="bts-ticket-label"><Trophy aria-hidden="true" /> Ta partie</span>
            <strong>{recap}</strong>
            <small>{activeBonuses.length > 0 ? `Avec ${activeBonuses.join(', ')}.` : 'Aucun bonus, scoring pur.'}</small>
          </div>

          <motion.button
            type="button"
            className="bts-launch menu-focus"
            onClick={() => onStart(Array.from(selected), config)}
            disabled={!canStart || starting}
            aria-busy={starting}
            whileTap={canStart && !starting ? { scale: 0.985 } : undefined}
          >
            <span className="bts-launch-icon" aria-hidden="true">
              {starting ? <Loader2 className="animate-spin" /> : <Play />}
            </span>
            <span className="bts-launch-copy">
              <strong>{starting ? 'Chargement du mix…' : 'Lancer le blindtest'}</strong>
              <small>{plural(playableRounds, 'manche')} · ~{estimatedMinutes} min</small>
            </span>
            <b aria-hidden="true">↗</b>
          </motion.button>

          <div className="bts-messages" aria-live="polite">
            {isCapped && (
              <p className="bts-message" data-tone="warn">
                <AlertTriangle aria-hidden="true" />
                {plural(titleCount, 'titre')} dans ta sélection : la partie s’arrêtera à {playableRounds}.
              </p>
            )}
            {!canStart && (
              <p className="bts-message">
                <Radio className="animate-pulse" aria-hidden="true" /> Connexion au salon…
              </p>
            )}
            {error && (
              <p className="bts-message" data-tone="error" role="alert">
                <AlertTriangle aria-hidden="true" /> {error}
              </p>
            )}
          </div>
        </footer>
      </aside>
    </motion.section>
  );
};
