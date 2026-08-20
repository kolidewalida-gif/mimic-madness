/**
 * Limiteur de concurrence.
 *
 * Le navigateur ne garde qu'une poignée de connexions simultanées par domaine.
 * Lancer d'un coup autant de requêtes qu'il y a de clips remplissait cette file
 * d'attente : les requêtes de jeu (lecture du salon, soumission) restaient
 * bloquées derrière et finissaient par expirer sans jamais atteindre le serveur.
 * Traiter par petits lots laisse toujours des connexions disponibles.
 */

/** Nombre de requêtes simultanées par défaut : assez rapide, sans saturer. */
export const DEFAULT_CONCURRENCY = 3;

/**
 * `Promise.all` avec un plafond de tâches simultanées.
 *
 * Les résultats gardent l'ordre des éléments d'entrée. Une tâche qui échoue
 * rejette l'ensemble, comme `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const total = items.length;
  if (total === 0) return [];

  const effectiveLimit = Math.max(1, Math.min(Math.floor(limit) || 1, total));
  const results = new Array<R>(total);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= total) return;
      results[index] = await task(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: effectiveLimit }, () => worker()));
  return results;
}
