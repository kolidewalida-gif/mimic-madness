-- Create table to track player submissions
CREATE TABLE IF NOT EXISTS public.player_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  challenges_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, player_id)
);

-- Enable RLS
ALTER TABLE public.player_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view submissions"
  ON public.player_submissions
  FOR SELECT
  USING (true);

CREATE POLICY "Players can submit their own challenges"
  ON public.player_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update their own submissions"
  ON public.player_submissions
  FOR UPDATE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_submissions;