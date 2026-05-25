import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_HOSTS = new Set([
  "cdn.myanimelist.net",
  "image.tmdb.org",
  "cdn.cloudflare.steamstatic.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "en.wikipedia.org",
  "fr.wikipedia.org",
  "picsum.photos",
  "i.imgur.com",
  "static.wikia.nocookie.net",
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety cap
const TIMEOUT_MS = 8000; // 8s max fetch time

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const target = requestUrl.searchParams.get("url") ?? "";

    if (!target) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new Response(JSON.stringify({ error: "Unsupported protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "Host not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlurRushImageProxy/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error ${upstream.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentLength = upstream.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        // Cache aggressively — images don't change
        "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
        "CDN-Cache-Control": "public, max-age=604800",
      },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
