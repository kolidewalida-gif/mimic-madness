/**
 * Rhythmo cue persistence.
 *
 * Cues live next to their clip in the existing `video-challenges` bucket as
 * `<playerId>/<clipId>.cues.json`. The deterministic path makes retries
 * idempotent; a bounded upsert prevents Storage outages from freezing the UI.
 */
import { supabase } from '@/integrations/supabase/client';
import { videoStorage } from '@/lib/videoStorageSupabase';
import { RhythmoError, type RhythmoTrack } from './types';

const BUCKET = 'video-challenges';
const CUES_SUFFIX = '.cues.json';
const MISSING_CACHE_MS = 10_000;
const DEFAULT_SAVE_TIMEOUT_MS = 30_000;

/** `abc/clip-1.mp4` -> `abc/clip-1.cues.json` */
export const cuesPathFor = (storagePath: string): string =>
  `${storagePath.replace(/\.[^./]+$/, '')}${CUES_SUFFIX}`;

type CacheEntry = {
  value: RhythmoTrack | null;
  expiresAt: number;
};

const trackCache = new Map<string, CacheEntry>();

const isTrack = (value: unknown): value is RhythmoTrack => {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<RhythmoTrack>;
  return track.version === 1 && Array.isArray(track.cues);
};

export const clearRhythmoTrackCache = (clipId?: string): void => {
  if (clipId) trackCache.delete(clipId);
  else trackCache.clear();
};

/** Read a band; a missing/malformed optional file is cached only briefly. */
export async function loadRhythmoTrack(clipId: string): Promise<RhythmoTrack | null> {
  const cached = trackCache.get(clipId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) trackCache.delete(clipId);

  try {
    const clip = await videoStorage.getVideoClip(clipId);
    if (!clip?.storagePath) {
      trackCache.set(clipId, { value: null, expiresAt: Date.now() + MISSING_CACHE_MS });
      return null;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(cuesPathFor(clip.storagePath));

    if (error || !data) {
      trackCache.set(clipId, { value: null, expiresAt: Date.now() + MISSING_CACHE_MS });
      return null;
    }

    const parsed: unknown = JSON.parse(await data.text());
    const track = isTrack(parsed) ? parsed : null;
    trackCache.set(clipId, {
      value: track,
      expiresAt: track ? Number.POSITIVE_INFINITY : Date.now() + MISSING_CACHE_MS,
    });
    return track;
  } catch {
    // A missing/malformed optional band never blocks video playback. Do not
    // retain the failure indefinitely: another client may create it shortly.
    trackCache.set(clipId, { value: null, expiresAt: Date.now() + MISSING_CACHE_MS });
    return null;
  }
}

/** List a player's existing cue files with one Storage request. */
export async function listRhythmoTracks(playerId: string): Promise<Set<string>> {
  const found = new Set<string>();
  try {
    const { data, error } = await supabase.storage.from(BUCKET).list(playerId, { limit: 1000 });
    if (error || !data) return found;

    for (const entry of data) {
      if (entry.name.endsWith(CUES_SUFFIX)) {
        found.add(entry.name.slice(0, -CUES_SUFFIX.length));
      }
    }
  } catch {
    // Optional feature: callers render the clips without badges on failure.
  }
  return found;
}

export interface SaveRhythmoOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Write the deterministic cue path with a bounded, idempotent upsert. */
export async function saveRhythmoTrack(
  track: RhythmoTrack,
  options: SaveRhythmoOptions = {},
): Promise<void> {
  if (options.signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

  const clip = await videoStorage.getVideoClip(track.clipId);
  if (!clip?.storagePath) {
    throw new RhythmoError('storage', `Clip introuvable pour la bande rythmo : ${track.clipId}`);
  }
  if (options.signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

  const blob = new Blob([JSON.stringify(track)], { type: 'application/json' });
  const operation = supabase.storage
    .from(BUCKET)
    .upload(cuesPathFor(clip.storagePath), blob, {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '3600',
    });

  const result = await new Promise<Awaited<typeof operation>>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(new RhythmoError('cancelled', 'Annulé.')));
    const timer = setTimeout(
      () => finish(() => reject(new RhythmoError('storage', "L'enregistrement de la bande a expiré."))),
      options.timeoutMs ?? DEFAULT_SAVE_TIMEOUT_MS,
    );

    options.signal?.addEventListener('abort', onAbort, { once: true });
    operation.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });

  if (result.error) {
    throw new RhythmoError(
      'storage',
      `Impossible d'enregistrer la bande rythmo : ${result.error.message}`,
    );
  }

  trackCache.set(track.clipId, { value: track, expiresAt: Number.POSITIVE_INFINITY });
}
