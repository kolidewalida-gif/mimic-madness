import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Check, Crown, Mic, Star } from 'lucide-react';

import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';

import { showSfx } from './showSfx';
import styles from './VideoStage.module.css';

/**
 * La scène du mode Imitation : un écran de télé, la bande en dessous, et à
 * droite la feuille de route.
 *
 *   [ L'ÉCRAN ··············· ]  [ la feuille de route ]
 *   [ bandeau : chrono, paroles ]
 *   [ la bande : qui joue ]
 *
 * L'écran prend toute la place que lui laissent la feuille et la bande, à son
 * vrai format (vertical, carré, horizontal). La feuille dit quoi faire et porte
 * l'unique action principale. La bande, posée sous l'écran, montre qui joue et
 * où chacun en est ; les duos gardent leur colonne à gauche.
 * Sur mobile et tablette verticale, tout s'empile : écran, bande, feuille.
 *
 * Ce composant ne fait que de la mise en scène : les lecteurs, leurs refs et
 * leur synchronisation restent ceux de la phase qui l'utilise.
 */

/**
 * Épouse la forme de la vidéo. Les événements média ne remontent pas, mais la
 * phase de capture les attrape, y compris quand le lecteur est remplacé (prise
 * enregistrée, prise suivante…).
 */
const useVideoShape = (stage: RefObject<HTMLElement>, picture: RefObject<HTMLElement>) => {
  useEffect(() => {
    const host = picture.current;
    const target = stage.current;
    if (!host || !target) return undefined;
    const apply = (video: HTMLVideoElement) => {
      const { videoWidth, videoHeight } = video;
      if (!videoWidth || !videoHeight) return;
      const ratio = videoWidth / videoHeight;
      target.style.setProperty('--ratio', String(Math.round(ratio * 1000) / 1000));
      target.dataset.shape = ratio < 0.95 ? 'portrait' : ratio > 1.05 ? 'landscape' : 'square';
    };
    const onMetadata = (event: Event) => {
      if (event.target instanceof HTMLVideoElement) apply(event.target);
    };
    host.addEventListener('loadedmetadata', onMetadata, true);
    const current = host.querySelector('video');
    if (current && current.readyState >= 1) apply(current);
    return () => host.removeEventListener('loadedmetadata', onMetadata, true);
  }, [stage, picture]);
};

/* jsdom et certains navigateurs embarqués n'ont pas requestAnimationFrame. */
const nextFrame = (callback: () => void): number =>
  typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(callback) : window.setTimeout(callback, 16);
