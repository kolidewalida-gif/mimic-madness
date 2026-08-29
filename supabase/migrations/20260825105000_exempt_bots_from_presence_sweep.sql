-- Les bots n'ont pas de cœur qui bat.
--
-- Le balayage d'absence et le ménage se fondent sur la fraîcheur du dernier
-- passage. Les bots d'entraînement, insérés par `admin_join_lobby` pour les
-- parties solo d'administration, n'ont ni onglet ni jeton : leur horodatage ne
-- bouge jamais, ils seraient donc marqués absents au bout de vingt secondes puis
-- retirés du salon à la minute suivante, en pleine partie.
--
-- Leur identifiant est préfixé `bot-`, on les exclut explicitement des deux
-- fonctions. À noter que la contrainte de forme sur `player_id` interdit les
-- caractères spéciaux, et `claim_lobby_seat` est le seul chemin d'entrée pour un
-- humain : personne ne peut se faire passer pour un bot afin d'échapper au
-- ménage, puisque le préfixe seul ne dispense pas de tenir un siège valide.

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
       and player_id not like 'bot-%'
       and last_seen_at < now() - interval '20 seconds'
    returning player_id
  )
  select count(*) into v_marked from stale;

  return coalesce(v_marked, 0);
end;
$$;

create or replace function public.prune_lobby_players(p_lobby_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_removed integer;
begin
  with gone as (
    delete from public.lobby_players
     where lobby_id = p_lobby_id
       and connection_status = 'disconnected'
       and player_id not like 'bot-%'
       and disconnected_at is not null
       and disconnected_at < now() - interval '60 seconds'
    returning player_id
  )
  select count(*) into v_removed from gone;

  delete from public.lobby_sessions ls
   where ls.lobby_id = p_lobby_id
     and not exists (
       select 1 from public.lobby_players lp
       where lp.lobby_id = ls.lobby_id and lp.player_id = ls.player_id
     );

  return coalesce(v_removed, 0);
end;
$$;

revoke execute on function public.mark_stale_lobby_seats(uuid) from public;
grant execute on function public.mark_stale_lobby_seats(uuid) to anon, authenticated;
revoke execute on function public.prune_lobby_players(uuid) from public;
grant execute on function public.prune_lobby_players(uuid) to anon, authenticated;
