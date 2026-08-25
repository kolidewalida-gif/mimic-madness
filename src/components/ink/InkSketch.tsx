/**
 * Primitives « dessinées à la main » du thème INK.
 *
 * Le point clé : un cadre irrégulier ne peut pas être obtenu avec `border`.
 * Une bordure CSS est mathématiquement parfaite, et c'est exactement ce qui
 * trahit une interface au premier regard. Ici chaque contour est un chemin SVG
 * dont les points sont volontairement décalés, tracé avec `vectorEffect`
 * non-scaling pour que l'épaisseur du trait reste celle d'un stylo quelle que
 * soit la taille du conteneur.
 *
 * Le tracé progressif utilise `stroke-dasharray` / `stroke-dashoffset` : c'est
 * la seule technique qui donne l'impression que la ligne s'écrit, plutôt qu'une
 * opacité qui monte.
 */
import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';

/**
 * Générateur pseudo-aléatoire déterministe.
 *
 * Indispensable : avec `Math.random`, chaque rendu React redessinerait un
 * cadre différent et l'interface tremblerait à chaque changement d'état. La
 * graine rend l'imperfection stable.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Trace un rectangle « à main levée » dans un espace 0-100 × 0-100.
 *
 * Chaque côté est une courbe quadratique dont le point de contrôle s'écarte
 * légèrement de la droite idéale, et les quatre coins ne se rejoignent pas
 * exactement — comme un crayon qui dépasse.
 */
function wobblyRect(seed: number, wobble = 2.2, overshoot = 1.8): string {
  const r = seeded(seed);
  const j = (amount = wobble) => (r() - 0.5) * 2 * amount;

  const x1 = 2 + j(1);
  const y1 = 2 + j(1);
  const x2 = 98 + j(1);
  const y2 = 98 + j(1);

  /* Les dépassements aux coins : le trait continue un peu au-delà de l'angle. */
  const o = () => j(overshoot);

  return [
    `M ${x1 + o()} ${y1}`,
    `Q ${(x1 + x2) / 2 + j()} ${y1 + j()} ${x2} ${y1 + o()}`,
    `Q ${x2 + j()} ${(y1 + y2) / 2 + j()} ${x2 + o()} ${y2}`,
    `Q ${(x1 + x2) / 2 + j()} ${y2 + j()} ${x1} ${y2 + o()}`,
    `Q ${x1 + j()} ${(y1 + y2) / 2 + j()} ${x1 + o()} ${y1}`,
  ].join(' ');
}

interface SketchFrameProps {
  /** Fixe l'irrégularité : deux appels avec la même graine sont identiques. */
  seed?: number;
  /** Double contour, comme un trait repassé une seconde fois. */
  doubled?: boolean;
  strokeWidth?: number;
  /** Retarde le tracé progressif, pour enchaîner les éléments. */
  drawDelay?: number;
  className?: string;
}

/**
 * Cadre irrégulier à poser en fond d'un conteneur positionné.
 *
 * `preserveAspectRatio="none"` est voulu : le chemin se déforme avec le
 * conteneur, ce qui évite de recalculer un chemin par format.
 */
export const SketchFrame = memo(
  ({ seed = 7, doubled = true, strokeWidth = 2, drawDelay = 0, className }: SketchFrameProps) => {
    const primary = useMemo(() => wobblyRect(seed), [seed]);
    const secondary = useMemo(() => wobblyRect(seed + 991, 3, 2.6), [seed]);

    return (
      <svg
        className={className}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {doubled && (
          <path
            className="ik-draw"
            d={secondary}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth * 0.6}
            strokeLinecap="round"
            strokeOpacity={0.4}
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${drawDelay + 90}ms` }}
          />
        )}
        <path
          className="ik-draw"
          d={primary}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.92}
          vectorEffect="non-scaling-stroke"
          style={{ animationDelay: `${drawDelay}ms` }}
        />
      </svg>
    );
  },
);
SketchFrame.displayName = 'SketchFrame';

/**
 * Panneau papier au cadre tracé à la main.
 *
 * La très légère rotation est appliquée ici et non sur les enfants : incliner
 * le texte le rendrait flou sur certains écrans, alors qu'incliner le panneau
 * entier reste net.
 */
export const SketchPanel = ({
  children,
  seed = 21,
  rotate = -0.6,
  className,
  style,
}: {
  children: ReactNode;
  seed?: number;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    className={`ik-panel ${className ?? ''}`}
    style={{ ...style, ['--ik-rotate' as string]: `${rotate}deg` }}
  >
    <SketchFrame className="ik-frame" seed={seed} strokeWidth={2.4} drawDelay={160} />
    <div className="ik-panel-body">{children}</div>
  </div>
);

/** Bouton au contour dessiné. Le cadre se redessine au survol. */
export const SketchButton = ({
  children,
  onClick,
  disabled,
  seed = 41,
  drawDelay = 0,
  type = 'button',
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  seed?: number;
  drawDelay?: number;
  type?: 'button' | 'submit';
  className?: string;
  ariaLabel?: string;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`ik-btn menu-focus ${className ?? ''}`}
  >
    <SketchFrame className="ik-frame" seed={seed} strokeWidth={2} drawDelay={drawDelay} />
    <span className="ik-btn-label">{children}</span>
  </button>
);

/**
 * Gribouillis décoratifs autour du menu.
 *
 * Volontairement peu nombreux et discrets : l'écran doit se lire comme une
 * page annotée, pas comme un cahier de brouillon. Chacun est purement
 * décoratif et masqué aux lecteurs d'écran.
 */
export const SketchDoodle = ({
  kind,
  className,
  drawDelay = 0,
}: {
  kind: 'arrow' | 'star' | 'underline' | 'scribble';
  className?: string;
  drawDelay?: number;
}) => {
  const paths: Record<typeof kind, string[]> = {
    arrow: ['M 4 26 Q 22 6 46 12 Q 62 16 74 30', 'M 62 22 L 76 31 L 61 36'],
    star: ['M 20 3 L 24 16 L 37 18 L 26 26 L 30 38 L 20 30 L 9 38 L 13 26 L 2 18 L 15 16 Z'],
    underline: ['M 2 8 Q 30 2 62 7 Q 84 11 98 5'],
    scribble: ['M 3 14 Q 14 3 24 13 Q 34 23 45 11 Q 55 1 66 12'],
  };

  const viewBoxes: Record<typeof kind, string> = {
    arrow: '0 0 80 42',
    star: '0 0 40 40',
    underline: '0 0 100 14',
    scribble: '0 0 70 26',
  };

  return (
    <svg
      className={`ik-doodle ${className ?? ''}`}
      viewBox={viewBoxes[kind]}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {paths[kind].map((d, index) => (
        <path
          key={d}
          className="ik-draw"
          d={d}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ animationDelay: `${drawDelay + index * 110}ms` }}
        />
      ))}
    </svg>
  );
};
