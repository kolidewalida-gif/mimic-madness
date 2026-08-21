/**
 * Journal de diagnostic embarqué.
 *
 * Motivation concrète : plusieurs écrans peuvent rester bloqués sur une attente
 * sans qu'aucune erreur n'apparaisse ni côté serveur ni dans la console. Les
 * logs Supabase, eux, montrent bien que le client n'envoie plus rien — mais ils
 * ne disent pas pourquoi. Il manquait la moitié de l'histoire, celle du
 * navigateur.
 *
 * Ce journal enregistre les étapes de synchronisation dans un tampon borné,
 * consultable à l'écran par un administrateur et copiable d'un clic. Il double
 * chaque entrée dans la console avec un préfixe stable, pour qu'un simple
 * copier-coller suffise à diagnostiquer.
 *
 * Contraintes tenues :
 *   * tampon borné, pour ne jamais faire grossir la mémoire d'une partie ;
 *   * aucune donnée sensible : identifiants de lobby et de manche seulement ;
 *   * coût nul quand personne n'écoute, en dehors de l'écriture en anneau.
 */

export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface DiagnosticEntry {
  /** Horodatage client, en millisecondes. */
  at: number;
  level: DiagnosticLevel;
  /** Domaine fonctionnel : `voting`, `imitation`, `recorder`, `lobby`… */
  scope: string;
  message: string;
  /** Détails sérialisables. Volontairement peu profonds. */
  data?: Record<string, unknown>;
}

/** Au-delà, les entrées les plus anciennes sont oubliées. */
const MAX_ENTRIES = 300;

const entries: DiagnosticEntry[] = [];
const listeners = new Set<(snapshot: DiagnosticEntry[]) => void>();

/** Réduit une valeur à quelque chose de lisible et court dans un journal. */
const summarize = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (Array.isArray(value)) return value.length <= 8 ? value.map(summarize) : `[${value.length} éléments]`;
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    // Récursion sur TOUTES les valeurs, pas seulement les objets imbriqués :
    // sinon une longue chaîne ou une erreur nichée échappait au résumé.
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = summarize(nested);
    }
    return output;
  }
  return String(value);
};

const notify = () => {
  if (listeners.size === 0) return;
  const snapshot = [...entries];
  for (const listener of listeners) listener(snapshot);
};

export const logDiagnostic = (
  level: DiagnosticLevel,
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): void => {
  const entry: DiagnosticEntry = {
    at: Date.now(),
    level,
    scope,
    message,
    data: data ? (summarize(data) as Record<string, unknown>) : undefined,
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);

  // Miroir console : c'est ce qui rend le journal utilisable sans ouvrir le
  // panneau, et copiable depuis n'importe quel navigateur.
  const prefix = `[mimic:${scope}]`;
  const payload = entry.data ? [prefix, message, entry.data] : [prefix, message];
  if (level === 'error') console.error(...payload);
  else if (level === 'warn') console.warn(...payload);
  else console.info(...payload);

  notify();
};

export const diagnose = {
  info: (scope: string, message: string, data?: Record<string, unknown>) =>
    logDiagnostic('info', scope, message, data),
  warn: (scope: string, message: string, data?: Record<string, unknown>) =>
    logDiagnostic('warn', scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) =>
    logDiagnostic('error', scope, message, data),
};

export const getDiagnostics = (): DiagnosticEntry[] => [...entries];

export const clearDiagnostics = (): void => {
  entries.length = 0;
  notify();
};

export const subscribeDiagnostics = (
  listener: (snapshot: DiagnosticEntry[]) => void,
): (() => void) => {
  listeners.add(listener);
  listener([...entries]);
  return () => {
    listeners.delete(listener);
  };
};

/** Rend le journal lisible d'un coup, pour un copier-coller vers un ticket. */
export const formatDiagnostics = (snapshot = entries): string => {
  const lines = snapshot.map((entry) => {
    const time = new Date(entry.at).toISOString().slice(11, 23);
    const details = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${time} ${entry.level.toUpperCase().padEnd(5)} [${entry.scope}] ${entry.message}${details}`;
  });

  // L'environnement compte autant que les événements : sans lui, impossible de
  // distinguer un blocage réseau d'une régression de code.
  const header = [
    `# Diagnostic Mimic Master — ${new Date().toISOString()}`,
    `# URL       : ${typeof location !== 'undefined' ? location.href : 'inconnue'}`,
    `# Navigateur: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'inconnu'}`,
    `# En ligne  : ${typeof navigator !== 'undefined' ? navigator.onLine : 'inconnu'}`,
    `# Entrées   : ${snapshot.length}`,
    '',
  ];

  return [...header, ...lines].join('\n');
};

/**
 * Point d'entrée console : `__mimic.dump()` recopie le journal, `__mimic.clear()`
 * le vide. Évite d'avoir à ouvrir le panneau pour récupérer une trace.
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__mimic = {
    dump: () => formatDiagnostics(),
    entries: getDiagnostics,
    clear: clearDiagnostics,
  };
}
