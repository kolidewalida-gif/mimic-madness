import { createClient } from 'npm:@supabase/supabase-js@2.105.4';
import {
  getConfiguredPriceId,
  verifyWebhook,
  type PaddleEnv,
  type VerifiedPaddleEvent,
} from '../_shared/paddle.ts';

const AD_FREE_PRICE = 'ad_free_monthly';
const LIFETIME_PRICE = 'supporter_lifetime';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

let cachedClient: SupabaseAdmin | null = null;
function getSupabase(): SupabaseAdmin {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cachedClient;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nestedRecord(record: JsonRecord | null, key: string): JsonRecord | null {
  return asRecord(record?.[key]);
}

function firstItem(data: JsonRecord): JsonRecord {
  const items = Array.isArray(data.items) ? data.items : [];
  return asRecord(items[0]) ?? {};
}

function paddleIds(item: JsonRecord): {
  paddlePriceId: string | null;
  paddleProductId: string | null;
} {
  const price = nestedRecord(item, 'price');
  const directProduct = nestedRecord(item, 'product');
  const nestedProduct = nestedRecord(price, 'product');
  return {
    paddlePriceId: asString(price?.id),
    paddleProductId:
      asString(directProduct?.id) ??
      asString(nestedProduct?.id) ??
      asString(price?.product_id),
  };
}

function checkoutIntentId(data: JsonRecord): string | null {
  const value = asString(nestedRecord(data, 'custom_data')?.checkout_intent_id);
  return value && UUID_PATTERN.test(value) ? value : null;
}

async function handleSubscription(
  admin: SupabaseAdmin,
  event: VerifiedPaddleEvent,
  env: PaddleEnv,
): Promise<string> {
  const data = event.data;
  const item = firstItem(data);
  const { paddlePriceId, paddleProductId } = paddleIds(item);
  if (!paddlePriceId || paddlePriceId !== getConfiguredPriceId(env, AD_FREE_PRICE)) {
    return 'ignored';
  }

  const subscriptionId = asString(data.id);
  const customerId = asString(data.customer_id);
  const status = asString(data.status);
  if (!subscriptionId || !customerId || !status || !paddleProductId) {
    throw new Error('Incomplete Paddle subscription event');
  }

  const billingPeriod = nestedRecord(data, 'current_billing_period');
  const scheduledChange = nestedRecord(data, 'scheduled_change');
  const { data: result, error } = await admin.rpc('apply_paddle_subscription_event', {
    p_event_id: event.eventId,
    p_environment: env,
    p_event_type: event.eventType,
    p_occurred_at: event.occurredAt,
    p_subscription_id: subscriptionId,
    p_transaction_id: asString(data.transaction_id),
    p_checkout_intent_id: checkoutIntentId(data),
    p_customer_id: customerId,
    p_product_id: paddleProductId,
    p_status: status,
    p_period_start: asString(billingPeriod?.starts_at),
    p_period_end: asString(billingPeriod?.ends_at),
    p_cancel_at_period_end: scheduledChange?.action === 'cancel',
  });
  if (error) throw error;
  return typeof result === 'string' ? result : 'applied';
}

async function handleTransaction(
  admin: SupabaseAdmin,
  event: VerifiedPaddleEvent,
  env: PaddleEnv,
): Promise<string> {
  const data = event.data;
  if (asString(data.subscription_id)) return 'ignored';

  const item = firstItem(data);
  const { paddlePriceId, paddleProductId } = paddleIds(item);
  if (!paddlePriceId || paddlePriceId !== getConfiguredPriceId(env, LIFETIME_PRICE)) {
    return 'ignored';
  }

  const transactionId = asString(data.id);
  if (!transactionId || !paddleProductId) {
    throw new Error('Incomplete Paddle transaction event');
  }

  const { data: result, error } = await admin.rpc(
    'apply_paddle_lifetime_transaction_event',
    {
      p_event_id: event.eventId,
      p_environment: env,
      p_event_type: event.eventType,
      p_occurred_at: event.occurredAt,
      p_transaction_id: transactionId,
      p_checkout_intent_id: checkoutIntentId(data),
      p_customer_id: asString(data.customer_id),
      p_product_id: paddleProductId,
    },
  );
  if (error) throw error;
  return typeof result === 'string' ? result : 'applied';
}

async function handleAdjustment(
  admin: SupabaseAdmin,
  event: VerifiedPaddleEvent,
  env: PaddleEnv,
): Promise<string> {
  const data = event.data;
  const adjustmentId = asString(data.id);
  const transactionId = asString(data.transaction_id);
  const action = asString(data.action);
  const status = asString(data.status);
  const adjustmentType = asString(data.type);
  if (!adjustmentId || !transactionId || !action || !status) {
    throw new Error('Incomplete Paddle adjustment event');
  }

  const { data: result, error } = await admin.rpc('apply_paddle_adjustment_event', {
    p_event_id: event.eventId,
    p_environment: env,
    p_event_type: event.eventType,
    p_occurred_at: event.occurredAt,
    p_adjustment_id: adjustmentId,
    p_transaction_id: transactionId,
    p_action: action,
    p_status: status,
    p_adjustment_type: adjustmentType,
  });
  if (error) throw error;
  return typeof result === 'string' ? result : 'applied';
}

async function processEvent(
  admin: SupabaseAdmin,
  event: VerifiedPaddleEvent,
  env: PaddleEnv,
): Promise<string> {
  switch (event.eventType) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.canceled':
      return handleSubscription(admin, event, env);
    case 'transaction.completed':
      return handleTransaction(admin, event, env);
    case 'adjustment.created':
    case 'adjustment.updated':
      return handleAdjustment(admin, event, env);
    default:
      console.log('Unhandled Paddle event:', event.eventType);
      return 'ignored';
  }
}

async function recordEventFailure(
  admin: SupabaseAdmin,
  event: VerifiedPaddleEvent,
  env: PaddleEnv,
  cause: unknown,
) {
  const message = cause instanceof Error ? cause.message : 'Unknown error';
  const { error } = await admin.rpc('record_paddle_webhook_failure', {
    p_event_id: event.eventId,
    p_environment: env,
    p_event_type: event.eventType,
    p_occurred_at: event.occurredAt,
    p_last_error: message.slice(0, 1_000),
  });
  if (error) console.error('Paddle webhook failure journal error:', error);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const env: PaddleEnv = new URL(req.url).searchParams.get('env') === 'live'
    ? 'live'
    : 'sandbox';

  let event: VerifiedPaddleEvent;
  try {
    event = await verifyWebhook(req, env);
  } catch (error) {
    console.error('Paddle webhook verification failed:', error);
    return json({ error: 'invalid_webhook' }, 400);
  }

  const admin = getSupabase();
  try {
    const result = await processEvent(admin, event, env);
    return json({ received: true, result }, 200);
  } catch (error) {
    console.error('Paddle webhook processing failed:', error);
    await recordEventFailure(admin, event, env, error);
    return json({ error: 'processing_failed' }, 500);
  }
});
