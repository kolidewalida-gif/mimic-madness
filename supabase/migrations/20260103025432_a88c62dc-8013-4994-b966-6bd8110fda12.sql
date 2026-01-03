-- Add synchronization columns for reveal phase
ALTER TABLE public.audio_phone_rounds
ADD COLUMN IF NOT EXISTS reveal_is_playing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reveal_phrase_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reveal_step text DEFAULT 'idle';