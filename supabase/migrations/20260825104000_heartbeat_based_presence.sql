-- Détecter les absences sans laisser personne déclarer les autres absents.
--
-- L'ancien mécanisme reposait sur la présence Realtime : quand le socket d'un
-- joueur disparaissait, n'importe quel client appelait
-- `set_lobby_player_connection(lobby, ce_joueur, false)` pour le marquer
-- déconnecté. Pratique, et parfaitement abusable : la fonction acceptait un
-- `player_id` libre, donc un seul appel suffisait à faire passer un adversaire
-- bien présent pour absent — puis à le faire retirer du salon par le ménage,
-- soixante secondes plus tard. Un bannissement à distance, sans rien détenir.
--
-- On remplace la déclaration par la constatation. Chaque siège horodate son
-- passage, et une fonction structurelle marque déconnectés les sièges dont le
-- battement de cœur a cessé. Plus personne n'a besoin d'écrire sur l'état d'un
-- autre : le silence suffit, et le silence ne se falsifie pas.

alter table public.lobby_players
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists lobby_players_last_seen_idx
  on public.lobby_players (lobby_id, last_seen_at);

-- Le battement de cœur horodate, en plus de rétablir l'état.
create or replace function public.touch_lobby_seat(
  p_lobby_id uuid,
  p_token text,
  p_connected boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_player text := public.lobby_seat_holder(p_lobby_id, p_token);
begin
  if v_player is null then
    return false;
  end if;

  update public.lobby_players
     set connection_status = case when p_connected then 'connected' else 'disconnected' end,
         disconnected_at = case when p_connected then null else now() end,
         last_seen_at = now()
   where lobby_id = p_lobby_id and player_id = v_player;

  return true;
end;
$$;

-- L'entrée en salon horodate aussi, sinon un siège tout juste pris passerait
-- pour périmé au premier balayage.
create or replace function public.claim_lobby_seat(
  p_lobby_id uuid,
  p_player_id text,
  p_player_name text,
  p_is_host boolean default false,
  p_token text default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_token text;
  v_seat_id uuid;
  v_status text;
  v_known_hash text;
  v_host_id text;
  v_max integer;
  v_seated integer;
  v_is_host boolean;
begin
  if p_lobby_id is null or p_player_id is null or p_player_name is null then
    raise exception 'claim_lobby_seat: arguments manquants' using errcode = '22023';
  end if;

  if not public.identity_belongs_to_caller(p_player_id) then
    raise exception 'claim_lobby_seat: identite deja rattachee a un compte'
      using errcode = '42501',
            hint = 'Connecte-toi avec ce compte pour jouer sous cette identite.';
  end if;

  select host_id, max_players into v_host_id, v_max
  from public.lobbies where id = p_lobby_id;

  if v_host_id is null then
    raise exception 'claim_lobby_seat: salon inconnu' using errcode = '42704';
  end if;

  v_is_host := coalesce(p_is_host, false) and v_host_id = p_player_id;

  select lp.id, lp.connection_status, ls.token_hash
    into v_seat_id, v_status, v_known_hash
  from public.lobby_players lp
  left join public.lobby_sessions ls
    on ls.lobby_id = lp.lobby_id and ls.player_id = lp.player_id
  where lp.lobby_id = p_lobby_id and lp.player_id = p_player_id;

  if v_seat_id is not null then
    if v_known_hash is not null
       and v_status = 'connected'
       and coalesce(public.hash_lobby_token(p_token), '') <> v_known_hash then
      raise exception 'claim_lobby_seat: siege deja occupe'
        using errcode = '42501',
              hint = 'Ce siege est tenu par une session active.';
    end if;
  else
    select count(*) into v_seated from public.lobby_players where lobby_id = p_lobby_id;
    if v_seated >= coalesce(v_max, 8) then
      raise exception 'claim_lobby_seat: salon complet' using errcode = '53400';
    end if;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  if v_seat_id is not null then
    update public.lobby_players
       set connection_status = 'connected',
           disconnected_at = null,
           player_name = p_player_name,
           is_host = v_is_host or is_host,
           last_seen_at = now()
     where id = v_seat_id;
  else
    insert into public.lobby_players (
      lobby_id, player_id, player_name, is_host, connection_status, last_seen_at
    ) values (
      p_lobby_id, p_player_id, p_player_name, v_is_host, 'connected', now()
    );
  end if;

  insert into public.lobby_sessions (lobby_id, player_id, token_hash, issued_at)
  values (p_lobby_id, p_player_id, public.hash_lobby_token(v_token), now())
  on conflict (lobby_id, player_id)
    do update set token_hash = excluded.token_hash, issued_at = excluded.issued_at;

  return v_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le balayage : un siège silencieux depuis plus de vingt secondes passe en
-- déconnecté. Le client bat toutes les quinze secondes, donc un joueur présent
-- n'est jamais touché ; et comme la condition ne porte que sur l'horodatage,
-- appeler cette fonction ne donne aucun pouvoir sur qui que ce soit. N'importe
-- quel client peut donc la déclencher, ce qui rend la détection rapide sans
-- rien concéder.
-- ---------------------------------------------------------------------------
create or replace function public.mark_stale_lobby_seats(p_lobby_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_marked integer;
begin
  with stale as (
    update public.lobby_players
       set connection_status = 'disconnected',
           disconnected_at = coalesce(disconnected_at, last_seen_at)
     where lobby_id = p_lobby_id
       and connection_status = 'connected'
       and last_seen_at < now() - interval '20 seconds'
    returning player_id
  )
  select count(*) into v_marked from stale;

  return coalesce(v_marked, 0);
end;
$$;

comment on function public.mark_stale_lobby_seats(uuid) is
  'Marque deconnectes les sieges sans battement de coeur depuis 20 s. Condition purement structurelle, donc sans risque d abus.';

revoke execute on function public.mark_stale_lobby_seats(uuid) from public;
grant execute on function public.mark_stale_lobby_seats(uuid) to anon, authenticated;

revoke execute on function public.touch_lobby_seat(uuid, text, boolean) from public;
grant execute on function public.touch_lobby_seat(uuid, text, boolean) to anon, authenticated;
revoke execute on function public.claim_lobby_seat(uuid, text, text, boolean, text) from public;
grant execute on function public.claim_lobby_seat(uuid, text, text, boolean, text) to anon, authenticated;
