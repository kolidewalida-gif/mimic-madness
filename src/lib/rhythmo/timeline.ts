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

/** Un mot déjà placé, vu comme point d'ancrage temps ↔ position. */
export interface RhythmoScrollAnchor {
  start: number;
  end: number;
  left: number;
  width: number;
}

/**
 * Position, en pixels de bande, qui doit se trouver sous la tête de lecture à
 * un instant donné.
 *
 * Cette conversion ne peut pas être un simple `temps × pxPerSecond`. Le
 * placement repousse les mots vers la droite pour qu'ils ne se chevauchent pas,
 * et ce report s'accumule : à quatre mots par seconde, un mot réclame environ
 * 111 px alors que le temps n'en fournit que 47, soit plus de 60 px de retard
 * par mot. Au bout de quelques secondes de parole dense, le mot sous la tête de
 * lecture n'était plus celui prononcé — la bande semblait décalée.
 *
 * On interpole donc sur les positions réellement attribuées aux mots. Le mot
 * prononcé arrive exactement sur la tête de lecture, quel que soit le report
 * accumulé. La vitesse de défilement devient variable : c'est le compromis
 * assumé, la justesse sur la tête de lecture étant tout l'intérêt d'une bande
 * rythmo.
 *
 * Suppose `anchors` trié par `start`, ce que garantit `flattenWords`.
 */
export const getRhythmoScrollX = (
  anchors: readonly RhythmoScrollAnchor[],
  time: number,
  pxPerSecond: number,
): number => {
  const safeSpeed = Number.isFinite(pxPerSecond) ? Math.max(1, pxPerSecond) : 1;
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0;
  if (anchors.length === 0) return safeTime * safeSpeed;

  const first = anchors[0];
  // Avant le premier mot, vitesse constante : on arrive pile sur sa position.
  if (safeTime <= first.start) {
    return first.left - (first.start - safeTime) * safeSpeed;
  }

  // Dernier mot dont la prononciation a commencé.
  let low = 0;
  let high = anchors.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (anchors[mid].start <= safeTime) low = mid;
    else high = mid - 1;
  }

  const current = anchors[low];
  const currentRight = current.left + current.width;

  // Pendant le mot : il traverse la tête de lecture au fil de sa prononciation.
  if (safeTime <= current.end) {
    const span = current.end - current.start;
    if (span <= 0) return current.left;
    return current.left + ((safeTime - current.start) / span) * current.width;
  }

  const next = anchors[low + 1];
  // Après le dernier mot, plus rien à caler : vitesse constante.
  if (!next) return currentRight + (safeTime - current.end) * safeSpeed;

  /*
   * Silence entre deux mots : tout le trajet restant est réparti sur la pause.
   * C'est là que le report accumulé par l'anti-chevauchement est absorbé, sans
   * jamais désaligner le mot suivant.
   */
  const span = next.start - current.end;
  if (span <= 0) return next.left;
  const travel = Math.max(0, next.left - currentRight);
  return currentRight + ((safeTime - current.end) / span) * travel;
};

/**
 * Décalage à appliquer à la bande pour amener `scrollX` sous la tête de lecture.
 */
export const getRhythmoStripOffset = (playhead: number, scrollX: number): number => {
  const safePlayhead = Number.isFinite(playhead) ? playhead : 0;
  const safeScrollX = Number.isFinite(scrollX) ? scrollX : 0;
  return safePlayhead - safeScrollX;
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
