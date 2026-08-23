create table public.ad_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  analytics_session_id uuid not null,
  impression_id uuid not null,
  event_type text not null check (
    event_type in ('scheduled', 'requested', 'loaded', 'viewable', 'cancelled', 'error')
  ),
  screen text not null check (
    screen in ('home', 'round_break', 'results_podium')
  ),
  placement text not null check (
    placement in ('home_rail_left', 'home_rail_right', 'round_break_banner', 'results_podium_banner')
  ),
  game_mode text check (
    game_mode is null or game_mode in (
      'normal', '2v2', 'quiz', 'audiophone', 'pixoguess',
      'monopoly', 'undercover', 'memorise', 'mimic'
    )
  ),
  is_authenticated boolean not null,
  error_code text,
  constraint ad_events_impression_event_key unique (impression_id, event_type),
  constraint ad_events_screen_placement_check check (
    (screen = 'home' and placement in ('home_rail_left', 'home_rail_right'))
    or (screen = 'round_break' and placement = 'round_break_banner')
    or (screen = 'results_podium' and placement = 'results_podium_banner')
  ),
  constraint ad_events_error_code_check check (
    (event_type = 'error' and error_code in ('script_load_failed', 'push_failed', 'unfilled', 'load_timeout'))
    or (event_type <> 'error' and error_code is null)
  )
);

comment on table public.ad_events is
  'Privacy-minimal client telemetry for ad placement health. Not a billing source; clicks and revenue remain in AdSense reports.';
comment on column public.ad_events.analytics_session_id is
  'Ephemeral sessionStorage UUID; never an auth, player, lobby or device identifier.';
comment on column public.ad_events.event_type is
  'Client lifecycle proxy. loaded/viewable are product observations, not billable AdSense metrics.';

create index ad_events_summary_idx
  on public.ad_events (occurred_at desc, screen, placement, game_mode, event_type);
create index ad_events_session_rate_idx
  on public.ad_events (analytics_session_id, occurred_at desc);

alter table public.ad_events enable row level security;
revoke all on table public.ad_events from public, anon, authenticated;
grant select, insert, delete on table public.ad_events to service_role;

create or replace function public.record_ad_event(
  p_analytics_session_id uuid,
  p_impression_id uuid,
  p_event_type text,
  p_screen text,
  p_placement text,
  p_game_mode text default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  if p_analytics_session_id is null or p_impression_id is null then
    return false;
  end if;

  if p_event_type not in ('scheduled', 'requested', 'loaded', 'viewable', 'cancelled', 'error') then
    return false;
  end if;

  if p_screen not in ('home', 'round_break', 'results_podium') then
    return false;
  end if;

  if not (
    (p_screen = 'home' and p_placement in ('home_rail_left', 'home_rail_right'))
    or (p_screen = 'round_break' and p_placement = 'round_break_banner')
    or (p_screen = 'results_podium' and p_placement = 'results_podium_banner')
  ) then
    return false;
  end if;

  if p_game_mode is not null and p_game_mode not in (
    'normal', '2v2', 'quiz', 'audiophone', 'pixoguess',
    'monopoly', 'undercover', 'memorise', 'mimic'
  ) then
    return false;
  end if;

  if (
    p_event_type = 'error'
    and p_error_code not in ('script_load_failed', 'push_failed', 'unfilled', 'load_timeout')
  ) or (
    p_event_type <> 'error' and p_error_code is not null
  ) then
    return false;
  end if;

  select count(*)::integer
    into v_recent_count
    from public.ad_events
    where analytics_session_id = p_analytics_session_id
      and occurred_at >= now() - interval '1 hour';

  if v_recent_count >= 240 then
    return false;
  end if;

  insert into public.ad_events (
    analytics_session_id,
    impression_id,
    event_type,
    screen,
    placement,
    game_mode,
    is_authenticated,
    error_code
  )
  values (
    p_analytics_session_id,
    p_impression_id,
    p_event_type,
    p_screen,
    p_placement,
    p_game_mode,
    auth.uid() is not null,
    p_error_code
  )
  on conflict (impression_id, event_type) do nothing;

  return true;
end;
$$;

revoke all on function public.record_ad_event(uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_ad_event(uuid, uuid, text, text, text, text, text)
  to anon, authenticated;

create or replace function public.get_ad_event_summary(
  p_from timestamptz default (now() - interval '7 days'),
  p_to timestamptz default now()
)
returns table (
  event_day date,
  screen text,
  placement text,
  game_mode text,
  sessions bigint,
  scheduled bigint,
  requested bigint,
  loaded bigint,
  viewable bigint,
  cancelled bigint,
  errors bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '90 days' then
    raise exception 'invalid date range' using errcode = '22023';
  end if;

  return query
  select
    (date_trunc('day', e.occurred_at at time zone 'UTC'))::date,
    e.screen,
    e.placement,
    e.game_mode,
    count(distinct e.analytics_session_id)::bigint,
    count(*) filter (where e.event_type = 'scheduled')::bigint,
    count(*) filter (where e.event_type = 'requested')::bigint,
    count(*) filter (where e.event_type = 'loaded')::bigint,
    count(*) filter (where e.event_type = 'viewable')::bigint,
    count(*) filter (where e.event_type = 'cancelled')::bigint,
    count(*) filter (where e.event_type = 'error')::bigint
  from public.ad_events e
  where e.occurred_at >= p_from
    and e.occurred_at < p_to
  group by 1, e.screen, e.placement, e.game_mode
  order by 1 desc, e.screen, e.placement, e.game_mode nulls first;
end;
$$;

revoke all on function public.get_ad_event_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_ad_event_summary(timestamptz, timestamptz)
  to authenticated;

create or replace function public.cleanup_old_ad_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.ad_events
  where occurred_at < now() - interval '45 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.cleanup_old_ad_events() from public, anon, authenticated;
grant execute on function public.cleanup_old_ad_events() to service_role;
