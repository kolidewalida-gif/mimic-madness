/**
 * MimicLyrics — fetch + parse synced lyrics from LRCLIB (free, no key, CORS-ok).
 * ISOLATED to the Mimic module.
 *
 * Honest limitation: LRC timestamps are relative to the FULL song, while the
 * iTunes preview is a ~30s clip at an unknown offset. We therefore expose the
 * plain lyric lines and let the karaoke UI advance them proportionally across
 * the preview (best-effort teleprompter), rather than claiming word-perfect
 * sync. If synced lyrics are unavailable we fall back to plain lyrics.
 */

export interface LyricLine {
  /** original LRC time in seconds (full-song relative), if any */
  t?: number;
  text: string;
}

export interface MimicLyrics {
  lines: LyricLine[];
  synced: boolean;
  source: 'lrclib' | 'none';
}

const LRCLIB = 'https://lrclib.net/api';

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!matches.length) continue;
    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) / 1000 : 0;
      out.push({ t: min * 60 + sec + frac, text });
    }
  }
  out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  // Drop leading empty lines
  return out.filter((l) => l.text.length > 0);
}

function plainToLines(plain: string): LyricLine[] {
  return plain
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

/** Fetch lyrics for a track. Returns null-ish (empty) if none found. */
export async function fetchMimicLyrics(trackName: string, artistName: string): Promise<MimicLyrics> {
  const empty: MimicLyrics = { lines: [], synced: false, source: 'none' };
  const clean = (s: string) => (s || '').replace(/\((feat|ft)\.[^)]*\)/gi, '').replace(/\s*-\s*.*$/,'').trim();
  const tn = clean(trackName);
  const an = (artistName || '').split(/[,&]/)[0].trim();
  if (!tn) return empty;

  const tryGet = async (url: string): Promise<any | null> => {
    try {
      // Hard timeout: some networks silently stall requests to lrclib.net
      // (firewall/extension/DNS), which would otherwise hang `fetch` forever
      // and freeze the "searching for a song" loop indefinitely.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
        if (!r.ok) return null;
        return await r.json();
      } finally { clearTimeout(timer); }
    } catch { return null; }
  };

  // 1) exact-ish get
  let data = await tryGet(`${LRCLIB}/get?track_name=${encodeURIComponent(tn)}&artist_name=${encodeURIComponent(an)}`);
  // 2) fallback: search and take first result with lyrics
  if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
    const results = await tryGet(`${LRCLIB}/search?track_name=${encodeURIComponent(tn)}&artist_name=${encodeURIComponent(an)}`);
    if (Array.isArray(results) && results.length) {
      data = results.find((x: any) => x.syncedLyrics) || results.find((x: any) => x.plainLyrics) || results[0];
    }
  }
  if (!data) return empty;

  if (data.syncedLyrics) {
    const lines = parseLrc(data.syncedLyrics);
    if (lines.length) return { lines, synced: true, source: 'lrclib' };
  }
  if (data.plainLyrics) {
    const lines = plainToLines(data.plainLyrics);
    if (lines.length) return { lines, synced: false, source: 'lrclib' };
  }
  return empty;
}

/**
 * Pick a contiguous window of lyric lines to sing for a ~30s extract.
 * We can't align to the preview's true offset, so we choose a musically
 * "interesting" middle-ish window (skips intros/outros) and cap the count.
 */
export function pickExtractLines(all: LyricLine[], maxLines = 8): LyricLine[] {
  if (all.length <= maxLines) return all;
  // start somewhere after the first ~15% (skip intro), deterministic-ish random
  const startMax = Math.max(0, all.length - maxLines);
  const bias = Math.floor(all.length * 0.15);
  const start = Math.min(startMax, bias + Math.floor(Math.random() * Math.max(1, startMax - bias)));
  return all.slice(start, start + maxLines);
}
