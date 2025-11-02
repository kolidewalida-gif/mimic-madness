-- Fix RLS policies for lobbies table to work without JWT authentication
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Host can update their lobby" ON public.lobbies;
DROP POLICY IF EXISTS "Host can delete their lobby" ON public.lobbies;

-- Create permissive policies that work without authentication
CREATE POLICY "Anyone can update lobbies"
  ON public.lobbies
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete lobbies"
  ON public.lobbies
  FOR DELETE
  USING (true);