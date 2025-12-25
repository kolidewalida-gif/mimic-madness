-- Add disconnected_at column for tracking disconnection time
ALTER TABLE public.lobby_players 
ADD COLUMN IF NOT EXISTS disconnected_at timestamp with time zone DEFAULT NULL;

-- Add connection_status column
ALTER TABLE public.lobby_players 
ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'connected';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lobby_players_disconnected 
ON public.lobby_players(lobby_id, disconnected_at) 
WHERE disconnected_at IS NOT NULL;

-- Update RLS policy to allow updates on lobby_players
DROP POLICY IF EXISTS "Players can update connection status" ON public.lobby_players;
CREATE POLICY "Players can update connection status"
ON public.lobby_players
FOR UPDATE
USING (true)
WITH CHECK (true);