import { describe, expect, it } from 'vitest';
import { resolveResumePosition } from '@/lib/challengePlayback';

describe('reprise de la vidéo à imiter', () => {
  it('reprend exactement là où le joueur avait suspendu', () => {
    /*
     * Non-régression : la reprise repartait du début après un changement de
     * voix. `VideoPreview` remet la lecture à zéro dès que le clip atteint sa
     * fin, donc se contenter d'un `play()` ne suffit pas.
     */
    expect(resolveResumePosition(12.5, 40)).toEqual({ seekTo: 12.5, shouldPlay: true });
  });

  it('ne relance pas un clip déjà terminé', () => {
    // Il n'y a plus rien à imiter : une relecture surprise gênerait le joueur.
    expect(resolveResumePosition(40, 40)).toEqual({ seekTo: null, shouldPlay: false });
    expect(resolveResumePosition(39.9, 40)).toEqual({ seekTo: null, shouldPlay: false });
  });

  it('reprend normalement juste avant la tolérance de fin', () => {
    expect(resolveResumePosition(39.5, 40)).toEqual({ seekTo: 39.5, shouldPlay: true });
  });

  it('joue sans repositionner quand aucune position n’a été relevée', () => {
    // Première lecture, ou lecteur pas encore prêt au moment de la pause.
    expect(resolveResumePosition(null, 40)).toEqual({ seekTo: null, shouldPlay: true });
  });

  it('ignore une position aberrante plutôt que de la restaurer', () => {
    expect(resolveResumePosition(Number.NaN, 40)).toEqual({ seekTo: null, shouldPlay: true });
    expect(resolveResumePosition(-3, 40)).toEqual({ seekTo: null, shouldPlay: true });
  });

  it('restaure la position même quand la durée est inconnue', () => {
    /*
     * `video.duration` vaut NaN tant que les métadonnées ne sont pas chargées,
     * et 0 est retourné à sa place. Sans durée fiable, on ne peut pas conclure
     * que le clip est fini : mieux vaut reprendre où on en était.
     */
    expect(resolveResumePosition(8, 0)).toEqual({ seekTo: 8, shouldPlay: true });
    expect(resolveResumePosition(8, Number.NaN)).toEqual({ seekTo: 8, shouldPlay: true });
  });
});

describe('passage à imiter déjà terminé', () => {
  it('ne relance rien quand la vidéo était déjà arrêtée', () => {
    /*
     * Cause réelle du « ça repart du début » : `VideoPreview` met la balise en
     * pause ET la rembobine dès la fin du passage découpé du clip. Sur un clip
     * court, la position relevée à la pause vaut donc déjà le début.
     */
    expect(resolveResumePosition(0, 40, true)).toEqual({ seekTo: null, shouldPlay: false });
  });

  it('l’emporte sur une position par ailleurs valable', () => {
    expect(resolveResumePosition(12.5, 40, true)).toEqual({ seekTo: null, shouldPlay: false });
  });

  it('laisse passer la reprise normale quand la vidéo jouait', () => {
    expect(resolveResumePosition(12.5, 40, false)).toEqual({ seekTo: 12.5, shouldPlay: true });
  });
});
