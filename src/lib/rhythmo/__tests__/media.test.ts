import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadMediaBlob } from '@/lib/rhythmo/media';
import { RhythmoError, type RhythmoProgress } from '@/lib/rhythmo/types';

const encoder = new TextEncoder();

const streamResponse = (
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
  options: { stallAfterChunks?: boolean; signal?: AbortSignal } = {},
) => {
  let index = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: {
      getReader: () => ({
        read: () => {
          if (options.stallAfterChunks && index >= chunks.length) {
            // A connection that stops delivering bytes without closing: the
            // read only settles if the transfer is aborted, exactly like fetch.
            return new Promise<never>((_resolve, reject) => {
              options.signal?.addEventListener('abort', () => {
                reject(new DOMException('Aborted', 'AbortError'));
              }, { once: true });
            });
          }
          if (index >= chunks.length) return Promise.resolve({ done: true, value: undefined });
          const value = chunks[index++];
          return Promise.resolve({ done: false, value });
        },
      }),
    },
  } as unknown as Response;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('media download', () => {
  it('reports real byte progress and assembles every chunk', async () => {
    const progress: RhythmoProgress[] = [];
    const blob = await downloadMediaBlob('https://example.test/clip.mp4', {
      fetchImpl: async () => streamResponse(
        [encoder.encode('abc'), encoder.encode('de')],
        { 'content-length': '5', 'content-type': 'video/mp4' },
      ),
      onProgress: (value) => progress.push(value),
    });

    expect(blob.size).toBe(5);
    const downloads = progress.filter((entry) => entry.phase === 'downloading-media');
    expect(downloads.at(-1)).toMatchObject({ loadedBytes: 5, totalBytes: 5, ratio: 1 });
    expect(downloads.map((entry) => (entry as { loadedBytes: number }).loadedBytes))
      .toEqual([0, 3, 5, 5]);
  });

  it('stays indeterminate when the server sends no content-length', async () => {
    const progress: RhythmoProgress[] = [];
    await downloadMediaBlob('https://example.test/clip.mp4', {
      fetchImpl: async () => streamResponse([encoder.encode('abcd')]),
      onProgress: (value) => progress.push(value),
    });

    const midway = progress.find(
      (entry) => entry.phase === 'downloading-media' && entry.loadedBytes === 4,
    );
    expect(midway).toMatchObject({ ratio: undefined });
  });

  it('fails with a network reason when the body stalls mid-transfer', async () => {
    vi.useFakeTimers();
    const promise = downloadMediaBlob('https://example.test/clip.mp4', {
      inactivityTimeoutMs: 1_000,
      fetchImpl: async (_url, init) => streamResponse(
        [encoder.encode('abc')],
        {},
        { stallAfterChunks: true, signal: init?.signal ?? undefined },
      ),
    });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'RhythmoError',
      reason: 'network',
    });

    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });

  it('rearms its watchdog on every chunk so a slow large file still completes', async () => {
    vi.useFakeTimers();
    let emitted = 0;
    const response = {
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => {
            if (emitted >= 4) return { done: true, value: undefined };
            emitted += 1;
            // Each chunk arrives just before the inactivity deadline.
            await new Promise<void>((resolve) => setTimeout(resolve, 900));
            return { done: false, value: encoder.encode('chunk') };
          },
        }),
      },
    } as unknown as Response;

    const promise = downloadMediaBlob('https://example.test/big.mp4', {
      inactivityTimeoutMs: 1_000,
      fetchImpl: async () => response,
    });
    await vi.advanceTimersByTimeAsync(6_000);
    await expect(promise).resolves.toMatchObject({ size: 20 });
  });

  it('surfaces an HTTP failure with its status so callers can refresh a URL', async () => {
    await expect(downloadMediaBlob('https://example.test/clip.mp4', {
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        headers: { get: () => null },
        body: null,
      } as unknown as Response),
    })).rejects.toMatchObject({ reason: 'network', message: expect.stringContaining('403') });
  });

  it('stops immediately and reports cancellation when aborted', async () => {
    const controller = new AbortController();
    const promise = downloadMediaBlob('https://example.test/clip.mp4', {
      signal: controller.signal,
      fetchImpl: (_url, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    });

    controller.abort();
    await expect(promise).rejects.toMatchObject({ reason: 'cancelled' });
  });

  it('refuses to start once the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();

    await expect(downloadMediaBlob('https://example.test/clip.mp4', {
      signal: controller.signal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toBeInstanceOf(RhythmoError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
