/**
 * Coquille Ink Beta des écrans de jeu.
 *
 * Les phases du mode Imitation portaient chacune leur propre plein écran, leur
 * dégradé sombre et ses taches floues. Rassembler la scène ici évite de
 * réécrire six fois la même direction artistique, et surtout d'en faire dériver
 * six variantes : la barre de marque, le cadre et les panneaux sont désormais
 * ceux du menu et du lobby beta.
 *
 * Ce fichier ne contient aucune logique de jeu : minuteurs, WebRTC, votes et
 * synchronisation restent dans les phases.
 */
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InkBetaLogo } from '@/components/InkBetaBrand';

interface InkBetaGameStageProps {
  /** Contenu du cadre de scène. */
  children: ReactNode;
  /** Pastille de gauche : phase et manche en cours. */
  badge?: ReactNode;
  /** Outils de droite : quitter, réglages, etc. */
  tools?: ReactNode;
  /** Identifiant du titre pour `aria-labelledby` du panneau principal. */
  titleId?: string;
  /** Classe de la grille interne, pour choisir une ou deux colonnes. */
  canvasClassName?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scène complète : couches de fond, barre de marque, cadre.
 *
 * `overflow-hidden` sur la racine et le défilement sur `.ik-main` : c'est ce que
 * fait déjà le lobby beta, et cela garde les pastilles fixes des phases hors du
 * flux défilant.
 */
export const InkBetaGameStage = ({
  children,
  badge,
  tools,
  titleId = 'ik-game-brand',
  canvasClassName,
  className,
  style,
}: InkBetaGameStageProps) => (
  <div
    className={cn(
      'ik-root ik-layout-v2 ik-game-v2 menu-screen-safe flex h-[100dvh] w-full flex-col overflow-hidden',
      className,
    )}
    style={style}
  >
    <div className="ik-party-bg" aria-hidden="true" />
    <div className="ik-party-rays" aria-hidden="true" />
    <div className="ik-party-dots" aria-hidden="true" />

    <header className="ik-topbar relative z-[8] flex-shrink-0">
      <InkBetaLogo titleId={titleId} />

      <div className="ik-topbar-side ik-topbar-side--start">{badge}</div>

      <div className="ik-topbar-side ik-topbar-side--end">
        <div className="ik-tools">{tools}</div>
      </div>
    </header>

    <main className="ik-main custom-scrollbar relative z-[2] min-h-0 flex-1 overflow-y-auto">
      <div className={cn('ik-canvas ik-game-canvas', canvasClassName)}>{children}</div>
    </main>
  </div>
);

interface InkBetaGameBadgeProps {
  /** Numéro d'étape ou de manche, affiché en gros. */
  step?: string;
  label: string;
  icon?: ReactNode;
}

/** Pastille de phase, calquée sur la pastille de code du lobby. */
export const InkBetaGameBadge = ({ step, label, icon }: InkBetaGameBadgeProps) => (
  <span className="ik-game-badge">
    {icon}
    <span>{label}</span>
    {step && <strong>{step}</strong>}
  </span>
);

interface InkBetaPanelProps {
  children: ReactNode;
  /** Petit surtitre du panneau, comme « Étape 02 » sur le lobby. */
  step?: string;
  title?: string;
  titleId?: string;
  /** Bloc aligné à droite de l'en-tête : compteur, statut, action courte. */
  aside?: ReactNode;
  /** Panneau mis en avant : bordure cyan et relief plus marqué. */
  featured?: boolean;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
}

/** Panneau prune à bordure épaisse, brique de base des écrans beta. */
export const InkBetaPanel = ({
  children,
  step,
  title,
  titleId,
  aside,
  featured = false,
  className,
  bodyClassName,
  style,
}: InkBetaPanelProps) => (
  <section className={cn('ik-gpanel', featured && 'is-featured', className)} style={style}>
    {(step || title || aside) && (
      <div className="ik-gpanel-head">
        <div>
          {step && <span>{step}</span>}
          {title && <h2 id={titleId}>{title}</h2>}
        </div>
        {aside && <div className="ik-gpanel-aside">{aside}</div>}
      </div>
    )}
    <div className={cn('ik-gpanel-body', bodyClassName)}>{children}</div>
  </section>
);

/** Compteur « 02 / 08 », repris du panneau troupe du lobby. */
export const InkBetaCount = ({ value, total }: { value: number; total: number }) => (
  <p className="ik-lobby-count">
    <strong>{String(value).padStart(2, '0')}</strong>
    <span>/ {String(total).padStart(2, '0')}</span>
  </p>
);

interface InkBetaSeatProps {
  name: string;
  meta: string;
  isHost?: boolean;
  isSelf?: boolean;
  /** Siège éteint : joueur absent ou pas encore prêt. */
  isDimmed?: boolean;
  /** Siège validé : imitation déposée, aperçu vu, vote enregistré. */
  isDone?: boolean;
  avatarUrl?: string;
  avatarColor?: string;
  crown?: ReactNode;
  badge?: ReactNode;
}

/**
 * Tuile joueur. Elle réutilise les classes `.ik-seat` du lobby beta : un joueur
 * doit se reconnaître d'un écran à l'autre.
 */
export const InkBetaSeat = ({
  name,
  meta,
  isSelf = false,
  isDimmed = false,
  isDone = false,
  avatarUrl,
  avatarColor,
  crown,
  badge,
}: InkBetaSeatProps) => (
  <div
    className={cn(
      'ik-seat',
      isSelf && 'is-self',
      isDimmed && 'is-away',
      isDone && 'is-done',
    )}
  >
    {crown}
    {badge}
    <span
      className={cn('ik-seat-avatar', avatarUrl && 'has-portrait')}
      style={!avatarUrl && avatarColor ? { background: avatarColor } : undefined}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" draggable={false} />
      ) : (
        (name[0] ?? '?').toUpperCase()
      )}
    </span>
    <span className="ik-seat-name">{name}</span>
    <span className="ik-seat-meta">{meta}</span>
  </div>
);

/** Grille de sièges. */
export const InkBetaSeatGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn('ik-seats custom-scrollbar', className)}>{children}</div>;
