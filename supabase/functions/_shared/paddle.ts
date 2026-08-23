/**
 * Accès Paddle mutualisé pour les fonctions serveur.
 * Les clés API restent dans les secrets Edge Functions et ne sont jamais
 * exposées au navigateur.
 */
export type PaddleEnv = 'sandbox' | 'live';

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

type PaddleOfferId = 'ad_free_monthly' | 'supporter_lifetime';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function environmentVariable(env: PaddleEnv, suffix: string): string {
  return `PADDLE_${env === 'live' ? 'LIVE' : 'SANDBOX'}_${suffix}`;
}

function requiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getConfiguredPriceId(env: PaddleEnv, offer: PaddleOfferId): string {
  const suffix = offer === 'ad_free_monthly'
    ? 'MONTHLY_PRICE_ID'
    : 'LIFETIME_PRICE_ID';
  const name = environmentVariable(env, suffix);
  const priceId = requiredEnvironmentVariable(name);
  if (!/^pri_[a-z0-9]+$/i.test(priceId)) {
    throw new Error(`${name} is not a valid Paddle price ID`);
  }
  return priceId;
}

export async function paddleApiFetch(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const apiKey = requiredEnvironmentVariable(environmentVariable(env, 'API_KEY'));
  const baseUrl = env === 'live'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Paddle API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function hmacHex(secret: string, value: string): Promise<string> {
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
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signatureBytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export interface VerifiedPaddleEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

/** Vérifie la signature et refuse les replays dont l'horodatage est trop ancien. */
export async function verifyWebhook(
  req: Request,
  env: PaddleEnv,
): Promise<VerifiedPaddleEvent> {
  const secretName = env === 'live'
    ? 'PAYMENTS_LIVE_WEBHOOK_SECRET'
    : 'PAYMENTS_SANDBOX_WEBHOOK_SECRET';
  const secret = Deno.env.get(secretName);
  if (!secret) throw new Error(`${secretName} is not configured`);

  const signature = req.headers.get('Paddle-Signature');
  if (!signature) throw new Error('Missing Paddle-Signature header');

  let timestamp = '';
  const expectedSignatures: string[] = [];
  signature.split(';').forEach((chunk) => {
    const separator = chunk.indexOf('=');
    if (separator < 0) return;
    const key = chunk.slice(0, separator).trim();
    const value = chunk.slice(separator + 1).trim();
    if (key === 'ts') timestamp = value;
    if (key === 'h1' && value) expectedSignatures.push(value);
  });
  if (!timestamp || expectedSignatures.length === 0) {
    throw new Error('Malformed Paddle-Signature header');
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Math.floor(Date.now() / 1_000) - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS
  ) {
    throw new Error('Stale Paddle signature');
  }

  const rawBody = await req.text();
  const computed = await hmacHex(secret, `${timestamp}:${rawBody}`);
  if (!expectedSignatures.some((candidate) => timingSafeEqual(computed, candidate))) {
    throw new Error('Invalid Paddle signature');
  }

  const payload = JSON.parse(rawBody) as {
    event_id?: unknown;
    event_type?: unknown;
    occurred_at?: unknown;
    data?: unknown;
  };
  if (
    typeof payload.event_id !== 'string' ||
    typeof payload.event_type !== 'string' ||
    typeof payload.occurred_at !== 'string' ||
    !payload.data ||
    typeof payload.data !== 'object' ||
    Array.isArray(payload.data)
  ) {
    throw new Error('Malformed Paddle payload');
  }
  if (!Number.isFinite(Date.parse(payload.occurred_at))) {
    throw new Error('Invalid Paddle event date');
  }

  return {
    eventId: payload.event_id,
    eventType: payload.event_type,
    occurredAt: payload.occurred_at,
    data: payload.data as Record<string, unknown>,
  };
}
