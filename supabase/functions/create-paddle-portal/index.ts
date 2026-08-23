import { createClient } from 'npm:@supabase/supabase-js@2.105.4';
import { corsHeaders, paddleApiFetch, type PaddleEnv } from '../_shared/paddle.ts';

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

    const body = (await req.json()) as { environment?: unknown };
    const env: PaddleEnv = body.environment === 'live' ? 'live' : 'sandbox';
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: subscription, error: subscriptionError } = await admin
      .from('subscriptions')
      .select('paddle_customer_id,paddle_subscription_id')
      .eq('user_id', user.id)
      .eq('environment', env)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;

    let customerId = subscription?.paddle_customer_id ?? null;
    if (!customerId) {
      const { data: purchase, error: purchaseError } = await admin
        .from('purchases')
        .select('paddle_customer_id')
        .eq('user_id', user.id)
        .eq('environment', env)
        .not('paddle_customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (purchaseError) throw purchaseError;
      customerId = purchase?.paddle_customer_id ?? null;
    }
    if (!customerId) return json({ error: 'customer_not_found' }, 404);

    const paddleResponse = await paddleApiFetch(
      env,
      `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
      {
        method: 'POST',
        body: JSON.stringify(
          subscription?.paddle_subscription_id
            ? { subscription_ids: [subscription.paddle_subscription_id] }
            : {},
        ),
      },
    );
    const payload = (await paddleResponse.json()) as {
      data?: { urls?: { general?: { overview?: unknown } } };
    };
    const url = payload.data?.urls?.general?.overview;
    if (typeof url !== 'string') throw new Error('Paddle portal URL is missing');

    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.paddle.com')) {
      throw new Error('Paddle portal URL is invalid');
    }
    return json({ url: parsed.toString() });
  } catch (error) {
    console.error('create-paddle-portal error:', error);
    return json({ error: 'portal_unavailable' }, 503);
  }
});
