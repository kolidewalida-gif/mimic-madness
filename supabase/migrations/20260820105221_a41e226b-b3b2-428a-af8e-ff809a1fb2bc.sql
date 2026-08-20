
-- 1. Durable columns -------------------------------------------------------
ALTER TABLE public.game_rounds
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.voting_session
  ADD COLUMN IF NOT EXISTS game_round_id uuid REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS playback_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS playback_position_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

ALTER TABLE public.voting_session
  ALTER COLUMN is_playing SET DEFAULT false;
UPDATE public.voting_session SET is_playing = false WHERE is_playing IS NULL;
ALTER TABLE public.voting_session ALTER COLUMN is_playing SET NOT NULL;

ALTER TABLE public.player_imitations
  ADD COLUMN IF NOT EXISTS clip_id text;

CREATE OR REPLACE FUNCTION public.bump_game_round_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS game_rounds_bump_version ON public.game_rounds;
CREATE TRIGGER game_rounds_bump_version
  BEFORE UPDATE ON public.game_rounds
  FOR EACH ROW EXECUTE FUNCTION public.bump_game_round_version();

-- 2. Voting session RPCs ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.read_voting_session(
  p_lobby_id uuid,
  p_round_number integer
)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.game_round_id, v.lobby_id, v.round_number, v.current_imitation_index,
         v.is_playing, v.playback_started_at, v.playback_position_ms, v.version,
         v.updated_at, now()
  FROM public.voting_session v
  WHERE v.lobby_id = p_lobby_id AND v.round_number = p_round_number;
$$;

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
DECLARE
  r public.game_rounds%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.game_rounds WHERE id = p_game_round_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.voting_session (lobby_id, round_number, current_imitation_index, game_round_id)
  VALUES (r.lobby_id, r.round_number, 0, r.id)
  ON CONFLICT (lobby_id, round_number)
  DO UPDATE SET game_round_id = COALESCE(public.voting_session.game_round_id, EXCLUDED.game_round_id);

  RETURN QUERY
  SELECT v.id, v.game_round_id, v.lobby_id, v.round_number, v.current_imitation_index,
         v.is_playing, v.playback_started_at, v.playback_position_ms, v.version,
         v.updated_at, now()
  FROM public.voting_session v
  WHERE v.lobby_id = r.lobby_id AND v.round_number = r.round_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.mutate_voting_session(
  p_session_id uuid,
  p_expected_version integer,
  p_expected_index integer,
  p_action text,
  p_countdown_ms integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer;
BEGIN
  IF p_action NOT IN ('start', 'pause', 'advance') THEN
    RAISE EXCEPTION 'invalid action %', p_action;
  END IF;

  UPDATE public.voting_session v
  SET
    current_imitation_index = CASE WHEN p_action = 'advance'
      THEN v.current_imitation_index + 1 ELSE v.current_imitation_index END,
    is_playing = (p_action = 'start'),
    playback_started_at = CASE
      WHEN p_action = 'start' THEN now() + make_interval(secs => GREATEST(p_countdown_ms, 0) / 1000.0)
      ELSE NULL END,
    playback_position_ms = CASE
      WHEN p_action = 'start' THEN v.playback_position_ms
      WHEN p_action = 'advance' THEN 0
      ELSE GREATEST(
        0,
        v.playback_position_ms + CASE
          WHEN v.is_playing AND v.playback_started_at IS NOT NULL
            THEN GREATEST(0, (EXTRACT(EPOCH FROM (now() - v.playback_started_at)) * 1000)::integer)
          ELSE 0 END
      ) END,
    version = v.version + 1,
    updated_at = now()
  WHERE v.id = p_session_id
    AND v.current_imitation_index = p_expected_index
    AND (p_expected_version = 0 OR v.version = p_expected_version);

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated = 1;
END;
$$;

-- 3. Imitation submission --------------------------------------------------
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.player_imitations (
    lobby_id, round_number, player_id, player_name, is_ready,
    clip_id, include_original_audio, original_audio_volume
  )
  VALUES (
    p_lobby_id, p_round_number, p_player_id, p_player_name, true,
    p_clip_id, COALESCE(p_include_original_audio, false), COALESCE(p_original_audio_volume, 50)
  )
  ON CONFLICT (lobby_id, round_number, player_id) DO UPDATE
  SET is_ready = true,
      player_name = EXCLUDED.player_name,
      clip_id = COALESCE(EXCLUDED.clip_id, public.player_imitations.clip_id),
      include_original_audio = EXCLUDED.include_original_audio,
      original_audio_volume = EXCLUDED.original_audio_volume;

  RETURN true;
END;
$$;

-- 4. Voting ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_imitation_vote(
  p_lobby_id uuid,
  p_round_number integer,
  p_voter_player_id text,
  p_imitation_player_ids text[],
  p_vote_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  IF p_vote_type NOT IN ('like', 'dislike') THEN
    RAISE EXCEPTION 'invalid vote type %', p_vote_type;
  END IF;

  INSERT INTO public.imitation_votes (
    lobby_id, round_number, imitation_player_id, voter_player_id, vote_type
  )
  SELECT p_lobby_id, p_round_number, target, p_voter_player_id, p_vote_type
  FROM unnest(p_imitation_player_ids) AS target
  ON CONFLICT (lobby_id, round_number, imitation_player_id, voter_player_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted > 0;
END;
$$;

-- 5. Connection status -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lobby_player_connection(
  p_lobby_id uuid,
  p_player_id text,
  p_connected boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.lobby_players
  SET connection_status = CASE WHEN p_connected THEN 'connected' ELSE 'disconnected' END,
      disconnected_at = CASE WHEN p_connected THEN NULL ELSE now() END
  WHERE lobby_id = p_lobby_id AND player_id = p_player_id;
$$;

-- 6. Grants ----------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.read_voting_session(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_voting_session(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mutate_voting_session(uuid, integer, integer, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_player_imitation(uuid, integer, text, text, text, boolean, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cast_imitation_vote(uuid, integer, text, text[], text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_lobby_player_connection(uuid, text, boolean) TO anon, authenticated, service_role;
