import { useMemo, useState, type CSSProperties } from 'react';
import {
  AlertCircle, ArrowUpRight, AudioLines, CassetteTape, Castle, Check,
  Clapperboard, Disc3, Gamepad2, Headphones, Lightbulb, Loader2,
  Mic2, Music2, Play, Radio, Shuffle, Sparkles, Swords, Timer, Tv, Users, Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  BLINDTEST_ENTRIES_UNIQUE, BLINDTEST_LISTEN_MS, BLINDTEST_LISTEN_OPTIONS,
  BLINDTEST_REVEAL_MS, BLINDTEST_ROUNDS, BLINDTEST_ROUND_OPTIONS, CATEGORY_META,
  type BlindtestCategory,
} from '@/lib/blindtestTracks';
import type { BlindtestConfig } from './MemoriseGameScreen';
import { InkBetaMascot } from '@/components/InkBetaBrand';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './BubbleBlindtest.module.css';

interface InkBetaBlindtestSetupProps {
  isHost: boolean;
  canStart: boolean;
  starting: boolean;
  error: string | null;
  onStart: (categories: BlindtestCategory[], config: BlindtestConfig) => void;
}

const UNIVERSES: { id: BlindtestCategory; icon: LucideIcon; caption: string; color: string }[] = [
  { id: 'music', icon: Music2, caption: 'Les hits, les vrais.', color: '#c2acff' },
  { id: 'anime', icon: Swords, caption: 'Opening culte.', color: '#ffaca0' },
  { id: 'film', icon: Clapperboard, caption: 'Le grand frisson.', color: '#f1d48e' },
  { id: 'jeuxvideo', icon: Gamepad2, caption: 'Level : mélomane.', color: '#b5d99f' },
  { id: 'rapfr', icon: Mic2, caption: 'Le flow dans la peau.', color: '#b2c5ff' },
  { id: 'disney', icon: Castle, caption: 'Un peu de magie.', color: '#e9b4e8' },
  { id: 'retro', icon: CassetteTape, caption: 'Retour sur la face B.', color: '#e7bb8b' },
  { id: 'kpop', icon: Sparkles, caption: 'Le refrain en boucle.', color: '#efa9ce' },
  { id: 'series', icon: Tv, caption: 'Encore un épisode.', color: '#9fcfdd' },
  { id: 'cartoon', icon: Play, caption: 'Souvenirs du matin.', color: '#d5d88c' },
];
const CATEGORIES = UNIVERSES.map(({ id }) => id);
const COUNTS = Object.fromEntries(CATEGORIES.map((id) => [id, BLINDTEST_ENTRIES_UNIQUE.filter((entry) => entry.category === id).length]));
const PRESETS: { label: string; categories: BlindtestCategory[] }[] = [
  { label: 'Le grand mix', categories: CATEGORIES },
  { label: 'Pop culture', categories: ['anime', 'film', 'jeuxvideo', 'disney', 'series', 'cartoon'] },
  { label: 'Hits & nostalgie', categories: ['music', 'rapfr', 'retro', 'kpop'] },
];

const Segmented = ({ options, value, onChange, label, seconds = false }: {
  options: readonly number[]; value: number; onChange: (value: number) => void; label: string; seconds?: boolean;
}) => (
  <div className={styles.segments} role="group" aria-label={label}>
    {options.map((option) => (
      <button key={option} type="button" aria-pressed={value === option} onClick={() => { playSoundEffect('selectItem', .16); onChange(option); }}>
        {seconds ? `${option / 1000}s` : option}
      </button>
    ))}
  </div>
);

const Toggle = ({ checked, onChange, icon: Icon, label, description }: {
  checked: boolean; onChange: () => void; icon: LucideIcon; label: string; description: string;
}) => (
  <button className={styles.toggle} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => { playSoundEffect(checked ? 'toggleOff' : 'toggleOn', .18); onChange(); }}>
    <Icon aria-hidden="true" />
    <span><strong>{label}</strong><small>{description}</small></span>
    <i className={styles.switch} aria-hidden="true"><i /></i>
  </button>
);

