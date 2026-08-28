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
 * Mimo, la goutte de son Ink Beta. Son dessin est volontairement propre au
 * projet : silhouette d'encre, casque audio et petite onde de voix.
 */
export const InkBetaMascot = memo(() => (
  <div className="ik-mascot" aria-hidden="true">
    <svg viewBox="0 0 360 350" focusable="false">
      <circle className="ik-mascot-ring ik-mascot-ring--outer" cx="180" cy="178" r="142" />
      <circle className="ik-mascot-ring ik-mascot-ring--inner" cx="180" cy="178" r="130" />
      <path className="ik-mascot-shadow" d="M86 252c20 47 166 58 194 3-18 57-166 62-194-3Z" />
      <path className="ik-mascot-body" d="M180 42c-46 0-91 28-105 77-12 42 6 79 7 118 0 23-16 42-6 60 9 16 30 12 45-2 15 27 44 28 59 2 18 26 48 23 61-4 17 15 39 16 47-1 8-18-8-35-8-57 1-39 18-75 6-116-14-49-59-77-106-77Z" />
      <path className="ik-mascot-forehead" d="M78 128c22-56 73-76 102-76 41 0 87 29 103 77-34-17-61-24-102-24-40 0-70 7-103 23Z" />
      <path className="ik-mascot-wave" d="M83 235c18 18 35-8 53 8 18 17 35-9 53 7 18 17 35-9 53 6 13 11 25 1 38-4 0 15 6 29 2 39-13 27-43 30-61 5-15 26-44 25-59-2-15 14-36 18-45 2-9-17 4-34 5-51Z" />
      <path className="ik-mascot-headset" d="M72 178C58 104 101 55 176 53c76-2 124 47 111 124" />
      <rect className="ik-mascot-ear" x="56" y="159" width="42" height="73" rx="19" />
      <rect className="ik-mascot-ear" x="262" y="159" width="42" height="73" rx="19" />
      <path className="ik-mascot-mic" d="M285 214c11 31-16 51-44 48" />
      <circle className="ik-mascot-mic-tip" cx="236" cy="261" r="9" />
      <g className="ik-mascot-eye">
        <circle cx="131" cy="161" r="38" />
        <circle className="ik-mascot-pupil" cx="139" cy="164" r="17" />
        <circle className="ik-mascot-glint" cx="145" cy="157" r="6" />
      </g>
      <g className="ik-mascot-eye">
        <circle cx="229" cy="161" r="38" />
        <circle className="ik-mascot-pupil" cx="221" cy="164" r="17" />
        <circle className="ik-mascot-glint" cx="227" cy="157" r="6" />
      </g>
      <path className="ik-mascot-mouth" d="M141 209q39 42 78 0-39 16-78 0Z" />
      <path className="ik-mascot-tongue" d="M166 225q16 12 31 0" />
    </svg>
    <span className="ik-mascot-pulse ik-mascot-pulse--one" />
    <span className="ik-mascot-pulse ik-mascot-pulse--two" />
  </div>
));
InkBetaMascot.displayName = 'InkBetaMascot';
