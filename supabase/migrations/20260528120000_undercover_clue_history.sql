-- Add clue_history array to preserve past clues across passes.
ALTER TABLE public.undercover_players
  ADD COLUMN IF NOT EXISTS clue_history TEXT[] NOT NULL DEFAULT '{}';

-- Helper: archive current_clue into clue_history for all players in a game,
-- then clear current_clue. Used between clue passes.
CREATE OR REPLACE FUNCTION public.archive_undercover_clues(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Append current_clue to clue_history (only for non-null clues)
  UPDATE public.undercover_players
    SET clue_history = CASE
          WHEN current_clue IS NOT NULL THEN array_append(clue_history, current_clue)
          ELSE clue_history
        END,
        current_clue = NULL
    WHERE game_id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_undercover_clues(UUID) TO authenticated, anon;
