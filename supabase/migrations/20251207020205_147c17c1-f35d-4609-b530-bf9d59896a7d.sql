-- Add column to store if player wants original video audio in their imitation
ALTER TABLE public.player_imitations 
ADD COLUMN IF NOT EXISTS include_original_audio BOOLEAN NOT NULL DEFAULT false;

-- Add round_number to video_clips to better track which round a clip belongs to
ALTER TABLE public.video_clips 
ADD COLUMN IF NOT EXISTS round_number INTEGER;