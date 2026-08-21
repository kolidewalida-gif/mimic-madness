CREATE OR REPLACE FUNCTION public.submit_player_challenges(p_lobby_id uuid, p_player_id text, p_player_name text, p_clip_ids text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_clip_ids IS NULL OR array_length(p_clip_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'no clips provided';
  END IF;

  UPDATE public.video_clips
  SET lobby_id = p_lobby_id, round_number = NULL
  WHERE id = ANY(p_clip_ids) AND player_id = p_player_id;

  INSERT INTO public.player_submissions (lobby_id, player_id, player_name, challenges_count)
  VALUES (p_lobby_id, p_player_id, p_player_name, array_length(p_clip_ids, 1))
  ON CONFLICT (lobby_id, player_id) DO UPDATE
    SET player_name = EXCLUDED.player_name,
        challenges_count = EXCLUDED.challenges_count,
        submitted_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_player_clips(p_player_id text, p_clip_ids text[] DEFAULT NULL)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_paths text[];
BEGIN
  WITH removed AS (
    DELETE FROM public.video_clips
    WHERE player_id = p_player_id
      AND (p_clip_ids IS NULL OR id = ANY(p_clip_ids))
    RETURNING storage_path
  )
  SELECT COALESCE(array_agg(storage_path), '{}') INTO v_paths FROM removed;

  RETURN v_paths;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_player_challenges(uuid, text, text, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_player_clips(text, text[]) TO anon, authenticated, service_role;