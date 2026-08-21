/**
 * Où reprendre la vidéo à imiter après une pause.
 *
 * Le lecteur de la vidéo de défi se rembobine tout seul : dès que la lecture
 * atteint la fin du clip, `VideoPreview` remet la position au début et met en
 * pause. Entre le moment où le joueur suspend son enregistrement pour changer
 * de voix et celui où il reprend, la position peut donc avoir été remise à zéro
 * sans que personne ne l'ait demandé — et la reprise repartait du début.
 *
 * La position est donc relevée au moment de la pause, puis restituée à la
 * reprise, au lieu de faire confiance à l'état du lecteur.
 */

export interface ResumeDecision {
  /** Position à restaurer, ou `null` pour laisser le lecteur où il est. */
  seekTo: number | null;
  shouldPlay: boolean;
}

/** Marge sous la durée totale en dessous de laquelle le clip est considéré fini. */
const END_TOLERANCE_SECONDS = 0.25;

export const resolveResumePosition = (
  capturedTime: number | null,
  duration: number,
): ResumeDecision => {
  // Aucune position relevée : première lecture, ou lecteur pas encore prêt.
  if (capturedTime === null || !Number.isFinite(capturedTime) || capturedTime < 0) {
    return { seekTo: null, shouldPlay: true };
  }

  const hasKnownDuration = Number.isFinite(duration) && duration > 0;

  /*
   * Le clip était déjà terminé quand le joueur a suspendu. Le relancer
   * repartirait forcément du début, ce qui n'a pas de sens : il n'y a plus rien
   * à imiter, et une relecture surprise pendant qu'il enregistre le gênerait.
   */
  if (hasKnownDuration && capturedTime >= duration - END_TOLERANCE_SECONDS) {
    return { seekTo: null, shouldPlay: false };
  }

  return { seekTo: capturedTime, shouldPlay: true };
};
