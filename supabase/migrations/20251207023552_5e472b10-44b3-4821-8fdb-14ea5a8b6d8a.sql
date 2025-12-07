-- Add policy to allow deleting avatars for cleanup
CREATE POLICY "Anyone can delete avatars"
ON public.player_avatars
FOR DELETE
USING (true);

-- Create a table to persist avatars globally by player_id
-- This will replace lobby-specific avatars
CREATE TABLE IF NOT EXISTS public.player_global_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  avatar_type TEXT NOT NULL DEFAULT 'initials',
  image_url TEXT,
  background_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_global_avatars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view global avatars"
ON public.player_global_avatars
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert global avatars"
ON public.player_global_avatars
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update global avatars"
ON public.player_global_avatars
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete global avatars"
ON public.player_global_avatars
FOR DELETE
USING (true);

-- Enable realtime for global avatars
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_global_avatars;