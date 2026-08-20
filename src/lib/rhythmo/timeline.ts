export interface RhythmoTimelineWord {
  start: number;
  end: number;
}

export const sanitizeRhythmoLeadSeconds = (leadSeconds: number): number =>
  Number.isFinite(leadSeconds) ? Math.max(0, leadSeconds) : 0;

/**
 * Time used by every visual decision in the strip. A positive lead makes a
 * word reach the playhead before its audio timestamp, giving the player time
 * to pronounce it without desynchronizing from `video.currentTime`.
 */
export const getRhythmoTimelineTime = (
  currentTime: number,
  leadSeconds = 0,
): number => {
  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  return safeCurrentTime + sanitizeRhythmoLeadSeconds(leadSeconds);
};

export const getRhythmoStripOffset = (
  playhead: number,
  timelineTime: number,
  pxPerSecond: number,
): number => {
  const safePlayhead = Number.isFinite(playhead) ? playhead : 0;
  const safeTime = Number.isFinite(timelineTime) ? Math.max(0, timelineTime) : 0;
  const safeSpeed = Number.isFinite(pxPerSecond) ? Math.max(0, pxPerSecond) : 0;
  return safePlayhead - safeTime * safeSpeed;
};

/**
 * Largeur approximative d'un mot dans la bande, en pixels.
 *
 * Mesurer chaque mot dans le DOM coûterait un calcul de mise en page par mot
 * sur des centaines de mots. Une estimation suffit ici, à condition d'être
 * légèrement généreuse : mieux vaut un petit espace en trop qu'un
 * chevauchement.
 */
export const estimateRhythmoWordWidth = (
  text: string,
  fontSizePx: number,
): number => {
  const safeSize = Number.isFinite(fontSizePx) ? Math.max(1, fontSizePx) : 24;
  // 0,58 em par caractère : moyenne mesurée sur une police display en graisse 800.
  return Math.max(safeSize, text.length * safeSize * 0.58);
};

export interface RhythmoPlacementInput {
  text: string;
  start: number;
  end: number;
}

export interface RhythmoPlacedWord {
  left: number;
  width: number;
}

/**
 * Placer les mots sur la bande sans qu'ils se chevauchent.
 *
 * La position idéale d'un mot est `start × pxPerSecond` : la distance devient du
 * temps, ce qui permet de lire à l'avance. Mais la parole courante dépasse
 * souvent trois mots par seconde, alors qu'un mot comme « musique » occupe bien
 * plus que l'espace correspondant à sa durée : les mots se superposaient donc et
 * la bande devenait illisible.
 *
 * On garde donc la position temporelle comme cible, en repoussant un mot juste
 * assez vers la droite pour qu'il ne recouvre pas le précédent. Le décalage
 * introduit reste local et se résorbe dès que le débit ralentit ; la mise en
 * surbrillance, elle, continue de suivre le temps réel.
 */
export const placeRhythmoWords = (
  words: readonly RhythmoPlacementInput[],
  pxPerSecond: number,
  fontSizePx: number,
  gapPx = 14,
): RhythmoPlacedWord[] => {
  const safeSpeed = Number.isFinite(pxPerSecond) ? Math.max(1, pxPerSecond) : 1;
  const safeGap = Number.isFinite(gapPx) ? Math.max(0, gapPx) : 0;

  const placed: RhythmoPlacedWord[] = [];
  let previousRight = Number.NEGATIVE_INFINITY;

  for (const word of words) {
    const start = Number.isFinite(word.start) ? Math.max(0, word.start) : 0;
    const end = Number.isFinite(word.end) ? Math.max(start, word.end) : start;

    // Un mot occupe au moins la largeur de son texte, et au moins celle de sa
    // durée pour qu'un mot tenu paraisse long.
    const width = Math.max(
      estimateRhythmoWordWidth(word.text, fontSizePx),
      (end - start) * safeSpeed,
    );

    const idealLeft = start * safeSpeed;
    const left = previousRight === Number.NEGATIVE_INFINITY
      ? idealLeft
      : Math.max(idealLeft, previousRight + safeGap);

    placed.push({ left, width });
    previousRight = left + width;
  }

  return placed;
};

/** Find the word under the playhead, including after a backwards seek. */
export const findActiveRhythmoWord = (
  words: readonly RhythmoTimelineWord[],
  time: number,
  previousIndex = -1,
): number => {
  const from = Number.isInteger(previousIndex) && previousIndex >= 0
    ? Math.min(previousIndex, words.length)
    : 0;

  for (let index = from; index < words.length; index += 1) {
    const word = words[index];
    if (time < word.start) break;
    if (time <= word.end) return index;
  }

  for (let index = 0; index < from; index += 1) {
    const word = words[index];
    if (time >= word.start && time <= word.end) return index;
  }

  return -1;
};
