-- Add is_playing field to voting_session for synchronized playback
ALTER TABLE public.voting_session ADD COLUMN IF NOT EXISTS is_playing boolean NOT NULL DEFAULT false;