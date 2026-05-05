-- Update the check constraint on game_rounds to include 'preview' phase
ALTER TABLE public.game_rounds 
DROP CONSTRAINT IF EXISTS game_rounds_phase_check;

ALTER TABLE public.game_rounds 
ADD CONSTRAINT game_rounds_phase_check 
CHECK (phase IN ('preview', 'imitation', 'voting', 'results'));