import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));

import {
  castImitationVote,
  isSchemaGapError,
  mutateVotingSession,
  readVotingSession,
  submitPlayerImitation,
} from '@/lib/imitationSyncClient';

const missingFunction = { code: 'PGRST202', message: 'function does not exist' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('schema gap detection', () => {
  it('recognises a function or column that is not deployed yet', () => {
    expect(isSchemaGapError(missingFunction)).toBe(true);
    expect(isSchemaGapError({ code: '42883' })).toBe(true);
    expect(isSchemaGapError({ message: 'Could not find the function in the schema cache' }))
      .toBe(true);
  });

  it('does not mistake a real failure for a missing migration', () => {
    expect(isSchemaGapError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isSchemaGapError(new Error('network unreachable'))).toBe(false);
    expect(isSchemaGapError(null)).toBe(false);
  });
});

describe('voting session reads', () => {
  it('uses the authoritative RPC snapshot when available', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ session_id: 'session-1', version: 3, server_now: '2026-08-19T10:00:00.000Z' }],
      error: null,
    });

    const read = await readVotingSession('lobby-1', 2);
    expect(read.degraded).toBe(false);
    expect(read.row?.session_id).toBe('session-1');
  });

  it('falls back to the table and flags the weaker guarantee', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: missingFunction });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'session-legacy',
          lobby_id: 'lobby-1',
          round_number: 2,
          current_imitation_index: 1,
          is_playing: true,
          updated_at: '2026-08-19T10:00:00.000Z',
        },
        error: null,
      }),
    };
    mocks.from.mockReturnValue(query);

    const read = await readVotingSession('lobby-1', 2);
    expect(read.degraded).toBe(true);
    expect(read.row).toMatchObject({
      session_id: 'session-legacy',
      version: 0,
      // updated_at doubles as the shared anchor on the legacy schema.
      playback_started_at: '2026-08-19T10:00:00.000Z',
    });
  });

  it('propagates a genuine read failure instead of degrading silently', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection lost' } });
    await expect(readVotingSession('lobby-1', 2)).rejects.toMatchObject({ code: '08006' });
  });
});

describe('voting session mutation', () => {
  it('returns false when the compare-and-set lost the race', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(mutateVotingSession('session-1', 4, 2, 'advance')).resolves.toBe(false);
  });

  it('passes the expected version and index to the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await mutateVotingSession('session-1', 4, 2, 'start', 3_500);

    expect(mocks.rpc).toHaveBeenCalledWith('mutate_voting_session', {
      p_session_id: 'session-1',
      p_expected_version: 4,
      p_expected_index: 2,
      p_action: 'start',
      p_countdown_ms: 3_500,
    });
  });

  it('still guards on the index when the RPC is not deployed', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: missingFunction });
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);

    await expect(mutateVotingSession('session-1', 0, 2, 'advance')).resolves.toBe(false);
    expect(query.eq).toHaveBeenCalledWith('current_imitation_index', 2);
  });
});

describe('vote casting', () => {
  it('reports an already-recorded vote as not inserted', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(castImitationVote('lobby-1', 2, 'voter', ['target'], 'like'))
      .resolves.toBe(false);
  });

  it('treats a unique violation on the legacy path as an existing vote', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: missingFunction });
    mocks.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
    });

    await expect(castImitationVote('lobby-1', 2, 'voter', ['target'], 'like'))
      .resolves.toBe(false);
  });

  it('writes one row per team target in a single statement', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: missingFunction });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert });

    await expect(castImitationVote('lobby-1', 2, 'voter', ['a', 'b'], 'dislike'))
      .resolves.toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toHaveLength(2);
  });
});

describe('imitation submission', () => {
  it('sends the recorded clip id to the durable RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(submitPlayerImitation({
      lobbyId: 'lobby-1',
      roundNumber: 2,
      playerId: 'player-1',
      playerName: 'Alex',
      clipId: 'clip-9',
      includeOriginalAudio: false,
      originalAudioVolume: 50,
    })).resolves.toBe(true);

    expect(mocks.rpc).toHaveBeenCalledWith(
      'submit_player_imitation',
      expect.objectContaining({ p_clip_id: 'clip-9' }),
    );
  });

  it('reports refusal when the round already moved on', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(submitPlayerImitation({
      lobbyId: 'lobby-1',
      roundNumber: 2,
      playerId: 'player-1',
      playerName: 'Alex',
      clipId: 'clip-9',
      includeOriginalAudio: false,
      originalAudioVolume: 50,
    })).resolves.toBe(false);
  });
});
