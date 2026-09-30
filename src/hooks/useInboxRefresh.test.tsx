// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeInbox } from './useInboxRefresh';
import { mergeDirectMessages, useDirectMessages, type DirectMessage } from './useDirectMessages';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), auth: vi.fn(), remove: vi.fn(), channel: vi.fn(),
  broadcast: null as null | (() => void), status: null as null | ((status: string) => void),
}));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 'self' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  realtime: { setAuth: mocks.auth }, removeChannel: mocks.remove,
  channel: (...args: unknown[]) => {
    mocks.channel(...args);
    const channel = { on: vi.fn((_event, _filter, callback) => { mocks.broadcast = callback; return channel; }), subscribe: vi.fn(callback => { mocks.status = callback; return channel; }) };
    return channel;
  },
  from: () => {
    const query = { then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) => mocks.fetch().then(resolve, reject) } as Record<string, unknown>;
    for (const method of ['select', 'order', 'limit', 'or', 'insert', 'single', 'update', 'is', 'eq', 'lte']) query[method] = () => query;
    return query;
  },
} }));
const row = (id: string, sender = 'luna'): DirectMessage => ({ id, sender_id: sender, receiver_id: 'self', content: id, created_at: `2026-09-30T20:00:0${id}.000Z`, read_at: null });
const stops: (() => void)[] = [];
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(undefined); mocks.fetch.mockResolvedValue({ data: [], error: null }); mocks.broadcast = null; mocks.status = null; });
afterEach(() => { cleanup(); stops.splice(0).forEach(stop => stop()); vi.useRealTimers(); });

describe('Private inbox transport', () => {
  it('shares one private channel and fans out instant invalidations', async () => {
    const first = vi.fn(); const second = vi.fn();
    stops.push(subscribeInbox('self', first), subscribeInbox('self', second));
    await Promise.resolve();
    expect(mocks.channel).toHaveBeenCalledTimes(1);
    expect(mocks.channel).toHaveBeenCalledWith('player-inbox:self', { config: { private: true } });
    mocks.broadcast?.(); expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenCalledTimes(1);
    mocks.status?.('SUBSCRIBED'); expect(first).toHaveBeenCalledTimes(2);
    stops.pop()!(); expect(mocks.remove).not.toHaveBeenCalled();
    stops.pop()!(); expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
  it('recovers missed events on focus and online, without leaking listeners', () => {
    const refresh = vi.fn(); const stop = subscribeInbox('self', refresh);
    window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('online'));
    expect(refresh).toHaveBeenCalledTimes(2); stop();
    window.dispatchEvent(new Event('focus')); expect(refresh).toHaveBeenCalledTimes(2);
  });
  it('only polls visible windows', () => {
    vi.useFakeTimers(); const refresh = vi.fn(); stops.push(subscribeInbox('self', refresh));
    vi.advanceTimersByTime(2500); expect(refresh).toHaveBeenCalledTimes(1);
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.advanceTimersByTime(5000); expect(refresh).toHaveBeenCalledTimes(1); hidden.mockRestore();
  });
  it('does not subscribe after its last consumer leaves during authentication', async () => {
    let finish!: () => void; mocks.auth.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const stop = subscribeInbox('self', vi.fn()); stop(); finish(); await Promise.resolve();
    expect(mocks.status).toBeNull(); expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
});
describe('Direct message reliability', () => {
  it('deduplicates rows and never rolls back read receipts', () => {
    const read = { ...row('1'), read_at: '2026-09-30T20:01:00Z' };
    const current = [read]; expect(mergeDirectMessages(current, [row('1')])).toBe(current);
    expect(mergeDirectMessages([row('2')], [row('1'), row('2')]).map(item => item.id)).toEqual(['1', '2']);
  });
  it('refreshes immediately when an inbox broadcast arrives', async () => {
    const { result } = renderHook(() => useDirectMessages('luna'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.fetch.mockResolvedValue({ data: [row('1')], error: null });
    await act(async () => mocks.broadcast?.());
    expect(result.current.messages.map(item => item.id)).toEqual(['1']);
  });
  it('re-fetches after an event arrives during an outstanding stale snapshot', async () => {
    let finish!: (result: unknown) => void;
    mocks.fetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue({ data: [row('2')], error: null });
    const { result } = renderHook(() => useDirectMessages('luna'));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await act(async () => { mocks.broadcast?.(); finish({ data: [row('1')], error: null }); });
    await waitFor(() => expect(result.current.messages.map(item => item.id)).toEqual(['1', '2']));
  });
  it('ignores a late response from the previous conversation', async () => {
    let finish!: (result: unknown) => void;
    mocks.fetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue({ data: [row('2', 'jade')], error: null });
    const { result, rerender } = renderHook(({ friend }) => useDirectMessages(friend), { initialProps: { friend: 'luna' } });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1)); rerender({ friend: 'jade' });
    await waitFor(() => expect(result.current.messages[0]?.sender_id).toBe('jade'));
    await act(async () => finish({ data: [row('1')], error: null }));
    expect(result.current.messages.map(item => item.sender_id)).toEqual(['jade']);
  });
  it('keeps the last known messages when a reconnect query fails', async () => {
    mocks.fetch.mockResolvedValue({ data: [row('1')], error: null });
    const { result } = renderHook(() => useDirectMessages('luna'));
    await waitFor(() => expect(result.current.messages.length).toBe(1));
    mocks.fetch.mockRejectedValue(new Error('offline')); await act(async () => mocks.broadcast?.());
    expect(result.current.messages.length).toBe(1); expect(result.current.loading).toBe(false); expect(result.current.error).toBeTruthy();
  });
});
