/**
 * Image proxy helpers — robust multi-source loader for the BlurRush canvas.
 *
 * Goal: make remote images usable inside <canvas> without CORS/taint issues
 * AND survive flaky upstream sources (Wikipedia, MyAnimeList, TMDb…).
 *
 * Strategy (in order):
 * 1) Backend image-proxy (Supabase Edge Function — best CORS, slow first hit)
 * 2) images.weserv.nl (CORS-friendly proxy that follows redirects)
 * 3) wsrv.nl (alternative weserv mirror)
 * 4) Direct URL (works for upload.wikimedia.org which already sends ACL headers)
 */

const isBypassUrl = (url: string) =>
  url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');

/** Strip query string from a URL — needed for weserv which adds its own. */
const stripQuery = (url: string): string => {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
};

export function getProxyImageCandidates(url: string): string[] {
  if (!url) return [];
  if (isBypassUrl(url)) return [url];

  const candidates: string[] = [];

  // 1) Backend proxy (preferred — controlled CORS)
  const base = (import.meta as any)?.env?.VITE_SUPABASE_URL as
    | string
    | undefined;
  if (base) {
    const qp = new URLSearchParams({ url });
    candidates.push(
      `${base.replace(/\/$/, '')}/functions/v1/image-proxy?${qp.toString()}`,
    );
  }

  // 2) images.weserv.nl — public CORS-friendly proxy.
  // weserv expects the URL WITHOUT the protocol; it follows redirects so
  // Wikipedia's `Special:FilePath` works out of the box.
  const cleaned = url.replace(/^https?:\/\//, '');
  candidates.push(
    `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}&output=jpg&w=900&h=900&fit=inside`,
  );

  // 3) wsrv.nl — alternative weserv mirror (sometimes faster from EU)
  candidates.push(
    `https://wsrv.nl/?url=${encodeURIComponent(cleaned)}&output=jpg&w=900&h=900&fit=inside`,
  );

  // 4) Direct (works for upload.wikimedia.org, fails for most others due to CORS)
  candidates.push(url);

  // Deduplicate while preserving order
  return Array.from(new Set(candidates));
}

export function proxyImageUrl(url: string): string {
  return getProxyImageCandidates(url)[0] ?? '';
}

/**
 * Best-effort plain proxy that bypasses CORS for non-canvas usage.
 * Use this when you just want to display an <img> (not pixelate it).
 */
export function simpleProxyImage(url: string): string {
  if (!url || isBypassUrl(url)) return url;
  const cleaned = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}&output=jpg`;
}
