import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronDown, ListMusic, Pause, Play, RotateCcw, Search, SkipBack, SkipForward, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useBackgroundMusic, type MusicMood, type MusicTrack } from '@/hooks/useBackgroundMusic';
import { MOOD_LABEL, titleOf } from '@/lib/musicCovers';
import { cn } from '@/lib/utils';
import styles from './BubbleMusicPlayer.module.css';
import '@/styles/showtime-tokens.css';

/*
 * La platine.
 *
 * Un disque qui tourne, un titre en grosses lettres, une règle faite de barres
 * qu'on touche pour avancer, un gros bouton lecture jaune. Le jukebox s'ouvre
 * comme une pile de tickets numérotés. Aucune dépendance aux pochettes : chaque
 * piste reçoit une couleur de la palette, toujours la même pour un même titre.
 */

const time = (seconds: number) => Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0') : '0:00';

const COVER_COLORS = ['var(--sh-go)', 'var(--sh-ok)', 'var(--sh-pink)', 'var(--sh-lilac)', 'var(--sh-rec-2)', 'var(--sh-go-2)'];
const coverColor = (track: MusicTrack | null | undefined) => {
  if (!track) return 'var(--sh-lilac)';
  let h = 0;
  for (let i = 0; i < track.name.length; i += 1) h = (h * 31 + track.name.charCodeAt(i)) | 0;
  return COVER_COLORS[Math.abs(h) % COVER_COLORS.length];
};

const BAR_COUNT = 34;
/** Hauteurs fixes, irrégulières : la règle ressemble à une forme d'onde. */
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7) * 0.45 + Math.sin(i * 0.55) * 0.25));

const Disc = ({ track, playing = false, small = false }: { track: MusicTrack | null; playing?: boolean; small?: boolean }) => (
  <span className={cn(styles.disc, playing && styles.discPlaying, small && styles.discSmall)} style={{ '--cover': coverColor(track) } as CSSProperties} aria-hidden="true">
    <i />
  </span>
);

