-- Durcit les droits Paddle avant leur première mise en production et publie
-- uniquement les lignes que les policies RLS autorisent déjà à lire.

alter table public.subscriptions
  add column if not exists last_event_at timestamptz;

alter table public.purchases
  add column if not exists last_event_at timestamptz;

alter table public.subscriptions
  drop constraint if exists subscriptions_paddle_subscription_id_key;
alter table public.purchases
  drop constraint if exists purchases_paddle_transaction_id_key;

create unique index if not exists subscriptions_paddle_id_environment_key
  on public.subscriptions(paddle_subscription_id, environment);
create unique index if not exists purchases_paddle_id_environment_key
  on public.purchases(paddle_transaction_id, environment);
create index if not exists subscriptions_user_environment_idx
  on public.subscriptions(user_id, environment);
create index if not exists purchases_user_environment_idx
  on public.purchases(user_id, environment);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_environment_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_environment_check
      check (environment in ('sandbox', 'live'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_status_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.purchases'::regclass
      and conname = 'purchases_environment_check'
  ) then
    alter table public.purchases
      add constraint purchases_environment_check
      check (environment in ('sandbox', 'live'));
  end if;
end
$$;

create table if not exists public.payment_webhook_events (
  event_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  event_type text not null,
  occurred_at timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, environment)
);

alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from public, anon, authenticated;
grant all on public.payment_webhook_events to service_role;

-- Un appel authentifié ne peut plus sonder les droits d'un autre compte.
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
      )
    )
  );
$$;

revoke execute on function public.has_ad_free(uuid, text) from public, anon;
grant execute on function public.has_ad_free(uuid, text) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'purchases'
  ) then
    alter publication supabase_realtime add table public.purchases;
  end if;
end
$$;

comment on table public.payment_webhook_events is
  'Journal idempotent des événements Paddle; jamais exposé au navigateur.';
comment on column public.subscriptions.last_event_at is
  'Empêche un webhook Paddle ancien d’écraser un état plus récent.';
comment on column public.purchases.last_event_at is
  'Horodatage du dernier événement Paddle appliqué à cet achat.';
