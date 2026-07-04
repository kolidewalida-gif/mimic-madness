/**
 * iTunes Search API — free, no key, 30s audio previews + real cover/poster art.
 *
 * Called via JSONP (the API supports a `callback` param) so it works straight
 * from the browser with no CORS issues. We query the FR store so French (VF)
 * content and titles come back. For the reveal we also fetch the real TV/movie
 * poster ("jaquette") when possible, instead of just the soundtrack album art.
 */

export interface ItunesTrack {
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl: string;
  artworkUrl?: string;
}

let jsonpSeq = 0;

/** Largest artwork URL from an iTunes result. */
function bigArt(r: any): string | undefined {
  const a = r?.artworkUrl100 || r?.artworkUrl60 || r?.artworkUrl30 || '';
  if (!a) return undefined;
  return a.replace('100x100', '600x600').replace('60x60', '600x600').replace('30x30', '600x600');
}

/** Core JSONP request to the iTunes Search API. Resolves [] on failure/timeout. */
function jsonpItunes(params: Record<string, string | number>): Promise<any[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !String(params.term ?? '').trim()) { resolve([]); return; }

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
      resolve(Array.isArray(data?.results) ? data.results : []);
    };

    const qs = Object.entries({ ...params, callback: cb })
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    script.src = `https://itunes.apple.com/search?${qs}`;
    script.async = true;
    script.onerror = () => { if (!done) { cleanup(); resolve([]); } };
    document.head.appendChild(script);
  });
}

/** Search songs (with 30s preview). */
export async function itunesSearch(term: string, limit = 12): Promise<ItunesTrack[]> {
  const results = await jsonpItunes({ term, media: 'music', entity: 'song', country: 'FR', limit });
  return results
    .filter((r: any) => r && r.previewUrl)
    .map((r: any) => ({
      trackName: r.trackName ?? '',
      artistName: r.artistName ?? '',
      collectionName: r.collectionName,
      previewUrl: r.previewUrl,
      artworkUrl: bigArt(r),
    }));
}

/**
 * Fetch the real "jaquette" (poster/cover) for an answer:
 *  - film / disney  → movie poster
 *  - anime / cartoon → TV show poster (falls back to movie for anime films)
 *  - music / jeuxvideo → null (use the song's album art instead)
 */
export async function itunesPoster(term: string, category: string): Promise<string | null> {
  const tries: Array<{ media: string; entity: string }> =
    category === 'film' || category === 'disney'
      ? [{ media: 'movie', entity: 'movie' }]
      : category === 'anime' || category === 'cartoon'
        ? [{ media: 'tvShow', entity: 'tvSeason' }, { media: 'movie', entity: 'movie' }]
        : category === 'series'
          ? [{ media: 'tvShow', entity: 'tvSeason' }, { media: 'movie', entity: 'movie' }]
          : [];

  const toks = answerTokens(term);
  const titleOf = (r: any) => NORM(`${r?.trackName ?? ''} ${r?.trackCensoredName ?? ''} ${r?.collectionName ?? ''}`);
  for (const t of tries) {
    const results = await jsonpItunes({ term, media: t.media, entity: t.entity, country: 'FR', limit: 8 });
    if (!results.length) continue;
    // Prefer the poster whose title matches the searched name (avoids grabbing
    // an unrelated movie that merely shares the composer/franchise).
    const pick =
      (toks.length && results.find((r: any) => bigArt(r) && toks.every((tk) => titleOf(r).includes(tk)))) ||
      (toks.length && results.find((r: any) => bigArt(r) && toks.some((tk) => titleOf(r).includes(tk)))) ||
      results.find((r: any) => bigArt(r));
    const art = pick ? bigArt(pick) : undefined;
    if (art) return art;
  }
  return null;
}

/** Pick the most relevant track with a preview for an entry. */
const NORM = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const STOP = new Set([
  'les', 'la', 'le', 'des', 'du', 'de', 'et', 'un', 'une', 'the', 'of', 'and', 'for',
  'generique', 'generiques', 'francais', 'francaise', 'theme', 'version', 'serie', 'tv',
  'dessin', 'anime', 'animee', 'animated', 'opening', 'main', 'title',
  // generic soundtrack/album words — these appear in almost every OST album name
  // and must NOT count as a relevance match (else a same-composer wrong track passes).
  'soundtrack', 'score', 'motion', 'picture', 'original', 'originale', 'expanded',
  'edition', 'deluxe', 'ost', 'music', 'musique', 'movie', 'film', 'bande', 'feat',
  'remastered', 'remaster', 'suite', 'credits', 'ending', 'album', 'from', 'song', 'songs',
]);
function answerTokens(answer: string): string[] {
  return NORM(answer).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
}

export function pickBestPreview(
  tracks: ItunesTrack[],
  opts: { answer: string; hint?: string; category: string; query?: string },
): ItunesTrack | null {
  const BAD = /karaoke|tribute|cover|made famous|instrumental|in the style|originally performed|8-bit|8 bit|lullaby|piano version|music box|ringtone|remix/i;
  const withPreview = tracks.filter((t) => t.previewUrl);
  if (!withPreview.length) return null;

  const clean = withPreview.filter(
    (t) => !BAD.test(t.trackName) && !BAD.test(t.artistName) && !BAD.test(t.collectionName ?? ''),
  );
  const pool = clean.length ? clean : withPreview;

  const haystack = (t: ItunesTrack) => `${NORM(t.trackName)} ${NORM(t.collectionName ?? '')} ${NORM(t.artistName)}`;
  const contains = (t: ItunesTrack, s: string) => haystack(t).includes(NORM(s));

  // Prefer a hint match when provided (e.g. the exact song name for anime).
  if (opts.hint) {
    const m = pool.find((t) => contains(t, opts.hint!));
    if (m) return m;
  }

  // Cartoon generics on iTunes FR are noisy → require the result to actually
  // relate to the show (using the show-name words from the query), otherwise
  // skip — so no wrong "Sous l'océan" for "Bob l'éponge".
  if (opts.category === 'cartoon') {
    const toks = answerTokens(opts.query || opts.answer);
    const m = pool.find((t) => toks.some((tok) => contains(t, tok)));
    return m ?? null;
  }

  // Film / series scores: the track title differs from the movie/series name,
  // but iTunes happily fuzzy-matches to another famous track by the SAME
  // composer (e.g. "Wonder Woman … Hans Zimmer" → Inception's "Time").
  // Require the picked result's track OR album name to share a word with the
  // query — the composer name in the artist field alone is NOT enough — else
  // skip so we never show a mismatched cover.
  if (opts.category === 'film' || opts.category === 'series') {
    const toks = answerTokens(opts.query || opts.answer);
    if (toks.length) {
      const titleHay = (t: ItunesTrack) => `${NORM(t.trackName)} ${NORM(t.collectionName ?? '')}`;
      const m = pool.find((t) => toks.some((tok) => titleHay(t).includes(tok)));
      return m ?? null;
    }
  }

  return pool[0];
}
