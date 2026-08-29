-- Compteur d'appels pour les fonctions serveur ouvertes.
--
-- Quatre fonctions déployées tournent sans vérification de jeton et appellent des
-- API tierces payantes : `generate-subtitles`, `refine-rhythmo-text`,
-- `transcribe-clip` et `transcribe-clip-status`. Avec un `Access-Control-Allow-Origin`
-- à `*` et aucun contrôle, n'importe qui sur Internet pouvait les appeler en
-- boucle. Ce n'est pas un risque pour les joueurs, c'est un risque pour la
-- facture — et il est immédiat.
--
-- Exiger un JWT n'est pas possible : le jeu se joue sans compte, et ces fonctions
-- servent aussi les invités. On compte donc les appels par adresse et par
-- fonction, dans des fenêtres glissantes. Les seuils sont larges — un joueur
-- normal ne les atteint pas — mais ils cassent net une boucle automatisée.
--
-- La table n'est accessible qu'à la clé de service, celle qu'utilisent les
-- fonctions serveur ; le navigateur n'y touche jamais.

create table if not exists public.edge_rate_limits (
  bucket text not null,
  client_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, client_key, window_start)
);

alter table public.edge_rate_limits enable row level security;

revoke all on public.edge_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.edge_rate_limits to service_role;

create index if not exists edge_rate_limits_window_idx
  on public.edge_rate_limits (window_start);

comment on table public.edge_rate_limits is
  'Fenetres de comptage des appels aux fonctions serveur ouvertes. Reservee a service_role.';

-- ---------------------------------------------------------------------------
-- Consomme un jeton de quota. Renvoie vrai si l'appel est autorisé.
--
-- Le découpage en fenêtres fixes est volontaire : il tient en un `insert ... on
-- conflict`, donc en un aller-retour, et se prête à un nettoyage trivial. Une
-- fenêtre glissante exacte coûterait une ligne par appel.
-- ---------------------------------------------------------------------------
create or replace function public.consume_edge_quota(
  p_bucket text,
  p_client_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_bucket is null or p_client_key is null then
    return true;
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / greatest(1, p_window_seconds)) * greatest(1, p_window_seconds)
  );

  insert into public.edge_rate_limits (bucket, client_key, window_start, hits)
  values (p_bucket, left(p_client_key, 100), v_window, 1)
  on conflict (bucket, client_key, window_start)
    do update set hits = public.edge_rate_limits.hits + 1
  returning hits into v_hits;

  -- Ménage opportuniste : une fois de temps en temps, on jette les fenêtres
  -- périmées plutôt que de programmer une tâche pour si peu.
  if random() < 0.01 then
    delete from public.edge_rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= greatest(1, p_limit);
end;
$$;

revoke execute on function public.consume_edge_quota(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_edge_quota(text, text, integer, integer) to service_role;
