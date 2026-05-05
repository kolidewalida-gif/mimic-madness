-- Add game_mode column to lobbies table
ALTER TABLE public.lobbies 
ADD COLUMN game_mode text NOT NULL DEFAULT 'normal';

-- Create game_teams table for team assignments
CREATE TABLE public.game_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  team_number integer NOT NULL,
  player_id text NOT NULL,
  player_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, player_id)
);

-- Enable RLS on game_teams
ALTER TABLE public.game_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_teams
CREATE POLICY "Anyone can view teams" ON public.game_teams
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert teams" ON public.game_teams
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update teams" ON public.game_teams
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete teams" ON public.game_teams
FOR DELETE USING (true);

-- Enable realtime for game_teams
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_teams;