-- Signalement entre joueurs.
--
-- Il existait déjà de quoi bannir (`user_bans`, `is_user_banned`) et une console
-- d'administration pour le faire. Ce qui manquait, c'est le début de la chaîne :
-- un joueur qui subit un comportement abusif n'avait aucun moyen de le dire.
-- Rien. Sur un jeu avec micro ouvert, chat, et clips vidéo publiés dans un flux
-- social, c'est le manque le plus concret côté protection des joueurs.
--
-- Un signalement porte l'identité de son auteur, prouvée par le jeton de siège :
-- on ne peut donc signaler que depuis un salon où l'on est réellement assis, et
-- pas au nom de quelqu'un d'autre. Un même joueur ne peut signaler une même
-- personne qu'une fois par salon, ce qui évite de transformer l'outil en arme.
--
-- La table n'est lisible que par les administrateurs. Personne ne doit pouvoir
-- vérifier s'il a été signalé, ni par qui : ce serait offrir une cible.

create table if not exists public.player_reports (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid references public.lobbies(id) on delete set null,
  reporter_player_id text not null,
  reporter_user_id uuid,
  target_player_id text not null,
  target_user_id uuid,
  target_player_name text not null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  constraint player_reports_reason_known check (
    reason in ('harcelement', 'contenu_choquant', 'usurpation', 'triche', 'spam', 'autre')
  ),
  constraint player_reports_status_known check (
    status in ('pending', 'reviewed', 'dismissed', 'actioned')
  ),
  constraint player_reports_details_sane check (
    details is null
    or (char_length(details) <= 500 and public.text_has_no_control_chars(details, true))
  ),
  constraint player_reports_target_name_sane check (
    char_length(target_player_name) between 1 and 24
    and public.text_has_no_control_chars(target_player_name)
  )
);

-- Un signalement par couple (salon, auteur, cible).
create unique index if not exists player_reports_unique_per_lobby
  on public.player_reports (lobby_id, reporter_player_id, target_player_id);

create index if not exists player_reports_pending_idx
  on public.player_reports (status, created_at desc);

create index if not exists player_reports_target_idx
  on public.player_reports (target_player_id, created_at desc);

alter table public.player_reports enable row level security;

-- Aucun accès direct : l'écriture passe par la fonction, la lecture est réservée
-- aux administrateurs.
revoke all on public.player_reports from anon, authenticated;

create policy "Admins read reports"
  on public.player_reports for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins triage reports"
  on public.player_reports for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

grant select, update on public.player_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Déposer un signalement.
-- ---------------------------------------------------------------------------
create or replace function public.report_lobby_player(
  p_lobby_id uuid,
  p_token text,
  p_target_player_id text,
  p_reason text,
  p_details text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reporter text := public.lobby_seat_holder(p_lobby_id, p_token);
  v_target_name text;
  v_target_user uuid;
  v_reporter_user uuid := auth.uid();
  v_recent integer;
begin
  if v_reporter is null then
    raise exception 'report_lobby_player: siege inconnu'
      using errcode = '42501',
            hint = 'Il faut etre dans le salon pour signaler quelqu un.';
  end if;

  if p_target_player_id is null or p_target_player_id = v_reporter then
    raise exception 'report_lobby_player: cible invalide' using errcode = '22023';
  end if;

  select player_name into v_target_name
  from public.lobby_players
  where lobby_id = p_lobby_id and player_id = p_target_player_id;

  if v_target_name is null then
    raise exception 'report_lobby_player: ce joueur n est pas dans le salon'
      using errcode = '22023';
  end if;

  -- Garde-fou anti-inondation, en plus de l'unicité par cible.
  select count(*) into v_recent
  from public.player_reports
  where reporter_player_id = v_reporter
    and created_at > now() - interval '1 hour';

  if v_recent >= 10 then
    raise exception 'report_lobby_player: trop de signalements recents'
      using errcode = '54000';
  end if;

  -- Un `player_id` qui est un uuid de compte identifie la personne au-delà du
  -- salon : c'est ce qui permet à un administrateur de relier plusieurs
  -- signalements et, le cas échéant, de bannir.
  begin
    v_target_user := p_target_player_id::uuid;
  exception when others then
    v_target_user := null;
  end;
  if v_target_user is not null
     and not exists (select 1 from auth.users where id = v_target_user) then
    v_target_user := null;
  end if;

  insert into public.player_reports (
    lobby_id, reporter_player_id, reporter_user_id,
    target_player_id, target_user_id, target_player_name,
    reason, details
  ) values (
    p_lobby_id, v_reporter, v_reporter_user,
    p_target_player_id, v_target_user, v_target_name,
    p_reason, nullif(btrim(coalesce(p_details, '')), '')
  )
  on conflict (lobby_id, reporter_player_id, target_player_id) do nothing;

  return true;
end;
$$;

comment on function public.report_lobby_player(uuid, text, text, text, text) is
  'Depose un signalement. L auteur est prouve par son jeton de siege, la cible doit etre dans le meme salon.';

revoke execute on function public.report_lobby_player(uuid, text, text, text, text) from public;
grant execute on function public.report_lobby_player(uuid, text, text, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vue de tri pour la console d'administration : les signalements groupés par
-- cible, pour voir d'un coup d'œil qui revient.
-- ---------------------------------------------------------------------------
create or replace function public.list_player_reports(p_limit integer default 100)
returns table (
  target_player_id text,
  target_user_id uuid,
  target_player_name text,
  report_count bigint,
  pending_count bigint,
  reasons text[],
  last_report_at timestamptz,
  last_details text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    r.target_player_id,
    max(r.target_user_id::text)::uuid as target_user_id,
    max(r.target_player_name) as target_player_name,
    count(*) as report_count,
    count(*) filter (where r.status = 'pending') as pending_count,
    array_agg(distinct r.reason) as reasons,
    max(r.created_at) as last_report_at,
    (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1]
      as last_details
  from public.player_reports r
  where public.has_role(auth.uid(), 'admin')
  group by r.target_player_id
  order by count(*) filter (where r.status = 'pending') desc, max(r.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke execute on function public.list_player_reports(integer) from public;
grant execute on function public.list_player_reports(integer) to authenticated;
