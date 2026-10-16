import { memo } from 'react';

/**
 * Marque et mascotte Ink Beta.
 *
 * Ces deux dessins vivaient dans `InkBetaHomeScreen`, mais le lobby beta doit
 * afficher exactement la même marque et la même mascotte : les dupliquer aurait
 * garanti une dérive visuelle entre l'accueil et le salon.
 */

interface InkBetaLogoProps {
  /**
   * Identifiant du titre, référencé par `aria-labelledby` sur le panneau
   * principal. Chaque écran fournit le sien : deux `id` identiques dans le même
   * document casseraient l'association pour les lecteurs d'écran.
   */
  titleId?: string;
}

export const InkBetaLogo = memo(({ titleId = 'ik-main-title' }: InkBetaLogoProps) => (
  <h1 id={titleId} className="ik-title" aria-label="Mimic Master Ink Beta">
    <span className="sr-only">Mimic Master Ink Beta</span>
    <svg className="ik-logo-svg" viewBox="0 0 680 270" aria-hidden="true" focusable="false">
      <path className="ik-logo-back" d="M76 52 605 37l39 42-22 134-531 18-48-45z" />
      <path className="ik-logo-splash" d="m48 118-35-17 31-12-20-29 47 16m565 68 34 15-35 11 16 30-42-20" />
      <g className="ik-logo-words">
        <text x="102" y="132" textLength="478" lengthAdjust="spacingAndGlyphs">MIMIC</text>
        <text x="80" y="215" textLength="525" lengthAdjust="spacingAndGlyphs">MASTER</text>
      </g>
      <path className="ik-logo-stroke" d="M119 226q216 20 430-8" />
      <g className="ik-logo-badge">
        <path d="m551 31 82 6 14 41-76 20-37-31z" />
        <text x="590" y="69">BETA</text>
      </g>
    </svg>
  </h1>
));
InkBetaLogo.displayName = 'InkBetaLogo';

/**
 * Mimo, la mascotte du jeu : un fantôme à casque, trait d'encre et aplats.
 * Le dessin est généré par tools/mascots/build.mjs (public/mimo/mimo.svg).
 */
export const InkBetaMascot = memo(() => (
  <div className="ik-mascot" aria-hidden="true">
    <img src={`${import.meta.env.BASE_URL}mimo/mimo.svg`} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
    <span className="ik-mascot-pulse ik-mascot-pulse--one" />
    <span className="ik-mascot-pulse ik-mascot-pulse--two" />
  </div>
));
InkBetaMascot.displayName = 'InkBetaMascot';
