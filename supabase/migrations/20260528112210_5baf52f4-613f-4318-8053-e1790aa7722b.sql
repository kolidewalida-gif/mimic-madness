CREATE OR REPLACE FUNCTION public.archive_undercover_clues(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Append current clues to clue_history for all alive players in this game
  UPDATE public.undercover_players
  SET clue_history = COALESCE(clue_history, '{}') || current_clue,
      current_clue = NULL
  WHERE game_id = p_game_id
    AND is_alive = true
    AND current_clue IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_undercover_clues(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_undercover_clues(UUID) TO service_role;