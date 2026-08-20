export type TransportState = 'offline' | 'connecting' | 'connected';
export type SnapshotState = 'idle' | 'syncing' | 'synchronized' | 'error';
export type ConnectionState = 'offline' | 'reconnecting' | 'online';

export interface SyncToken {
  generation: number;
  requestId: number;
}

/** Transport connectivity and SQL certainty are deliberately separate. */
export const deriveConnectionState = (
  transport: TransportState,
  snapshot: SnapshotState,
): ConnectionState => {
  if (transport === 'offline') return 'offline';
  return transport === 'connected' && snapshot === 'synchronized'
    ? 'online'
    : 'reconnecting';
};

/**
 * Faut-il signaler une resynchronisation à l'écran ?
 *
 * Une relecture de fond (battement de cœur toutes les 15 s, signal realtime
 * d'un autre joueur) repassait l'état en `syncing`, ce que
 * `deriveConnectionState` traduit par `reconnecting` : le bandeau
 * « Reconnexion… » clignotait donc en permanence alors que la connexion était
 * parfaitement saine, ce qui donnait l'impression d'une instabilité inexistante.
 *
 * On ne l'affiche donc que quand il y a une vraie incertitude : premier
 * chargement, ou état déjà dégradé. Un échec de lecture repasse de son côté en
 * `error`, ce qui affiche bien « Reconnexion… ».
 */
export const shouldReportSyncing = (
  currentSnapshot: SnapshotState,
  hasSnapshotData: boolean,
): boolean => !(currentSnapshot === 'synchronized' && hasSnapshotData);

/** Reject both an old subscription generation and an older request in it. */
export const canCommitSyncToken = (
  token: SyncToken,
  activeGeneration: number,
  latestRequestId: number,
): boolean =>
  token.generation === activeGeneration && token.requestId === latestRequestId;

/** Equal-jitter exponential backoff avoids reconnecting every client at once. */
export const equalJitterBackoff = (
  attempt: number,
  baseMs = 1_000,
  maxMs = 15_000,
  random: () => number = Math.random,
): number => {
  const exponent = Math.max(0, Math.floor(attempt));
  const cap = Math.min(maxMs, baseMs * (2 ** exponent));
  const sample = Math.max(0, Math.min(1, random()));
  return Math.round(cap / 2 + sample * cap / 2);
};
