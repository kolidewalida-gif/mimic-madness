import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, type PaddleEnv } from '../_shared/paddle.ts';

let cachedClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return cachedClient;
}

type AnyRecord = Record<string, any>;

function externalIds(item: AnyRecord): { priceId?: string; productId?: string } {
  return {
    priceId: item?.price?.import_meta?.external_id ?? undefined,
    productId: item?.product?.import_meta?.external_id ?? undefined,
  };
}

async function handleSubscriptionCreated(data: AnyRecord, env: PaddleEnv) {
  const userId = data.custom_data?.userId;
  if (!userId) {
    console.error('subscription.created without custom_data.userId');
    return;
  }
  const item = data.items?.[0] ?? {};
  const { priceId, productId } = externalIds(item);
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing import_meta.external_id', {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  await getSupabase().from('subscriptions').upsert(
    {
      user_id: userId,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      product_id: productId,
      price_id: priceId,
      status: data.status,
      current_period_start: data.current_billing_period?.starts_at ?? null,
      current_period_end: data.current_billing_period?.ends_at ?? null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'paddle_subscription_id' },
  );
}

async function handleSubscriptionUpdated(data: AnyRecord, env: PaddleEnv) {
  await getSupabase()
    .from('subscriptions')
    .update({
      status: data.status,
      current_period_start: data.current_billing_period?.starts_at ?? null,
      current_period_end: data.current_billing_period?.ends_at ?? null,
      cancel_at_period_end: data.scheduled_change?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

async function handleSubscriptionCanceled(data: AnyRecord, env: PaddleEnv) {
  await getSupabase()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

/** Achat unique « Supporter à vie » : aucune notion d'abonnement côté Paddle. */
async function handleTransactionCompleted(data: AnyRecord, env: PaddleEnv) {
  if (data.subscription_id) return; // déjà couvert par les événements d'abonnement
  const userId = data.custom_data?.userId;
  if (!userId) {
    console.error('transaction.completed without custom_data.userId');
    return;
  }
  const item = data.items?.[0] ?? {};
  const priceId = item?.price?.import_meta?.external_id;
  const productId = item?.price?.product?.import_meta?.external_id ?? priceId;
  if (!priceId) {
    console.warn('Skipping purchase: missing import_meta.external_id', {
      rawPriceId: item?.price?.id,
    });
    return;
  }

  await getSupabase().from('purchases').upsert(
    {
      user_id: userId,
      paddle_transaction_id: data.id,
      paddle_customer_id: data.customer_id ?? null,
      product_id: productId,
      price_id: priceId,
      environment: env,
    },
    { onConflict: 'paddle_transaction_id' },
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const env: PaddleEnv = url.searchParams.get('env') === 'live' ? 'live' : 'sandbox';

  try {
    const event = await verifyWebhook(req, env);
    switch (event.eventType) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data, env);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data, env);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data, env);
        break;
      case 'transaction.completed':
        await handleTransactionCompleted(event.data, env);
        break;
      default:
        console.log('Unhandled event:', event.eventType);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 400 });
  }
});
