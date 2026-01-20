-- Create table for Pixoguess rounds
CREATE TABLE public.pixoguess_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'waiting',
  image_url TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  acceptable_answers TEXT[] DEFAULT '{}',
  category TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  winner_id TEXT,
  winner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Pixoguess guesses
CREATE TABLE public.pixoguess_guesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  guess TEXT NOT NULL,
  guess_time_ms INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pixoguess_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixoguess_guesses ENABLE ROW LEVEL SECURITY;

-- Policies for pixoguess_rounds
CREATE POLICY "Anyone can view pixoguess rounds" ON public.pixoguess_rounds
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert pixoguess rounds" ON public.pixoguess_rounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update pixoguess rounds" ON public.pixoguess_rounds
  FOR UPDATE USING (true);

-- Policies for pixoguess_guesses
CREATE POLICY "Anyone can view pixoguess guesses" ON public.pixoguess_guesses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert pixoguess guesses" ON public.pixoguess_guesses
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixoguess_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixoguess_guesses;