-- Drop the old constraint and add a new one that includes 'quiz'
ALTER TABLE public.lobbies DROP CONSTRAINT IF EXISTS lobbies_game_phase_check;

ALTER TABLE public.lobbies ADD CONSTRAINT lobbies_game_phase_check 
CHECK (game_phase IN ('lobby', 'preparation', 'playing', 'quiz'));