-- Create player_avatars table to store avatars for all players to see
CREATE TABLE public.player_avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id text NOT NULL,
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  avatar_type text NOT NULL DEFAULT 'initials',
  image_url text,
  background_color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, lobby_id)
);

-- Enable RLS
ALTER TABLE public.player_avatars ENABLE ROW LEVEL SECURITY;

-- Anyone can view avatars
CREATE POLICY "Anyone can view avatars"
ON public.player_avatars
FOR SELECT
USING (true);

-- Anyone can insert avatars
CREATE POLICY "Anyone can insert avatars"
ON public.player_avatars
FOR INSERT
WITH CHECK (true);

-- Anyone can update avatars
CREATE POLICY "Anyone can update avatars"
ON public.player_avatars
FOR UPDATE
USING (true);

-- Enable realtime for avatars
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_avatars;