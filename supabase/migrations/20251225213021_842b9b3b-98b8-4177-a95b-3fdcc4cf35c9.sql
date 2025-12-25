-- Fix RLS policy for DELETE on lobby_players to allow kick functionality
DROP POLICY IF EXISTS "Players can leave or host can kick" ON public.lobby_players;

CREATE POLICY "Anyone can delete lobby players"
ON public.lobby_players
FOR DELETE
USING (true);