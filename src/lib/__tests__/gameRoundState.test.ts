import { describe, expect, it } from 'vitest';
import {
  GAME_PHASES,
  canCommitRoundSnapshot,
  getRenderableGamePhase,
  getRoundReconciliationMode,
  isAllowedGamePhaseTransition,
  parseDurableGameRound,
  shouldInvalidateRoundRetry,
  type GamePhase,
} from '@/lib/gameRoundState';

const makeRow = (phase: GamePhase = 'preview') => ({
  id: 'round-1',
  lobby_id: 'lobby-1',
  current_challenge_id: 'clip-1',
  challenge_player_id: 'player-1',
  created_at: '2026-08-18T20:00:00.000Z',
  round_number: 1,
  phase,
});

describe('durable game-round phase guard', () => {
  it.each(GAME_PHASES)('accepts the SQL phase %s', (phase) => {
    expect(parseDurableGameRound(makeRow(phase))?.phase).toBe(phase);
  });

  it('rejects an unknown phase instead of casting it into the UI state', () => {
    expect(parseDurableGameRound({ ...makeRow(), phase: 'upload' })).toBeNull();
  });

  it('rejects a broadcast-like payload that is not a durable SQL row', () => {
    expect(parseDurableGameRound({ phase: 'imitation', round: 1 })).toBeNull();
  });

  it('does not render any phase while synchronization is uncertain', () => {
    const round = parseDurableGameRound(makeRow('imitation'));
    expect(getRenderableGamePhase(round, false)).toBeNull();
    expect(getRenderableGamePhase(null, true)).toBeNull();
  });

  it('renders exactly the synchronized durable phase', () => {
    const round = parseDurableGameRound(makeRow('voting'));
    expect(getRenderableGamePhase(round, true)).toBe('voting');
  });
});

describe('durable game-round transitions', () => {
  it.each([
    ['preview', 'imitation'],
    ['imitation', 'voting'],
    ['voting', 'results'],
  ] as const)('allows %s -> %s', (current, next) => {
    expect(isAllowedGamePhaseTransition(current, next)).toBe(true);
  });

  it.each([
    ['preview', 'voting'],
    ['imitation', 'results'],
    ['voting', 'imitation'],
    ['results', 'preview'],
  ] as const)('rejects %s -> %s', (current, next) => {
    expect(isAllowedGamePhaseTransition(current, next)).toBe(false);
  });
});

describe('realtime reconciliation hints', () => {
  const current = parseDurableGameRound({
    ...makeRow('imitation'),
    id: 'round-2',
    round_number: 2,
  });

  it('ignores delayed events from an older round', () => {
    expect(getRoundReconciliationMode(current, {
      roundNumber: 1,
      phase: 'results',
      roundId: 'round-1',
    })).toBe('ignore');
  });

  it('reconciles an unchanged current phase without destructive invalidation', () => {
    expect(getRoundReconciliationMode(current, {
      roundNumber: 2,
      phase: 'imitation',
      roundId: 'round-2',
      challengeId: 'clip-1',
    })).toBe('background');
  });

  it('invalidates before reading a possible current phase change', () => {
    expect(getRoundReconciliationMode(current, {
      roundNumber: 2,
      phase: 'voting',
      roundId: 'round-2',
    })).toBe('invalidate');
  });

  it('invalidates when a newer round is announced', () => {
    expect(getRoundReconciliationMode(current, {
      roundNumber: 3,
      phase: 'preview',
      roundId: 'round-3',
    })).toBe('invalidate');
  });

  it('invalidates a conflicting row id for the current round', () => {
    expect(getRoundReconciliationMode(current, {
      roundNumber: 2,
      phase: 'imitation',
      roundId: 'replacement-round',
    })).toBe('invalidate');
  });
});

describe('same-round stale phase hints', () => {
  it('checks a backwards phase hint in the background without remounting', () => {
    const current = parseDurableGameRound({
      ...makeRow('results'),
      id: 'round-2',
      round_number: 2,
    });
    expect(getRoundReconciliationMode(current, {
      roundNumber: 2,
      phase: 'imitation',
      roundId: 'round-2',
    })).toBe('background');
  });
});

describe('reconciliation subscription epoch', () => {
  const token = { requestId: 4, channelEpoch: 2 };

  it('commits only the latest request from the active subscribed epoch', () => {
    expect(canCommitRoundSnapshot(token, 4, 2, true)).toBe(true);
    expect(canCommitRoundSnapshot(token, 5, 2, true)).toBe(false);
    expect(canCommitRoundSnapshot(token, 4, 3, true)).toBe(false);
    expect(canCommitRoundSnapshot(token, 4, 2, false)).toBe(false);
  });

  it('keeps a background retry non-destructive while SQL realtime is healthy', () => {
    expect(shouldInvalidateRoundRetry(false, true, true)).toBe(false);
  });

  it('makes a retry destructive after prior invalidation or channel loss', () => {
    expect(shouldInvalidateRoundRetry(true, true, true)).toBe(true);
    expect(shouldInvalidateRoundRetry(false, false, true)).toBe(true);
    expect(shouldInvalidateRoundRetry(false, true, false)).toBe(true);
  });
});
