/**
 * Lightweight YouTube IFrame Player API loader + URL helpers.
 *
 * Lets the Blindtest play audio (and optionally video) straight from YouTube,
 * so no local mp3/mp4 files are required — just a video id.
 */

let apiPromise: Promise<any> | null = null;

/** Load the YouTube IFrame API once and resolve with the global `YT` object. */
export function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(w.YT);
    };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

/**
 * Extract an 11-char YouTube video id from any common URL form, or return the
 * input if it's already a bare id. Returns null when nothing matches.
 *
 * Accepts:
 *   https://www.youtube.com/watch?v=ID&list=...
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   ID
 */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Real YouTube thumbnail URL for a video id (no API key needed). */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
