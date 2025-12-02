-- Create voting_session table to synchronize votes across players
CREATE TABLE IF NOT EXISTS public.voting_session (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  current_imitation_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, round_number)
);

-- Enable Row Level Security
ALTER TABLE public.voting_session ENABLE ROW LEVEL SECURITY;

-- Create policies for voting_session
CREATE POLICY "Voting sessions are viewable by everyone" 
ON public.voting_session 
FOR SELECT 
USING (true);

CREATE POLICY "Host can create voting sessions" 
ON public.voting_session 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Host can update voting sessions" 
ON public.voting_session 
FOR UPDATE 
USING (true);

-- Enable realtime for voting_session
ALTER PUBLICATION supabase_realtime ADD TABLE public.voting_session;