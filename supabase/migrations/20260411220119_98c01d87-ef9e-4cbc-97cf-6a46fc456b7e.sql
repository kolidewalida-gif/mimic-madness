
-- Create undercover_games table
CREATE TABLE public.undercover_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  civilian_word TEXT NOT NULL,
  undercover_word TEXT NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'word_reveal',
  current_player_index INTEGER NOT NULL DEFAULT 0,
  player_order TEXT[] NOT NULL DEFAULT '{}',
  eliminated_player_id TEXT,
  eliminated_role TEXT,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  winner_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id)
);

-- Create undercover_players table
CREATE TABLE public.undercover_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.undercover_games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'civilian',
  word TEXT,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  vote_target TEXT,
  current_clue TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.undercover_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.undercover_players ENABLE ROW LEVEL SECURITY;

-- Public access policies (like other game tables)
CREATE POLICY "Anyone can view undercover games" ON public.undercover_games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert undercover games" ON public.undercover_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update undercover games" ON public.undercover_games FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete undercover games" ON public.undercover_games FOR DELETE USING (true);

CREATE POLICY "Anyone can view undercover players" ON public.undercover_players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert undercover players" ON public.undercover_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update undercover players" ON public.undercover_players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete undercover players" ON public.undercover_players FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.undercover_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.undercover_players;
