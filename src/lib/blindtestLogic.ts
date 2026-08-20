/**
 * Règles pures du mode Blindtest (memorise).
 *
 * Extrait de `MemoriseGameScreen` : l'indice masqué progressif, le générateur
 * pseudo-aléatoire déterministe, le mélange et la construction des propositions.
 *
 * Le déterminisme est ici une exigence de synchro : l'hôte et les autres
 * joueurs doivent obtenir EXACTEMENT les mêmes propositions dans le même ordre
 * à partir de la même graine, sinon les joueurs ne votent pas sur la même liste.
 */
import type { BlindtestCategory } from '@/lib/blindtestTracks';

/** Clé d'historique anti-répétition d'une entrée. */
export const entryKey = (e: { category: string; answer: string }): string =>
  `${e.category}|${e.answer.toLowerCase()}`;

/**
 * Indice masqué progressif : plus la manche avance, plus de lettres
 * apparaissent. Les caractères non alphanumériques restent visibles pour
 * conserver la forme du titre.
 */
export function buildHint(title: string, elapsedFrac: number): string {
  return title
    .split(' ')
    .map((word) =>
      word
        .split('')
        .map((ch, i) => {
          if (!/[a-zA-Z0-9À-ÿ]/.test(ch)) return ch;
          if (elapsedFrac >= 0.7) return i === 0 || i % 2 === 0 ? ch : '•';
          if (elapsedFrac >= 0.45) return i === 0 ? ch : '•';
          return '•';
        })
        .join(''),
    )
    .join('  ');
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * Une même graine produit toujours la même suite : c'est ce qui garantit que
 * tous les clients construisent la même liste de propositions.
 */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates piloté par un générateur fourni. */
export function shuffle<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface OptionCandidate {
  title: string;
  category: BlindtestCategory;
}

export interface BuiltOptions {
  options: string[];
  answerIndex: number;
}

/**
 * Construire les quatre propositions d'une manche.
 *
 * Les leurres viennent d'abord de la même catégorie (plus crédibles), puis des
 * autres si nécessaire. Tout est piloté par la graine, donc reproductible.
 */
export function buildOptions(
  correct: OptionCandidate,
  pool: readonly OptionCandidate[],
  seed: number,
): BuiltOptions {
  const rnd = mulberry(seed);
  const same = Array.from(
    new Set(pool.filter((t) => t.category === correct.category).map((t) => t.title)),
  ).filter((t) => t !== correct.title);
  const others = Array.from(new Set(pool.map((t) => t.title))).filter(
    (t) => t !== correct.title && !same.includes(t),
  );
  const distractors = [...shuffle(same, rnd), ...shuffle(others, rnd)].slice(0, 3);
  const options = shuffle([correct.title, ...distractors], rnd);
  return { options, answerIndex: options.indexOf(correct.title) };
}
