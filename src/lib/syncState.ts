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
