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
  <div className="ibx-segments" role="group" aria-label={label}>
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
  <button className="ibx-toggle-row" type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => { playSoundEffect(checked ? 'toggleOff' : 'toggleOn', .18); onChange(); }}>
    <Icon aria-hidden="true" />
    <span><strong>{label}</strong><small>{description}</small></span>
    <i className="ibx-switch" aria-hidden="true"><i /></i>
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
    <section className="ibx-wait" aria-labelledby="ibx-wait-title">
      <div className="ibx-wait-mascot"><InkBetaMascot /></div>
      <span className="ibx-kicker">LES COULISSES / BLINDTEST MUSICAL</span>
      <h1 id="ibx-wait-title">Ton prochain refrain<br /><em>arrive.</em></h1>
      <p>L’hôte prépare le mix. Installe-toi, règle ton volume en haut de l’écran et prépare tes réflexes.</p>
      <ol className="ibx-howto">
        <li><b>01</b><span>Écoute l’extrait</span></li>
        <li><b>02</b><span>Choisis une réponse</span></li>
        <li><b>03</b><span>Marque des points</span></li>
      </ol>
      <div className="ibx-status" role="status"><Radio />{canStart ? 'Salon connecté · En attente de l’hôte' : 'Connexion au salon…'}</div>
      <small>Plus tu réponds vite, plus tu marques. Une réponse validée est définitive.</small>
    </section>
  );

  return (
    <fieldset className="ibx-setup" disabled={starting}>
      <legend className="sr-only">Préparer le blindtest</legend>
      <div className="ibx-catalog">
        <section className="ibx-hero" aria-labelledby="ibx-setup-title">
          <div className="ibx-hero-copy">
            <span className="ibx-kicker"><span className="ibx-dot" /> LE BLINDTEST MUSICAL / INK BETA</span>
            <h1 id="ibx-setup-title">Monte le son.<br /><em>Défie tes potes !</em></h1>
            <p>Choisis tes univers, règle la partie.<br />Et montre-leur qui connaît tous les refrains.</p>
            <span className="ibx-hero-tag"><Headphones /> Écoute. Trouve. Prends la tête.</span>
          </div>
          <div className="ibx-setup-mascot" aria-hidden="true"><InkBetaMascot /><span>FAIS PÉTER<br />LE SCORE !</span></div>
        </section>

        <section className="ibx-library" aria-labelledby="ibx-library-title">
          <header className="ibx-section-head">
            <div><span className="ibx-section-no">01</span><h2 id="ibx-library-title">Compose ton mix</h2></div>
            <span className="ibx-count" aria-live="polite">{selected.size} / {CATEGORIES.length} univers</span>
          </header>
          <div className="ibx-presets" role="group" aria-label="Sélections rapides">
            {PRESETS.map((item) => <button type="button" key={item.label} aria-pressed={preset?.label === item.label} onClick={() => { playSoundEffect('tabSwitch', .18); setSelected(new Set(item.categories)); }}>{item.label}</button>)}
            <button type="button" className="ibx-surprise" onClick={() => { playSoundEffect('pageFlip', .2); surprise(); }}><Shuffle /> Surprends-moi</button>
          </div>
          <div className="ibx-universes" role="group" aria-label="Univers musicaux disponibles">
            {UNIVERSES.map(({ id, icon: Icon, caption, color }, index) => {
              const active = selected.has(id);
              const locked = selected.size === 1 && active;
              return (
                <button key={id} type="button" className="ibx-universe" style={{ '--sleeve': color } as CSSProperties}
                  aria-label={CATEGORY_META[id].label} aria-pressed={active} aria-disabled={locked || undefined}
                  title={locked ? 'Garde au moins un univers dans ton mix' : undefined} onClick={() => { playSoundEffect(active ? 'deselectItem' : 'selectItem', .18); toggleCategory(id); }}>
                  <span className="ibx-sleeve" aria-hidden="true">
                    <span className="ibx-sleeve-number">VOL. {String(index + 1).padStart(2, '0')}</span>
                    <Icon className="ibx-sleeve-icon" strokeWidth={1.4} />
                    <span className="ibx-check">{active ? <Check /> : '+'}</span>
                    <span className="ibx-sleeve-lines" />
                  </span>
                  <span className="ibx-universe-name">{CATEGORY_META[id].label}</span>
                  <span className="ibx-universe-note">{caption}</span>
                  <span className="ibx-universe-count">{COUNTS[id]} titres</span>
                </button>
              );
            })}
          </div>
          <p className="ibx-library-note"><Disc3 /><span><strong>{titleCount.toLocaleString('fr-FR')} titres</strong> dans ton mix. Garde au moins un univers.</span></p>
        </section>
        <ol className="ibx-howto" aria-label="Comment jouer">
          <li><b>01</b><span><strong>Tends l’oreille</strong><small>Un extrait, aucun titre.</small></span></li>
          <li><b>02</b><span><strong>Fais ton choix</strong><small>Une réponse définitive.</small></span></li>
          <li><b>03</b><span><strong>Vise le sommet</strong><small>La vitesse fait le score.</small></span></li>
        </ol>
      </div>

      <aside className="ibx-settings" aria-label="Réglages de la partie">
        <fieldset disabled={starting} className="ibx-settings-fields">
          <legend className="sr-only">Configuration de la partie</legend>
          <header className="ibx-section-head"><div><span className="ibx-section-no">02</span><h2>À ton rythme</h2></div><AudioLines aria-hidden="true" /></header>
          <p className="ibx-settings-intro">Une petite session ou toute la soirée ?</p>
          <div className="ibx-setting"><label><Disc3 /> Nombre de manches</label><Segmented label="Nombre de manches" options={BLINDTEST_ROUND_OPTIONS} value={rounds} onChange={setRounds} /></div>
          <div className="ibx-setting"><label><Timer /> Temps pour trouver</label><Segmented label="Durée d’écoute par manche" options={BLINDTEST_LISTEN_OPTIONS} value={listenMs} onChange={setListenMs} seconds /></div>
          <div className="ibx-settings-divider"><span>LES PETITS EXTRAS</span></div>
          <Toggle checked={teams} onChange={() => setTeams(!teams)} icon={Users} label="En équipes" description="Deux camps, un score commun." />
          <Toggle checked={hints} onChange={() => setHints(!hints)} icon={Lightbulb} label="Un coup de pouce" description="Des lettres se dévoilent peu à peu." />
          <Toggle checked={doublePoints} onChange={() => setDoublePoints(!doublePoints)} icon={Zap} label="Manches à points doubles" description="Certaines manches comptent ×2." />
        </fieldset>
        <div className="ibx-ticket">
          <span className="ibx-kicker">TON PASS POUR LA SESSION</span>
          <div className="ibx-ticket-summary"><div><strong>{playableRounds}</strong><small>manches</small></div><div><strong>{listenMs / 1000}<em>s</em></strong><small>par extrait</small></div><div><strong>~{minutes}<em>min</em></strong><small>de jeu</small></div></div>
          <p><Users />{teams ? 'Deux équipes · Scores cumulés' : 'Chacun pour soi · Que le meilleur gagne'}</p>
        </div>
        <button className="ibx-launch" type="button" disabled={!canStart || starting || titleCount === 0} aria-busy={starting}
          onClick={() => { playSoundEffect('powerUp', .34); onStart([...selected], { rounds: playableRounds, listenMs, teams, hints, doublePoints }); }}>
          {starting ? <Loader2 className="ibx-spinning" /> : <Play fill="currentColor" />}<span>{starting ? 'Préparation du mix…' : 'C’est parti !'}</span><ArrowUpRight />
        </button>
        <p className="ibx-launch-note"><span className="ibx-dot" />{canStart ? 'Tout le monde joue avec ces réglages' : 'Connexion au salon en cours…'}</p>
        <div aria-live="polite">
          {playableRounds < rounds && <p className="ibx-message"><AlertCircle />Le mix contient {titleCount} titres : la partie est limitée à {playableRounds} manches.</p>}
          {error && <p className="ibx-message ibx-message-error" role="alert"><AlertCircle />{error}</p>}
        </div>
      </aside>
    </fieldset>
  );
};
