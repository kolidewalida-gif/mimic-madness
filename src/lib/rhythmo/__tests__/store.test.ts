import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  list: vi.fn(),
  getVideoClip: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mocks.upload,
        download: mocks.download,
        list: mocks.list,
      }),
    },
  },
}));

vi.mock('@/lib/videoStorageSupabase', () => ({
  videoStorage: { getVideoClip: mocks.getVideoClip },
}));

import {
  clearRhythmoTrackCache,
  cuesPathFor,
  loadRhythmoTrack,
  saveRhythmoTrack,
} from '@/lib/rhythmo/store';
import type { RhythmoTrack } from '@/lib/rhythmo/types';

const track: RhythmoTrack = {
  version: 1,
  clipId: 'clip-1',
  model: 'onnx-community/whisper-tiny_timestamped',
  duration: 4,
  createdAt: '2026-08-19T10:00:00.000Z',
  cues: [{ start: 0, end: 1, text: 'salut', words: [{ text: 'salut', start: 0, end: 1 }] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  clearRhythmoTrackCache();
  mocks.getVideoClip.mockResolvedValue({ id: 'clip-1', storagePath: 'player-1/clip-1.mp4' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('deterministic cue path', () => {
  it('places cues next to their clip so retries overwrite the same object', () => {
    expect(cuesPathFor('player-1/clip-1.mp4')).toBe('player-1/clip-1.cues.json');
    expect(cuesPathFor('player-1/clip-1.webm')).toBe('player-1/clip-1.cues.json');
  });
});

describe('saving a rhythmo track', () => {
  it('upserts JSON at the deterministic path', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    await saveRhythmoTrack(track);

    expect(mocks.upload).toHaveBeenCalledWith(
      'player-1/clip-1.cues.json',
      expect.any(Blob),
      expect.objectContaining({ upsert: true, contentType: 'application/json' }),
    );
  });

  it('fails with a storage reason when the upload never settles', async () => {
    vi.useFakeTimers();
    mocks.upload.mockReturnValue(new Promise(() => undefined));

    const promise = saveRhythmoTrack(track, { timeoutMs: 1_000 });
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'storage' });
    await vi.advanceTimersByTimeAsync(2_000);
    await assertion;
  });

  it('reports cancellation instead of a storage failure when aborted', async () => {
    const controller = new AbortController();
    mocks.upload.mockReturnValue(new Promise(() => undefined));

    const promise = saveRhythmoTrack(track, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ reason: 'cancelled' });
  });

  it('surfaces a Storage rejection as a typed storage error', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'new row violates policy' } });
    await expect(saveRhythmoTrack(track)).rejects.toMatchObject({ reason: 'storage' });
  });

  it('retries under an allowed MIME type when the bucket refuses application/json', async () => {
    mocks.upload
      .mockResolvedValueOnce({ error: { message: 'mime type application/json is not supported' } })
      .mockResolvedValueOnce({ error: null });

    await saveRhythmoTrack(track);

    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload.mock.calls[0][2]).toMatchObject({ contentType: 'application/json' });
    // video/mp4 has been allowed since the bucket was created; cues are read
    // back with .text(), so the stored content-type never affects parsing.
    expect(mocks.upload.mock.calls[1][2]).toMatchObject({ contentType: 'video/mp4' });
  });

  it('does not retry a non-MIME storage failure under a different type', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'bucket not found' } });
    await expect(saveRhythmoTrack(track)).rejects.toMatchObject({ reason: 'storage' });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('refuses to save when the clip no longer exists', async () => {
    mocks.getVideoClip.mockResolvedValue(null);
    await expect(saveRhythmoTrack(track)).rejects.toMatchObject({ reason: 'storage' });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe('loading a rhythmo track', () => {
  it('serves a saved track from cache without a second download', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    await saveRhythmoTrack(track);

    await expect(loadRhythmoTrack('clip-1')).resolves.toMatchObject({ clipId: 'clip-1' });
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it('retries a missing band after the negative cache expires', async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: 'not found' } });

    await expect(loadRhythmoTrack('clip-1')).resolves.toBeNull();
    await expect(loadRhythmoTrack('clip-1')).resolves.toBeNull();
    // Still one attempt: the short negative cache absorbed the second read.
    expect(mocks.download).toHaveBeenCalledTimes(1);

    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 11_000);
    mocks.download.mockResolvedValue({
      data: { text: async () => JSON.stringify(track) },
      error: null,
    });

    await expect(loadRhythmoTrack('clip-1')).resolves.toMatchObject({ clipId: 'clip-1' });
    expect(mocks.download).toHaveBeenCalledTimes(2);
    vi.mocked(Date.now).mockRestore();
  });

  it('ignores a malformed cue file instead of breaking playback', async () => {
    mocks.download.mockResolvedValue({
      data: { text: async () => '{"version":99}' },
      error: null,
    });
    await expect(loadRhythmoTrack('clip-1')).resolves.toBeNull();
  });

  // A hanging read used to freeze the preview on an endless spinner and could
  // stall the imitation phase, which loads the band the same way.
  it('resolves to null instead of hanging when the download never settles', async () => {
    vi.useFakeTimers();
    mocks.download.mockReturnValue(new Promise(() => undefined));

    const promise = loadRhythmoTrack('clip-1');
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(promise).resolves.toBeNull();
  });

  it('resolves to null instead of hanging when the clip lookup never settles', async () => {
    vi.useFakeTimers();
    mocks.getVideoClip.mockReturnValue(new Promise(() => undefined));

    const promise = loadRhythmoTrack('clip-1');
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(promise).resolves.toBeNull();
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
