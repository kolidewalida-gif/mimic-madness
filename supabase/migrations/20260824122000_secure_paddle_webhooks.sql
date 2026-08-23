begin;

alter table public.purchases
  add column if not exists revoked_at timestamptz,
  add column if not exists revocation_reason text;

create table if not exists public.paddle_checkout_intents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id text not null check (offer_id in ('ad_free_monthly', 'supporter_lifetime')),
  environment text not null check (environment in ('sandbox', 'live')),
  paddle_transaction_id text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_paddle_entity_id text,
  created_at timestamptz not null default now(),
  unique (paddle_transaction_id, environment)
);

create index if not exists paddle_checkout_intents_user_environment_idx
  on public.paddle_checkout_intents(user_id, environment, created_at desc);

create table if not exists public.paddle_adjustments (
  adjustment_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  paddle_transaction_id text not null,
  action text not null check (action in (
    'credit', 'refund', 'chargeback', 'chargeback_reverse',
    'chargeback_warning', 'chargeback_warning_reverse', 'credit_reverse'
  )),
  status text not null check (status in ('pending_approval', 'approved', 'rejected', 'reversed')),
  adjustment_type text check (adjustment_type in ('full', 'partial')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (adjustment_id, environment)
);

create index if not exists paddle_adjustments_transaction_environment_idx
  on public.paddle_adjustments(paddle_transaction_id, environment);

alter table public.paddle_checkout_intents enable row level security;
alter table public.paddle_adjustments enable row level security;

revoke all privileges
  on table public.paddle_checkout_intents, public.paddle_adjustments
  from public, anon, authenticated;
grant all privileges
  on table public.paddle_checkout_intents, public.paddle_adjustments
  to service_role;

create or replace function public.begin_paddle_webhook_event(
  p_event_id text,
  p_environment text,
  p_event_type text,
  p_occurred_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_processed_at timestamptz;
begin
  insert into public.payment_webhook_events (
    event_id, environment, event_type, occurred_at, attempts,
    processed_at, last_error, created_at, updated_at
  ) values (
    p_event_id, p_environment, p_event_type, p_occurred_at, 1,
    null, null, now(), now()
  )
  on conflict (event_id, environment) do update
    set attempts = public.payment_webhook_events.attempts + 1,
        last_error = null,
        updated_at = now()
  returning processed_at into v_processed_at;

  return v_processed_at is null;
end;
$$;

create or replace function public.finish_paddle_webhook_event(
  p_event_id text,
  p_environment text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.payment_webhook_events
  set processed_at = now(), last_error = null, updated_at = now()
  where event_id = p_event_id and environment = p_environment;
$$;

create or replace function public.claim_paddle_checkout_intent(
  p_intent_id uuid,
  p_transaction_id text,
  p_environment text,
  p_offer_id text,
  p_entity_id text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent public.paddle_checkout_intents%rowtype;
begin
  select i.* into v_intent
  from public.paddle_checkout_intents i
  where i.environment = p_environment
    and i.offer_id = p_offer_id
    and i.paddle_transaction_id = p_transaction_id
    and i.expires_at >= p_occurred_at
    and (p_intent_id is null or i.id = p_intent_id)
  for update;

  if v_intent.id is null then
    raise exception 'No trusted Paddle checkout intent matches this event';
  end if;
  if v_intent.claimed_paddle_entity_id is not null
     and v_intent.claimed_paddle_entity_id <> p_entity_id then
    raise exception 'Paddle checkout intent is already linked to another entity';
  end if;

  update public.paddle_checkout_intents
  set claimed_at = coalesce(claimed_at, now()),
      claimed_paddle_entity_id = coalesce(claimed_paddle_entity_id, p_entity_id)
  where id = v_intent.id;

  return v_intent.user_id;
end;
$$;

create or replace function public.refresh_paddle_lifetime_revocation(
  p_transaction_id text,
  p_environment text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_revoked_at timestamptz;
  v_reason text;
begin
  select a.occurred_at, a.action
  into v_revoked_at, v_reason
  from public.paddle_adjustments a
  where a.paddle_transaction_id = p_transaction_id
    and a.environment = p_environment
    and a.status = 'approved'
    and a.action in ('refund', 'chargeback')
  order by a.occurred_at asc
  limit 1;

  update public.purchases
  set revoked_at = v_revoked_at,
      revocation_reason = v_reason
  where paddle_transaction_id = p_transaction_id
    and environment = p_environment;
end;
$$;

create or replace function public.apply_paddle_subscription_event(
  p_event_id text,
  p_environment text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_subscription_id text,
  p_transaction_id text,
  p_checkout_intent_id uuid,
  p_customer_id text,
  p_product_id text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_existing_user_id uuid;
  v_rows integer;
  v_result text := 'applied';
begin
  if not public.begin_paddle_webhook_event(
    p_event_id, p_environment, p_event_type, p_occurred_at
  ) then
    return 'duplicate';
  end if;

  select s.user_id into v_existing_user_id
  from public.subscriptions s
  where s.paddle_subscription_id = p_subscription_id
    and s.environment = p_environment
  for update;

  if v_existing_user_id is not null then
    v_user_id := v_existing_user_id;
  else
    if p_transaction_id is null then
      raise exception 'A new Paddle subscription requires its originating transaction';
    end if;
    v_user_id := public.claim_paddle_checkout_intent(
      p_checkout_intent_id,
      p_transaction_id,
      p_environment,
      'ad_free_monthly',
      p_subscription_id,
      p_occurred_at
    );
  end if;

  insert into public.subscriptions (
    user_id, paddle_subscription_id, paddle_customer_id, product_id, price_id,
    status, current_period_start, current_period_end, cancel_at_period_end,
    environment, last_event_at, created_at, updated_at
  ) values (
    v_user_id, p_subscription_id, p_customer_id, p_product_id, 'ad_free_monthly',
    p_status, p_period_start, p_period_end, p_cancel_at_period_end,
    p_environment, p_occurred_at, now(), now()
  )
  on conflict (paddle_subscription_id, environment) do update
    set paddle_customer_id = excluded.paddle_customer_id,
        product_id = excluded.product_id,
        price_id = excluded.price_id,
        status = excluded.status,
        current_period_start = coalesce(excluded.current_period_start, public.subscriptions.current_period_start),
        current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end),
        cancel_at_period_end = excluded.cancel_at_period_end,
        last_event_at = excluded.last_event_at,
        updated_at = now()
  where public.subscriptions.user_id = excluded.user_id
    and (
      public.subscriptions.last_event_at is null
      or public.subscriptions.last_event_at < excluded.last_event_at
    );

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    select s.user_id into v_existing_user_id
    from public.subscriptions s
    where s.paddle_subscription_id = p_subscription_id
      and s.environment = p_environment;
    if v_existing_user_id is distinct from v_user_id then
      raise exception 'Paddle subscription user mismatch';
    end if;
    v_result := 'stale';
  end if;

  perform public.finish_paddle_webhook_event(p_event_id, p_environment);
  return v_result;
end;
$$;

create or replace function public.apply_paddle_lifetime_transaction_event(
  p_event_id text,
  p_environment text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_transaction_id text,
  p_checkout_intent_id uuid,
  p_customer_id text,
  p_product_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_existing_user_id uuid;
  v_rows integer;
  v_result text := 'applied';
begin
  if not public.begin_paddle_webhook_event(
    p_event_id, p_environment, p_event_type, p_occurred_at
  ) then
    return 'duplicate';
  end if;

  v_user_id := public.claim_paddle_checkout_intent(
    p_checkout_intent_id,
    p_transaction_id,
    p_environment,
    'supporter_lifetime',
    p_transaction_id,
    p_occurred_at
  );

  insert into public.purchases (
    user_id, paddle_transaction_id, paddle_customer_id, product_id, price_id,
    environment, last_event_at, created_at
  ) values (
    v_user_id, p_transaction_id, p_customer_id, p_product_id, 'supporter_lifetime',
    p_environment, p_occurred_at, now()
  )
  on conflict (paddle_transaction_id, environment) do update
    set paddle_customer_id = excluded.paddle_customer_id,
        product_id = excluded.product_id,
        price_id = excluded.price_id,
        last_event_at = excluded.last_event_at
  where public.purchases.user_id = excluded.user_id
    and (
      public.purchases.last_event_at is null
      or public.purchases.last_event_at < excluded.last_event_at
    );

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    select p.user_id into v_existing_user_id
    from public.purchases p
    where p.paddle_transaction_id = p_transaction_id
      and p.environment = p_environment;
    if v_existing_user_id is distinct from v_user_id then
      raise exception 'Paddle transaction user mismatch';
    end if;
    v_result := 'stale';
  end if;

  perform public.refresh_paddle_lifetime_revocation(p_transaction_id, p_environment);
  perform public.finish_paddle_webhook_event(p_event_id, p_environment);
  return v_result;
end;
$$;

create or replace function public.apply_paddle_adjustment_event(
  p_event_id text,
  p_environment text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_adjustment_id text,
  p_transaction_id text,
  p_action text,
  p_status text,
  p_adjustment_type text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
  v_result text := 'applied';
begin
  if not public.begin_paddle_webhook_event(
    p_event_id, p_environment, p_event_type, p_occurred_at
  ) then
    return 'duplicate';
  end if;

  insert into public.paddle_adjustments (
    adjustment_id, environment, paddle_transaction_id, action, status,
    adjustment_type, occurred_at, created_at, updated_at
  ) values (
    p_adjustment_id, p_environment, p_transaction_id, p_action, p_status,
    p_adjustment_type, p_occurred_at, now(), now()
  )
  on conflict (adjustment_id, environment) do update
    set paddle_transaction_id = excluded.paddle_transaction_id,
        action = excluded.action,
        status = excluded.status,
        adjustment_type = excluded.adjustment_type,
        occurred_at = excluded.occurred_at,
        updated_at = now()
  where public.paddle_adjustments.occurred_at < excluded.occurred_at;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then v_result := 'stale'; end if;

  perform public.refresh_paddle_lifetime_revocation(p_transaction_id, p_environment);
  perform public.finish_paddle_webhook_event(p_event_id, p_environment);
  return v_result;
end;
$$;

create or replace function public.record_paddle_webhook_failure(
  p_event_id text,
  p_environment text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_last_error text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.payment_webhook_events (
    event_id, environment, event_type, occurred_at, attempts,
    processed_at, last_error, created_at, updated_at
  ) values (
    p_event_id, p_environment, p_event_type, p_occurred_at, 1,
    null, left(p_last_error, 1000), now(), now()
  )
  on conflict (event_id, environment) do update
    set attempts = public.payment_webhook_events.attempts + 1,
        last_error = left(excluded.last_error, 1000),
        updated_at = now()
    where public.payment_webhook_events.processed_at is null;
$$;

create or replace function public.has_ad_free(
  user_uuid uuid,
  check_env text default 'live'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (
    (
      (select auth.uid()) = user_uuid
      or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    )
    and check_env in ('sandbox', 'live')
    and (
      exists (
        select 1
        from public.subscriptions
        where user_id = user_uuid
          and environment = check_env
          and price_id = 'ad_free_monthly'
          and status in ('active', 'trialing', 'past_due', 'canceled')
          and current_period_end is not null
          and current_period_end > now()
      )
      or exists (
        select 1
        from public.purchases
        where user_id = user_uuid
          and environment = check_env
          and price_id = 'supporter_lifetime'
          and revoked_at is null
      )
    )
  );
$$;

revoke all privileges on function public.begin_paddle_webhook_event(text, text, text, timestamptz) from public, anon, authenticated;
revoke all privileges on function public.finish_paddle_webhook_event(text, text) from public, anon, authenticated;
revoke all privileges on function public.claim_paddle_checkout_intent(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all privileges on function public.refresh_paddle_lifetime_revocation(text, text) from public, anon, authenticated;
revoke all privileges on function public.apply_paddle_subscription_event(text, text, text, timestamptz, text, text, uuid, text, text, text, timestamptz, timestamptz, boolean) from public, anon, authenticated;
revoke all privileges on function public.apply_paddle_lifetime_transaction_event(text, text, text, timestamptz, text, uuid, text, text) from public, anon, authenticated;
revoke all privileges on function public.apply_paddle_adjustment_event(text, text, text, timestamptz, text, text, text, text, text) from public, anon, authenticated;
revoke all privileges on function public.record_paddle_webhook_failure(text, text, text, timestamptz, text) from public, anon, authenticated;

grant execute on function public.apply_paddle_subscription_event(text, text, text, timestamptz, text, text, uuid, text, text, text, timestamptz, timestamptz, boolean) to service_role;
grant execute on function public.apply_paddle_lifetime_transaction_event(text, text, text, timestamptz, text, uuid, text, text) to service_role;
grant execute on function public.apply_paddle_adjustment_event(text, text, text, timestamptz, text, text, text, text, text) to service_role;
grant execute on function public.record_paddle_webhook_failure(text, text, text, timestamptz, text) to service_role;

revoke execute on function public.has_ad_free(uuid, text) from public, anon;
grant execute on function public.has_ad_free(uuid, text) to authenticated, service_role;

comment on table public.paddle_checkout_intents is
  'Liaison privée entre un utilisateur authentifié et une transaction Paddle créée côté serveur.';
comment on table public.paddle_adjustments is
  'État privé des remboursements et contestations Paddle utilisé pour révoquer un achat à vie.';
comment on column public.purchases.revoked_at is
  'Date de révocation du droit à vie après remboursement ou contestation approuvée.';

commit;
