/**
 * Sons d'interface du mode Imitation.
 *
 * Une seule table pour que chaque geste sonne toujours pareil : survol,
 * appui, validation, tampon, tension du chrono, score, victoire. Tout passe
 * par `playSample`, donc par le volume des effets choisi par le joueur, et
 * rien ne lève jamais : un son absent ou pas encore chargé est simplement muet.
 */
import { playSample } from '@/lib/sfx/samples';

type Cue = 'hover' | 'press' | 'confirm' | 'stamp' | 'whoosh' | 'tick' | 'critical' | 'score' | 'win' | 'reveal';

/** Échantillon et volume de chaque geste. Volumes bas : l'interface accompagne, elle ne crie pas. */
const CUES: Record<Cue, [name: string, volume: number, minGapMs: number]> = {
  hover: ['hoverSoft', 0.05, 90],
  press: ['click', 0.2, 40],
  confirm: ['success', 0.28, 120],
  stamp: ['cartoonBoing', 0.24, 120],
  whoosh: ['whoosh', 0.2, 200],
  tick: ['countdown', 0.1, 400],
  critical: ['countdown', 0.18, 400],
  score: ['scoreUp', 0.12, 70],
  win: ['celebration', 0.32, 1500],
  reveal: ['reveal', 0.22, 300],
};

const lastPlayed = new Map<Cue, number>();

export const showSfx = (cue: Cue): void => {
  const [name, volume, gap] = CUES[cue];
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - (lastPlayed.get(cue) ?? -Infinity) < gap) return;
  lastPlayed.set(cue, now);
  playSample(name, volume);
};

/**
 * Charge les échantillons à l'avance. Le premier appel de `playSample` lance le
 * téléchargement sans jouer : sans ce préchauffage, le premier survol, le
 * premier tampon ou le premier tic du chrono seraient muets.
 */
export const warmShowSfx = (): void => {
  for (const [name] of Object.values(CUES)) playSample(name, 0);
};
