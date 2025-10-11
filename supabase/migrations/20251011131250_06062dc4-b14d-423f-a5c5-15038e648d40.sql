-- Create lobbies table
CREATE TABLE public.lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create lobby_players table
CREATE TABLE public.lobby_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid REFERENCES public.lobbies(id) ON DELETE CASCADE NOT NULL,
  player_id text NOT NULL,
  player_name text NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, player_id)
);

-- Enable RLS
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for lobbies (public read, anyone can create)
CREATE POLICY "Anyone can view lobbies"
  ON public.lobbies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create lobbies"
  ON public.lobbies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Host can update lobby"
  ON public.lobbies FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete lobbies"
  ON public.lobbies FOR DELETE
  USING (true);

-- RLS policies for lobby_players (public read, anyone can join)
CREATE POLICY "Anyone can view lobby players"
  ON public.lobby_players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join lobbies"
  ON public.lobby_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can leave lobbies"
  ON public.lobby_players FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_players;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_lobby_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lobbies_updated_at
  BEFORE UPDATE ON public.lobbies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lobby_updated_at();