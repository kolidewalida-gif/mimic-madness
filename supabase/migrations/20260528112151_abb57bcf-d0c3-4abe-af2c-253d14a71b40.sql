ALTER TABLE public.undercover_players
ADD COLUMN IF NOT EXISTS clue_history TEXT[] NOT NULL DEFAULT '{}';