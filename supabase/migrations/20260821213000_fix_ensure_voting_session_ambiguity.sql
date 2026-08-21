-- `ensure_voting_session` échouait avec 42702 : « column reference "lobby_id"
-- is ambiguous — It could refer to either a PL/pgSQL variable or a table column ».
--
-- Cause : la fonction déclare `RETURNS TABLE (… lobby_id uuid, round_number
-- integer …)`. Ces noms de sortie sont des variables PL/pgSQL. Or le corps
-- écrivait `ON CONFLICT (lobby_id, round_number)` : dans une clause d'inférence,
-- ces identifiants doivent désigner des COLONNES, et PL/pgSQL ne sait pas
-- trancher entre sa variable homonyme et la colonne.
--
-- Conséquence côté joueur : la phase de vote restait bloquée sur
-- « Synchronisation de la session de vote… » indéfiniment. Le client relit en
-- boucle, la fonction échoue à chaque fois, et rien ne le disait — l'erreur
-- était avalée. Elle n'est apparue qu'après l'ajout du journal de diagnostic.
--
-- Correctif : viser la contrainte PAR SON NOM. Un nom de contrainte n'est pas un
-- identifiant de colonne, donc l'ambiguïté devient structurellement impossible,
-- au lieu de dépendre d'une directive de résolution.
--
-- `#variable_conflict use_column` est conservé en second rempart pour le reste
-- du corps.
--
-- IMPORTANT : ce correctif n'existait jusqu'ici que dans la base d'un seul
-- projet, appliqué hors dépôt. La définition versionnée
-- (`20260820105221_…`) est restée la version fautive, donc tout projet
-- reconstruit depuis le dépôt héritait du bug. Cette migration remet le dépôt
-- en position de source de vérité.

-- La contrainte nommée doit exister pour pouvoir être visée. Idempotent.
DO $$
BEGIN
  ALTER TABLE public.voting_session
    ADD CONSTRAINT voting_session_lobby_id_round_number_key
    UNIQUE (lobby_id, round_number);
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    -- Déjà présente : rien à faire.
    NULL;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_voting_session(p_game_round_id uuid)
RETURNS TABLE (
  session_id uuid,
  game_round_id uuid,
  lobby_id uuid,
  round_number integer,
  current_imitation_index integer,
  is_playing boolean,
  playback_started_at timestamptz,
  playback_position_ms integer,
  version integer,
  updated_at timestamptz,
  server_now timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  active_round public.game_rounds%ROWTYPE;
BEGIN
  SELECT * INTO active_round
  FROM public.game_rounds
  WHERE id = p_game_round_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.voting_session AS target (
    lobby_id,
    round_number,
    current_imitation_index,
    game_round_id
  )
  VALUES (
    active_round.lobby_id,
    active_round.round_number,
    0,
    active_round.id
  )
  -- Contrainte visée par son nom : aucun identifiant de colonne à résoudre ici.
  ON CONFLICT ON CONSTRAINT voting_session_lobby_id_round_number_key
  DO UPDATE SET game_round_id = COALESCE(target.game_round_id, EXCLUDED.game_round_id);

  RETURN QUERY
  SELECT
    existing.id,
    existing.game_round_id,
    existing.lobby_id,
    existing.round_number,
    existing.current_imitation_index,
    existing.is_playing,
    existing.playback_started_at,
    existing.playback_position_ms,
    existing.version,
    existing.updated_at,
    now()
  FROM public.voting_session AS existing
  WHERE existing.lobby_id = active_round.lobby_id
    AND existing.round_number = active_round.round_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_voting_session(uuid)
  TO anon, authenticated, service_role;
