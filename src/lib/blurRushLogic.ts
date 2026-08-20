/**
 * Règles pures du mode BlurRush (pixoguess).
 *
 * Extrait de `usePixoguessGame` : ces fonctions décident du score, de la
 * validité d'une réponse, du niveau de floutage et du moment où la manche
 * doit avancer. Elles sont utilisées directement par le hook, donc les tests
 * portent sur le code réellement joué et non sur une copie.
 */

/** Nombre de manches d'une partie. */
export const TOTAL_ROUNDS = 5;
/** Durée d'une manche. */
export const ROUND_DURATION_MS = 20_000;
/** Nombre de paliers de floutage (20 = très flou, 1 = net). */
export const PIXELATION_STEPS = 20;
/** Délai anti-spam entre deux propositions. */
export const GUESS_COOLDOWN_MS = 300;
/** Marge avant qu'un autre joueur reprenne la main de l'hôte. */
export const HOST_FALLBACK_GRACE_MS = 2_000;
/** Durée maximale de la phase de révélation. */
export const REVEAL_PHASE_MAX_MS = 8_000;

/**
 * Points obtenus selon la rapidité : 100 immédiatement, 10 à l'expiration.
 * Le temps est borné pour qu'une horloge décalée ne donne jamais de score
 * négatif ni supérieur au maximum.
 */
export const calculatePointsFromTime = (timeMs: number): number => {
  const ratio = Math.max(0, Math.min(1, timeMs / ROUND_DURATION_MS));
  return Math.round(100 - ratio * 90);
};

/**
 * Normalisation d'une réponse : minuscules, accents retirés, ponctuation et
 * espaces supprimés. « Astérix ! » et « asterix » deviennent identiques.
 */
export const normalizeAnswer = (answer: string): string =>
  answer
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

/**
 * Une proposition est correcte si elle égale la réponse (ou une variante
 * acceptée), ou la contient.
 *
 * Le garde-fou sur la longueur est essentiel : une réponse qui se normalise en
 * chaîne vide rendrait `'nimporte quoi'.includes('')` vrai et validerait tout.
 */
export const isGuessCorrect = (
  guess: string,
  correctAnswer: string,
  acceptable: readonly string[] = [],
): boolean => {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedAnswer = normalizeAnswer(correctAnswer);
  const acceptableNormalized = acceptable.map(normalizeAnswer);

  return (
    (normalizedAnswer.length > 0 &&
      (normalizedGuess === normalizedAnswer || normalizedGuess.includes(normalizedAnswer))) ||
    acceptableNormalized.some(
      (variant) =>
        variant.length > 0 &&
        (normalizedGuess === variant || normalizedGuess.includes(variant)),
    )
  );
};

/** Niveau de floutage courant : décroît de PIXELATION_STEPS vers 1. */
export const computePixelLevel = (elapsedMs: number): number => {
  const progress = Math.max(0, Math.min(1, elapsedMs / ROUND_DURATION_MS));
  return Math.max(
    1,
    Math.min(PIXELATION_STEPS, Math.ceil(PIXELATION_STEPS * (1 - progress))),
  );
};

/** Temps restant affiché, jamais négatif. */
export const computeTimeRemaining = (elapsedMs: number): number =>
  Math.max(0, ROUND_DURATION_MS - elapsedMs);

/** L'indice « première lettre » apparaît sur les derniers 30 % du temps. */
export const shouldRevealFirstLetter = (timeRemainingMs: number): boolean =>
  timeRemainingMs <= ROUND_DURATION_MS * 0.3;

/** L'indice « nombre de lettres » apparaît sur les derniers 60 % du temps. */
export const shouldRevealLength = (timeRemainingMs: number): boolean =>
  timeRemainingMs <= ROUND_DURATION_MS * 0.6;

/**
 * L'hôte (ou son remplaçant) doit clore la manche une fois le temps écoulé,
 * la marge évitant que deux clients le fassent en même temps.
 */
export const shouldAdvanceRound = (
  elapsedMs: number,
  graceMs: number = HOST_FALLBACK_GRACE_MS,
): boolean => elapsedMs >= ROUND_DURATION_MS + graceMs;

/** Vrai quand la partie est terminée après cette manche. */
export const isLastRound = (roundNumber: number, totalRounds = TOTAL_ROUNDS): boolean =>
  roundNumber >= totalRounds;

/** Numéro de la manche suivante, borné au total. */
export const nextRoundNumber = (
  roundNumber: number,
  totalRounds = TOTAL_ROUNDS,
): number => Math.min(totalRounds, Math.max(1, Math.floor(roundNumber)) + 1);
