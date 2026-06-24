
-- 1. FOLLOWS
create table if not exists public.social_follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_follows_follower  on public.social_follows(follower_id);
create index if not exists idx_follows_following on public.social_follows(following_id);

grant select, insert, delete on public.social_follows to authenticated;
grant all on public.social_follows to service_role;

alter table public.social_follows enable row level security;

drop policy if exists "follows_select" on public.social_follows;
create policy "follows_select" on public.social_follows
  for select to authenticated using (true);
drop policy if exists "follows_insert" on public.social_follows;
create policy "follows_insert" on public.social_follows
  for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "follows_delete" on public.social_follows;
create policy "follows_delete" on public.social_follows
  for delete to authenticated using (follower_id = auth.uid());

-- 2. RÉACTIONS EMOJI
create table if not exists public.social_post_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.social_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);
create index if not exists idx_reactions_post on public.social_post_reactions(post_id);

grant select, insert, delete on public.social_post_reactions to authenticated;
grant all on public.social_post_reactions to service_role;

alter table public.social_post_reactions enable row level security;

drop policy if exists "reactions_select" on public.social_post_reactions;
create policy "reactions_select" on public.social_post_reactions
  for select to authenticated using (true);
drop policy if exists "reactions_insert" on public.social_post_reactions;
create policy "reactions_insert" on public.social_post_reactions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reactions_delete" on public.social_post_reactions;
create policy "reactions_delete" on public.social_post_reactions
  for delete to authenticated using (user_id = auth.uid());

-- 3. NOTIFICATIONS
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  actor_name text,
  type       text not null,
  post_id    uuid references public.social_posts(id) on delete cascade,
  emoji      text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (actor_id = auth.uid());
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- 4. TRIGGERS
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  select owner_id into v_owner from social_posts where id = NEW.post_id;
  if v_owner is null or v_owner = NEW.user_id then return NEW; end if;
  select display_name into v_name from profiles where user_id = NEW.user_id;
  insert into notifications(user_id, actor_id, actor_name, type, post_id)
  values (v_owner, NEW.user_id, coalesce(v_name, 'Quelqu''un'), 'like', NEW.post_id);
  return NEW;
end; $$;
drop trigger if exists trg_notify_on_like on public.social_post_likes;
create trigger trg_notify_on_like after insert on public.social_post_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  select owner_id into v_owner from social_posts where id = NEW.post_id;
  if v_owner is null or v_owner = NEW.user_id then return NEW; end if;
  select display_name into v_name from profiles where user_id = NEW.user_id;
  insert into notifications(user_id, actor_id, actor_name, type, post_id, emoji)
  values (v_owner, NEW.user_id, coalesce(v_name, 'Quelqu''un'), 'reaction', NEW.post_id, NEW.emoji);
  return NEW;
end; $$;
drop trigger if exists trg_notify_on_reaction on public.social_post_reactions;
create trigger trg_notify_on_reaction after insert on public.social_post_reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select display_name into v_name from profiles where user_id = NEW.follower_id;
  insert into notifications(user_id, actor_id, actor_name, type)
  values (NEW.following_id, NEW.follower_id, coalesce(v_name, 'Quelqu''un'), 'follow');
  return NEW;
end; $$;
drop trigger if exists trg_notify_on_follow on public.social_follows;
create trigger trg_notify_on_follow after insert on public.social_follows
  for each row execute function public.notify_on_follow();

-- 5. REALTIME
do $$ begin
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.social_follows; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.social_post_reactions; exception when duplicate_object then null; end;
end $$;
