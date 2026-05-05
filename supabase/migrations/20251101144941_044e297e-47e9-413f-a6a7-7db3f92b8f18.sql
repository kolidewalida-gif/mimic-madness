-- Fix security issues: Restrict access to lobbies, lobby_players, and video_clips tables

-- 1. DROP existing permissive policies on lobbies table
DROP POLICY IF EXISTS "Anyone can create lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Anyone can delete lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Anyone can view lobbies" ON public.lobbies;
DROP POLICY IF EXISTS "Host can update lobby" ON public.lobbies;

-- 2. CREATE new restrictive policies for lobbies table
-- Players can only view lobbies they are part of
CREATE POLICY "Players can view their lobbies"
ON public.lobbies
FOR SELECT
USING (
  id IN (
    SELECT lobby_id 
    FROM public.lobby_players 
    WHERE player_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  OR host_id = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Anyone can create a lobby (needed for game creation)
CREATE POLICY "Anyone can create lobbies"
ON public.lobbies
FOR INSERT
WITH CHECK (true);

-- Only the host can update their lobby
CREATE POLICY "Host can update their lobby"
ON public.lobbies
FOR UPDATE
USING (
  host_id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR id IN (
    SELECT lobby_id 
    FROM public.lobby_players 
    WHERE player_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Only the host can delete their lobby
CREATE POLICY "Host can delete their lobby"
ON public.lobbies
FOR DELETE
USING (host_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 3. DROP existing policies on lobby_players table
DROP POLICY IF EXISTS "Anyone can join lobbies" ON public.lobby_players;
DROP POLICY IF EXISTS "Anyone can view lobby players" ON public.lobby_players;
DROP POLICY IF EXISTS "Players can leave lobbies" ON public.lobby_players;

-- 4. CREATE new restrictive policies for lobby_players table
-- Players can only view players in lobbies they are part of
CREATE POLICY "Players can view lobby members"
ON public.lobby_players
FOR SELECT
USING (
  lobby_id IN (
    SELECT lobby_id 
    FROM public.lobby_players 
    WHERE player_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Players can join lobbies (needed for game joining)
CREATE POLICY "Players can join lobbies"
ON public.lobby_players
FOR INSERT
WITH CHECK (true);

-- Players can only remove themselves, or host can remove anyone
CREATE POLICY "Players can leave or host can kick"
ON public.lobby_players
FOR DELETE
USING (
  player_id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE lobbies.id = lobby_players.lobby_id 
    AND lobbies.host_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- 5. DROP existing policies on video_clips table
DROP POLICY IF EXISTS "Anyone can view video clips" ON public.video_clips;
DROP POLICY IF EXISTS "Players can delete their own clips" ON public.video_clips;
DROP POLICY IF EXISTS "Players can insert their own clips" ON public.video_clips;
DROP POLICY IF EXISTS "Players can update their own clips" ON public.video_clips;

-- 6. CREATE new restrictive policies for video_clips table
-- Players can only view clips in lobbies they are part of
CREATE POLICY "Players can view clips in their lobbies"
ON public.video_clips
FOR SELECT
USING (
  lobby_id IS NULL
  OR lobby_id IN (
    SELECT lobby_id 
    FROM public.lobby_players 
    WHERE player_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Players can insert their own clips
CREATE POLICY "Players can insert their clips"
ON public.video_clips
FOR INSERT
WITH CHECK (player_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Players can update their own clips
CREATE POLICY "Players can update their clips"
ON public.video_clips
FOR UPDATE
USING (player_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Players can delete their own clips
CREATE POLICY "Players can delete their clips"
ON public.video_clips
FOR DELETE
USING (player_id = current_setting('request.jwt.claims', true)::json->>'sub');