export const BubbleMusicPlayer = ({ placement = 'fixed' }: { placement?: 'fixed' | 'inline' }) => {
  const music = useBackgroundMusic();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'tracks' | 'mix'>('tracks');
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<MusicMood | 'all'>('all');
  const lastVolume = useRef(music.volume || .3);
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const id = useId();
  useEffect(() => { if (music.volume > 0) lastVolume.current = music.volume; }, [music.volume]);
  useEffect(() => {
    if (!open) return;
    (panel.current?.querySelector<HTMLElement>('input') || panel.current?.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && root.current?.contains(document.activeElement)) {
        event.stopPropagation(); setOpen(false); opener.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const moods = useMemo(() => [...new Set(music.tracks.flatMap(track => track.moods || []))], [music.tracks]);
  const tracks = useMemo(() => music.tracks.filter(track =>
    (mood === 'all' || track.moods?.includes(mood)) && (track.name + ' ' + (track.genre || '')).toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))),
  [music.tracks, mood, query]);
  const title = titleOf(music.currentTrack?.name || 'Ta bande-son');
  const toggleMute = () => music.setVolume(music.volume ? 0 : lastVolume.current);
  const live = music.isPlaying && music.volume > 0;
  const ratio = music.duration > 0 ? Math.min(1, Math.max(0, music.progress / music.duration)) : 0;
  const filled = Math.round(ratio * BAR_COUNT);
  const cover = coverColor(music.currentTrack);

  return (
    <div ref={root} className={cn(styles.root, placement === 'fixed' ? styles.fixed : 'mp-shell--inline')}>
      <AnimatePresence>{open && <motion.div key="jukebox" ref={panel} className={styles.library} id={id} role="dialog" aria-label="Jukebox Mimic Master"
        initial={reduced ? false : { opacity: 0, y: 18, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : 10 }} transition={{ duration: reduced ? 0 : .26, ease: [.16, 1, .3, 1] }}>
        <header className={styles.libraryHeader}>
          <div><span className={styles.libraryTag}>Les tubes de la bande</span><h2>Le jukebox</h2><p>La bande-son de ta bande.</p></div>
          <button className={styles.closeButton} type="button" aria-label="Fermer le jukebox" onClick={() => { setOpen(false); opener.current?.focus(); }}><X /></button>
        </header>
        <div className={styles.viewTabs} aria-label="Sections du jukebox">
          <button type="button" aria-pressed={view === 'tracks'} onClick={() => setView('tracks')}><ListMusic />Les pistes<span>{music.tracks.length}</span></button>
          <button type="button" aria-pressed={view === 'mix'} onClick={() => setView('mix')}><Volume2 />Le mix</button>
        </div>
        <div className={styles.libraryBody}>
          {view === 'tracks' ? <>
            <label className={styles.search}><Search /><input aria-label="Chercher une piste" placeholder="Un titre, une ambiance…" value={query} onChange={event => setQuery(event.target.value)} />
              {query && <button type="button" className={styles.clearSearch} onClick={() => setQuery('')} aria-label="Effacer la recherche"><X /></button>}
            </label>
            {moods.length > 0 && <div className={styles.moods}><button type="button" aria-pressed={mood === 'all'} onClick={() => setMood('all')}>Tout</button>
              {moods.map(value => <button type="button" key={value} aria-pressed={mood === value} onClick={() => setMood(value)}>{MOOD_LABEL[value]}</button>)}
            </div>}
            <ul className={styles.trackList}>{tracks.map((track, index) => {
              const current = track.id === music.currentTrack?.id;
              return <li key={track.id}><button type="button" className={styles.track} style={{ '--cover': coverColor(track) } as CSSProperties}
                aria-current={current ? 'true' : undefined}
                onClick={() => { music.selectTrack(track.id); if (!music.isPlaying) music.play(); }}>
                <span className={styles.stub} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.trackCopy}><strong>{titleOf(track.name)}</strong><small>{track.genre || 'Mimic Master'}{track.bpm ? ' · ' + track.bpm + ' BPM' : ''}</small></span>
                {current ? <span className={styles.nowStamp}><Check />En cours</span> : <Play className={styles.trackPlay} />}
              </button></li>;
            })}</ul>
            {!tracks.length && <div className={styles.empty}><Search /><strong>Aucune piste trouvée</strong><p>Essaie un autre titre ou une autre ambiance.</p><button type="button" className={styles.chip} onClick={() => { setQuery(''); setMood('all'); }}>Afficher toutes les pistes</button></div>}
          </> : <div className={styles.mix}>
            <div className={styles.mixHeading}><span>Volume de la musique</span><output>{Math.round(music.volume * 100)}<small>%</small></output></div>
            <div className={styles.mixVolume}><button type="button" className={styles.squareButton} aria-label={music.volume ? 'Couper la musique' : 'Réactiver la musique'} onClick={toggleMute}>{music.volume ? <Volume2 /> : <VolumeX />}</button>
              <input className={styles.volumeRange} type="range" min={0} max={100} value={Math.round(music.volume * 100)} onChange={event => music.setVolume(Number(event.target.value) / 100)} aria-label="Volume de la musique" />
            </div>
            <button type="button" role="switch" aria-checked={music.autoMode} className={styles.adaptive} onClick={() => music.setAutoMode(!music.autoMode)}>
              <Sparkles /><span><strong>Ambiance automatique</strong><small>Le jeu choisit la piste selon le moment.</small></span><b>{music.autoMode ? 'Oui' : 'Non'}</b>
            </button>
            <p className={styles.mixNote}>Le blindtest garde son propre son. Cette bande-son y reste coupée.</p>
          </div>}
        </div>
      </motion.div>}</AnimatePresence>

      <div className={styles.deck} role="region" aria-label="Lecteur de musique" style={{ '--cover': cover } as CSSProperties}>
        <Disc track={music.currentTrack} playing={live} />
        <div className={styles.info}>
          <div className={styles.headline}>
            <span className={cn(styles.status, live && styles.statusLive)}>{!music.volume ? 'Musique coupée' : music.isPlaying ? 'En lecture' : 'En pause'}</span>
            <span className={cn(styles.eq, live && styles.eqLive)} aria-hidden="true"><i /><i /><i /><i /></span>
            <strong className={styles.title} title={title}>{title}</strong>
          </div>
          <div className={styles.seek}>
            <span className={styles.clock}>{time(music.progress)}</span>
            <div className={styles.rule}>
              <input type="range" min={0} max={Math.max(1, Math.floor(music.duration))} step={1} value={Math.min(music.progress, music.duration) || 0}
                disabled={!music.duration} onChange={event => music.seek(Number(event.target.value))} aria-label="Position de lecture"
                aria-valuetext={time(music.progress) + ' sur ' + time(music.duration)} />
              <div className={styles.bars} aria-hidden="true">{BAR_HEIGHTS.map((height, index) =>
                <i key={index} data-on={index < filled || undefined} style={{ height: Math.round(height * 100) + '%' }} />)}</div>
            </div>
            <span className={styles.clock}>{time(music.duration)}</span>
          </div>
        </div>
        <div className={styles.transport}>
          <button type="button" className={styles.squareButton} aria-label={music.tracks.length > 1 ? 'Piste précédente' : 'Recommencer la piste'}
            onClick={() => music.progress > 3 || music.tracks.length === 1 ? music.seek(0) : music.previousTrack()} disabled={!music.currentTrack}>
            {music.tracks.length > 1 ? <SkipBack /> : <RotateCcw />}
          </button>
          <button type="button" className={styles.play} onClick={() => music.isPlaying ? music.pause() : music.play()}
            aria-label={(music.isPlaying ? 'Mettre en pause ' : 'Lire ') + title} disabled={!music.currentTrack}>
            {music.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
          {music.tracks.length > 1 && <button type="button" className={styles.squareButton} aria-label="Piste suivante" onClick={music.nextTrack}><SkipForward /></button>}
        </div>
        <button type="button" className={cn(styles.squareButton, styles.mute)} aria-label={music.volume ? 'Couper la musique' : 'Réactiver la musique'} aria-pressed={!music.volume} onClick={toggleMute}>
          {music.volume ? <Volume2 /> : <VolumeX />}
        </button>
        <button ref={opener} type="button" className={cn(styles.tape, open && styles.tapeOpen)} aria-expanded={open} aria-controls={id} aria-haspopup="dialog"
          aria-label={open ? 'Fermer le jukebox' : 'Ouvrir le jukebox'} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown /> : <ListMusic />}<span>Jukebox</span>
        </button>
      </div>
    </div>
  );
};
