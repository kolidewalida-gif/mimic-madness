import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Check, Sparkles } from 'lucide-react';

import { PlayerAvatar } from '@/components/PlayerAvatar';
import { cn } from '@/lib/utils';

import styles from './VideoStage.module.css';

/**
 * Scène vidéo du mode Imitation.
 *
 * La vidéo prend toute la place disponible, à son vrai format ; les commandes
 * vivent dans une console à côté (sous la vidéo sur mobile). Ce composant ne
 * fait que de la mise en page : les lecteurs (`VideoPreview`, `VideoWithAudioOverlay`…),
 * leurs refs et leur synchronisation restent ceux de la phase qui l'utilise.
 */

/**
 * Épouse la forme de la vidéo : un clip vertical donne un écran étroit collé
 * au rail, un clip horizontal remplit la largeur. Les événements média ne
 * remontent pas, mais la phase de capture les attrape, y compris quand le
 * lecteur est remplacé par un autre (prise enregistrée, par exemple).
 */
const useVideoShape = (screen: RefObject<HTMLElement>) => {
  useEffect(() => {
    const node = screen.current;
    if (!node) return undefined;

    const apply = (video: HTMLVideoElement) => {
      const { videoWidth, videoHeight } = video;
      if (!videoWidth || !videoHeight) return;
      const ratio = videoWidth / videoHeight;
      node.style.setProperty('--video-ratio', String(Math.round(ratio * 1000) / 1000));
      node.dataset.shape = ratio < 0.95 ? 'portrait' : ratio > 1.05 ? 'landscape' : 'square';
    };
    const onMetadata = (event: Event) => {
      if (event.target instanceof HTMLVideoElement) apply(event.target);
    };

    node.addEventListener('loadedmetadata', onMetadata, true);
    const current = node.querySelector('video');
    if (current && current.readyState >= 1) apply(current);
    return () => node.removeEventListener('loadedmetadata', onMetadata, true);
  }, [screen]);
};

interface VideoStageProps {
  /** Nom accessible de la scène. */
  label: string;
  /** Le lecteur, déjà construit par la phase. */
  media: ReactNode;
  /** Pastille en haut à gauche de l'écran (ex. « Proposé par … »). */
  chip?: ReactNode;
  /** Pastille d'état en haut à droite de l'écran (ex. « REC »). */
  status?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** À droite du titre, dans la console. */
  aside?: ReactNode;
  /** Corps de la console : consignes, enregistreur… */
  children?: ReactNode;
  /** Action principale de la phase, toujours épinglée en bas du corps. */
  action?: ReactNode;
  /** Bas de la console (la bande, les duos…). */
  footer?: ReactNode;
  className?: string;
}

export const VideoStage = ({
  label, media, chip, status, kicker, title, lead, aside, children, action, footer, className,
}: VideoStageProps) => {
  const screen = useRef<HTMLDivElement>(null);
  useVideoShape(screen);

  return (
    <section className={cn(styles.stage, className)} aria-label={label}>
      <div className={styles.cell}>
        <div className={styles.screen} ref={screen}>
          <div className={styles.media}>{media}</div>
          {chip && <div className={styles.chip}>{chip}</div>}
          {status && <div className={styles.status}>{status}</div>}
        </div>
      </div>

      <div className={styles.deck}>
        <header className={styles.heading}>
          <div>
            {kicker && <span>{kicker}</span>}
            <h1>{title}</h1>
            {lead && <p>{lead}</p>}
          </div>
          {aside}
        </header>
        {children && <div className={styles.body}>{children}</div>}
        {action && <div className={styles.action}>{action}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </section>
  );
};

interface StagePlayersProps {
  players: { id: string; name: string }[];
  ready: string[];
  self: string;
  label?: string;
  /** Ce que comptent les coches : « prêts », « prises déposées »… */
  unit?: string;
  listLabel?: string;
  readyLabel?: string;
}

/** La bande, en une rangée d'avatars avec leurs coches. */
export const StagePlayers = ({
  players, ready, self, label = 'La bande', unit = 'prêts', listLabel, readyLabel = 'Prêt',
}: StagePlayersProps) => {
  const count = ready.filter(id => players.some(player => player.id === id)).length;
  return (
    <section className={styles.players} aria-label={label}>
      <div className={styles.playersHead}>
        <Sparkles aria-hidden="true" />
        <strong>{label}</strong>
        <small>{count}/{players.length} {unit}</small>
      </div>
      <ul aria-label={listLabel}>
        {players.map(player => {
          const isReady = ready.includes(player.id);
          return (
            <li key={player.id} className={cn(isReady && styles.ready)}>
              <span className={styles.portrait}>
                <PlayerAvatar playerId={player.id} playerName={player.name} size="sm" showTitle={false} />
                {isReady && <Check className={styles.readyMark} aria-label={readyLabel} />}
              </span>
              <span className={styles.playerName}>{player.id === self ? 'Toi' : player.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export { styles as videoStageStyles };