const cancelFrame = (handle: number) => {
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(handle);
  else window.clearTimeout(handle);
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

interface ClockView { total: number; remaining: number; playing: boolean }

/**
 * Le chrono vit sur le bandeau de l'écran : il se remplit au rythme du clip.
 *
 * Il lit la vidéo présente dans l'écran, quelle qu'elle soit, et respecte la
 * découpe du clip (attributs data-clip-start / data-clip-end posés par les
 * lecteurs). La barre est peinte image par image sans rendu React ; seuls les
 * changements de seconde passent par l'état.
 *
 * `armed` : la prise tourne. Sous dix secondes la barre chauffe, sous cinq
 * elle palpite et chaque seconde fait un tic.
 */
const StageClock = ({ scope, armed, label }: { scope: RefObject<HTMLElement>; armed: boolean; label?: ReactNode }) => {
  const bar = useRef<HTMLSpanElement>(null);
  const [view, setView] = useState<ClockView>({ total: 0, remaining: 0, playing: false });
  const armedRef = useRef(armed);
  useEffect(() => { armedRef.current = armed; }, [armed]);

  useEffect(() => {
    const host = scope.current;
    if (!host) return undefined;
    let video: HTMLVideoElement | null = null;
    let frame = 0;
    let last: ClockView = { total: -1, remaining: -1, playing: false };
    const events = ['play', 'playing', 'pause', 'timeupdate', 'seeked', 'loadedmetadata', 'durationchange', 'ended', 'emptied'];

    const paint = () => {
      frame = 0;
      const current = video;
      if (!current) {
        bar.current?.style.setProperty('--p', '0');
        return;
      }
      const duration = Number.isFinite(current.duration) ? current.duration : 0;
      const start = Math.max(0, Number(current.dataset.clipStart) || 0);
      const rawEnd = Number(current.dataset.clipEnd) || 0;
      const end = rawEnd > start ? Math.min(rawEnd, duration || rawEnd) : duration;
      const total = Math.max(0, end - start);
      const elapsed = Math.min(total, Math.max(0, current.currentTime - start));
      bar.current?.style.setProperty('--p', total > 0 ? (elapsed / total).toFixed(4) : '0');
      const remaining = total > 0 ? Math.max(0, Math.ceil(total - elapsed - 0.05)) : 0;
      const playing = !current.paused && !current.ended;
      if (remaining !== last.remaining || playing !== last.playing || Math.round(total) !== Math.round(last.total)) {
        if (armedRef.current && playing && remaining > 0 && remaining <= 5 && remaining !== last.remaining) showSfx('tick');
        last = { total, remaining, playing };
        setView(last);
      }
      if (playing) frame = nextFrame(paint);
    };
    const kick = () => { if (!frame) frame = nextFrame(paint); };
    const attach = (next: HTMLVideoElement | null) => {
      if (next === video) return;
      events.forEach(name => video?.removeEventListener(name, kick));
      video = next;
      events.forEach(name => video?.addEventListener(name, kick));
      kick();
    };
    attach(host.querySelector('video'));
    const observer = new MutationObserver(() => attach(host.querySelector('video')));
    observer.observe(host, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      events.forEach(name => video?.removeEventListener(name, kick));
      if (frame) cancelFrame(frame);
    };
  }, [scope]);

  const tension = armed && view.playing && view.total > 0
    ? view.remaining <= 5 ? 'critical' : view.remaining <= 10 ? 'warm' : 'calm'
    : undefined;
  const known = view.total > 0;
  return <div className={styles.clock} data-tension={tension} data-playing={view.playing || undefined}>
    {label && <span className={styles.clockLabel}>{label}</span>}
    <span className={styles.clockTrack} aria-hidden="true"><span ref={bar} className={styles.clockFill} /></span>
    <span className={styles.clockTime}>
      {armed && view.playing && known
        ? <strong key={view.remaining} className={styles.clockBig}>{view.remaining}<small> s</small></strong>
        : <span>{known ? formatClock(view.playing ? view.remaining : view.total) : '–:––'}</span>}
    </span>
  </div>;
};

interface VideoStageProps {
  /** Nom accessible de la scène. */
  label: string;
  /** Le lecteur, déjà construit par la phase. */
  media: ReactNode;
  /** Autocollant en haut à gauche de l'écran (qui, quoi). */
  chip?: ReactNode;
  /** Autocollant d'état en haut à droite de l'écran (REC, prêt…). */
  status?: ReactNode;
  /** Tampon posé au centre de l'écran, le temps d'un feedback. */
  overlay?: ReactNode;
  /** Bande de paroles, entre l'image et le bandeau. */
  lyrics?: ReactNode;
  /** Texte du bandeau, à gauche du chrono. */
  stripLabel?: ReactNode;
  /** Outils du bandeau, à droite du chrono. */
  stripTools?: ReactNode;
  /** La prise tourne : écran au rouge, chrono sous tension. */
  live?: boolean;
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** À droite du titre, dans la carte. */
  aside?: ReactNode;
  /** Corps de la carte. */
  children?: ReactNode;
  /** L'action principale de la phase, épinglée en bas de la carte. */
  action?: ReactNode;
  /** Sous l'action (aide, outils de l'hôte). */
  footer?: ReactNode;
  /** La bande : qui joue, où chacun en est. */
  bench?: ReactNode;
  /** Bande étroite (avatars) ou large (duos). */
  benchSize?: 'slim' | 'wide';
  /** Change la clé pour rejouer l'entrée de la carte (prise suivante…). */
  cardKey?: string | number;
  className?: string;
}

export const VideoStage = ({
  label, media, chip, status, overlay, lyrics, stripLabel, stripTools, live = false,
  kicker, title, lead, aside, children, action, footer, bench, benchSize = 'slim', cardKey, className,
}: VideoStageProps) => {
  const stage = useRef<HTMLElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  useVideoShape(stage, picture);

  return (
    <section ref={stage} className={cn(styles.stage, className)} aria-label={label}
      data-bench={bench ? benchSize : undefined} data-lyrics={lyrics ? 'true' : undefined} data-live={live || undefined}>
      <div className={styles.screenCol}>
        <div className={styles.tv}>
          <div className={styles.picture} ref={picture}>
            <div className={styles.media}>{media}</div>
            {overlay && <div className={styles.overlay}>{overlay}</div>}
          </div>
          {lyrics && <div className={styles.lyrics}>{lyrics}</div>}
          <div className={styles.strip}>
            <i className={styles.led} aria-hidden="true" />
            <StageClock scope={picture} armed={live} label={stripLabel} />
            {stripTools && <div className={styles.stripTools}>{stripTools}</div>}
          </div>
        </div>
        {chip && <div className={styles.chip}>{chip}</div>}
        {status && <div className={styles.status}>{status}</div>}
        {bench && benchSize === 'slim' && <div className={styles.bench}>{bench}</div>}
      </div>

      <div className={styles.card} key={cardKey}>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
        <header className={styles.heading}>
          <h1>{title}</h1>
          {aside}
        </header>
        {lead && <p className={styles.lead}>{lead}</p>}
        {children && <div className={styles.body}>{children}</div>}
        {action && <div className={styles.action}>{action}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>

      {bench && benchSize === 'wide' && <div className={styles.bench}>{bench}</div>}
    </section>
  );
};

/** Autocollant d'identité posé sur le coin de l'écran : un visage, deux lignes. */
export const StageTag = ({ who, label, title, tone = 'go' }: { who?: { id: string; name: string }; label: ReactNode; title: ReactNode; tone?: 'go' | 'ok' | 'rec' | 'card' }) =>
  <span className={styles.tag} data-tone={tone}>
    {who && <span className={styles.tagFace}><PlayerAvatar playerId={who.id} playerName={who.name} size="sm" showTitle={false} /></span>}
    <span className={styles.tagText}><small>{label}</small><strong>{title}</strong></span>
  </span>;

/** Pastille d'état (en haut à droite de l'écran). */
export const StageBadge = ({ tone = 'card', icon, children, live = false }: { tone?: 'go' | 'ok' | 'rec' | 'card'; icon?: ReactNode; children: ReactNode; live?: boolean }) =>
  <span className={styles.badge} data-tone={tone} data-live={live || undefined} role="status">{live && <i className={styles.recDot} aria-hidden="true" />}{icon}{children}</span>;

/** Tampon de feedback au centre de l'écran : il claque, tient, puis s'efface. */
export const StageStamp = ({ tone = 'ok', children }: { tone?: 'go' | 'ok' | 'rec' | 'card'; children: ReactNode }) =>
  <span className={styles.stamp} data-tone={tone} aria-hidden="true">{children}</span>;

interface StageBenchProps {
  players: { id: string; name: string; isHost?: boolean }[];
  ready: string[];
  self: string;
  label?: string;
  /** Ce que comptent les coches : « prêts », « prises »… */
  unit?: string;
  listLabel?: string;
  readyLabel?: string;
  /** Joueurs en train d'enregistrer. */
  live?: string[];
  /** Joueur sous le projecteur (la prise jugée). */
  spotlight?: string[];
  /**
   * Compteur imposé (le vote compte les prises, pas les joueurs prêts). Les
   * sièges restent alors neutres : seul le projecteur se distingue.
   */
  counter?: { value: number; total: number; label: string };
  /** Outil sous la bande (hôte). */
  footer?: ReactNode;
}

/**
 * La bande : les joueurs assis à côté de l'écran. Un visage par joueur, une
 * pastille d'état (✓ prêt, micro ouvert, en attente), un saut quand quelqu'un
 * vient de valider. Le compteur dit où en est le groupe sans tableau de bord.
 */
export const StageBench = ({
  players, ready, self, label = 'La bande', unit = 'prêts', listLabel, readyLabel = 'Prêt', live = [], spotlight = [], counter, footer,
}: StageBenchProps) => {
  const count = counter ? counter.value : ready.filter(id => players.some(player => player.id === id)).length;
  const total = counter ? counter.total : players.length;
  const all = !counter && total > 0 && count === total;
  return (
    <section className={styles.benchList} aria-label={label} data-complete={all || undefined}>
      <p className={styles.count}><strong key={count}>{count}</strong><span>/{total}</span><small>{counter ? counter.label : unit}</small></p>
      <ul aria-label={listLabel}>
        {players.map((player, index) => {
          const isReady = ready.includes(player.id);
          const isLive = !isReady && live.includes(player.id);
          const isSpot = spotlight.includes(player.id);
          const state = isSpot ? 'spot' : isReady ? 'ready' : isLive ? 'live' : counter ? 'idle' : 'wait';
          return (
            <li key={player.id} className={styles.seat} data-state={state} data-self={player.id === self || undefined}
              style={{ '--i': index } as CSSProperties} title={player.name}>
              <span className={styles.face}><PlayerAvatar playerId={player.id} playerName={player.name} size="md" showTitle={false} /></span>
              {player.isHost && <Crown className={styles.crown} aria-label="Hôte" />}
              <span className={styles.seatBadge}>
                {isSpot ? <Star aria-label="Sur scène" /> : isReady ? <Check aria-label={readyLabel} /> : isLive ? <Mic aria-label="Enregistre" /> : <i aria-hidden="true" />}
              </span>
              <span className={styles.seatName}>{player.id === self ? 'Toi' : player.name}</span>
            </li>
          );
        })}
      </ul>
      {footer}
    </section>
  );
};

export { styles as videoStageStyles };
