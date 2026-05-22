-- Persistent score tracking across rounds in a single Undercover game.
-- The host's pre-game settings panel can ask for "best of N" rounds; when
-- a round ends (one side wins by elimination or parity), we don't end the
-- game — we increment the matching score, redistribute roles/words, and
-- return to word_reveal until current_round reaches total_rounds.

ALTER TABLE public.undercover_games
  ADD COLUMN IF NOT EXISTS civilian_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS undercover_wins INTEGER NOT NULL DEFAULT 0;
