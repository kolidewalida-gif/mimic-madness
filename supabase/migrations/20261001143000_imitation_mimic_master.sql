-- One immutable favorite per player and round. Regular votes remain unchanged.
-- Uses the existing lobby guest-player identity protocol, not account-only voting.
CREATE TABLE public.imitation_masters (
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number > 0),
  voter_player_id text NOT NULL,
  target_player_ids text[] NOT NULL CHECK (cardinality(target_player_ids) BETWEEN 1 AND 2),
  target_team_number integer,
  voter_team_number integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (lobby_id, round_number, voter_player_id),
  CHECK (NOT voter_player_id = ANY(target_player_ids)),
  CHECK ((target_team_number IS NULL) = (voter_team_number IS NULL))
);
ALTER TABLE public.imitation_masters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.imitation_masters FROM anon, authenticated;

CREATE FUNCTION public.cast_mimic_master(
  p_lobby_id uuid, p_round_number integer, p_voter_player_id text,
  p_target_player_ids text[], p_session_id uuid, p_expected_index integer
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_round public.game_rounds%ROWTYPE;
  active_session public.voting_session%ROWTYPE;
  mode text;
  targets text[];
  team_targets text[];
  target_team integer;
  voter_team integer;
  displayed_player text;
  displayed_team integer;
  affected integer;
BEGIN
  SELECT * INTO active_round FROM public.game_rounds
    WHERE lobby_id = p_lobby_id AND round_number = p_round_number FOR SHARE;
  IF active_round.id IS NULL OR active_round.phase <> 'voting' THEN RETURN false; END IF;
  SELECT * INTO active_session FROM public.voting_session
    WHERE id = p_session_id AND lobby_id = p_lobby_id AND round_number = p_round_number FOR SHARE;
  IF active_session.id IS NULL OR active_session.current_imitation_index <> p_expected_index
    OR p_expected_index IS NULL OR p_expected_index < 0 THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lobby_players WHERE lobby_id = p_lobby_id
    AND player_id = p_voter_player_id) THEN RETURN false; END IF;
  SELECT array_agg(DISTINCT id ORDER BY id) INTO targets FROM unnest(p_target_player_ids) id;
  IF cardinality(targets) IS NULL OR cardinality(targets) NOT BETWEEN 1 AND 2
    OR p_voter_player_id = ANY(targets) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM unnest(targets) id WHERE id IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.lobby_players WHERE lobby_id = p_lobby_id AND player_id = id))
    THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.player_imitations WHERE lobby_id = p_lobby_id
    AND round_number = p_round_number AND player_id = ANY(targets)
    AND is_ready AND clip_id IS NOT NULL) THEN RETURN false; END IF;

  SELECT game_mode INTO mode FROM public.lobbies WHERE id = p_lobby_id;
  IF mode = '2v2' THEN
    SELECT team_number INTO target_team FROM public.game_teams
      WHERE lobby_id = p_lobby_id AND player_id = targets[1];
    SELECT team_number INTO voter_team FROM public.game_teams
      WHERE lobby_id = p_lobby_id AND player_id = p_voter_player_id;
    IF target_team IS NULL OR voter_team IS NULL OR voter_team = target_team THEN RETURN false; END IF;
    SELECT array_agg(DISTINCT player_id ORDER BY player_id) INTO team_targets FROM public.game_teams
      WHERE lobby_id = p_lobby_id AND team_number = target_team;
    IF targets IS DISTINCT FROM team_targets THEN RETURN false; END IF;
    SELECT team_number INTO displayed_team FROM (
      SELECT DISTINCT team.team_number FROM public.game_teams team
      JOIN public.player_imitations imitation ON imitation.lobby_id = team.lobby_id
        AND imitation.player_id = team.player_id AND imitation.round_number = p_round_number
        AND imitation.is_ready AND imitation.clip_id IS NOT NULL
      WHERE team.lobby_id = p_lobby_id
    ) audible_teams ORDER BY team_number OFFSET p_expected_index LIMIT 1;
    IF target_team IS DISTINCT FROM displayed_team THEN RETURN false; END IF;
  ELSIF mode = 'normal' THEN
    IF cardinality(targets) <> 1 THEN RETURN false; END IF;
    SELECT player_id INTO displayed_player FROM public.lobby_players
      WHERE lobby_id = p_lobby_id ORDER BY joined_at, player_id OFFSET p_expected_index LIMIT 1;
    IF targets[1] IS DISTINCT FROM displayed_player THEN RETURN false; END IF;
  ELSE
    RETURN false;
  END IF;

  -- Unique key serializes concurrent/retried choices; never update an award.
  INSERT INTO public.imitation_masters (lobby_id, round_number, voter_player_id,
    target_player_ids, target_team_number, voter_team_number)
    VALUES (p_lobby_id, p_round_number, p_voter_player_id, targets, target_team, voter_team)
    ON CONFLICT (lobby_id, round_number, voter_player_id) DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

CREATE FUNCTION public.read_mimic_masters(p_lobby_id uuid, p_round_number integer, p_player_id text)
RETURNS TABLE (voter_player_id text, target_player_ids text[], target_team_number integer, voter_team_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT master.voter_player_id, master.target_player_ids, master.target_team_number, master.voter_team_number
  FROM public.imitation_masters master
  JOIN public.game_rounds round_row ON round_row.lobby_id = master.lobby_id AND round_row.round_number = master.round_number
  WHERE master.lobby_id = p_lobby_id AND master.round_number = p_round_number
    AND EXISTS (SELECT 1 FROM public.lobby_players WHERE lobby_id = p_lobby_id AND player_id = p_player_id)
    AND (round_row.phase = 'results' OR master.voter_player_id = p_player_id)
  ORDER BY master.created_at, master.voter_player_id;
$$;

REVOKE ALL ON FUNCTION public.cast_mimic_master(uuid, integer, text, text[], uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_mimic_masters(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_mimic_master(uuid, integer, text, text[], uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.read_mimic_masters(uuid, integer, text) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
