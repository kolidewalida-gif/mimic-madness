-- Persistent group messaging and private inbox invalidations. No message text
-- is published to a public channel, and direct_messages stays unpublished.
begin;

create table public.message_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.message_group_members (
  group_id uuid not null references public.message_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index message_group_members_user on public.message_group_members(user_id, group_id);
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.message_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index group_messages_history on public.group_messages(group_id, created_at desc, id);
-- Clients cannot backdate a message to evade unread counters or pagination.
create function public.stamp_group_message()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.content := btrim(new.content);
  return new;
end; $$;
revoke all on function public.stamp_group_message() from public, anon, authenticated;
create trigger stamp_group_message before insert on public.group_messages for each row execute function public.stamp_group_message();
alter table public.message_groups enable row level security;
alter table public.message_group_members enable row level security;
alter table public.group_messages enable row level security;

create function public.is_message_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.message_group_members where group_id = p_group_id and user_id = (select auth.uid()));
$$;
revoke all on function public.is_message_group_member(uuid) from public, anon;
grant execute on function public.is_message_group_member(uuid) to authenticated;
grant select on public.message_groups, public.message_group_members to authenticated;
grant select, insert on public.group_messages to authenticated;
revoke all on public.message_groups, public.message_group_members, public.group_messages from anon;
create policy "Members see their groups" on public.message_groups for select to authenticated using (public.is_message_group_member(id));
create policy "Members see their group roster" on public.message_group_members for select to authenticated using (public.is_message_group_member(group_id));
create policy "Members see group messages" on public.group_messages for select to authenticated using (public.is_message_group_member(group_id));
create policy "Members send as themselves" on public.group_messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_message_group_member(group_id));

-- Restrict private-channel subscriptions even if another broad broadcast policy
-- exists. Existing unrelated topics continue to use their own policies.
create policy "Own player inbox" on realtime.messages for select to authenticated
using (extension = 'broadcast' and (select realtime.topic()) = 'player-inbox:' || (select auth.uid())::text);
create policy "Isolate player inbox topics" on realtime.messages as restrictive for select to authenticated
using ((select realtime.topic()) not like 'player-inbox:%' or (select realtime.topic()) = 'player-inbox:' || (select auth.uid())::text);
create policy "Only server sends player inbox events" on realtime.messages as restrictive for insert to authenticated
with check ((select realtime.topic()) not like 'player-inbox:%');

