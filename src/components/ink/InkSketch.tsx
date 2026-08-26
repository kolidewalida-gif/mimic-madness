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
/**
 * Trace un rectangle « à main levée ».
 *
 * Les amplitudes sont volontairement faibles. Le `viewBox` fait 100 × 100 avec
 * `preserveAspectRatio="none"`, donc sur un bouton large et bas — 470 × 62 par
 * exemple — l'étirement horizontal est sept fois supérieur au vertical : un
 * tremblement de 2 unités devenait 9 px de large contre 1 px de haut, et les
 * côtés s'incurvaient assez pour que le cadre ne se ferme plus. À 0,9 la
 * déviation reste sous 4 px au plus large tout en gardant le trait manuel.
 */
function wobblyRect(seed: number, inset = 2, wobble = 0.9): string {
  const r = seeded(seed);
  const j = (amount = wobble) => (r() - 0.5) * 2 * amount;

  /*
   * Les quatre coins sont calculés une seule fois, puis réutilisés tels quels
   * comme extrémités des courbes, et le chemin se referme par `Z`.
   *
   * La version précédente retirait un décalage aléatoire à chaque mention d'un
   * coin, y compris entre le `M` initial et la dernière courbe : les deux
   * extrémités ne coïncidaient donc jamais et le cadre restait ouvert, ce qui
   * donnait des boutons en forme de crochets. L'irrégularité passe désormais
   * uniquement par les points de contrôle, où elle ne peut pas rompre le tracé.
   */
  const ax = inset + j(0.6);
  const ay = inset + j(0.6);
  const bx = 100 - inset + j(0.6);
  const by = 100 - inset + j(0.6);

  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;

  return [
    `M ${ax} ${ay}`,
    `Q ${midX + j()} ${ay + j()} ${bx} ${ay}`,
    `Q ${bx + j()} ${midY + j()} ${bx} ${by}`,
    `Q ${midX + j()} ${by + j()} ${ax} ${by}`,
    `Q ${ax + j()} ${midY + j()} ${ax} ${ay}`,
    'Z',
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
    const primary = useMemo(() => wobblyRect(seed, 3.5), [seed]);
    /* Le repassage est tracé plus à l'extérieur, via un `inset` plus faible
       plutôt qu'une transformation : exprimé dans les mêmes coordonnées, il
       suit l'étirement du conteneur sans se désolidariser du trait principal. */
    const secondary = useMemo(() => wobblyRect(seed + 991, 0.8, 1.3), [seed]);

    return (
      <svg
        className={className}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Le repassage est tracé légèrement à l'extérieur du trait principal,
            comme sur la planche de référence : superposés, les deux traits se
            confondaient en une seule ligne épaisse. Le décalage est exprimé en
            unités de viewBox, donc il suit l'étirement du conteneur. */}
        {doubled && (
          <path
            className="ik-draw"
            d={secondary}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth * 0.55}
            strokeLinecap="round"
            strokeOpacity={0.45}
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
