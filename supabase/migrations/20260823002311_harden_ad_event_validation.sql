alter table public.ad_events
  drop constraint ad_events_error_code_check;

alter table public.ad_events
  add constraint ad_events_error_code_check check (
    (
      event_type = 'error'
      and error_code is not null
      and error_code in ('script_load_failed', 'push_failed', 'unfilled', 'load_timeout')
    )
    or (event_type <> 'error' and error_code is null)
  );

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

  if p_event_type = 'error' then
    if p_error_code is null or p_error_code not in (
      'script_load_failed', 'push_failed', 'unfilled', 'load_timeout'
    ) then
      return false;
    end if;
  elsif p_error_code is not null then
    return false;
  end if;

  -- Sérialise le quota d'une même session pour éviter les dépassements concurrents.
  perform pg_advisory_xact_lock(hashtextextended(p_analytics_session_id::text, 0));

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
