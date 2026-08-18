/**
 * Rhythmo cue persistence.
 *
 * Cues live as a JSON object in the *existing* `video-challenges` bucket,
 * right next to the clip they describe: `<playerId>/<clipId>.cues.json`.
 *
 * Deliberately not a database column: that would need a migration applied to
 * the live Supabase project, which would block this feature on an external
 * step. The bucket is already writable by the same code path that uploads the
 * video, so cues inherit its access rules for free.
 */
import { supabase } from '@/integrations/supabase/client';
import { videoStorage } from '@/lib/videoStorageSupabase';
import type { RhythmoTrack } from './types';

const BUCKET = 'video-challenges';

/** `abc/clip-1.mp4` -> `abc/clip-1.cues.json` */
export const cuesPathFor = (storagePath: string): string =>
  `${storagePath.replace(/\.[^./]+$/, '')}.cues.json`;

/**
 * Cache keyed by clip id. `null` is cached too: a clip with no band is the
 * common case, and we must not re-request a 404 on every render.
 */
const trackCache = new Map<string, RhythmoTrack | null>();

export const peekCachedTrack = (clipId: string): RhythmoTrack | null | undefined =>
  trackCache.get(clipId);

export const invalidateTrack = (clipId: string): void => {
  trackCache.delete(clipId);
};

const isTrack = (value: unknown): value is RhythmoTrack => {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<RhythmoTrack>;
  return t.version === 1 && Array.isArray(t.cues);
};

/**
 * Read the band for a clip. Returns `null` when the clip has none, which is
 * not an error: most clips are imported before transcription has run.
 */
export async function loadRhythmoTrack(clipId: string): Promise<RhythmoTrack | null> {
  const cached = trackCache.get(clipId);
  if (cached !== undefined) return cached;

  try {
    const clip = await videoStorage.getVideoClip(clipId);
    if (!clip?.storagePath) {
      trackCache.set(clipId, null);
      return null;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(cuesPathFor(clip.storagePath));

    if (error || !data) {
      trackCache.set(clipId, null);
      return null;
    }

    const parsed: unknown = JSON.parse(await data.text());
    const track = isTrack(parsed) ? parsed : null;
    trackCache.set(clipId, track);
    return track;
  } catch {
    // A missing or malformed band must never break playback.
    trackCache.set(clipId, null);
    return null;
  }
}

/** True when a band already exists, without downloading it. */
export async function hasRhythmoTrack(clipId: string): Promise<boolean> {
  if (trackCache.get(clipId)) return true;
  return (await loadRhythmoTrack(clipId)) !== null;
}

/**
 * Write the band next to its clip. `upsert` so re-running transcription with a
 * better model simply replaces the previous result.
 */
export async function saveRhythmoTrack(track: RhythmoTrack): Promise<void> {
  const clip = await videoStorage.getVideoClip(track.clipId);
  if (!clip?.storagePath) {
    throw new Error(`Clip introuvable pour la bande rythmo : ${track.clipId}`);
  }

  const blob = new Blob([JSON.stringify(track)], { type: 'application/json' });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(cuesPathFor(clip.storagePath), blob, {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '3600',
    });

  if (error) throw new Error(`Impossible d'enregistrer la bande rythmo : ${error.message}`);

  trackCache.set(track.clipId, track);
}

/** Remove a band. Called when its clip is deleted. */
export async function deleteRhythmoTrack(clipId: string): Promise<void> {
  try {
    const clip = await videoStorage.getVideoClip(clipId);
    if (clip?.storagePath) {
      await supabase.storage.from(BUCKET).remove([cuesPathFor(clip.storagePath)]);
    }
  } catch {
    /* a leftover cue file is harmless */
  } finally {
    trackCache.delete(clipId);
  }
}
