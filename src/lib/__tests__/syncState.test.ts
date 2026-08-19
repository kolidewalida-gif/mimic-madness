import { describe, expect, it } from 'vitest';
import {
  canCommitSyncToken,
  deriveConnectionState,
  equalJitterBackoff,
} from '@/lib/syncState';

describe('transport versus snapshot certainty', () => {
  it('never reports online on a live socket whose SQL reads have not succeeded', () => {
    expect(deriveConnectionState('connected', 'syncing')).toBe('reconnecting');
    expect(deriveConnectionState('connected', 'error')).toBe('reconnecting');
    expect(deriveConnectionState('connected', 'idle')).toBe('reconnecting');
  });

  it('reports online only for a connected transport with a certified snapshot', () => {
    expect(deriveConnectionState('connected', 'synchronized')).toBe('online');
  });

  it('keeps offline authoritative even when a stale snapshot is still held', () => {
    expect(deriveConnectionState('offline', 'synchronized')).toBe('offline');
  });

  it('reports reconnecting while the socket is still being established', () => {
    expect(deriveConnectionState('connecting', 'synchronized')).toBe('reconnecting');
  });
});

describe('snapshot commit tokens', () => {
  const token = { generation: 3, requestId: 7 };

  it('commits only the newest request of the active generation', () => {
    expect(canCommitSyncToken(token, 3, 7)).toBe(true);
  });

  it('rejects a response overtaken by a newer request', () => {
    expect(canCommitSyncToken(token, 3, 8)).toBe(false);
  });

  it('rejects a response from a previous connection generation', () => {
    expect(canCommitSyncToken(token, 4, 7)).toBe(false);
  });
});

describe('reconnection backoff', () => {
  it('grows exponentially and stays inside the equal-jitter window', () => {
    for (const attempt of [0, 1, 2, 3]) {
      const cap = 1_000 * 2 ** attempt;
      expect(equalJitterBackoff(attempt, 1_000, 15_000, () => 0)).toBe(cap / 2);
      expect(equalJitterBackoff(attempt, 1_000, 15_000, () => 1)).toBe(cap);
    }
  });

  it('never exceeds the cap for a long outage', () => {
    expect(equalJitterBackoff(20, 1_000, 15_000, () => 1)).toBe(15_000);
    expect(equalJitterBackoff(20, 1_000, 15_000, () => 0)).toBe(7_500);
  });

  it('spreads clients instead of retrying at one identical instant', () => {
    const first = equalJitterBackoff(4, 1_000, 15_000, () => 0.1);
    const second = equalJitterBackoff(4, 1_000, 15_000, () => 0.9);
    expect(first).not.toBe(second);
  });

  it('tolerates a negative or fractional attempt count', () => {
    expect(equalJitterBackoff(-3, 1_000, 15_000, () => 0)).toBe(500);
  });
});
