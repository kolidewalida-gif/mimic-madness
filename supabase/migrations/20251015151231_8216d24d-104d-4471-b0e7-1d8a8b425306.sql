-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lobby_players_lobby_id ON public.lobby_players(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_code ON public.lobbies(code);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON public.lobbies(status);

-- Add constraint to limit players per lobby
ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 8;

-- Clean up old lobbies (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_lobbies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lobbies
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;