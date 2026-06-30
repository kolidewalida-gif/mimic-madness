/**
 * Host-curated Blindtest playlist, persisted in localStorage.
 *
 * The host pastes YouTube links (+ the answer title + category) before the
 * game. The list is saved locally so it persists between parties, and is
 * broadcast round-by-round so every client plays the exact same track.
 */
import type { BlindtestCategory } from './blindtestTracks';
import { parseYouTubeId } from './youtube';

export interface CustomTrack {
  id: string;
  title: string; // the answer
  subtitle?: string;
  category: BlindtestCategory;
  youtubeId: string;
}

const KEY = 'mimic.blindtest.playlist.v1';

export function loadCustomPlaylist(): CustomTrack[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((t) => t && typeof t.youtubeId === 'string' && typeof t.title === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveCustomPlaylist(list: CustomTrack[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

/** Build a track from a pasted link/id + answer title. Returns null if invalid. */
export function makeCustomTrack(
  link: string,
  title: string,
  category: BlindtestCategory,
  subtitle?: string,
): CustomTrack | null {
  const yt = parseYouTubeId(link);
  if (!yt || !title.trim()) return null;
  return {
    id: `c-${yt}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    subtitle: subtitle?.trim() || undefined,
    category,
    youtubeId: yt,
  };
}
