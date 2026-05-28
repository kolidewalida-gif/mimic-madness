-- Add clue_pass column to track how many rounds of clues have been given.
-- 0 = first pass, 1 = second pass. After pass 1 completes → discussion.
ALTER TABLE public.undercover_games
  ADD COLUMN IF NOT EXISTS clue_pass INTEGER NOT NULL DEFAULT 0;
