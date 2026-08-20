/**
 * Mode BLINDTEST (memorise) — couverture complète.
 *
 *  - mécaniques : score à la rapidité, indice masqué progressif, catalogue
 *  - synchro entre joueurs : propositions identiques chez tous via la graine
 *  - passage à la manche suivante : file de manches sans répétition
 *  - reconnexion : tout est recalculable depuis la graine diffusée par l'hôte
 */
import { describe, expect, it } from 'vitest';
import {
  BLINDTEST_ENTRIES,
  BLINDTEST_ENTRIES_UNIQUE,
  BLINDTEST_LISTEN_MS,
  BLINDTEST_LISTEN_OPTIONS,
  BLINDTEST_REVEAL_MS,
  BLINDTEST_ROUNDS,
  BLINDTEST_ROUND_OPTIONS,
  CATEGORY_META,
  scoreFor,
  type BlindtestCategory,
} from '@/lib/blindtestTracks';
import {
  buildHint,
  buildOptions,
  entryKey,
  mulberry,
  shuffle,
  type OptionCandidate,
} from '@/lib/blindtestLogic';

const CATEGORIES: BlindtestCategory[] = [
  'anime', 'cartoon', 'music', 'film', 'jeuxvideo', 'disney',
  'kpop', 'retro', 'series', 'rapfr',
];

const candidate = (title: string, category: BlindtestCategory = 'anime'): OptionCandidate =>
  ({ title, category });

const pool = (count: number, category: BlindtestCategory = 'anime'): OptionCandidate[] =>
  Array.from({ length: count }, (_, i) => candidate(`titre-${i}`, category));

// ── 1. Constantes de partie ────────────────────────────────────────────────

