begin;

-- Repartir d'un état déterministe, même si les droits historiques ont dérivé.
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all privileges
  on table
    public.subscriptions,
    public.purchases,
    public.payment_webhook_events
  from public, anon, authenticated;

grant select
  on table public.subscriptions, public.purchases
  to authenticated;

grant all privileges
  on table
    public.subscriptions,
    public.purchases,
    public.payment_webhook_events
  to service_role;

-- Une policy par table, limitée à la lecture du compte courant.
drop policy if exists "Users can view own subscription"
  on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own purchases"
  on public.purchases;
create policy "Users can view own purchases"
  on public.purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- La RPC ne peut pas être découverte par un client anonyme.
revoke all privileges
  on function public.has_ad_free(uuid, text)
  from public, anon;
grant execute
  on function public.has_ad_free(uuid, text)
  to authenticated, service_role;

commit;
