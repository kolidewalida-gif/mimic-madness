-- Fix RLS policies for anonymous game system (no auth required)
-- Since this game uses client-generated player IDs without authentication,
-- we need to make policies more permissive while still maintaining some security

-- 1. Update lobbies policies to allow viewing by code
DROP POLICY IF EXISTS "Players can view their lobbies" ON public.lobbies;

-- Allow viewing lobbies by code (needed for joining)
CREATE POLICY "Anyone can view lobbies by code"
ON public.lobbies
FOR SELECT
USING (true);

-- 2. Update lobby_players policies
DROP POLICY IF EXISTS "Players can view lobby members" ON public.lobby_players;

-- Allow viewing all lobby players (needed for game functionality)
CREATE POLICY "Anyone can view lobby players"
ON public.lobby_players
FOR SELECT
USING (true);

-- 3. Update video_clips policies
DROP POLICY IF EXISTS "Players can view clips in their lobbies" ON public.video_clips;

-- Allow viewing all clips (needed for game functionality)
CREATE POLICY "Anyone can view video clips"
ON public.video_clips
FOR SELECT
USING (true);

-- Note: INSERT, UPDATE, DELETE policies remain restrictive based on player_id
-- but since there's no auth system, enforcement happens at application level