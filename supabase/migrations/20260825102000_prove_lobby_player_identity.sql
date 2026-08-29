-- Identité prouvée dans les salons.
--
-- Le problème d'origine : `lobby_players.player_id` est une colonne TEXT libre,
-- sans lien avec `auth.users`, et les policies de la table étaient
-- `USING (true)` / `WITH CHECK (true)` pour le rôle `public`. Avec la seule clé
-- anon — publiée dans le bundle, donc connue de tout le monde — n'importe qui
-- pouvait s'asseoir dans n'importe quel salon sous le `player_id` et le pseudo
-- de n'importe qui, renommer les autres, et surtout supprimer leur ligne, ce
-- qui les éjecte de la partie. Aucune de ces trois choses ne demandait le
-- moindre secret.
--
-- La correction idéale serait `player_id = auth.uid()`. Elle est hors de portée
-- ici : le jeu se joue sans compte, et les connexions anonymes Supabase sont
-- désactivées sur ce projet, si bien qu'un invité n'a aucun JWT à opposer. On
-- fabrique donc l'identité manquante : à l'entrée dans un salon, le serveur
-- délivre un jeton de session aléatoire de 32 octets, n'en garde que le SHA-256
-- dans une table que le client ne peut pas lire, et exige ce jeton pour toute
-- action qui touche un siège. Le siège devient une capacité : on ne peut agir
-- que sur celui dont on détient le jeton.
--
-- Les comptes enregistrés gagnent une garantie de plus : leur `player_id` étant
-- un `auth.uid()`, il faut détenir le JWT correspondant pour s'en servir. Un
-- inconnu ne peut donc plus se présenter sous le nom d'un joueur inscrit.
--
-- Après cette migration, `lobby_players` est en lecture seule depuis le client :
-- toutes les écritures passent par les fonctions ci-dessous.

-- ---------------------------------------------------------------------------
-- Les jetons vivent à part, dans une table sans aucune policy : RLS est activé
-- et rien ne l'autorise, donc elle est invisible et inécrivable depuis le
-- navigateur, y compris pour un `select *`. Les garder dans une colonne de
-- `lobby_players` aurait exposé leur empreinte à la moindre lecture, et cassé
-- les `select('*')` du client si on avait révoqué le privilège de colonne.
-- ---------------------------------------------------------------------------
create table if not exists public.lobby_sessions (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  player_id text not null,
  token_hash text not null,
  issued_at timestamptz not null default now(),
  primary key (lobby_id, player_id)
);

alter table public.lobby_sessions enable row level security;

revoke all on public.lobby_sessions from anon, authenticated;

comment on table public.lobby_sessions is
  'Empreintes SHA-256 des jetons de siège. Aucune policy : seules les fonctions SECURITY DEFINER y accèdent.';

-- ---------------------------------------------------------------------------
-- Un `player_id` correspond-il à un compte existant ?
--
-- Le cast direct vers uuid lèverait une erreur sur les identifiants d'invité,
-- d'où le bloc d'exception plutôt qu'un garde par expression régulière : dans
-- une clause WHERE, rien ne garantit que le filtre soit évalué avant le cast.
-- ---------------------------------------------------------------------------
create or replace function public.identity_is_registered(p_player_id text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uuid uuid;
begin
  if p_player_id is null then
    return false;
  end if;
  begin
    v_uuid := p_player_id::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from auth.users where id = v_uuid);
end;
$$;

