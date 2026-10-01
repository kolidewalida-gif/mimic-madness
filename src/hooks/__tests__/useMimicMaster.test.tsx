import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MimicMasterChoice } from '@/lib/mimicMaster';

const mocks = vi.hoisted(() => ({ read: vi.fn(), cast: vi.fn() }));
vi.mock('@/lib/mimicMasterClient', () => ({ readMimicMasters: mocks.read, castMimicMaster: mocks.cast }));
import { useMimicMaster } from '../useMimicMaster';
const saved: MimicMasterChoice = { voterPlayerId: 'a', targetPlayerIds: ['b'], targetTeamNumber: null, voterTeamNumber: null };
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({ available: true, choices: [] });
});

describe('Mimic Master recovery and single-choice lock', () => {
  it('restores a saved choice on mount and refuses another award', async () => {
    mocks.read.mockResolvedValue({ available: true, choices: [saved] });
    const { result } = renderHook(() => useMimicMaster('lobby', 1, 'a'));
    await waitFor(() => expect(result.current.choice).toEqual(saved));
    await act(async () => { expect(await result.current.choose(['c'], 'session', 2)).toBe(false); });
    expect(mocks.cast).not.toHaveBeenCalled();
  });
  it('blocks a double click synchronously and certifies the saved choice after a write', async () => {
    let finish: (value: boolean) => void;
    mocks.cast.mockImplementation(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useMimicMaster('lobby', 1, 'a'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let first: Promise<boolean>;
    await act(async () => {
      first = result.current.choose(['b'], 'session', 1);
      expect(await result.current.choose(['c'], 'session', 1)).toBe(false);
    });
    expect(mocks.cast).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);
    mocks.read.mockResolvedValue({ available: true, choices: [saved] });
    await act(async () => { finish!(true); expect(await first!).toBe(true); });
    expect(result.current.choice).toEqual(saved);
    expect(result.current.pending).toBe(false);
  });
  it('recovers a committed choice even when the write response was lost', async () => {
    const { result } = renderHook(() => useMimicMaster('lobby', 1, 'a'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    mocks.cast.mockRejectedValue(new Error('Network interrupted after commit'));
    mocks.read.mockResolvedValue({ available: true, choices: [saved] });
    await act(async () => { await expect(result.current.choose(['b'], 'session', 1)).rejects.toThrow('Network'); });
    expect(result.current.choice).toEqual(saved);
    expect(result.current.pending).toBe(false);
  });
  it('does not carry an award into another round or apply a late old snapshot', async () => {
    let finishOld: (value: unknown) => void;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const { result, rerender } = renderHook(({ round }) => useMimicMaster('lobby', round, 'a'), { initialProps: { round: 1 } });
    rerender({ round: 2 });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => { finishOld!({ available: true, choices: [saved] }); });
    expect(result.current.choice).toBeNull();
  });
  it('fails visibly when offline and recovers after an explicit retry', async () => {
    mocks.read.mockRejectedValueOnce(new Error('Offline'));
    const { result } = renderHook(() => useMimicMaster('lobby', 1, 'a'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    await act(async () => { await result.current.retry(); });
    expect(result.current.status).toBe('ready');
  });
  it('never enables local-only awards without the migration', async () => {
    mocks.read.mockResolvedValue({ available: false, choices: [] });
    const { result } = renderHook(() => useMimicMaster('lobby', 1, 'a'));
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    await act(async () => { expect(await result.current.choose(['b'], 'session', 1)).toBe(false); });
    expect(mocks.cast).not.toHaveBeenCalled();
  });
});
