
-- Monopoly game state
CREATE TABLE public.monopoly_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid REFERENCES public.lobbies(id) ON DELETE CASCADE NOT NULL,
  current_player_index integer NOT NULL DEFAULT 0,
  player_order text[] NOT NULL DEFAULT '{}',
  phase text NOT NULL DEFAULT 'rolling',
  free_parking_pot integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  winner_id text,
  winner_name text,
  is_finished boolean NOT NULL DEFAULT false,
  last_dice_1 integer DEFAULT NULL,
  last_dice_2 integer DEFAULT NULL,
  doubles_count integer NOT NULL DEFAULT 0,
  trade_from_player text,
  trade_to_player text,
  trade_offer jsonb,
  UNIQUE(lobby_id)
);

ALTER TABLE public.monopoly_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view monopoly games" ON public.monopoly_games FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert monopoly games" ON public.monopoly_games FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update monopoly games" ON public.monopoly_games FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete monopoly games" ON public.monopoly_games FOR DELETE TO public USING (true);

-- Monopoly players
CREATE TABLE public.monopoly_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.monopoly_games(id) ON DELETE CASCADE NOT NULL,
  player_id text NOT NULL,
  player_name text NOT NULL,
  token_type text NOT NULL DEFAULT 'car',
  position integer NOT NULL DEFAULT 0,
  money integer NOT NULL DEFAULT 1500,
  is_bankrupt boolean NOT NULL DEFAULT false,
  in_jail boolean NOT NULL DEFAULT false,
  jail_turns integer NOT NULL DEFAULT 0,
  has_get_out_of_jail_card integer NOT NULL DEFAULT 0,
  player_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

ALTER TABLE public.monopoly_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view monopoly players" ON public.monopoly_players FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert monopoly players" ON public.monopoly_players FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update monopoly players" ON public.monopoly_players FOR UPDATE TO public USING (true);

-- Monopoly properties ownership
CREATE TABLE public.monopoly_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.monopoly_games(id) ON DELETE CASCADE NOT NULL,
  property_index integer NOT NULL,
  owner_id text,
  houses integer NOT NULL DEFAULT 0,
  is_mortgaged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, property_index)
);

ALTER TABLE public.monopoly_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view monopoly properties" ON public.monopoly_properties FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert monopoly properties" ON public.monopoly_properties FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update monopoly properties" ON public.monopoly_properties FOR UPDATE TO public USING (true);

-- Monopoly action log for real-time sync
CREATE TABLE public.monopoly_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.monopoly_games(id) ON DELETE CASCADE NOT NULL,
  player_id text NOT NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monopoly_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view monopoly actions" ON public.monopoly_actions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert monopoly actions" ON public.monopoly_actions FOR INSERT TO public WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_actions;

-- Update lobbies constraint to include monopoly
ALTER TABLE public.lobbies DROP CONSTRAINT IF EXISTS lobbies_game_phase_check;
ALTER TABLE public.lobbies ADD CONSTRAINT lobbies_game_phase_check CHECK (game_phase IN ('lobby', 'preparation', 'playing', 'quiz', 'audiophone', 'pixoguess', 'monopoly'));
