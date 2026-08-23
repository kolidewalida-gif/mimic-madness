import { createClient } from 'npm:@supabase/supabase-js@2.105.4';
import {
  corsHeaders,
  getConfiguredPriceId,
  paddleApiFetch,
  type PaddleEnv,
} from '../_shared/paddle.ts';

type OfferId = 'ad_free_monthly' | 'supporter_lifetime';

const EXPECTED_OFFERS: Record<OfferId, {
  amount: string;
  currency: 'EUR';
  recurring: boolean;
}> = {
  ad_free_monthly: { amount: '199', currency: 'EUR', recurring: true },
  supporter_lifetime: { amount: '399', currency: 'EUR', recurring: false },
};

interface PaddlePrice {
  id?: unknown;
  status?: unknown;
  unit_price?: { amount?: unknown; currency_code?: unknown };
  billing_cycle?: { interval?: unknown; frequency?: unknown } | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase function environment is incomplete');
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as { priceId?: unknown; environment?: unknown };
    if (typeof body.priceId !== 'string' || !(body.priceId in EXPECTED_OFFERS)) {
      return json({ error: 'unknown_offer' }, 400);
    }
    const offerId = body.priceId as OfferId;
    const expected = EXPECTED_OFFERS[offerId];
    const env: PaddleEnv = body.environment === 'live' ? 'live' : 'sandbox';

    const configuredPriceId = getConfiguredPriceId(env, offerId);
    const priceResponse = await paddleApiFetch(
      env,
      `/prices/${encodeURIComponent(configuredPriceId)}`,
    );
    const pricePayload = (await priceResponse.json()) as { data?: PaddlePrice };
    const price = pricePayload.data;
    const isMonthly =
      price?.billing_cycle?.interval === 'month' &&
      price.billing_cycle.frequency === 1;
    const isOneTime = price?.billing_cycle == null;

    if (
      price?.id !== configuredPriceId ||
      price.status !== 'active' ||
      price.unit_price?.amount !== expected.amount ||
      price.unit_price?.currency_code !== expected.currency ||
      (expected.recurring ? !isMonthly : !isOneTime)
    ) {
      console.error('Paddle catalog mismatch', {
        offerId,
        environment: env,
        amount: price?.unit_price?.amount,
        currency: price?.unit_price?.currency_code,
        billingCycle: price?.billing_cycle,
      });
      return json({ error: 'catalog_mismatch' }, 409);
    }

    const checkoutIntentId = crypto.randomUUID();
    const transactionResponse = await paddleApiFetch(env, '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ price_id: configuredPriceId, quantity: 1 }],
        collection_mode: 'automatic',
        custom_data: { checkout_intent_id: checkoutIntentId },
      }),
    });
    const transactionPayload = (await transactionResponse.json()) as {
      data?: { id?: unknown };
    };
    const transactionId = transactionPayload.data?.id;
    if (typeof transactionId !== 'string' || !/^txn_[a-z0-9]+$/i.test(transactionId)) {
      throw new Error('Paddle transaction ID is missing');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
    const { error: intentError } = await admin.from('paddle_checkout_intents').insert({
      id: checkoutIntentId,
      user_id: user.id,
      offer_id: offerId,
      environment: env,
      paddle_transaction_id: transactionId,
      expires_at: expiresAt,
    });
    if (intentError) throw intentError;

    return json({
      transactionId,
      paddleId: price.id,
      amount: expected.amount,
      currency: expected.currency,
      billingCycle: expected.recurring ? 'month' : null,
    });
  } catch (error) {
    console.error('get-paddle-price error:', error);
    return json({ error: 'offer_unavailable' }, 503);
  }
});