create or replace function public.identity_belongs_to_caller(p_player_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select not public.identity_is_registered(p_player_id)
      or p_player_id = (select auth.uid())::text;
$$;

comment on function public.identity_belongs_to_caller(text) is
  'Vrai si l identifiant est celui d un invite, ou celui du compte connecte. Bloque l usurpation de compte.';

create or replace function public.hash_lobby_token(p_token text)
returns text
language sql
immutable
set search_path to 'extensions'
as $$
  select case
    when p_token is null or length(p_token) < 32 then null
    else encode(extensions.digest(p_token, 'sha256'), 'hex')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Prendre un siège, ou le reprendre après une coupure.
--
-- Un siège encore connecté ne se reprend qu'avec son jeton : sans cette règle,
-- il suffirait de rejoindre avec le `player_id` de quelqu'un pour détourner sa
-- place. Un siège déconnecté reste réattribuable, parce que c'est exactement ce
-- dont a besoin un joueur qui a fermé son onglet et revient sans son jeton.
-- ---------------------------------------------------------------------------
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

  -- On ne se déclare hôte que si le salon le dit déjà.
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
           is_host = v_is_host or is_host
     where id = v_seat_id;
  else
    insert into public.lobby_players (
      lobby_id, player_id, player_name, is_host, connection_status
    ) values (
      p_lobby_id, p_player_id, p_player_name, v_is_host, 'connected'
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
-- Le joueur derrière un jeton, ou NULL. Socle des fonctions suivantes.
-- ---------------------------------------------------------------------------
create or replace function public.lobby_seat_holder(p_lobby_id uuid, p_token text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select ls.player_id
  from public.lobby_sessions ls
  where ls.lobby_id = p_lobby_id
    and ls.token_hash is not null
    and ls.token_hash = public.hash_lobby_token(p_token);
$$;

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
         disconnected_at = case when p_connected then null else now() end
   where lobby_id = p_lobby_id and player_id = v_player;

  return true;
end;
$$;

comment on function public.touch_lobby_seat(uuid, text, boolean) is
  'Battement de coeur d un siege. Remplace set_lobby_player_connection, qui acceptait de marquer n importe qui deconnecte.';

create or replace function public.release_lobby_seat(p_lobby_id uuid, p_token text)
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

  delete from public.lobby_players
   where lobby_id = p_lobby_id and player_id = v_player;
  delete from public.lobby_sessions
   where lobby_id = p_lobby_id and player_id = v_player;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exclure quelqu'un : réservé à l'hôte du salon et aux administrateurs.
-- ---------------------------------------------------------------------------
create or replace function public.kick_lobby_player(
  p_lobby_id uuid,
  p_token text,
  p_target_player_id text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.lobby_seat_holder(p_lobby_id, p_token);
  v_user uuid := auth.uid();
  v_host text;
begin
  if p_target_player_id is null then
    return false;
  end if;

  select host_id into v_host from public.lobbies where id = p_lobby_id;
  if v_host is null then
    return false;
  end if;

  if not (
    (v_actor is not null and v_actor = v_host)
    or (v_user is not null and public.has_role(v_user, 'admin'))
  ) then
    raise exception 'kick_lobby_player: reserve a l hote du salon' using errcode = '42501';
  end if;

  if v_actor is not null and v_actor = p_target_player_id then
    raise exception 'kick_lobby_player: utiliser release_lobby_seat pour partir'
      using errcode = '22023';
  end if;

  delete from public.lobby_players
   where lobby_id = p_lobby_id and player_id = p_target_player_id;
  delete from public.lobby_sessions
   where lobby_id = p_lobby_id and player_id = p_target_player_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Passer la main.
--
-- Deux cas légitimes : l'hôte désigne son successeur, ou l'hôte a disparu et un
-- joueur encore présent se promeut — c'est la reprise automatique de
-- `maybeMigrateHost`. Le second cas exige que l'ancien hôte soit vraiment
-- absent ou déconnecté, sinon n'importe qui prendrait la main en pleine partie.
-- ---------------------------------------------------------------------------
create or replace function public.transfer_lobby_host(
  p_lobby_id uuid,
  p_token text,
  p_new_host_id text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor text := public.lobby_seat_holder(p_lobby_id, p_token);
  v_host text;
  v_host_status text;
  v_target_exists boolean;
begin
  if v_actor is null or p_new_host_id is null then
    return false;
  end if;

  select host_id into v_host from public.lobbies where id = p_lobby_id;
  if v_host is null then
    return false;
  end if;

  select exists (
    select 1 from public.lobby_players
    where lobby_id = p_lobby_id and player_id = p_new_host_id
  ) into v_target_exists;

  if not v_target_exists then
    raise exception 'transfer_lobby_host: le nouvel hote n est pas dans le salon'
      using errcode = '22023';
  end if;

  select connection_status into v_host_status
  from public.lobby_players
  where lobby_id = p_lobby_id and player_id = v_host;

  if v_actor <> v_host
     and coalesce(v_host_status, 'disconnected') = 'connected' then
    raise exception 'transfer_lobby_host: l hote actuel est toujours la'
      using errcode = '42501';
  end if;

  -- Le déclencheur de `lobbies` refuse tout changement de `host_id` qui ne
  -- vient pas d'ici ; ce drapeau de session est le laissez-passer.
  perform set_config('app.host_transfer', 'on', true);

  update public.lobbies set host_id = p_new_host_id where id = p_lobby_id;
  update public.lobby_players set is_host = (player_id = p_new_host_id)
   where lobby_id = p_lobby_id;

  perform set_config('app.host_transfer', 'off', true);

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ménage des sièges abandonnés. Pas d'identité requise : la condition est
-- structurelle, seule une ligne déconnectée depuis plus longtemps que la
-- fenêtre de reconnexion du client (60 s) peut partir.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Le code et l'hôte d'un salon ne se réécrivent pas depuis le navigateur.
--
-- Changer `host_id` donnait la main sur le salon, et changer `code` permettait
-- de détourner le code que la troupe s'était échangé de vive voix. Aucun des
-- deux n'a d'usage client légitime hors passation d'hôte.
-- ---------------------------------------------------------------------------
create or replace function public.guard_lobby_ownership()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  if new.code <> old.code then
    raise exception 'le code d un salon ne se change pas' using errcode = '42501';
  end if;

  if new.host_id <> old.host_id
     and coalesce(current_setting('app.host_transfer', true), 'off') <> 'on' then
    raise exception 'la main se passe par transfer_lobby_host' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists lobbies_guard_ownership on public.lobbies;
create trigger lobbies_guard_ownership
  before update on public.lobbies
  for each row execute function public.guard_lobby_ownership();

-- ---------------------------------------------------------------------------
-- `lobby_players` passe en lecture seule pour le client.
--
-- La lecture reste ouverte : c'est elle qui alimente la table du salon et le
-- flux temps réel, et elle ne révèle qu'un pseudo déjà affiché à l'écran. Tout
-- le reste passe par les fonctions ci-dessus.
-- ---------------------------------------------------------------------------
drop policy if exists "Players can join lobbies" on public.lobby_players;
drop policy if exists "Players can update connection status" on public.lobby_players;
drop policy if exists "Anyone can delete lobby players" on public.lobby_players;
drop policy if exists "Users can join lobbies" on public.lobby_players;
drop policy if exists "Users can update their own player row" on public.lobby_players;
drop policy if exists "Users can leave lobbies" on public.lobby_players;

revoke insert, update, delete on public.lobby_players from anon, authenticated;

-- L'ancienne fonction de battement de cœur acceptait un `p_player_id` libre :
-- elle permettait de marquer un adversaire déconnecté, donc de le faire
-- expulser par le ménage soixante secondes plus tard. `touch_lobby_seat` la
-- remplace.
revoke execute on function public.set_lobby_player_connection(uuid, text, boolean)
  from anon, authenticated;

grant execute on function public.claim_lobby_seat(uuid, text, text, boolean, text) to anon, authenticated;
grant execute on function public.touch_lobby_seat(uuid, text, boolean) to anon, authenticated;
grant execute on function public.release_lobby_seat(uuid, text) to anon, authenticated;
grant execute on function public.kick_lobby_player(uuid, text, text) to anon, authenticated;
grant execute on function public.transfer_lobby_host(uuid, text, text) to anon, authenticated;
grant execute on function public.prune_lobby_players(uuid) to anon, authenticated;

-- Ces deux-là ne servent qu'aux policies et aux fonctions internes.
revoke execute on function public.identity_is_registered(text) from anon, authenticated;
revoke execute on function public.identity_belongs_to_caller(text) from anon, authenticated;
revoke execute on function public.lobby_seat_holder(uuid, text) from anon, authenticated;
revoke execute on function public.hash_lobby_token(text) from anon, authenticated;