describe('blindtest — réglages de partie', () => {
  it('joue dix manches par défaut', () => {
    expect(BLINDTEST_ROUNDS).toBe(10);
  });

  it('laisse vingt secondes d’écoute par défaut', () => {
    expect(BLINDTEST_LISTEN_MS).toBe(20_000);
  });

  it('laisse un temps de révélation positif', () => {
    expect(BLINDTEST_REVEAL_MS).toBeGreaterThan(0);
  });

  it('propose plusieurs durées d’écoute', () => {
    expect(BLINDTEST_LISTEN_OPTIONS.length).toBeGreaterThan(1);
  });

  it('propose des durées d’écoute croissantes', () => {
    const values = [...BLINDTEST_LISTEN_OPTIONS];
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('inclut la durée par défaut dans les options', () => {
    expect(BLINDTEST_LISTEN_OPTIONS).toContain(BLINDTEST_LISTEN_MS);
  });

  it('propose plusieurs nombres de manches', () => {
    expect(BLINDTEST_ROUND_OPTIONS.length).toBeGreaterThan(1);
  });

  it('propose des nombres de manches croissants', () => {
    const values = [...BLINDTEST_ROUND_OPTIONS];
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('inclut le nombre de manches par défaut dans les options', () => {
    expect(BLINDTEST_ROUND_OPTIONS).toContain(BLINDTEST_ROUNDS);
  });

  it('n’offre que des durées d’écoute positives', () => {
    expect(BLINDTEST_LISTEN_OPTIONS.every((v) => v > 0)).toBe(true);
  });
});

// ── 2. Catalogue ───────────────────────────────────────────────────────────

describe('blindtest — catalogue de titres', () => {
  it('contient assez d’entrées pour une partie complète', () => {
    expect(BLINDTEST_ENTRIES_UNIQUE.length).toBeGreaterThan(BLINDTEST_ROUNDS);
  });

  it('donne une réponse à chaque entrée', () => {
    expect(BLINDTEST_ENTRIES_UNIQUE.every((e) => e.answer.trim().length > 0)).toBe(true);
  });

  it('donne une requête de recherche à chaque entrée', () => {
    expect(BLINDTEST_ENTRIES_UNIQUE.every((e) => e.query.trim().length > 0)).toBe(true);
  });

  it('donne une catégorie connue à chaque entrée', () => {
    expect(BLINDTEST_ENTRIES_UNIQUE.every((e) => CATEGORIES.includes(e.category))).toBe(true);
  });

  it('ne contient aucun doublon dans la liste dédupliquée', () => {
    const keys = BLINDTEST_ENTRIES_UNIQUE.map(entryKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('pondère la liste tirable au moins autant que la liste unique', () => {
    expect(BLINDTEST_ENTRIES.length).toBeGreaterThanOrEqual(BLINDTEST_ENTRIES_UNIQUE.length);
  });

  it('n’introduit aucune entrée absente de la liste unique', () => {
    const unique = new Set(BLINDTEST_ENTRIES_UNIQUE.map(entryKey));
    expect(BLINDTEST_ENTRIES.every((e) => unique.has(entryKey(e)))).toBe(true);
  });

  it('duplique les entrées pondérées', () => {
    const counts = new Map<string, number>();
    for (const entry of BLINDTEST_ENTRIES) {
      const key = entryKey(entry);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const entry of BLINDTEST_ENTRIES_UNIQUE) {
      const expected = Math.max(1, Math.round(entry.weight ?? 1));
      expect(counts.get(entryKey(entry))).toBe(expected);
    }
  });

  it('donne un libellé à chaque catégorie', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_META[category].label.length).toBeGreaterThan(0);
    }
  });

  it('donne un emoji à chaque catégorie', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_META[category].emoji.length).toBeGreaterThan(0);
    }
  });

  it('donne une couleur à chaque catégorie', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_META[category].color).toMatch(/^#/);
    }
  });

  it('couvre plusieurs catégories dans le catalogue', () => {
    const used = new Set(BLINDTEST_ENTRIES_UNIQUE.map((e) => e.category));
    expect(used.size).toBeGreaterThan(3);
  });

  it('fournit assez de titres par catégorie utilisée pour faire des leurres', () => {
    const byCategory = new Map<string, number>();
    for (const entry of BLINDTEST_ENTRIES_UNIQUE) {
      byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + 1);
    }
    for (const count of byCategory.values()) expect(count).toBeGreaterThan(1);
  });

  it('construit une clé d’historique stable', () => {
    expect(entryKey({ category: 'anime', answer: 'Naruto' })).toBe('anime|naruto');
  });

  it('rend la clé d’historique insensible à la casse', () => {
    expect(entryKey({ category: 'anime', answer: 'NARUTO' }))
      .toBe(entryKey({ category: 'anime', answer: 'naruto' }));
  });

  it('distingue deux catégories pour une même réponse', () => {
    expect(entryKey({ category: 'anime', answer: 'X' }))
      .not.toBe(entryKey({ category: 'film', answer: 'X' }));
  });
});

// ── 3. Score à la rapidité ─────────────────────────────────────────────────

