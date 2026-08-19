import { describe, expect, it } from 'vitest';
import {
  canCommitVotingSession,
  expectedPlaybackPositionMs,
  localPlaybackStartMs,
  parseVotingSessionSnapshot,
  type VotingSessionSnapshot,
} from '@/lib/votingSessionState';

const guard = { lobbyId: 'lobby-1', roundNumber: 2, gameRoundId: 'round-2' };

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  session_id: 'session-1',
  game_round_id: 'round-2',
  lobby_id: 'lobby-1',
  round_number: 2,
  current_imitation_index: 1,
  is_playing: false,
  playback_started_at: null,
  playback_position_ms: 0,
  version: 5,
  updated_at: '2026-08-19T10:00:00.000Z',
  server_now: '2026-08-19T10:00:00.000Z',
  ...overrides,
});

describe('voting session SQL boundary', () => {
  it('accepts a well-formed durable row', () => {
    const snapshot = parseVotingSessionSnapshot(makeRow(), guard, 1_000, 1_100);
    expect(snapshot?.id).toBe('session-1');
    expect(snapshot?.version).toBe(5);
  });

  it('rejects a row belonging to another round', () => {
    expect(parseVotingSessionSnapshot(makeRow({ round_number: 3 }), guard, 0, 0)).toBeNull();
  });

  it('rejects a row belonging to another lobby', () => {
    expect(parseVotingSessionSnapshot(makeRow({ lobby_id: 'lobby-9' }), guard, 0, 0)).toBeNull();
  });

  it('rejects a row attached to a replaced durable round', () => {
    expect(parseVotingSessionSnapshot(
      makeRow({ game_round_id: 'round-replaced' }),
      guard,
      0,
      0,
    )).toBeNull();
  });

  it('rejects a broadcast-like payload without the server clock', () => {
    expect(parseVotingSessionSnapshot(
      makeRow({ server_now: undefined }),
      guard,
      0,
      0,
    )).toBeNull();
  });

  it('rejects playing state that carries no playback anchor', () => {
    expect(parseVotingSessionSnapshot(
      makeRow({ is_playing: true, playback_started_at: null }),
      guard,
      0,
      0,
    )).toBeNull();
  });

  it('rejects a negative index or position', () => {
    expect(parseVotingSessionSnapshot(makeRow({ current_imitation_index: -1 }), guard, 0, 0)).toBeNull();
    expect(parseVotingSessionSnapshot(makeRow({ playback_position_ms: -20 }), guard, 0, 0)).toBeNull();
  });

  it('estimates the server offset from the request midpoint', () => {
    const serverNow = Date.parse('2026-08-19T10:00:00.000Z');
    // Client clock is 60 s behind; the round trip took 200 ms.
    const requestStartedAt = serverNow - 60_000;
    const responseReceivedAt = requestStartedAt + 200;
    const snapshot = parseVotingSessionSnapshot(
      makeRow(),
      guard,
      requestStartedAt,
      responseReceivedAt,
    );
    expect(snapshot?.serverOffsetMs).toBeCloseTo(59_900, -2);
  });
});

describe('server-anchored playback position', () => {
  const base: VotingSessionSnapshot = {
    id: 'session-1',
    gameRoundId: 'round-2',
    lobbyId: 'lobby-1',
    roundNumber: 2,
    currentIndex: 0,
    isPlaying: true,
    playbackStartedAt: '2026-08-19T10:00:00.000Z',
    playbackPositionMs: 4_000,
    version: 5,
    updatedAt: '2026-08-19T10:00:00.000Z',
    serverOffsetMs: 0,
  };

  it('adds the elapsed server time to the stored position', () => {
    const serverNow = Date.parse('2026-08-19T10:00:03.000Z');
    expect(expectedPlaybackPositionMs(base, serverNow)).toBe(7_000);
  });

  it('keeps the stored position while paused', () => {
    const paused = { ...base, isPlaying: false, playbackStartedAt: null };
    expect(expectedPlaybackPositionMs(paused, Date.now())).toBe(4_000);
  });

  it('never returns a position before the anchor when the start is in the future', () => {
    const serverNow = Date.parse('2026-08-19T09:59:58.000Z');
    expect(expectedPlaybackPositionMs(base, serverNow)).toBe(4_000);
  });

  it('gives two skewed clients the same media position for one snapshot', () => {
    const serverNow = Date.parse('2026-08-19T10:00:05.000Z');
    // Same server truth, two devices whose clocks differ by five minutes.
    const ahead = { ...base, serverOffsetMs: -300_000 };
    const behind = { ...base, serverOffsetMs: 300_000 };
    const aheadClientNow = serverNow - ahead.serverOffsetMs;
    const behindClientNow = serverNow - behind.serverOffsetMs;

    expect(expectedPlaybackPositionMs(ahead, aheadClientNow + ahead.serverOffsetMs))
      .toBe(expectedPlaybackPositionMs(behind, behindClientNow + behind.serverOffsetMs));
  });

  it('translates the server anchor into this clock for the countdown', () => {
    const skewed = { ...base, serverOffsetMs: 120_000 };
    const expected = Date.parse(base.playbackStartedAt as string) - 120_000;
    expect(localPlaybackStartMs(skewed)).toBe(expected);
  });
});

describe('voting session commit guard', () => {
  const token = { generation: 2, requestId: 4, channelEpoch: 6 };

  it('commits the newest request of the subscribed epoch', () => {
    expect(canCommitVotingSession(token, 2, 4, 6, true)).toBe(true);
  });

  it('discards a response that arrives after the channel was lost', () => {
    expect(canCommitVotingSession(token, 2, 4, 6, false)).toBe(false);
  });

  it('discards a response from a previous subscription epoch', () => {
    expect(canCommitVotingSession(token, 2, 4, 7, true)).toBe(false);
  });

  it('discards a response overtaken by a newer request', () => {
    expect(canCommitVotingSession(token, 2, 5, 6, true)).toBe(false);
  });
});
