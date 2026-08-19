import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  createSignedUrl: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: mocks.createSignedUrl,
        getPublicUrl: mocks.getPublicUrl,
      }),
    },
  },
}));

import { videoStorage } from '@/lib/videoStorageSupabase';

const clipRow = {
  id: 'clip-1',
  name: 'clip',
  player_id: 'player-1',
  player_name: 'Alex',
  start_time: 0,
  end_time: 0,
  duration: 0,
  is_muted: false,
  storage_path: 'player-1/clip-1.mp4',
  created_at: '2026-08-19T10:00:00.000Z',
  lobby_id: 'lobby-1',
  round_number: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.maybeSingle.mockResolvedValue({ data: clipRow, error: null });
});

describe('signed URL resolution', () => {
  it('caches the signed URL so repeated reads do not re-sign', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/first' },
      error: null,
    });

    await expect(videoStorage.getVideoUrl('clip-1')).resolves.toBe('https://signed.test/first');
    await expect(videoStorage.getVideoUrl('clip-1')).resolves.toBe('https://signed.test/first');
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('re-signs on demand so an expired URL can be recovered', async () => {
    mocks.createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed.test/stale' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed.test/fresh' }, error: null });

    await expect(videoStorage.getVideoUrl('clip-2')).resolves.toBe('https://signed.test/stale');
    // forceRefresh is what a 401/403 during download triggers.
    await expect(videoStorage.getVideoUrl('clip-2', true)).resolves.toBe('https://signed.test/fresh');
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('falls back to the public URL when signing is refused', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://public.test/clip.mp4' } });

    await expect(videoStorage.getVideoUrl('clip-3')).resolves.toBe('https://public.test/clip.mp4');
  });

  it('reports a missing clip as null instead of throwing', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(videoStorage.getVideoUrl('clip-absent')).resolves.toBeNull();
  });

  it('never settles on its own when Storage hangs, so callers must bound it', async () => {
    vi.useFakeTimers();
    mocks.createSignedUrl.mockReturnValue(new Promise(() => undefined));

    let settled = false;
    void videoStorage.getVideoUrl('clip-hang').then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(60_000);

    // This is exactly why the rythmo panel wraps it in a deadline.
    expect(settled).toBe(false);
    vi.useRealTimers();
  });
});