describe('blindtest — score à la rapidité', () => {
  it('ne donne aucun point pour une mauvaise réponse', () => {
    expect(scoreFor(false, 0)).toBe(0);
  });

  it('ne donne aucun point même très vite si la réponse est fausse', () => {
    expect(scoreFor(false, 1)).toBe(0);
  });

  it('donne le maximum pour une réponse instantanée', () => {
    expect(scoreFor(true, 0)).toBe(1_100);
  });

  it('donne le minimum en fin de fenêtre', () => {
    expect(scoreFor(true, BLINDTEST_LISTEN_MS)).toBe(100);
  });

  it('donne un score intermédiaire à mi-parcours', () => {
    expect(scoreFor(true, BLINDTEST_LISTEN_MS / 2)).toBe(600);
  });

  it('décroît de façon monotone', () => {
    for (let t = 0; t < BLINDTEST_LISTEN_MS; t += 500) {
      expect(scoreFor(true, t)).toBeGreaterThanOrEqual(scoreFor(true, t + 500));
    }
  });

  it('borne un temps négatif au maximum', () => {
    expect(scoreFor(true, -5_000)).toBe(1_100);
  });

  it('borne un dépassement au minimum', () => {
    expect(scoreFor(true, BLINDTEST_LISTEN_MS * 4)).toBe(100);
  });

  it('ne descend jamais sous cent points pour une bonne réponse', () => {
    for (let t = 0; t <= BLINDTEST_LISTEN_MS * 2; t += 1_000) {
      expect(scoreFor(true, t)).toBeGreaterThanOrEqual(100);
    }
  });

  it('récompense le joueur le plus rapide', () => {
    expect(scoreFor(true, 1_000)).toBeGreaterThan(scoreFor(true, 12_000));
  });

  it('renvoie toujours un entier', () => {
    for (let t = 0; t <= BLINDTEST_LISTEN_MS; t += 777) {
      expect(Number.isInteger(scoreFor(true, t))).toBe(true);
    }
  });

  it('s’adapte à une fenêtre d’écoute courte', () => {
    expect(scoreFor(true, 10_000, 10_000)).toBe(100);
  });

  it('s’adapte à une fenêtre d’écoute longue', () => {
    expect(scoreFor(true, 10_000, 45_000)).toBeGreaterThan(100);
  });

  it('donne le même score à deux joueurs au même temps', () => {
    expect(scoreFor(true, 3_333)).toBe(scoreFor(true, 3_333));
  });

  it('classe correctement trois joueurs par rapidité', () => {
    const scores = [1_000, 5_000, 15_000].map((t) => scoreFor(true, t));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });
});

// ── 4. Indice masqué progressif ────────────────────────────────────────────

describe('blindtest — indice masqué progressif', () => {
  it('masque tout au début de la manche', () => {
    expect(buildHint('Naruto', 0)).toBe('••••••');
  });

  it('masque tout juste avant le premier palier', () => {
    expect(buildHint('Naruto', 0.44)).toBe('••••••');
  });

  it('révèle la première lettre au premier palier', () => {
    expect(buildHint('Naruto', 0.45)).toBe('N•••••');
  });

  it('révèle une lettre sur deux au second palier', () => {
    expect(buildHint('Naruto', 0.7)).toBe('N•r•t•');
  });

  it('révèle davantage à la toute fin', () => {
    const early = buildHint('Naruto', 0.2);
    const late = buildHint('Naruto', 0.95);
    const countHidden = (s: string) => [...s].filter((c) => c === '•').length;
    expect(countHidden(late)).toBeLessThan(countHidden(early));
  });

  it('conserve la ponctuation visible', () => {
    expect(buildHint("L'ami", 0)).toContain("'");
  });

  it('conserve les chiffres masqués comme des lettres', () => {
    expect(buildHint('Rocky2', 0)).toBe('••••••');
  });

  it('sépare les mots par deux espaces', () => {
    expect(buildHint('Le Roi', 0)).toBe('••  •••');
  });

  it('gère un titre vide', () => {
    expect(buildHint('', 0)).toBe('');
  });

  it('gère un titre d’une seule lettre', () => {
    expect(buildHint('A', 0)).toBe('•');
  });

  it('révèle la lettre unique au premier palier', () => {
    expect(buildHint('A', 0.5)).toBe('A');
  });

  it('gère les lettres accentuées', () => {
    expect(buildHint('Été', 0)).toBe('•••');
  });

  it('révèle la première lettre accentuée', () => {
    expect(buildHint('Été', 0.5)).toBe('É••');
  });

  it('ne masque jamais un tiret', () => {
    expect(buildHint('Spider-Man', 0)).toContain('-');
  });

  it('conserve la longueur de chaque mot', () => {
    const hint = buildHint('Naruto Shippuden', 0);
    const [first, second] = hint.split('  ');
    expect(first).toHaveLength(6);
    expect(second).toHaveLength(9);
  });

  it('donne le même indice à tous les joueurs au même instant', () => {
    expect(buildHint('Dragon Ball', 0.6)).toBe(buildHint('Dragon Ball', 0.6));
  });

  it('reste stable au-delà de cent pour cent', () => {
    expect(buildHint('Naruto', 5)).toBe(buildHint('Naruto', 1));
  });

  it('traite une fraction négative comme le début', () => {
    expect(buildHint('Naruto', -1)).toBe('••••••');
  });
});

