/**
 * Accès Paddle mutualisé pour les fonctions serveur.
 * Les clés ne sont jamais utilisées directement : tout passe par la passerelle
 * de connecteurs, qui injecte les identifiants de l'environnement demandé.
 */
export type PaddleEnv = 'sandbox' | 'live';

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev/paddle';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function connectionKey(env: PaddleEnv): string {
  const name = env === 'live' ? 'PADDLE_LIVE_API_KEY' : 'PADDLE_SANDBOX_API_KEY';
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) throw new Error('LOVABLE_API_KEY is not configured');

  const response = await fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': connectionKey(env),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Paddle gateway ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie la signature `Paddle-Signature` puis renvoie l'événement décodé.
 * Le corps brut doit être lu une seule fois : on le renvoie aussi.
 */
export async function verifyWebhook(
  req: Request,
  env: PaddleEnv,
): Promise<{ eventType: string; data: Record<string, unknown> }> {
  const secretName = env === 'live'
    ? 'PAYMENTS_LIVE_WEBHOOK_SECRET'
    : 'PAYMENTS_SANDBOX_WEBHOOK_SECRET';
  const secret = Deno.env.get(secretName);
  if (!secret) throw new Error(`${secretName} is not configured`);

  const signature = req.headers.get('Paddle-Signature');
  if (!signature) throw new Error('Missing Paddle-Signature header');

  const parts = Object.fromEntries(
    signature.split(';').map((chunk) => {
      const [key, value] = chunk.split('=');
      return [key?.trim() ?? '', value?.trim() ?? ''];
    }),
  );
  const timestamp = parts.ts;
  const expected = parts.h1;
  if (!timestamp || !expected) throw new Error('Malformed Paddle-Signature header');

  const rawBody = await req.text();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}:${rawBody}`),
  );
  const computed = Array.from(new Uint8Array(signatureBytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (!timingSafeEqual(computed, expected)) throw new Error('Invalid Paddle signature');

  const payload = JSON.parse(rawBody) as { event_type: string; data: Record<string, unknown> };
  return { eventType: payload.event_type, data: payload.data };
}
