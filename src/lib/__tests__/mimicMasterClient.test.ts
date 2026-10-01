import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
import { castMimicMaster, readMimicMasters } from '../mimicMasterClient';
beforeEach(() => { vi.resetAllMocks(); });
describe('Mimic Master SQL adapter', () => {
  it('maps persisted choices including both duo identities', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ voter_player_id: 'a', target_player_ids: ['c', 'd'], target_team_number: 2, voter_team_number: 1 }], error: null });
    const result = await readMimicMasters('lobby', 3, 'a');
    expect(result).toEqual({ available: true, choices: [{ voterPlayerId: 'a', targetPlayerIds: ['c', 'd'], targetTeamNumber: 2, voterTeamNumber: 1 }] });
  });
  it('distinguishes a missing migration from a real network failure', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    expect((await readMimicMasters('lobby', 3, 'a')).available).toBe(false);
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'Connection lost' } });
    await expect(readMimicMasters('lobby', 3, 'a')).rejects.toMatchObject({ code: '08006' });
  });
  it('passes the current session and index, and honors a server refusal', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await castMimicMaster({ lobbyId: 'lobby', roundNumber: 3, playerId: 'a', targetIds: ['b'], sessionId: 'session', expectedIndex: 2 })).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('cast_mimic_master', { p_lobby_id: 'lobby', p_round_number: 3, p_voter_player_id: 'a', p_target_player_ids: ['b'], p_session_id: 'session', p_expected_index: 2 });
  });
  it('never substitutes an insecure table or local-storage write for a missing RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(castMimicMaster({ lobbyId: 'lobby', roundNumber: 3, playerId: 'a', targetIds: ['b'], sessionId: 'session', expectedIndex: 2 })).rejects.toMatchObject({ code: 'PGRST202' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
