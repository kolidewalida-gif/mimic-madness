-- Durable ordering and server-time anchors for the existing Imitation flow.
-- Realtime remains a notification layer; these rows remain authoritative.
ALTER TABLE public.game_rounds
  ADD COLUMN version bigint NOT NULL DEFAULT 0,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT clock_timestamp();

ALTER TABLE public.voting_session
  ADD COLUMN game_round_id uuid REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  ADD COLUMN version bigint NOT NULL DEFAULT 0,
  ADD COLUMN playback_started_at timestamptz,
  ADD COLUMN playback_position_ms bigint NOT NULL DEFAULT 0,
  ADD CONSTRAINT voting_session_index_nonnegative CHECK (current_imitation_index >= 0),
  ADD CONSTRAINT voting_session_position_nonnegative CHECK (playback_position_ms >= 0);

UPDATE public.voting_session AS session
SET game_round_id = round_row.id
FROM public.game_rounds AS round_row
WHERE session.game_round_id IS NULL
  AND round_row.lobby_id = session.lobby_id
  AND round_row.round_number = session.round_number;

CREATE UNIQUE INDEX voting_session_game_round_unique
  ON public.voting_session(game_round_id)
  WHERE game_round_id IS NOT NULL;

ALTER TABLE public.player_imitations
  ADD COLUMN clip_id text REFERENCES public.video_clips(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX player_imitations_clip_unique
  ON public.player_imitations(clip_id)
  WHERE clip_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bump_imitation_state_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_game_round_version
BEFORE UPDATE ON public.game_rounds
FOR EACH ROW EXECUTE FUNCTION public.bump_imitation_state_version();

CREATE TRIGGER bump_voting_session_version
BEFORE UPDATE ON public.voting_session
FOR EACH ROW EXECUTE FUNCTION public.bump_imitation_state_version();

-- Every session read carries the database clock used by playback_started_at.
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
  playback_position_ms bigint,
  version bigint,
  updated_at timestamptz,
  server_now timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    session.id,
    session.game_round_id,
    session.lobby_id,
    session.round_number,
    session.current_imitation_index,
    session.is_playing,
    session.playback_started_at,
    session.playback_position_ms,
    session.version,
    session.updated_at,
    clock_timestamp()
  FROM public.voting_session AS session
  WHERE session.lobby_id = p_lobby_id
    AND session.round_number = p_round_number
  LIMIT 1;
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
  playback_position_ms bigint,
  version bigint,
  updated_at timestamptz,
  server_now timestamptz
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_round public.game_rounds%ROWTYPE;
BEGIN
  SELECT * INTO active_round
  FROM public.game_rounds
  WHERE id = p_game_round_id;

  IF active_round.id IS NULL OR active_round.phase <> 'voting' THEN
    RAISE EXCEPTION 'The durable round is not in voting phase';
  END IF;

  INSERT INTO public.voting_session (
    game_round_id,
    lobby_id,
    round_number,
    current_imitation_index,
    is_playing
  ) VALUES (
    active_round.id,
    active_round.lobby_id,
    active_round.round_number,
    0,
    false
  )
  ON CONFLICT (lobby_id, round_number) DO NOTHING;

  UPDATE public.voting_session AS session
  SET game_round_id = active_round.id
  WHERE session.lobby_id = active_round.lobby_id
    AND session.round_number = active_round.round_number
    AND session.game_round_id IS NULL;

  RETURN QUERY
  SELECT * FROM public.read_voting_session(active_round.lobby_id, active_round.round_number);
END;
$$;

-- A single CAS owns start/pause/advance. Time and accumulated position are
-- computed by PostgreSQL, never by a phone's wall clock.
CREATE OR REPLACE FUNCTION public.mutate_voting_session(
  p_session_id uuid,
  p_expected_version bigint,
  p_expected_index integer,
  p_action text,
  p_countdown_ms integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected integer;
  current_time timestamptz := clock_timestamp();
BEGIN
  IF p_action NOT IN ('start', 'pause', 'advance') THEN
    RAISE EXCEPTION 'Unknown voting session action';
  END IF;

  UPDATE public.voting_session AS session
  SET
    current_imitation_index = CASE
      WHEN p_action = 'advance' THEN session.current_imitation_index + 1
      ELSE session.current_imitation_index
    END,
    playback_position_ms = CASE
      WHEN p_action = 'advance' THEN 0
      WHEN p_action = 'pause' AND session.is_playing AND session.playback_started_at IS NOT NULL
        THEN session.playback_position_ms + GREATEST(
          0,
          floor(extract(epoch FROM (current_time - session.playback_started_at)) * 1000)::bigint
        )
      ELSE session.playback_position_ms
    END,
    playback_started_at = CASE
      WHEN p_action = 'start'
        THEN current_time + make_interval(secs => GREATEST(0, p_countdown_ms)::double precision / 1000)
      ELSE NULL
    END,
    is_playing = p_action = 'start'
  FROM public.game_rounds AS round_row
  WHERE session.id = p_session_id
    AND session.version = p_expected_version
    AND session.current_imitation_index = p_expected_index
    AND round_row.id = session.game_round_id
    AND round_row.phase = 'voting';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

-- Recording readiness and its exact uploaded clip become one durable write.
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
    original_audio_volume
  ) VALUES (
    p_lobby_id,
    p_round_number,
    p_player_id,
    p_player_name,
    p_clip_id,
    true,
    p_include_original_audio,
    p_original_audio_volume
  )
  ON CONFLICT (lobby_id, round_number, player_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    clip_id = EXCLUDED.clip_id,
    is_ready = true,
    include_original_audio = EXCLUDED.include_original_audio,
    original_audio_volume = EXCLUDED.original_audio_volume;

  RETURN true;
END;
$$;

-- Immutable, transactionally all-or-nothing vote (one or both team targets).
CREATE OR REPLACE FUNCTION public.cast_imitation_vote(
  p_lobby_id uuid,
  p_round_number integer,
  p_voter_player_id text,
  p_imitation_player_ids text[],
  p_vote_type text
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_count integer;
BEGIN
  target_count := cardinality(p_imitation_player_ids);
  IF target_count IS NULL OR target_count < 1 OR p_vote_type NOT IN ('like', 'dislike') THEN
    RETURN false;
  END IF;
  IF p_voter_player_id = ANY(p_imitation_player_ids) THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rounds
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND phase = 'voting'
  ) THEN
    RETURN false;
  END IF;
  IF (
    SELECT count(*) FROM public.player_imitations
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND player_id = ANY(p_imitation_player_ids)
      AND is_ready = true
      AND clip_id IS NOT NULL
  ) <> target_count THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.imitation_votes
    WHERE lobby_id = p_lobby_id
      AND round_number = p_round_number
      AND voter_player_id = p_voter_player_id
      AND imitation_player_id = ANY(p_imitation_player_ids)
  ) THEN
    RETURN false;
  END IF;

  BEGIN
    INSERT INTO public.imitation_votes (
      lobby_id,
      round_number,
      imitation_player_id,
      voter_player_id,
      vote_type
    )
    SELECT
      p_lobby_id,
      p_round_number,
      target_id,
      p_voter_player_id,
      p_vote_type
    FROM unnest(p_imitation_player_ids) AS target_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  RETURN true;
END;
$$;

-- Presence updates use database time; unload is intentionally not involved.
CREATE OR REPLACE FUNCTION public.set_lobby_player_connection(
  p_lobby_id uuid,
  p_player_id text,
  p_connected boolean
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.lobby_players
  SET
    connection_status = CASE WHEN p_connected THEN 'connected' ELSE 'disconnected' END,
    disconnected_at = CASE WHEN p_connected THEN NULL ELSE clock_timestamp() END
  WHERE lobby_id = p_lobby_id
    AND player_id = p_player_id
    AND (
      connection_status IS DISTINCT FROM CASE WHEN p_connected THEN 'connected' ELSE 'disconnected' END
      OR (p_connected AND disconnected_at IS NOT NULL)
    );
$$;

GRANT EXECUTE ON FUNCTION public.read_voting_session(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_voting_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_voting_session(uuid, bigint, integer, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_player_imitation(uuid, integer, text, text, text, boolean, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cast_imitation_vote(uuid, integer, text, text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_lobby_player_connection(uuid, text, boolean) TO anon, authenticated;
