-- Audio Phone: rounds table
create table if not exists public.audio_phone_rounds (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null,
  round_number integer not null default 1,
  phase text not null default 'instructions',
  current_player_index integer not null default 0,
  player_order text[] not null,
  original_phrase text null,
  max_recording_seconds integer not null default 8,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Audio Phone: recordings table
create table if not exists public.audio_phone_recordings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.audio_phone_rounds(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  player_order_index integer not null,
  storage_path text not null,
  reversed_storage_path text null,
  transcribed_text text null,
  duration_seconds numeric not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_audio_phone_rounds_lobby_created_at on public.audio_phone_rounds(lobby_id, created_at desc);
create index if not exists idx_audio_phone_recordings_round_order on public.audio_phone_recordings(round_id, player_order_index);

-- Enable RLS
alter table public.audio_phone_rounds enable row level security;
alter table public.audio_phone_recordings enable row level security;

-- Policies (app uses anonymous players; keep consistent with existing public game tables)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_rounds' and policyname='Anyone can view audio phone rounds'
  ) then
    create policy "Anyone can view audio phone rounds"
    on public.audio_phone_rounds
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_rounds' and policyname='Anyone can insert audio phone rounds'
  ) then
    create policy "Anyone can insert audio phone rounds"
    on public.audio_phone_rounds
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_rounds' and policyname='Anyone can update audio phone rounds'
  ) then
    create policy "Anyone can update audio phone rounds"
    on public.audio_phone_rounds
    for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_rounds' and policyname='Anyone can delete audio phone rounds'
  ) then
    create policy "Anyone can delete audio phone rounds"
    on public.audio_phone_rounds
    for delete
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_recordings' and policyname='Anyone can view audio phone recordings'
  ) then
    create policy "Anyone can view audio phone recordings"
    on public.audio_phone_recordings
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_recordings' and policyname='Anyone can insert audio phone recordings'
  ) then
    create policy "Anyone can insert audio phone recordings"
    on public.audio_phone_recordings
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_recordings' and policyname='Anyone can update audio phone recordings'
  ) then
    create policy "Anyone can update audio phone recordings"
    on public.audio_phone_recordings
    for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audio_phone_recordings' and policyname='Anyone can delete audio phone recordings'
  ) then
    create policy "Anyone can delete audio phone recordings"
    on public.audio_phone_recordings
    for delete
    using (true);
  end if;
end $$;

-- Realtime / full old row
alter table public.audio_phone_rounds replica identity full;
alter table public.audio_phone_recordings replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.audio_phone_rounds;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.audio_phone_recordings;
  exception when duplicate_object then
    null;
  end;
end $$;

-- Storage bucket for Audio Phone files
insert into storage.buckets (id, name, public)
values ('audio-phone', 'audio-phone', true)
on conflict (id) do update set public = excluded.public;

-- Storage policies for audio-phone bucket
-- (RLS is already enabled on storage.objects)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public can read audio-phone files'
  ) then
    create policy "Public can read audio-phone files"
    on storage.objects
    for select
    using (bucket_id = 'audio-phone');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public can upload audio-phone files'
  ) then
    create policy "Public can upload audio-phone files"
    on storage.objects
    for insert
    with check (bucket_id = 'audio-phone');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public can update audio-phone files'
  ) then
    create policy "Public can update audio-phone files"
    on storage.objects
    for update
    using (bucket_id = 'audio-phone')
    with check (bucket_id = 'audio-phone');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public can delete audio-phone files'
  ) then
    create policy "Public can delete audio-phone files"
    on storage.objects
    for delete
    using (bucket_id = 'audio-phone');
  end if;
end $$;
