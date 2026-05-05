-- Add original_audio_volume column to player_imitations
ALTER TABLE public.player_imitations
ADD COLUMN IF NOT EXISTS original_audio_volume integer NOT NULL DEFAULT 50;