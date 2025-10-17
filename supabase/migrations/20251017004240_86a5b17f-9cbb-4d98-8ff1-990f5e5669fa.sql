-- Add game_phase column to track the current phase of the game
ALTER TABLE public.lobbies
ADD COLUMN IF NOT EXISTS game_phase TEXT DEFAULT 'lobby' CHECK (game_phase IN ('lobby', 'preparation', 'playing'));

-- Update existing lobbies to have the correct phase
UPDATE public.lobbies
SET game_phase = 'lobby'
WHERE game_phase IS NULL;