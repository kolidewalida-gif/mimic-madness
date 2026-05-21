-- Add per-game settings to undercover_games for pre-game configuration.
-- These let the host pick number of rounds, number of undercover spies,
-- and toggle Mr White before the match starts. A new 'settings' phase
-- is allowed so the host can configure things before reveal.

ALTER TABLE public.undercover_games
  ADD COLUMN IF NOT EXISTS total_rounds INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS num_undercover INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS enable_mr_white BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS settings_locked BOOLEAN NOT NULL DEFAULT FALSE;
