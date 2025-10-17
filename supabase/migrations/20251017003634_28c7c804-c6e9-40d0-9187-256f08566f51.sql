-- Table pour stocker les imitations des joueurs pendant une manche
CREATE TABLE IF NOT EXISTS public.player_imitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, round_number, player_id)
);

-- Table pour stocker les votes (likes/dislikes)
CREATE TABLE IF NOT EXISTS public.imitation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  imitation_player_id TEXT NOT NULL,
  voter_player_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, round_number, imitation_player_id, voter_player_id)
);

-- Table pour stocker l'état du jeu et le défi actuel
CREATE TABLE IF NOT EXISTS public.game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  current_challenge_id TEXT NOT NULL,
  challenge_player_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'imitation' CHECK (phase IN ('imitation', 'voting', 'results')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, round_number)
);

-- Enable RLS
ALTER TABLE public.player_imitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imitation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

-- Policies for player_imitations
CREATE POLICY "Anyone can view imitations"
  ON public.player_imitations FOR SELECT
  USING (true);

CREATE POLICY "Players can insert their own imitation status"
  ON public.player_imitations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own imitation status"
  ON public.player_imitations FOR UPDATE
  USING (true);

-- Policies for imitation_votes
CREATE POLICY "Anyone can view votes"
  ON public.imitation_votes FOR SELECT
  USING (true);

CREATE POLICY "Players can insert votes"
  ON public.imitation_votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own votes"
  ON public.imitation_votes FOR UPDATE
  USING (true);

-- Policies for game_rounds
CREATE POLICY "Anyone can view game rounds"
  ON public.game_rounds FOR SELECT
  USING (true);

CREATE POLICY "Host can manage game rounds"
  ON public.game_rounds FOR ALL
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_imitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.imitation_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;