/** Setup owns only local form state. The host remains authoritative for starting a game. */
export const InkBetaBlindtestSetup = ({ isHost, canStart, starting, error, onStart }: InkBetaBlindtestSetupProps) => {
  const [selected, setSelected] = useState<Set<BlindtestCategory>>(() => new Set(CATEGORIES));
  const [rounds, setRounds] = useState<number>(BLINDTEST_ROUNDS);
  const [listenMs, setListenMs] = useState<number>(BLINDTEST_LISTEN_MS);
  const [teams, setTeams] = useState(false);
  const [hints, setHints] = useState(true);
  const [doublePoints, setDoublePoints] = useState(true);
  const reduceMotion = useReducedMotion();
  const titleCount = useMemo(() => [...selected].reduce((total, id) => total + COUNTS[id], 0), [selected]);
  const playableRounds = Math.min(rounds, titleCount);
  const minutes = Math.max(1, Math.ceil(playableRounds * (listenMs + BLINDTEST_REVEAL_MS) / 60000));
  const preset = PRESETS.find(({ categories }) => categories.length === selected.size && categories.every((id) => selected.has(id)));

  const toggleCategory = (id: BlindtestCategory) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
    return next;
  });
  const surprise = () => {
    const shuffled = [...CATEGORIES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSelected(new Set(shuffled.slice(0, 3)));
  };

  if (!isHost) return (
    <section className={styles.wait} aria-labelledby="ibx-wait-title">
      <div className={styles.waitMascot}><InkBetaMascot /></div>
      <span className={styles.eyebrow}>BLINDTEST MUSICAL</span>
      <h1 id="ibx-wait-title">La partie se prépare.</h1>
      <p>L’hôte choisit les catégories et les réglages. Tu peux régler ton volume en haut de l’écran.</p>
      <ol className={styles.howto}>
        <li><b>01</b><span>Écoute l’extrait</span></li>
        <li><b>02</b><span>Choisis une réponse</span></li>
        <li><b>03</b><span>Marque des points</span></li>
      </ol>
      <div className={styles.status} role="status"><Radio />{canStart ? 'Salon connecté · En attente de l’hôte' : 'Connexion au salon…'}</div>
      <small>Plus tu réponds vite, plus tu marques. Une réponse validée est définitive.</small>
    </section>
  );

  return (
    <fieldset className={styles.setup} disabled={starting}>
      <legend className="sr-only">Préparer le blindtest</legend>
      <header className={`${styles.heading} ${styles.setupHeading}`}>
        <div><span className={styles.eyebrow}><Headphones /> Le blindtest de ta bande</span><h1 id="ibx-setup-title">Ça te dit <em>quelque chose ?</em></h1><p>Compose ton mix. Reconnais les titres. Fais grimper le score.</p></div>
        <div className={styles.setupMascot} aria-hidden="true"><InkBetaMascot /><span>À vous les hits !</span></div>
      </header>
      <div className={styles.catalog}>
        <section className={styles.library} aria-labelledby="ibx-library-title">
          <header className={styles.sectionHead}>
            <div><span className={styles.sectionNo}>1</span><span><h2 id="ibx-library-title">Qu’est-ce qu’on écoute ?</h2><p>Pioche tes univers. Tu peux les mélanger.</p></span></div>
            <span className={styles.count} aria-live="polite">{selected.size} / {CATEGORIES.length}</span>
          </header>
          <div className={styles.presets} role="group" aria-label="Sélections rapides">
            {PRESETS.map((item) => <button type="button" key={item.label} aria-pressed={preset?.label === item.label} onClick={() => { playSoundEffect('tabSwitch', .18); setSelected(new Set(item.categories)); }}>{item.label}</button>)}
            <button type="button" className={styles.surprise} onClick={() => { playSoundEffect('pageFlip', .2); surprise(); }}><Shuffle /> Surprends-moi</button>
          </div>
          <div className={styles.universes} role="group" aria-label="Univers musicaux disponibles">
            {UNIVERSES.map(({ id, icon: Icon, caption, color }) => {
              const active = selected.has(id);
              const locked = selected.size === 1 && active;
              return (
                <motion.button key={id} type="button" className={styles.universe} style={{ '--sleeve': color } as CSSProperties}
                  aria-label={CATEGORY_META[id].label} aria-pressed={active} aria-disabled={locked || undefined}
                  whileHover={reduceMotion || starting ? undefined : { y: -4 }} whileTap={reduceMotion || starting ? undefined : { scale: .96 }} transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                  title={locked ? 'Garde au moins un univers dans ton mix' : undefined} onClick={() => { playSoundEffect(active ? 'deselectItem' : 'selectItem', .18); toggleCategory(id); }}>
                  <span className={styles.categoryOrb} aria-hidden="true"><Icon strokeWidth={1.8} /><span className={styles.categoryCheck}>{active ? <Check /> : '+'}</span></span>
                  <strong>{CATEGORY_META[id].label}</strong><span className={styles.categoryCaption}>{caption}</span><small>{COUNTS[id]} titres</small>
                </motion.button>
              );
            })}
          </div>
          <p className={styles.libraryNote}><Disc3 /><span><strong>{titleCount.toLocaleString('fr-FR')} titres</strong> dans ton mix · au moins un univers sélectionné.</span></p>
        </section>
        <ol className={styles.howto} aria-label="Comment jouer">
          <li><b><Headphones /></b><span><strong>Écoute</strong><small>Un extrait, aucun titre.</small></span></li>
          <li><b><Check /></b><span><strong>Choisis</strong><small>4 titres, 1 bonne réponse.</small></span></li>
          <li><b><Zap /></b><span><strong>Marque</strong><small>Plus vite = plus de points.</small></span></li>
        </ol>
      </div>

      <aside className={styles.settings} aria-label="Réglages de la partie">
        <fieldset disabled={starting} className={styles.settingsFields}>
          <legend className="sr-only">Configuration de la partie</legend>
          <header className={styles.sectionHead}><div><span className={styles.sectionNo}>2</span><h2>À votre rythme</h2></div><AudioLines aria-hidden="true" /></header>
          <p className={styles.settingsIntro}>Un même programme pour toute la bande.</p>
          <div className={styles.setting}><label><Disc3 /> Nombre de manches</label><Segmented label="Nombre de manches" options={BLINDTEST_ROUND_OPTIONS} value={rounds} onChange={setRounds} /></div>
          <div className={styles.setting}><label><Timer /> Temps pour trouver</label><Segmented label="Durée d’écoute par manche" options={BLINDTEST_LISTEN_OPTIONS} value={listenMs} onChange={setListenMs} seconds /></div>
          <div className={styles.settingsDivider}>Le petit plus</div>
          <Toggle checked={teams} onChange={() => setTeams(!teams)} icon={Users} label="En équipes" description="Deux camps, un score commun." />
          <Toggle checked={hints} onChange={() => setHints(!hints)} icon={Lightbulb} label="Un coup de pouce" description="Des lettres se dévoilent peu à peu." />
          <Toggle checked={doublePoints} onChange={() => setDoublePoints(!doublePoints)} icon={Zap} label="Manches à points doubles" description="Certaines manches comptent ×2." />
        </fieldset>
        <div className={styles.ticket}>
          <span className={styles.eyebrow}>Votre programme</span>
          <div className={styles.ticketSummary}><div><strong>{playableRounds}</strong><small>manches</small></div><div><strong>{listenMs / 1000}<em>s</em></strong><small>par extrait</small></div><div><strong>~{minutes}<em>min</em></strong><small>de jeu</small></div></div>
          <p><Users />{teams ? 'Deux équipes · Scores cumulés' : 'Chacun pour soi · Que le meilleur gagne'}</p>
        </div>
        <button className={`${styles.primary} ${styles.yellow}`} type="button" disabled={!canStart || starting || titleCount === 0} aria-busy={starting}
          onClick={() => { playSoundEffect('powerUp', .34); onStart([...selected], { rounds: playableRounds, listenMs, teams, hints, doublePoints }); }}>
          {starting ? <Loader2 className={styles.spinning} /> : <Play fill="currentColor" />}<span>{starting ? 'Préparation du mix…' : 'C’est parti !'}</span><ArrowUpRight />
        </button>
        <p className={styles.launchNote}>{canStart ? 'Tout le monde joue avec ces réglages' : 'Connexion au salon en cours…'}</p>
        <div aria-live="polite">
          {playableRounds < rounds && <p className={styles.status}><AlertCircle />Le mix contient {titleCount} titres : la partie est limitée à {playableRounds} manches.</p>}
          {error && <p className={styles.error} role="alert"><AlertCircle />{error}</p>}
        </div>
      </aside>
    </fieldset>
  );
};
