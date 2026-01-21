/**
 * Proxy external images through a CORS-friendly service
 * This ensures images load correctly in canvas and img tags
 */
export function proxyImageUrl(url: string): string {
  if (!url) return '';
  
  // Don't proxy local images or data URLs
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Use images.weserv.nl as CORS proxy - it's free and reliable
  const encodedUrl = encodeURIComponent(url);
  return `https://images.weserv.nl/?url=${encodedUrl}&w=600&h=600&fit=inside&we`;
}
