import { corsHeaders, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { priceId, environment } = (await req.json()) as {
      priceId?: string;
      environment?: PaddleEnv;
    };
    if (!priceId) throw new Error('priceId is required');
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    const response = await gatewayFetch(
      env,
      `/prices?external_id=${encodeURIComponent(priceId)}&status=active`,
    );
    const payload = (await response.json()) as { data?: Array<{ id: string }> };
    const paddleId = payload.data?.[0]?.id;
    if (!paddleId) throw new Error(`Price not found: ${priceId}`);

    return new Response(JSON.stringify({ paddleId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('get-paddle-price error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