create function public.notify_player_inbox(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send('{}'::jsonb, 'inbox_changed', 'player-inbox:' || p_user_id::text, true);
end; $$;
revoke all on function public.notify_player_inbox(uuid) from public, anon, authenticated;

create function public.notify_direct_message_inbox()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_player_inbox(new.receiver_id);
  perform public.notify_player_inbox(new.sender_id);
  return new;
end; $$;
revoke all on function public.notify_direct_message_inbox() from public, anon, authenticated;
create trigger direct_message_inbox after insert or update on public.direct_messages for each row execute function public.notify_direct_message_inbox();

create function public.stamp_direct_message()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.read_at := null;
  return new;
end; $$;
revoke all on function public.stamp_direct_message() from public, anon, authenticated;
create trigger stamp_direct_message before insert on public.direct_messages for each row execute function public.stamp_direct_message();

-- The old UPDATE policy allowed a recipient to edit message content. Read
-- receipts are the only fields clients may change.
create function public.guard_direct_message_receipt()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.sender_id is distinct from old.sender_id
    or new.receiver_id is distinct from old.receiver_id or new.content is distinct from old.content
    or new.created_at is distinct from old.created_at then
    raise exception 'A private message is immutable' using errcode = '42501';
  end if;
  if old.read_at is not null then new.read_at := old.read_at;
  elsif new.read_at is not null then new.read_at := now(); end if;
  return new;
end; $$;
revoke all on function public.guard_direct_message_receipt() from public, anon, authenticated;
create trigger guard_direct_message_receipt before update on public.direct_messages for each row execute function public.guard_direct_message_receipt();

create function public.notify_group_inboxes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_user uuid;
begin
  if tg_table_name = 'message_group_members' and tg_op in ('INSERT', 'UPDATE') then
    -- New membership and one's read position only invalidate that user's inbox.
    -- Group edits notify the complete roster once, not N times per bulk insert.
    perform public.notify_player_inbox(new.user_id);
    return new;
  end if;
  if tg_table_name = 'message_groups' then v_group := coalesce(new.id, old.id);
  else v_group := coalesce(new.group_id, old.group_id); end if;
  for v_user in select user_id from public.message_group_members where group_id = v_group loop
    perform public.notify_player_inbox(v_user);
  end loop;
  if tg_table_name = 'message_group_members' and tg_op = 'DELETE' then
    perform public.notify_player_inbox(old.user_id);
  end if;
  return coalesce(new, old);
end; $$;
revoke all on function public.notify_group_inboxes() from public, anon, authenticated;
create trigger group_message_inbox after insert on public.group_messages for each row execute function public.notify_group_inboxes();
create trigger group_member_inbox after insert or update or delete on public.message_group_members for each row execute function public.notify_group_inboxes();
create trigger group_name_inbox after update on public.message_groups for each row execute function public.notify_group_inboxes();

create function public.create_message_group(p_name text, p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_self uuid := auth.uid(); v_ids uuid[]; v_id uuid; v_group uuid;
begin
  if v_self is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select array_agg(distinct member) into v_ids from unnest(p_member_ids) member where member is not null and member <> v_self;
  if coalesce(cardinality(v_ids), 0) < 2 or cardinality(v_ids) > 31 then
    raise exception 'Choose between 2 and 31 friends';
  end if;
  if char_length(btrim(p_name)) not between 1 and 60 then raise exception 'Invalid group name'; end if;
  foreach v_id in array v_ids loop
    if not exists(select 1 from public.friendships where status = 'accepted' and
      ((requester_id = v_self and addressee_id = v_id) or (addressee_id = v_self and requester_id = v_id))) then
      raise exception 'Only accepted friends can be invited' using errcode = '42501';
    end if;
  end loop;
  insert into public.message_groups(name, owner_id) values(btrim(p_name), v_self) returning id into v_group;
  insert into public.message_group_members(group_id, user_id) select v_group, member from unnest(array_append(v_ids, v_self)) member;
  return v_group;
end; $$;

create function public.update_message_group(p_group_id uuid, p_name text, p_add_members uuid[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare v_self uuid := auth.uid(); v_owner uuid; v_ids uuid[]; v_id uuid; v_count integer;
begin
  select owner_id into v_owner from public.message_groups where id = p_group_id for update;
  if v_self is null or v_owner is distinct from v_self or not public.is_message_group_member(p_group_id) then
    raise exception 'Only the group owner can manage it' using errcode = '42501';
  end if;
  if char_length(btrim(p_name)) not between 1 and 60 then raise exception 'Invalid group name'; end if;
  select array_agg(distinct member) into v_ids from unnest(p_add_members) member where member is not null and member <> v_self
    and not exists(select 1 from public.message_group_members where group_id = p_group_id and user_id = member);
  select count(*) into v_count from public.message_group_members where group_id = p_group_id;
  if v_count + coalesce(cardinality(v_ids), 0) > 32 then raise exception '32 members maximum'; end if;
  foreach v_id in array coalesce(v_ids, '{}'::uuid[]) loop
    if not exists(select 1 from public.friendships where status = 'accepted' and
      ((requester_id = v_self and addressee_id = v_id) or (addressee_id = v_self and requester_id = v_id))) then
      raise exception 'Only accepted friends can be invited' using errcode = '42501';
    end if;
    insert into public.message_group_members(group_id, user_id) values(p_group_id, v_id);
  end loop;
  update public.message_groups set name = btrim(p_name) where id = p_group_id;
end; $$;

create function public.leave_message_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_self uuid := auth.uid(); v_owner uuid; v_next uuid;
begin
  select owner_id into v_owner from public.message_groups where id = p_group_id for update;
  if v_self is null or not public.is_message_group_member(p_group_id) then raise exception 'Membership required' using errcode = '42501'; end if;
  delete from public.message_group_members where group_id = p_group_id and user_id = v_self;
  if v_owner = v_self then
    select user_id into v_next from public.message_group_members where group_id = p_group_id order by joined_at, user_id limit 1;
    if v_next is not null then update public.message_groups set owner_id = v_next where id = p_group_id; end if;
  end if;
  -- Empty groups remain archived in the database; leaving does not delete history.
end; $$;

create function public.mark_message_group_read(p_group_id uuid, p_read_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_message_group_member(p_group_id) then raise exception 'Membership required' using errcode = '42501'; end if;
  update public.message_group_members set last_read_at = greatest(last_read_at, least(p_read_until, now()))
  where group_id = p_group_id and user_id = auth.uid() and last_read_at < least(p_read_until, now());
end; $$;

-- A restricted directory: only names and avatars of one's own group members.
create function public.get_message_groups()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(item order by sort_at desc), '[]'::jsonb) from (
    select jsonb_build_object('id', g.id, 'name', g.name, 'owner_id', g.owner_id, 'created_at', g.created_at,
      'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', p.display_name, 'avatar_url', p.avatar_url) order by m.joined_at, m.user_id), '[]'::jsonb)
        from public.message_group_members m left join public.profiles p on p.user_id = m.user_id where m.group_id = g.id),
      'last_message', (select jsonb_build_object('id', id, 'sender_id', sender_id, 'content', content, 'created_at', created_at) from public.group_messages where group_id = g.id order by created_at desc, id desc limit 1),
      'unread_count', (select count(*) from public.group_messages where group_id = g.id and sender_id <> auth.uid() and created_at > own.last_read_at)) item,
      coalesce((select max(created_at) from public.group_messages where group_id = g.id), g.created_at) sort_at
    from public.message_groups g join public.message_group_members own on own.group_id = g.id and own.user_id = auth.uid()
  ) groups;
$$;

revoke all on function public.create_message_group(text, uuid[]), public.update_message_group(uuid, text, uuid[]), public.leave_message_group(uuid), public.mark_message_group_read(uuid, timestamptz), public.get_message_groups() from public, anon;
grant execute on function public.create_message_group(text, uuid[]), public.update_message_group(uuid, text, uuid[]), public.leave_message_group(uuid), public.mark_message_group_read(uuid, timestamptz), public.get_message_groups() to authenticated;
commit;
