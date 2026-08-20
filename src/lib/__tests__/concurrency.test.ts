/**
 * Limiteur de concurrence — garde-fou contre la saturation des connexions.
 *
 * Lancer une requête par clip d'un seul coup remplissait la file d'attente du
 * navigateur : les requêtes de jeu restaient bloquées derrière et expiraient.
 * Ces tests verrouillent le plafond et la préservation de l'ordre.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONCURRENCY, mapWithConcurrency } from '@/lib/concurrency';

/** Tâche qui mesure le pic de parallélisme réellement atteint. */
const makeTracker = () => {
  const state = { active: 0, peak: 0 };
  const run = async <T>(value: T, delayMs = 0): Promise<T> => {
    state.active += 1;
    state.peak = Math.max(state.peak, state.active);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    state.active -= 1;
    return value;
  };
  return { state, run };
};

describe('mapWithConcurrency', () => {
  it('propose un plafond par défaut raisonnable', () => {
    expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
    expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(6);
  });

  it('renvoie un tableau vide sans élément', async () => {
    await expect(mapWithConcurrency([], 3, async (x) => x)).resolves.toEqual([]);
  });

  it('applique la tâche à chaque élément', async () => {
    await expect(mapWithConcurrency([1, 2, 3], 2, async (n) => n * 2)).resolves.toEqual([2, 4, 6]);
  });

  it('préserve l’ordre d’entrée malgré des durées inégales', async () => {
    const result = await mapWithConcurrency([30, 10, 20, 0], 2, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return index;
    });
    expect(result).toEqual([0, 1, 2, 3]);
  });

  it('ne dépasse jamais le plafond demandé', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 3, (n) => run(n, 5));
    expect(state.peak).toBeLessThanOrEqual(3);
  });

  it('atteint effectivement le plafond quand il y a assez de travail', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency(Array.from({ length: 9 }, (_, i) => i), 3, (n) => run(n, 5));
    expect(state.peak).toBe(3);
  });

  it('sérialise complètement avec un plafond de un', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency([1, 2, 3, 4], 1, (n) => run(n, 2));
    expect(state.peak).toBe(1);
  });

  it('ne lance pas plus de tâches que d’éléments', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency([1, 2], 10, (n) => run(n, 5));
    expect(state.peak).toBeLessThanOrEqual(2);
  });

  it('traite un plafond nul comme un traitement séquentiel', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency([1, 2, 3], 0, (n) => run(n, 2));
    expect(state.peak).toBe(1);
  });

  it('traite un plafond négatif comme un traitement séquentiel', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency([1, 2, 3], -5, (n) => run(n, 2));
    expect(state.peak).toBe(1);
  });

  it('tronque un plafond décimal', async () => {
    const { state, run } = makeTracker();
    await mapWithConcurrency(Array.from({ length: 8 }, (_, i) => i), 2.9, (n) => run(n, 4));
    expect(state.peak).toBeLessThanOrEqual(2);
  });

  it('transmet l’index à la tâche', async () => {
    await expect(
      mapWithConcurrency(['a', 'b', 'c'], 2, async (value, index) => `${index}:${value}`),
    ).resolves.toEqual(['0:a', '1:b', '2:c']);
  });

  it('visite chaque élément exactement une fois', async () => {
    const seen: number[] = [];
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async (n) => {
      seen.push(n);
      return n;
    });
    expect(seen).toHaveLength(20);
    expect(new Set(seen).size).toBe(20);
  });

  it('rejette si une tâche échoue', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('échec');
        return n;
      }),
    ).rejects.toThrow('échec');
  });

  it('supporte une liste plus longue que le plafond sans perdre de résultat', async () => {
    const result = await mapWithConcurrency(
      Array.from({ length: 25 }, (_, i) => i),
      DEFAULT_CONCURRENCY,
      async (n) => n,
    );
    expect(result).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });
});
