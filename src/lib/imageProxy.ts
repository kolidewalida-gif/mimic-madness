/**
 * Image proxy helpers.
 *
 * Goal: make remote images usable inside <canvas> without CORS/taint issues.
 *
 * Strategy:
 * 1) Prefer our backend image-proxy (stable, CORS headers under our control)
 * 2) Fallback to images.weserv.nl
 * 3) Last resort: direct URL
 */

const isBypassUrl = (url: string) =>
  url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');

export function getProxyImageCandidates(url: string): string[] {
  if (!url) return [];
  if (isBypassUrl(url)) return [url];

  const candidates: string[] = [];

  // 1) Backend proxy (preferred)
  const base = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
  if (base) {
    const qp = new URLSearchParams({ url });
    candidates.push(`${base.replace(/\/$/, '')}/functions/v1/image-proxy?${qp.toString()}`);
  }

  // 2) Public proxy fallback
  const cleaned = url.replace(/^https?:\/\//, '');
  candidates.push(`https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}&w=900&h=900&fit=inside&we`);

  // 3) Direct
  candidates.push(url);

  // Deduplicate
  return Array.from(new Set(candidates));
}

export function proxyImageUrl(url: string): string {
  return getProxyImageCandidates(url)[0] ?? '';
}
