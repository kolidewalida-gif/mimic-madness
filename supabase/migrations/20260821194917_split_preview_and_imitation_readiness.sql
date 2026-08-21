-- `player_imitations.is_ready` portait deux sens incompatibles sur la même ligne :
--   * la phase d'aperçu y écrivait « j'ai vu la vidéo à imiter » ;
--   * la phase d'imitation, le RPC de soumission, la phase de vote et
--     `cast_imitation_vote` y lisent « j'ai déposé mon imitation ».
--
-- Le code compensait par un reset `is_ready = false` juste avant la transition,
-- plus une fenêtre aveugle de 2 s. Ni l'un ni l'autre n'est atomique : quand le
-- reset passe avant que l'upsert d'un joueur ait atterri, ce joueur entre en
-- phase d'imitation déjà « prêt », la manche saute l'imitation, et sa vraie
-- soumission est ensuite refusée par le RPC — d'où des clients qui ne voient pas
-- la même chose et un lobby bloqué.
--
-- Mesuré avant correctif : 71 % des lignes marquées prêtes n'avaient aucun clip.

ALTER TABLE public.player_imitations
  ADD COLUMN IF NOT EXISTS has_seen_preview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skipped boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.player_imitations.is_ready IS
  'Le joueur a déposé son imitation. Ne jamais écrire depuis la phase d''aperçu.';
COMMENT ON COLUMN public.player_imitations.has_seen_preview IS
  'Le joueur a vu la vidéo à imiter. Propre à la phase d''aperçu.';
COMMENT ON COLUMN public.player_imitations.skipped IS
  'L''hôte a débloqué la manche sans ce joueur. Rend explicite une ligne prête sans clip.';

-- Toute ligne déjà marquée prête vient d'un joueur qui avait au moins vu l'aperçu.
UPDATE public.player_imitations
SET has_seen_preview = true
WHERE is_ready AND NOT has_seen_preview;

-- Les lignes prêtes sans clip sont, rétrospectivement, des sauts : les nommer
-- ainsi évite qu'elles bloquent les manches en cours après le correctif.
UPDATE public.player_imitations
SET skipped = true
WHERE is_ready AND clip_id IS NULL AND NOT skipped;

-- L'aperçu obtient sa propre écriture, qui ne touche jamais `is_ready`.
CREATE OR REPLACE FUNCTION public.mark_preview_seen(
  p_lobby_id uuid,
  p_round_number integer,
  p_player_id text,
  p_player_name text
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rounds
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.player_imitations (
    lobby_id,
    round_number,
    player_id,
    player_name,
    has_seen_preview,
    is_ready
  ) VALUES (
    p_lobby_id,
    p_round_number,
    p_player_id,
    p_player_name,
    true,
    false
  )
  ON CONFLICT (lobby_id, round_number, player_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    has_seen_preview = true;

  RETURN true;
END;
$$;

-- Seule une imitation réellement déposée interdit un nouvel envoi. Une ligne
-- prête sans clip est un reliquat — aperçu vu, ou joueur ignoré par l'hôte — et
-- doit pouvoir recevoir la vraie imitation au lieu de la refuser en silence.
CREATE OR REPLACE FUNCTION public.submit_player_imitation(
  p_lobby_id uuid,
  p_round_number integer,
  p_player_id text,
  p_player_name text,
  p_clip_id text,
  p_include_original_audio boolean,
  p_original_audio_volume integer
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.player_imitations
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND player_id = p_player_id
      AND is_ready = true
      AND clip_id IS NOT NULL
  ) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.game_rounds
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND phase = 'imitation'
  ) THEN
    RETURN false;
  END IF;

  IF p_clip_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.video_clips
    WHERE id = p_clip_id
      AND lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND player_id = p_player_id
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.player_imitations (
    lobby_id,
    round_number,
    player_id,
    player_name,
    clip_id,
    is_ready,
    include_original_audio,
    original_audio_volume,
    skipped
  ) VALUES (
    p_lobby_id,
    p_round_number,
    p_player_id,
    p_player_name,
    p_clip_id,
    true,
    p_include_original_audio,
    p_original_audio_volume,
    false
  )
  ON CONFLICT (lobby_id, round_number, player_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    clip_id = EXCLUDED.clip_id,
    is_ready = true,
    include_original_audio = EXCLUDED.include_original_audio,
    original_audio_volume = EXCLUDED.original_audio_volume,
    -- Un joueur ignoré par l'hôte qui finit par envoyer redevient participant.
    skipped = false;

  RETURN true;
END;
$$;

-- L'hôte débloque une manche : le saut devient explicite au lieu d'être déduit
-- d'une ligne prête sans clip.
CREATE OR REPLACE FUNCTION public.skip_missing_imitations(
  p_lobby_id uuid,
  p_round_number integer,
  p_player_ids text[],
  p_player_names text[]
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rounds
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND phase = 'imitation'
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.player_imitations (
    lobby_id,
    round_number,
    player_id,
    player_name,
    is_ready,
    skipped
  )
  SELECT
    p_lobby_id,
    p_round_number,
    ids.player_id,
    coalesce(names.player_name, ids.player_id),
    true,
    true
  FROM unnest(p_player_ids) WITH ORDINALITY AS ids(player_id, position)
  LEFT JOIN unnest(p_player_names) WITH ORDINALITY AS names(player_name, position)
    ON names.position = ids.position
  ON CONFLICT (lobby_id, round_number, player_id) DO UPDATE SET
    is_ready = true,
    skipped = public.player_imitations.clip_id IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_preview_seen(uuid, integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.skip_missing_imitations(uuid, integer, text[], text[]) TO anon, authenticated;
