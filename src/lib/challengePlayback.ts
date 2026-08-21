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
  /**
   * La vidéo était déjà arrêtée quand le joueur a suspendu.
   *
   * C'est la signature de l'auto-rembobinage : `VideoPreview` met la balise en
   * pause ET la remet au début dès que la lecture atteint la fin du passage à
   * imiter — pas la fin du fichier, la fin du découpage, qui peut n'être que
   * quelques secondes. Sur un clip court, la vidéo est donc déjà revenue au
   * début avant même le clic sur Pause, et sa position ne veut plus rien dire.
   */
  clipAlreadyFinished = false,
): ResumeDecision => {
  // Rien à reprendre : le passage à imiter est terminé. Le relancer donnerait
  // exactement l'impression de « ça repart du début ».
  if (clipAlreadyFinished) return { seekTo: null, shouldPlay: false };

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
