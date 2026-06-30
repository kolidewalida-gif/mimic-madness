/**
 * iTunes Search API — free, no key, 30s audio previews.
 *
 * We call it via JSONP (the API supports a `callback` param) so it works
 * straight from the browser with no CORS issues. The returned `previewUrl`
 * is a 30-second clip that plays in a plain <audio> element, and
 * `artworkUrl` gives cover art for the reveal.
 *
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

export interface ItunesTrack {
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl: string;
  artworkUrl?: string;
}

let jsonpSeq = 0;

/** Search songs on iTunes (JSONP). Resolves [] on any failure/timeout. */
export function itunesSearch(term: string, limit = 12): Promise<ItunesTrack[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !term.trim()) { resolve([]); return; }

    const cb = `__itunesCb_${Date.now()}_${jsonpSeq++}`;
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      done = true;
      try { delete (window as any)[cb]; } catch { (window as any)[cb] = undefined; }
      script.remove();
      clearTimeout(timer);
    };
    const timer = window.setTimeout(() => { if (!done) { cleanup(); resolve([]); } }, 8000);

    (window as any)[cb] = (data: any) => {
      if (done) return;
      cleanup();
      const out: ItunesTrack[] = (data?.results ?? [])
        .filter((r: any) => r && r.previewUrl)
        .map((r: any) => ({
          trackName: r.trackName ?? '',
          artistName: r.artistName ?? '',
          collectionName: r.collectionName,
          previewUrl: r.previewUrl,
          artworkUrl: (r.artworkUrl100 || r.artworkUrl60 || '')?.replace('100x100', '600x600').replace('60x60', '600x600') || undefined,
        }));
      resolve(out);
    };

    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
      `&media=music&entity=song&limit=${limit}&callback=${cb}`;
    script.src = url;
    script.async = true;
    script.onerror = () => { if (!done) { cleanup(); resolve([]); } };
    document.head.appendChild(script);
  });
}

/** Pick the most relevant track with a preview for a query. */
export function pickBestPreview(tracks: ItunesTrack[], hint?: string): ItunesTrack | null {
  const BAD = /karaoke|tribute|cover|made famous|instrumental|in the style|originally performed|8-bit|8 bit|lullaby|piano version|music box|ringtone|remix/i;
  const withPreview = tracks.filter((t) => t.previewUrl);
  if (!withPreview.length) return null;

  // Prefer "clean" official-ish versions (no karaoke/cover/etc).
  const clean = withPreview.filter(
    (t) => !BAD.test(t.trackName) && !BAD.test(t.artistName) && !BAD.test(t.collectionName ?? ''),
  );
  const pool = clean.length ? clean : withPreview;

  if (hint) {
    const h = hint.toLowerCase();
    const match = pool.find(
      (t) => t.trackName.toLowerCase().includes(h) || (t.collectionName ?? '').toLowerCase().includes(h),
    );
    if (match) return match;
  }
  return pool[0];
}