// ── 5. Générateur déterministe (base de la synchro) ────────────────────────

describe('blindtest — générateur déterministe', () => {
  it('produit la même suite pour une même graine', () => {
    const a = mulberry(42);
    const b = mulberry(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produit des suites différentes pour des graines différentes', () => {
    const a = mulberry(1);
    const b = mulberry(2);
    expect(a()).not.toBe(b());
  });

  it('reste dans l’intervalle zéro-un', () => {
    const rnd = mulberry(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rnd();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('ne renvoie pas toujours la même valeur', () => {
    const rnd = mulberry(99);
    const values = new Set(Array.from({ length: 20 }, () => rnd()));
    expect(values.size).toBeGreaterThan(10);
  });

  it('accepte la graine zéro', () => {
    const rnd = mulberry(0);
    expect(Number.isFinite(rnd())).toBe(true);
  });

  it('accepte une graine négative', () => {
    const rnd = mulberry(-123);
    const value = rnd();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('accepte une très grande graine', () => {
    const rnd = mulberry(2 ** 31);
    expect(Number.isFinite(rnd())).toBe(true);
  });

  it('avance à chaque appel', () => {
    const rnd = mulberry(5);
    expect(rnd()).not.toBe(rnd());
  });
});

// ── 6. Mélange déterministe ────────────────────────────────────────────────

describe('blindtest — mélange déterministe', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('conserve tous les éléments', () => {
    expect(new Set(shuffle(items, mulberry(1)))).toEqual(new Set(items));
  });

  it('conserve la longueur', () => {
    expect(shuffle(items, mulberry(1))).toHaveLength(items.length);
  });

  it('n’altère pas le tableau d’origine', () => {
    const copy = [...items];
    shuffle(items, mulberry(3));
    expect(items).toEqual(copy);
  });

  it('donne le même ordre pour une même graine', () => {
    expect(shuffle(items, mulberry(11))).toEqual(shuffle(items, mulberry(11)));
  });

  it('donne des ordres différents pour des graines différentes', () => {
    const results = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) => shuffle(items, mulberry(seed)).join('')),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('gère un tableau vide', () => {
    expect(shuffle([], mulberry(1))).toEqual([]);
  });

  it('gère un tableau d’un élément', () => {
    expect(shuffle(['seul'], mulberry(1))).toEqual(['seul']);
  });

  it('ne duplique jamais un élément', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const shuffled = shuffle(items, mulberry(seed));
      expect(new Set(shuffled).size).toBe(items.length);
    }
  });
});

// ── 7. Propositions de réponse (synchro entre joueurs) ─────────────────────

describe('blindtest — propositions de réponse', () => {
  it('propose quatre choix quand le vivier suffit', () => {
    expect(buildOptions(candidate('bon'), pool(10), 1).options).toHaveLength(4);
  });

  it('inclut toujours la bonne réponse', () => {
    const { options } = buildOptions(candidate('bon'), pool(10), 1);
    expect(options).toContain('bon');
  });

  it('pointe l’index de la bonne réponse', () => {
    const { options, answerIndex } = buildOptions(candidate('bon'), pool(10), 1);
    expect(options[answerIndex]).toBe('bon');
  });

  it('ne répète jamais une proposition', () => {
    const { options } = buildOptions(candidate('bon'), pool(10), 1);
    expect(new Set(options).size).toBe(options.length);
  });

  it('n’inclut pas la bonne réponse comme leurre', () => {
    const { options } = buildOptions(candidate('bon'), [candidate('bon'), ...pool(6)], 2);
    expect(options.filter((o) => o === 'bon')).toHaveLength(1);
  });

  it('donne exactement les mêmes propositions à tous les joueurs', () => {
    const chezHote = buildOptions(candidate('bon'), pool(12), 777);
    const chezJoueur = buildOptions(candidate('bon'), pool(12), 777);
    expect(chezJoueur).toEqual(chezHote);
  });

  it('donne le même index de réponse à tous les joueurs', () => {
    const a = buildOptions(candidate('bon'), pool(12), 555);
    const b = buildOptions(candidate('bon'), pool(12), 555);
    expect(a.answerIndex).toBe(b.answerIndex);
  });

  it('change l’ordre selon la graine', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => buildOptions(candidate('bon'), pool(12), seed).options.join('|')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('privilégie les leurres de la même catégorie', () => {
    const same = pool(5, 'anime');
    const others = pool(5, 'film').map((c) => candidate(`autre-${c.title}`, 'film'));
    const { options } = buildOptions(candidate('bon', 'anime'), [...same, ...others], 9);
    const distractors = options.filter((o) => o !== 'bon');
    expect(distractors.every((d) => d.startsWith('titre-'))).toBe(true);
  });

  it('complète avec d’autres catégories si nécessaire', () => {
    const same = [candidate('unique-anime', 'anime')];
    const others = [
      candidate('film-1', 'film'),
      candidate('film-2', 'film'),
      candidate('film-3', 'film'),
    ];
    const { options } = buildOptions(candidate('bon', 'anime'), [...same, ...others], 4);
    expect(options).toHaveLength(4);
    expect(options).toContain('unique-anime');
  });

  it('déduplique les titres identiques du vivier', () => {
    const duplicated = [candidate('meme'), candidate('meme'), candidate('autre')];
    const { options } = buildOptions(candidate('bon'), duplicated, 6);
    expect(options.filter((o) => o === 'meme')).toHaveLength(1);
  });

  it('fonctionne avec un vivier minimal', () => {
    const { options, answerIndex } = buildOptions(candidate('bon'), [candidate('leurre')], 1);
    expect(options).toHaveLength(2);
    expect(options[answerIndex]).toBe('bon');
  });

  it('fonctionne avec un vivier vide', () => {
    const { options, answerIndex } = buildOptions(candidate('bon'), [], 1);
    expect(options).toEqual(['bon']);
    expect(answerIndex).toBe(0);
  });

  it('place la bonne réponse à des positions variées selon la graine', () => {
    const positions = new Set(
      Array.from({ length: 40 }, (_, seed) => buildOptions(candidate('bon'), pool(12), seed).answerIndex),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it('renvoie un index valide dans les bornes', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const { options, answerIndex } = buildOptions(candidate('bon'), pool(10), seed);
      expect(answerIndex).toBeGreaterThanOrEqual(0);
      expect(answerIndex).toBeLessThan(options.length);
    }
  });

  it('reste reproductible pour un joueur qui se reconnecte', () => {
    // Même graine diffusée par l'hôte -> mêmes propositions après reconnexion.
    const avant = buildOptions(candidate('bon'), pool(12), 31_337);
    const apresReconnexion = buildOptions(candidate('bon'), pool(12), 31_337);
    expect(apresReconnexion.options).toEqual(avant.options);
    expect(apresReconnexion.answerIndex).toBe(avant.answerIndex);
  });

  it('n’inclut que des titres du vivier ou la bonne réponse', () => {
    const vivier = pool(8);
    const titres = new Set([...vivier.map((c) => c.title), 'bon']);
    const { options } = buildOptions(candidate('bon'), vivier, 12);
    expect(options.every((o) => titres.has(o))).toBe(true);
  });

  it('construit une manche complète avec une entrée réelle du catalogue', () => {
    const entry = BLINDTEST_ENTRIES_UNIQUE[0];
    const vivier: OptionCandidate[] = BLINDTEST_ENTRIES_UNIQUE.slice(0, 30).map((e) => ({
      title: e.answer,
      category: e.category,
    }));
    const { options, answerIndex } = buildOptions(
      { title: entry.answer, category: entry.category },
      vivier,
      2_024,
    );
    expect(options).toHaveLength(4);
    expect(options[answerIndex]).toBe(entry.answer);
  });
});

// ── 8. File de manches (passage au tour suivant) ───────────────────────────

describe('blindtest — file de manches sans répétition', () => {
  it('constitue une file de la taille demandée', () => {
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(1)).slice(0, BLINDTEST_ROUNDS);
    expect(queue).toHaveLength(BLINDTEST_ROUNDS);
  });

  it('ne pose jamais deux fois la même réponse dans une partie', () => {
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(2)).slice(0, BLINDTEST_ROUNDS);
    expect(new Set(queue.map(entryKey)).size).toBe(queue.length);
  });

  it('donne la même file à tous les joueurs pour une graine', () => {
    const hote = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(4_242)).slice(0, BLINDTEST_ROUNDS);
    const joueur = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(4_242)).slice(0, BLINDTEST_ROUNDS);
    expect(joueur.map(entryKey)).toEqual(hote.map(entryKey));
  });

  it('produit des files différentes selon la graine', () => {
    const a = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(1)).slice(0, BLINDTEST_ROUNDS);
    const b = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(2)).slice(0, BLINDTEST_ROUNDS);
    expect(a.map(entryKey).join()).not.toBe(b.map(entryKey).join());
  });

  it('supporte le plus grand nombre de manches proposé', () => {
    const max = Math.max(...BLINDTEST_ROUND_OPTIONS);
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(3)).slice(0, max);
    expect(queue).toHaveLength(max);
    expect(new Set(queue.map(entryKey)).size).toBe(max);
  });

  it('permet d’exclure les titres récemment joués', () => {
    const recent = new Set(BLINDTEST_ENTRIES_UNIQUE.slice(0, 5).map(entryKey));
    const fresh = BLINDTEST_ENTRIES_UNIQUE.filter((e) => !recent.has(entryKey(e)));
    expect(fresh.length).toBe(BLINDTEST_ENTRIES_UNIQUE.length - 5);
    expect(fresh.some((e) => recent.has(entryKey(e)))).toBe(false);
  });

  it('garde assez de titres frais pour une partie après exclusion', () => {
    const recent = new Set(BLINDTEST_ENTRIES_UNIQUE.slice(0, 50).map(entryKey));
    const fresh = BLINDTEST_ENTRIES_UNIQUE.filter((e) => !recent.has(entryKey(e)));
    expect(fresh.length).toBeGreaterThanOrEqual(BLINDTEST_ROUNDS);
  });

  it('avance de manche en manche jusqu’à la fin', () => {
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(8)).slice(0, BLINDTEST_ROUNDS);
    let index = 0;
    const seen: string[] = [];
    while (index < queue.length) {
      seen.push(entryKey(queue[index]));
      index += 1;
    }
    expect(seen).toHaveLength(BLINDTEST_ROUNDS);
    expect(index).toBe(BLINDTEST_ROUNDS);
  });

  it('associe une graine de propositions distincte à chaque manche', () => {
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(9)).slice(0, BLINDTEST_ROUNDS);
    const vivier: OptionCandidate[] = BLINDTEST_ENTRIES_UNIQUE.slice(0, 40).map((e) => ({
      title: e.answer,
      category: e.category,
    }));
    const signatures = queue.map((entry, roundIndex) =>
      buildOptions({ title: entry.answer, category: entry.category }, vivier, roundIndex + 1)
        .options.join('|'),
    );
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('reconstruit la manche courante après reconnexion', () => {
    const queue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(1_234)).slice(0, BLINDTEST_ROUNDS);
    const roundIndex = 4;
    const entry = queue[roundIndex];
    const requeue = shuffle(BLINDTEST_ENTRIES_UNIQUE, mulberry(1_234)).slice(0, BLINDTEST_ROUNDS);
    expect(entryKey(requeue[roundIndex])).toBe(entryKey(entry));
  });
});
